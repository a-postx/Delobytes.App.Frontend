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

const openList = async (wrapper: ReturnType<typeof mountCombobox>): Promise<void> => {
  await searchInput(wrapper).trigger('focus')
  searchInput(wrapper).element.dispatchEvent(new Event('input', { bubbles: true }))
  searchInput(wrapper).element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  searchInput(wrapper).element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
  searchInput(wrapper).element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await flushPromises()
}

describe('ProductCombobox', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    productsGet.mockReset()
    ratesGetByProduct.mockReset()
    productsGet.mockResolvedValue(productsResponse(PRODUCTS))
    ratesGetByProduct.mockResolvedValue({ items: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
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

  it('propagates the selected product id outward', async () => {
    const wrapper = mountCombobox()
    await openList(wrapper)

    const option = Array.from(document.querySelectorAll('[role="option"]'))
      .find(element => element.textContent?.includes('SKU-002'))
    expect(option).toBeTruthy()
    option!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['p2'])
    expect(wrapper.emitted('select')?.at(-1)?.[0]).toMatchObject({ id: 'p2' })
    expect(ratesGetByProduct).toHaveBeenCalledWith('p2')
  })

  it('renders a photo placeholder when the product has no photos', async () => {
    const wrapper = mountCombobox()
    await openList(wrapper)

    const options = Array.from(document.querySelectorAll('[role="option"]'))
    const withoutPhoto = options.find(element => element.textContent?.includes('SKU-001'))
    const withPhoto = options.find(element => element.textContent?.includes('SKU-002'))

    expect(withoutPhoto?.querySelector('img')).toBeNull()
    expect(withPhoto?.querySelector('img')).not.toBeNull()
  })

  it('marks rate coverage on the option dot', async () => {
    const wrapper = mountCombobox()
    await openList(wrapper)

    const options = Array.from(document.querySelectorAll('[role="option"]'))
    const covered = options.find(element => element.textContent?.includes('SKU-002'))
    const uncovered = options.find(element => element.textContent?.includes('SKU-001'))

    expect(covered?.querySelector('[title="Норма заведена"]')).not.toBeNull()
    expect(uncovered?.querySelector('[title="Норма не заведена"]')).not.toBeNull()
  })

  it('shows a warning with the existing rate date after selection', async () => {
    ratesGetByProduct.mockResolvedValue({
      items: [
        {
          id: 'r1',
          productId: 'p2',
          productName: 'Товар Б',
          productSku: 'SKU-002',
          workRateId: 'wr-1',
          assemblyRatePerDay: 10,
          validFrom: '2024-03-12',
          isActive: true,
          createdAt: '2024-03-12',
        },
      ],
    })

    const wrapper = mountCombobox()
    await openList(wrapper)

    const option = Array.from(document.querySelectorAll('[role="option"]'))
      .find(element => element.textContent?.includes('SKU-002'))
    option!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(wrapper.text()).toContain('12.03.2024')
  })

  it('stays silent when the rate lookup fails', async () => {
    ratesGetByProduct.mockRejectedValue(new Error('network'))

    const wrapper = mountCombobox()
    await openList(wrapper)

    const option = Array.from(document.querySelectorAll('[role="option"]'))
      .find(element => element.textContent?.includes('SKU-002'))
    option!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(wrapper.text()).not.toContain('активная норма')
  })
})
