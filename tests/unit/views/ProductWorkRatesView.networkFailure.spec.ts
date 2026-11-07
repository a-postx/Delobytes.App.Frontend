import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { computed, defineComponent, h } from 'vue'

vi.mock('@/services/api', () => ({
  productWorkRatesApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  catalogProductsApi: {
    getAll: vi.fn(),
  },
  workRatesApi: {
    getAll: vi.fn(),
  },
}))

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  },
}))

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({
    currentUser: { value: null },
    canWrite: computed(() => true),
  }),
}))

import { productWorkRatesApi, catalogProductsApi, workRatesApi } from '@/services/api'
import AppErrorBoundary from '@/components/feedback/AppErrorBoundary.vue'
import ProductWorkRatesView from '@/views/ProductWorkRatesView.vue'

const getRates = productWorkRatesApi.getAll as ReturnType<typeof vi.fn>
const getCatalogProbe = catalogProductsApi.getAll as ReturnType<typeof vi.fn>
const getWorkRates = workRatesApi.getAll as ReturnType<typeof vi.fn>

const PassthroughStub = defineComponent({ template: '<div><slot /></div>' })
const DialogRootStub = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
})

const stubs = {
  DataGrid: defineComponent({ name: 'DataGrid', template: '<div data-test="data-grid"><slot name="empty" /></div>' }),
  ProductCombobox: defineComponent({ name: 'ProductCombobox', template: '<div data-test="product-combobox" />' }),
  SearchInput: defineComponent({ name: 'SearchInput', template: '<div data-test="search-input" />' }),
  StatusFilter: defineComponent({ name: 'StatusFilter', template: '<div data-test="status-filter" />' }),
  Skeleton: PassthroughStub,
  /**
   * `emits` обязателен: без него Vue считает `click` обычным атрибутом, обработчик приходит
   * fallthrough'ом на корневой <button> и вызывается второй раз вместе с `$emit`. Один клик
   * по retry давал два запроса, и счётчик вызовов в тесте был завышен вдвое.
   */
  Button: defineComponent({
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  }),
  Input: defineComponent({ template: '<input />' }),
  Label: defineComponent({ template: '<label><slot /></label>' }),
  Badge: PassthroughStub,
  Spinner: defineComponent({ template: '<span>Loading...</span>' }),
  DialogRoot: DialogRootStub,
  DialogPortal: PassthroughStub,
  DialogOverlay: PassthroughStub,
  DialogContent: PassthroughStub,
  DialogTitle: PassthroughStub,
  DialogDescription: PassthroughStub,
  DialogClose: PassthroughStub,
  AlertDialogRoot: DialogRootStub,
  AlertDialogPortal: PassthroughStub,
  AlertDialogOverlay: PassthroughStub,
  AlertDialogContent: PassthroughStub,
  AlertDialogTitle: PassthroughStub,
  AlertDialogDescription: PassthroughStub,
  AlertDialogAction: PassthroughStub,
  AlertDialogCancel: PassthroughStub,
  RouterLink: PassthroughStub,
}

/**
 * R5.3: productWorkRatesApi.getAll отклоняется отдельно от catalogProductsApi.getAll и workRatesApi.getAll.
 * До исправления единый Promise.all в onMounted связывал все три загрузки: отказ одной рушил
 * другие две. Тест проверяет, что теперь они независимы: неудачный getAll норм
 * не должен мешать загрузке ставок работы и пробы каталога, и обратно.
 */
const mountInsideBoundary = () =>
  mount(AppErrorBoundary, {
    global: { stubs },
    slots: { default: () => h(ProductWorkRatesView) },
  })

describe('ProductWorkRatesView — деградация при недоступном backend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCatalogProbe.mockResolvedValue({ items: [], statusCounts: { active: 1, inactive: 0, all: 1 } })
    getWorkRates.mockResolvedValue({ items: [{ id: 'wr-1', name: 'Сборщик', dailyWage: 2000, isActive: true, createdAt: '2024-01-01T00:00:00Z' }] })
  })

  it('не схлопывается в AppErrorBoundary, когда падает только загрузка норм выработки', async () => {
    getRates.mockRejectedValue({ message: 'Network Error' })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Не удалось отобразить раздел')
    expect(wrapper.text()).toContain('Нормы выработки')
  })

  it('обе остальные загрузки доходят до конца независимо от отклонённого productWorkRatesApi.getAll', async () => {
    getRates.mockRejectedValue({ message: 'Network Error' })

    mountInsideBoundary()
    await flushPromises()

    expect(getRates).toHaveBeenCalledTimes(1)
    expect(getCatalogProbe).toHaveBeenCalledTimes(1)
    expect(getWorkRates).toHaveBeenCalledTimes(1)
  })

  it('показывает встроенный блок ошибки с retry вместо тихого отказа', async () => {
    getRates.mockRejectedValue({ message: 'Network Error' })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).toContain('Нет связи с сервером')
    const retryButton = wrapper.findAll('button').find(b => b.text().trim() === 'Повторить')
    expect(retryButton).toBeTruthy()
  })

  it('восстанавливается после повторного запроса без перезагрузки страницы', async () => {
    getRates.mockRejectedValueOnce({ message: 'Network Error' })
    getRates.mockResolvedValueOnce({
      items: [{
        id: 'rate-1', productId: 'product-1', productName: 'Товар', productSku: 'SKU-1',
        workRateId: 'wr-1', assemblyRatePerDay: 100, validFrom: '2024-01-01', status: 'Active',
        removedFrom: null, createdAt: '2024-01-01', updatedAt: null,
      }],
      totalCount: 1, page: 1, pageSize: 25,
      statusCounts: { active: 1, inactive: 0, all: 1 },
    })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    const retryButton = wrapper.findAll('button').find(b => b.text().trim() === 'Повторить')
    await retryButton!.trigger('click')
    await flushPromises()

    expect(getRates).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).not.toContain('Нет связи с сервером')
  })

  it('не падает, если вместо норм выработки рушится загрузка справочника товаров', async () => {
    getRates.mockResolvedValue({ items: [], totalCount: 0, page: 1, pageSize: 25, statusCounts: { active: 0, inactive: 0, all: 0 } })
    getCatalogProbe.mockRejectedValue({ message: 'Network Error' })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Не удалось отобразить раздел')
    expect(getWorkRates).toHaveBeenCalledTimes(1)
  })
})
