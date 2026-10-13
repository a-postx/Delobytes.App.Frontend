import { describe, it, expect } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { Unit } from '@/services/api'
import type { ComponentItem, GetComponentsParams, GetComponentsResponse } from '@/services/api'

const canWrite = ref(true)

vi.mock('@/services/api', () => ({
  Unit: {
    Piece: 'Piece',
    Kg: 'Kg',
    Meter: 'Meter',
    Liter: 'Liter',
    Ml: 'Ml',
    Gram: 'Gram',
  },
  componentsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    createPrice: vi.fn(),
    delete: vi.fn(),
    restore: vi.fn(),
  },
  suppliersApi: { getAll: vi.fn() },
  isComponentSortKey: (value: unknown): boolean =>
    typeof value === 'string' && ['name', 'supplier', 'validFrom', 'createdAt'].includes(value),
}))
vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({ canWrite: computed(() => canWrite.value) }),
}))
vi.mock('@/composables/useTenantMoney', () => ({
  useTenantMoney: () => ({
    formatMoney: (value: number): string =>
      new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value),
    currencySymbol: computed(() => '₽'),
    currency: computed(() => 'RUB'),
  }),
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

import { componentsApi, suppliersApi } from '@/services/api'
import ComponentsView from '@/views/ComponentsView.vue'

const getComponents = componentsApi.getAll as ReturnType<typeof vi.fn>
const getSuppliers = suppliersApi.getAll as ReturnType<typeof vi.fn>

/** Последний вызов `getAll`: аргумент — это то, что реально ушло на сервер. */
const lastCall = (): GetComponentsParams | undefined =>
  getComponents.mock.calls.at(-1)?.[0] as GetComponentsParams | undefined

const component = (overrides: Partial<ComponentItem> = {}): ComponentItem => ({
  id: 'component-1',
  name: 'Картон',
  unit: Unit.Piece,
  category: 'Material',
  activePrice: {
    id: 'price-1',
    pricePerUnit: 100,
    supplierId: 'supplier-1',
    supplierName: 'Поставщик 1',
    validFrom: '2024-01-01',
  },
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
})

const response = (
  items: ComponentItem[],
  overrides: Partial<GetComponentsResponse> = {},
): GetComponentsResponse => ({
  items,
  totalCount: items.length,
  page: 1,
  pageSize: 25,
  statusCounts: { active: 2, inactive: 1, all: 3 },
  ...overrides,
})

const factory = (): VueWrapper => mount(ComponentsView, { attachTo: document.body })

const sortButton = (wrapper: VueWrapper, title: string) =>
  wrapper.findAll('thead button')
    .filter(button => button.attributes('role') !== 'checkbox')
    .find(candidate => candidate.text().includes(title))

const sortHeader = (wrapper: VueWrapper, title: string) =>
  wrapper.findAll('thead th').find(cell => cell.text().includes(title))

const searchField = (wrapper: VueWrapper) =>
  wrapper.find('[data-slot="search-input"] input')

/**
 * Счётчики вкладок и фильтр по статусу переехали на сервер вместе с пагинацией: список
 * страницы больше не содержит все статусы сразу, поэтому клиентский подсчёт показывал бы
 * числа только для видимых строк. Эти тесты фиксируют, что состояние уходит в запрос,
 * а подписи вкладок берутся из ответа.
 */
describe('ComponentsView status tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    canWrite.value = true
    getSuppliers.mockResolvedValue({ items: [] })
    getComponents.mockResolvedValue(response([component()]))
  })

  it('renders the counts returned by the server', async () => {
    const wrapper = factory()
    await flushPromises()

    expect(wrapper.text()).toContain('Активные (2)')
    expect(wrapper.text()).toContain('Все (3)')
    expect(wrapper.text()).toContain('Неактивные (1)')
  })

  it('requests the counts together with the first page', async () => {
    factory()
    await flushPromises()

    expect(lastCall()).toMatchObject({
      isActive: true,
      page: 1,
      pageSize: 25,
      sortBy: 'name',
      sortDir: 'asc',
      includeCounts: true,
    })
  })

  it('drops the status parameter for the all tab', async () => {
    const wrapper = factory()
    await flushPromises()

    const allTab = wrapper.findAll('button').find(button => button.text().includes('Все'))
    await allTab?.trigger('click')
    await flushPromises()

    expect(lastCall()?.isActive).toBeUndefined()
  })

  it('requests inactive components from the inactive tab', async () => {
    const wrapper = factory()
    await flushPromises()

    const inactiveTab = wrapper.findAll('button').find(button => button.text().includes('Неактивные'))
    await inactiveTab?.trigger('click')
    await flushPromises()

    expect(lastCall()).toMatchObject({ isActive: false })
  })
})

describe('ComponentsView server-side paging and sorting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    canWrite.value = true
    getSuppliers.mockResolvedValue({ items: [] })
    getComponents.mockResolvedValue(response([component()], { totalCount: 60 }))
  })

  it('opens on the Название column, ascending', async () => {
    const wrapper = factory()
    await flushPromises()

    expect(sortHeader(wrapper, 'Название')?.attributes('aria-sort')).toBe('ascending')
  })

  it('reloads with the next page number when the page changes', async () => {
    const wrapper = factory()
    await flushPromises()

    await wrapper.find('[aria-label="Следующая страница"]').trigger('click')
    await flushPromises()

    expect(lastCall()).toMatchObject({ page: 2 })
    expect(wrapper.text()).toContain('26–50 из 60')
  })

  it('reloads with the new sortBy/sortDir when a sortable header is clicked', async () => {
    const wrapper = factory()
    await flushPromises()

    await sortButton(wrapper, 'Поставщик')?.trigger('click')
    await flushPromises()

    expect(lastCall()).toMatchObject({ sortBy: 'supplier', sortDir: 'asc', page: 1 })

    await sortButton(wrapper, 'Поставщик')?.trigger('click')
    await flushPromises()

    expect(lastCall()).toMatchObject({ sortBy: 'supplier', sortDir: 'desc' })
  })

  it('sends no request when a non-sortable header is clicked', async () => {
    const wrapper = factory()
    await flushPromises()

    const callsBefore = getComponents.mock.calls.length

    for (const title of ['Единица', 'Категория', 'Цена/ед.', 'Статус']) {
      expect(sortButton(wrapper, title)).toBeUndefined()
    }

    await flushPromises()

    expect(getComponents).toHaveBeenCalledTimes(callsBefore)
  })

  it('keeps the actions column out of the server query', async () => {
    const wrapper = factory()
    await flushPromises()

    // The actions column never reaches the server: its header carries the column-visibility
    // gear instead of a sortable title, and the sort key stays on the default column.
    expect(wrapper.find('[aria-label="Настроить колонки"]').exists()).toBe(true)
    expect(sortHeader(wrapper, 'Действия')).toBeUndefined()
    expect(lastCall()).toMatchObject({ sortBy: 'name' })
  })
})

describe('ComponentsView column visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    canWrite.value = true
    getSuppliers.mockResolvedValue({ items: [] })
    getComponents.mockResolvedValue(response([component()]))
  })

  it('hides a column and remembers the choice in localStorage', async () => {
    const wrapper = factory()
    await flushPromises()

    expect(wrapper.text()).toContain('Поставщик 1')

    const grid = wrapper.findComponent({ name: 'DataGrid' })
    const table = (grid.vm as unknown as { table: { getColumn: (id: string) => { toggleVisibility: (visible: boolean) => void } } }).table
    table.getColumn('supplier').toggleVisibility(false)
    await flushPromises()

    expect(JSON.parse(localStorage.getItem('delobytes.components.columns') ?? '{}')).toEqual({ supplier: false })
    expect(wrapper.text()).not.toContain('Поставщик 1')
  })

  it('restores the stored column visibility on mount', async () => {
    localStorage.setItem('delobytes.components.columns', JSON.stringify({ supplier: false }))

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Поставщик 1')
  })

  it('falls back to all columns visible when the stored value is corrupt', async () => {
    localStorage.setItem('delobytes.components.columns', '{not json')

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.text()).toContain('Поставщик 1')
    expect(wrapper.text()).toContain('Компоненты')
  })

  it('falls back to all columns visible when the stored value is not an object', async () => {
    localStorage.setItem('delobytes.components.columns', '"supplier"')

    const wrapper = factory()
    await flushPromises()

    expect(wrapper.text()).toContain('Поставщик 1')
  })
})

describe('ComponentsView server-side search', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.clearAllMocks()
      canWrite.value = true
      getSuppliers.mockResolvedValue({ items: [] })
      getComponents.mockResolvedValue(response([component()]))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('sends the trimmed search to the server after the debounce', async () => {
      const wrapper = factory()
      await flushPromises()
      expect(getComponents).toHaveBeenCalledTimes(1)

      await searchField(wrapper).setValue('  картон  ')
      expect(getComponents).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(300)
      await flushPromises()

      expect(getComponents).toHaveBeenCalledTimes(2)
      expect(lastCall()).toMatchObject({ search: 'картон' })
    })

    it('sends one request for a burst of keystrokes', async () => {
      const wrapper = factory()
      await flushPromises()

      const field = searchField(wrapper)
      await field.setValue('к')
      await field.setValue('ка')
      await field.setValue('кар')
      await vi.advanceTimersByTimeAsync(300)
      await flushPromises()

      expect(getComponents).toHaveBeenCalledTimes(2)
    })

    it('drops a whitespace-only search', async () => {
      const wrapper = factory()
      await flushPromises()

      await searchField(wrapper).setValue('   ')
      await vi.advanceTimersByTimeAsync(300)
      await flushPromises()

      expect(lastCall()?.search).toBeUndefined()
    })

    it('does not claim the catalog is empty when the search found nothing', async () => {
      getComponents.mockResolvedValue(response([], { totalCount: 0 }))

      const wrapper = factory()
      await flushPromises()

      expect(wrapper.text()).toContain('Компоненты не добавлены')
      expect(wrapper.text()).toContain('Добавить первый')

      await searchField(wrapper).setValue('нет-такого-компонента')
      await vi.advanceTimersByTimeAsync(300)
      await flushPromises()

      expect(wrapper.text()).toContain('Ничего не найдено')
      expect(wrapper.text()).not.toContain('Добавить первый')
    })

    it('keeps the typed search when a status tab is switched', async () => {
      const wrapper = factory()
      await flushPromises()

      await searchField(wrapper).setValue('картон')
      await vi.advanceTimersByTimeAsync(300)
      await flushPromises()

      const allTab = wrapper.findAll('button').find(button => button.text().includes('Все'))
      await allTab?.trigger('click')
      await flushPromises()

      expect(searchField(wrapper).element.value).toBe('картон')
      expect(lastCall()).toMatchObject({ search: 'картон' })
      expect(lastCall()?.isActive).toBeUndefined()
    })
})
