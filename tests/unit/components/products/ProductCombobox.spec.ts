import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/services/api', () => ({
  catalogProductsApi: { getAll: vi.fn() },
  productWorkRatesApi: { getByProduct: vi.fn() },
}))

import { catalogProductsApi, productWorkRatesApi } from '@/services/api'
import { ProductStatus } from '@/types/products'
import ProductCombobox from '@/components/products/ProductCombobox.vue'

const productsGet = vi.mocked(catalogProductsApi.getAll)
const ratesGetByProduct = vi.mocked(productWorkRatesApi.getByProduct)

const PRODUCTS = [
  {
    id: 'p1',
    sku: 'SKU-001',
    name: 'Товар А',
    status: ProductStatus.Active,
    createdAt: '2024-01-01',
    creationSource: 'manual',
    hasActiveWorkRate: false,
  },
  {
    id: 'p2',
    sku: 'SKU-002',
    name: 'Товар Б',
    status: ProductStatus.Active,
    createdAt: '2024-01-02',
    creationSource: 'manual',
    hasActiveWorkRate: true,
    photos: [{ id: 'ph1', displayOrder: 0, sizeVariant: 'small', url: 'https://example.test/p2.jpg' }],
  },
]

const productsResponse = (items: typeof PRODUCTS, totalCount = items.length) => ({
  items,
  totalCount,
  page: 1,
  pageSize: 20,
})

const ACTIVE_RATE = {
  id: 'r1',
  productId: 'p2',
  productName: 'Товар Б',
  productSku: 'SKU-002',
  workRateId: 'wr-1',
  assemblyRatePerDay: 10,
  validFrom: '2024-03-12',
  isActive: true,
  createdAt: '2024-03-12',
}

let host: HTMLDivElement

const mountCombobox = (modelValue = '') => {
  host = document.createElement('div')
  document.body.appendChild(host)
  return mount(ProductCombobox, {
    props: { modelValue },
    attachTo: host,
  })
}

const searchInput = (wrapper: ReturnType<typeof mountCombobox>) =>
  wrapper.get('input[placeholder="Поиск по названию или SKU"]')

/** `ComboboxPortal` телепортирует список в body, поэтому ищем его в документе, а не в обёртке. */
const listOptions = (): Element[] => Array.from(document.querySelectorAll('[role="option"]'))

const listText = (): string => document.body.textContent ?? ''

const viewport = (): HTMLElement => {
  const element = document.querySelector('[data-reka-combobox-viewport]')
  expect(element).toBeTruthy()
  return element as HTMLElement
}

/** Список открывается по фокусу: `openOnFocus` включён в компоненте. */
const openList = async (wrapper: ReturnType<typeof mountCombobox>): Promise<void> => {
  await searchInput(wrapper).trigger('focus')
  await flushPromises()
}

/** `ListboxItem` реагирует только на `click`, поэтому выбор эмулируется им же. */
const clickOption = async (sku: string): Promise<void> => {
  const option = listOptions().find(element => element.textContent?.includes(sku))
  expect(option).toBeTruthy()
  option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushPromises()
}

/** Кнопка из телепортированного списка: `@vue/test-utils` её не видит. */
const clickListButton = async (label: string): Promise<void> => {
  const button = Array.from(document.querySelectorAll('button'))
    .find(candidate => candidate.textContent?.trim() === label)
  expect(button).toBeTruthy()
  button!.click()
  await flushPromises()
}

describe('ProductCombobox', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // reka-ui подсвечивает первый элемент и просит его в видимую область — в jsdom метода нет.
    Element.prototype.scrollIntoView = vi.fn()
    productsGet.mockReset()
    ratesGetByProduct.mockReset()
    productsGet.mockResolvedValue(productsResponse(PRODUCTS))
    ratesGetByProduct.mockResolvedValue({ items: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    host?.remove()
  })

  it('does not load products until the list is opened', async () => {
    mountCombobox()
    await flushPromises()

    expect(productsGet).not.toHaveBeenCalled()
  })

  it('requests the first page of active products with coverage on open', async () => {
    const wrapper = mountCombobox()
    await openList(wrapper)

    expect(productsGet).toHaveBeenCalledTimes(1)
    expect(productsGet).toHaveBeenCalledWith(ProductStatus.Active, {
      page: 1,
      pageSize: 20,
      sortBy: 'name',
      sortDir: 'asc',
      includeWorkRateCoverage: true,
      search: undefined,
    })
  })

  it('sends a single request after a burst of typing', async () => {
    const wrapper = mountCombobox()
    await openList(wrapper)
    productsGet.mockClear()

    await searchInput(wrapper).setValue('То')
    await searchInput(wrapper).setValue('Тов')
    await searchInput(wrapper).setValue('Това')

    expect(productsGet).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(productsGet).toHaveBeenCalledTimes(1)
    expect(productsGet).toHaveBeenCalledWith(
      ProductStatus.Active,
      expect.objectContaining({ search: 'Това', page: 1 }),
    )
  })

  it('renders server results even when the local filter would hide them', async () => {
    productsGet.mockResolvedValue(productsResponse(PRODUCTS, 2))
    const wrapper = mountCombobox()
    await openList(wrapper)

    await searchInput(wrapper).setValue('подстрока, которой нет в выдаче')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    // Фильтр reka-ui отключён: иначе он спрятал бы товары, пришедшие с сервера по своему поиску.
    expect(listOptions()).toHaveLength(2)
  })

  it('propagates the selected product id outward', async () => {
    const wrapper = mountCombobox()
    await openList(wrapper)

    await clickOption('SKU-002')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['p2'])
    expect(wrapper.emitted('select')?.at(-1)?.[0]).toMatchObject({ id: 'p2' })
    expect(ratesGetByProduct).toHaveBeenCalledWith('p2')
  })

  it('renders a photo placeholder when the product has no photos', async () => {
    const wrapper = mountCombobox()
    await openList(wrapper)

    const options = listOptions()
    const withoutPhoto = options.find(element => element.textContent?.includes('SKU-001'))
    const withPhoto = options.find(element => element.textContent?.includes('SKU-002'))

    expect(withoutPhoto?.querySelector('img')).toBeNull()
    expect(withPhoto?.querySelector('img')).not.toBeNull()
  })

  it('marks rate coverage on the option dot', async () => {
    const wrapper = mountCombobox()
    await openList(wrapper)

    const options = listOptions()
    const covered = options.find(element => element.textContent?.includes('SKU-002'))
    const uncovered = options.find(element => element.textContent?.includes('SKU-001'))

    expect(covered?.querySelector('[title="Норма заведена"]')).not.toBeNull()
    expect(uncovered?.querySelector('[title="Норма не заведена"]')).not.toBeNull()
  })

  it('shows a warning with the existing rate date after selection', async () => {
    ratesGetByProduct.mockResolvedValue({ items: [ACTIVE_RATE] })

    const wrapper = mountCombobox()
    await openList(wrapper)
    await clickOption('SKU-002')

    expect(wrapper.text()).toContain('12.03.2024')
  })

  it('shows no warning when the product has no active rate', async () => {
    ratesGetByProduct.mockResolvedValue({
      items: [{ ...ACTIVE_RATE, isActive: false }],
    })

    const wrapper = mountCombobox()
    await openList(wrapper)
    await clickOption('SKU-002')

    expect(wrapper.text()).not.toContain('У товара уже есть активная норма')
  })

  it('stays silent when the rate lookup fails', async () => {
    ratesGetByProduct.mockRejectedValue(new Error('network'))

    const wrapper = mountCombobox()
    await openList(wrapper)
    await clickOption('SKU-002')

    expect(wrapper.text()).not.toContain('У товара уже есть активная норма')
  })

  it('clears the selection without emitting a second select', async () => {
    const wrapper = mountCombobox()
    await openList(wrapper)
    await clickOption('SKU-002')

    await wrapper.get('[title="Очистить выбор"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([''])
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('does not fire an extra request when the search box is reset after a selection', async () => {
    const wrapper = mountCombobox()
    await openList(wrapper)
    productsGet.mockClear()

    await clickOption('SKU-002')
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()

    expect(productsGet).not.toHaveBeenCalled()
  })

  it('keeps the search box usable after a product is chosen', async () => {
    const wrapper = mountCombobox()
    await openList(wrapper)
    await clickOption('SKU-002')

    expect(searchInput(wrapper).attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('SKU-002')
  })

  it('surfaces a load failure with a retry that keeps the list open', async () => {
    productsGet.mockRejectedValueOnce(new Error('network'))

    const wrapper = mountCombobox()
    await openList(wrapper)

    expect(listText()).toContain('Не удалось загрузить товары')

    productsGet.mockResolvedValue(productsResponse(PRODUCTS))
    await clickListButton('Повторить')

    expect(listText()).toContain('Товар А')
  })

  it('shows a link to the catalogue when there are no active products at all', async () => {
    productsGet.mockResolvedValue(productsResponse([], 0))

    const wrapper = mountCombobox()
    await openList(wrapper)

    expect(listText()).toContain('В каталоге нет активных товаров')
    expect(listText()).not.toContain('Ничего не найдено')
  })

  it('loads the next page when the list is scrolled to the bottom', async () => {
    productsGet.mockResolvedValueOnce(productsResponse(PRODUCTS, 60))
    const wrapper = mountCombobox()
    await openList(wrapper)
    productsGet.mockClear()

    const element = viewport()
    Object.defineProperty(element, 'scrollHeight', { value: 500, configurable: true })
    Object.defineProperty(element, 'clientHeight', { value: 300, configurable: true })
    Object.defineProperty(element, 'scrollTop', { value: 195, configurable: true })

    productsGet.mockResolvedValueOnce(productsResponse(PRODUCTS, 60))
    element.dispatchEvent(new Event('scroll', { bubbles: false }))
    await flushPromises()

    expect(productsGet).toHaveBeenCalledWith(
      ProductStatus.Active,
      expect.objectContaining({ page: 2 }),
    )
  })
})