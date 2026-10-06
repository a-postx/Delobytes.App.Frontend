import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({ canWrite: { value: true } }),
}))

vi.mock('@/composables/useTenantMoney', () => ({
  useTenantMoney: () => ({ formatMoney: (value: number) => `${value} ₽` }),
}))

vi.mock('@/composables/useBomCostPreview', () => ({
  useBomCostPreview: () => ({
    baseline: { value: null },
    preview: { value: null },
    delta: { value: null },
    isPreviewLoading: { value: false },
    hasPreview: { value: false },
    reset: vi.fn(),
  }),
}))

vi.mock('vue-sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

vi.mock('@/services/api', async (importActual) => {
  const actual = await importActual<typeof import('@/services/api')>()
  return {
    // Unit берём настоящий: подписи единиц измерения в компоненте ключуются его значениями
    Unit: actual.Unit,
    bomApi: { getByProduct: vi.fn(), upsert: vi.fn() },
    componentsApi: { getAll: vi.fn() },
    productCostApi: { getCost: vi.fn(), previewCost: vi.fn(), getHistory: vi.fn() },
  }
})

import { bomApi, componentsApi, productCostApi } from '@/services/api'
import { toast } from 'vue-sonner'
import ProductBomEditor from '@/components/products/ProductBomEditor.vue'

const bomGet = vi.mocked(bomApi.getByProduct)
const componentsGet = vi.mocked(componentsApi.getAll)
const costGet = vi.mocked(productCostApi.getCost)
const toastFn = vi.mocked(toast)

const SERVER_LINES = [
  { id: 'l1', productId: 'p1', componentId: 'c1', quantity: 2, validFrom: '2024-01-01', isActive: true, createdAt: '2024-01-01' },
  { id: 'l2', productId: 'p1', componentId: 'c2', quantity: 5, validFrom: '2024-01-01', isActive: true, createdAt: '2024-01-01' },
  { id: 'l3', productId: 'p1', componentId: 'c3', quantity: 1, validFrom: '2024-01-01', isActive: true, createdAt: '2024-01-01' },
]

const COMPONENTS = [
  { id: 'c1', name: 'Ткань', unit: 'Piece', category: 'Material', activePrice: null, isActive: true, createdAt: '2024-01-01' },
  { id: 'c2', name: 'Нить', unit: 'Meter', category: 'Material', activePrice: null, isActive: true, createdAt: '2024-01-01' },
  { id: 'c3', name: 'Коробка', unit: 'Piece', category: 'Packaging', activePrice: null, isActive: true, createdAt: '2024-01-01' },
]

const COST = {
  found: true,
  productId: 'p1',
  asOfDate: '2024-06-01',
  materialCost: 120,
  logisticsCost: 30,
  packagingCost: 10,
  laborCost: 400,
  totalCost: 560,
  isComplete: true,
  lines: [],
  warnings: [],
}

const tableRows = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('tbody tr')

const quantities = (wrapper: ReturnType<typeof mount>): string[] =>
  wrapper.findAll('tbody tr input[type="number"]').map(input => (input.element as HTMLInputElement).value)

const buttonsWithText = (wrapper: ReturnType<typeof mount>, text: string) =>
  wrapper.findAll('button').filter(button => button.text().includes(text))

async function mountEditor() {
  const wrapper = mount(ProductBomEditor, {
    props: { productId: 'p1' },
    global: {
      stubs: {
        RouterLink: { props: ['to'], template: '<a><slot /></a>' },
        ProductCostHistoryDialog: { template: '<div />' },
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('ProductBomEditor — панель несохранённых изменений', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    bomGet.mockResolvedValue({ items: SERVER_LINES })
    componentsGet.mockResolvedValue({ items: COMPONENTS })
    costGet.mockResolvedValue(COST)
  })

  it('показывает панель с единственной точкой сохранения только при правках', async () => {
    const wrapper = await mountEditor()

    expect(wrapper.text()).not.toContain('Есть несохранённые изменения в составе товара')
    expect(buttonsWithText(wrapper, 'Сохранить состав')).toHaveLength(0)

    await tableRows(wrapper)[0].find('input[type="number"]').setValue('7')

    expect(wrapper.text()).toContain('Есть несохранённые изменения в составе товара')
    expect(buttonsWithText(wrapper, 'Сохранить состав')).toHaveLength(1)
    expect(buttonsWithText(wrapper, 'Отменить правки')).toHaveLength(1)
    // Кнопка под таблицей удалена — иначе точек сохранения было бы две
    expect(buttonsWithText(wrapper, 'Добавить компонент').length).toBeGreaterThan(0)
  })

  it('«Отменить правки» возвращает строки к сохранённому составу и снимает панель', async () => {
    const wrapper = await mountEditor()

    await tableRows(wrapper)[0].find('input[type="number"]').setValue('7')
    expect(quantities(wrapper)[0]).toBe('7')

    await buttonsWithText(wrapper, 'Отменить правки')[0].trigger('click')

    expect(quantities(wrapper)).toEqual(['2', '5', '1'])
    expect(wrapper.text()).not.toContain('Есть несохранённые изменения в составе товара')
    expect(bomGet).toHaveBeenCalledTimes(1)
  })

  it('не отправляет PUT при отмене правок', async () => {
    const wrapper = await mountEditor()

    await tableRows(wrapper)[0].find('input[type="number"]').setValue('7')
    await buttonsWithText(wrapper, 'Отменить правки')[0].trigger('click')
    await flushPromises()

    expect(bomApi.upsert).not.toHaveBeenCalled()
  })
})

describe('ProductBomEditor — отмена удаления строки', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    bomGet.mockResolvedValue({ items: SERVER_LINES })
    componentsGet.mockResolvedValue({ items: COMPONENTS })
    costGet.mockResolvedValue(COST)
  })

  const removeSecondRow = async (wrapper: ReturnType<typeof mount>) => {
    await wrapper.findAll('button[aria-label="Удалить строку"]')[1].trigger('click')
    await flushPromises()
  }

  it('показывает toast с названием компонента и действием отмены', async () => {
    const wrapper = await mountEditor()
    await removeSecondRow(wrapper)

    expect(tableRows(wrapper)).toHaveLength(2)
    expect(toastFn).toHaveBeenCalledTimes(1)

    const [message, options] = toastFn.mock.calls[0] as unknown as [string, { duration: number; action: { label: string } }]
    expect(message).toBe('Компонент «Нить» удалён из состава')
    expect(options.action.label).toBe('Отменить')
    expect(options.duration).toBeGreaterThan(0)
  })

  it('отмена возвращает строку на прежнее место с прежним количеством', async () => {
    const wrapper = await mountEditor()
    await removeSecondRow(wrapper)

    const [, options] = toastFn.mock.calls[0] as unknown as [string, { action: { onClick: () => void } }]
    options.action.onClick()
    await flushPromises()

    expect(tableRows(wrapper)).toHaveLength(3)
    expect(quantities(wrapper)).toEqual(['2', '5', '1'])
    // Строка снова в черновике — состав отличается от сохранённого, требуется сохранение
    expect(wrapper.text()).toContain('Есть несохранённые изменения в составе товара')
    expect(bomApi.upsert).not.toHaveBeenCalled()
  })

  it('повторная отмена не дублирует восстановленную строку', async () => {
    const wrapper = await mountEditor()
    await removeSecondRow(wrapper)

    const [, options] = toastFn.mock.calls[0] as unknown as [string, { action: { onClick: () => void } }]
    options.action.onClick()
    await flushPromises()
    options.action.onClick()
    await flushPromises()

    expect(tableRows(wrapper)).toHaveLength(3)
    expect(quantities(wrapper)).toEqual(['2', '5', '1'])
  })
})
