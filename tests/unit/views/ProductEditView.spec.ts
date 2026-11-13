import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { GetProductResponse } from '@/types/products'
import { ProductStatus } from '@/types/products'

vi.mock('@/services/api', () => ({
  catalogProductsApi: {
    getById: vi.fn(),
    update: vi.fn(),
  },
}))

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({ canWrite: computed(() => true) }),
}))

vi.mock('@/composables/useApi', () => ({
  // Mirrors the real priority: the server message wins over the fallback.
  extractErrorCode: () => undefined,
  extractErrorMessage: (error: any, fallback: string): string =>
    error?.response?.data?.message || fallback,
}))

const routeParams = ref<Record<string, string>>({ id: 'product-1' })

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: routeParams.value, query: {} }),
  useRouter: () => ({ push: vi.fn() }),
  // The view registers a leave guard for unsaved changes through the shared composable, so the
  // module mock has to expose the hook. Navigation itself is not under test here, and the stub
  // simply never blocks the (nonexistent) transitions.
  onBeforeRouteLeave: vi.fn(),
}))

vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { catalogProductsApi } from '@/services/api'
import ProductEditView from '@/views/ProductEditView.vue'

const getById = catalogProductsApi.getById as ReturnType<typeof vi.fn>
const update = catalogProductsApi.update as ReturnType<typeof vi.fn>

const baseProduct: GetProductResponse = {
  found: true,
  id: 'product-1',
  code: 'P-000001',
  sku: 'SKU-001',
  name: 'Товар',
  description: 'Описание',
  status: ProductStatus.Active,
  createdAt: '2024-01-01T00:00:00Z',
  creationSource: 'Manual',
  barcodes: [{ value: '4600000000001', type: 'wildberries', isDefault: true }],
  packingUnit: { lengthCm: 10, widthCm: 20, heightCm: 30, weightKg: 1 },
  photos: [],
}

const linkedProduct: GetProductResponse = {
  ...baseProduct,
  sku: 'WB-VENDOR-CODE',
  creationSource: 'WildberriesImport',
  channelLinks: [{
    channelId: 'channel-wb',
    channelName: 'Wildberries',
    channelCode: 'wildberries',
    externalProductId: '123456789',
    externalSku: 'WB-VENDOR-CODE',
    name: 'Название на WB',
    description: 'Описание на WB',
    packingUnit: { lengthCm: 1, widthCm: 2, heightCm: 3, weightKg: 0.5 },
    lastSyncedAt: '2024-02-01T10:00:00Z',
    isActive: true,
  }],
}

const factory = () => mount(ProductEditView, {
  global: {
    stubs: {
      ProductPhotoGallery: true,
      ProductBomEditor: true,
      ProductChannelCard: {
        props: ['link'],
        template: '<div class="product-channel-card">{{ link.externalProductId }}</div>',
      },
      ProductChannelBadges: {
        props: ['links'],
        template: '<div class="product-channel-badges">{{ links.length }}</div>',
      },
      Button: {
        props: ['disabled'],
        template: '<button :disabled="disabled"><slot /></button>',
      },
      CopyButton: true,
      Spinner: true,
      Skeleton: true,
    },
  },
})

const mountWith = async (product: GetProductResponse) => {
  getById.mockResolvedValue(product)
  const wrapper = factory()
  await flushPromises()
  return wrapper
}

const saveButton = (wrapper: ReturnType<typeof factory>) =>
  wrapper.findAll('button').find(b => b.text().includes('Сохранить'))

describe('ProductEditView: канонические поля связанного товара', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeParams.value = { id: 'product-1' }
  })

  it('оставляет редактируемыми все поля связанного товара', async () => {
    // Импорт больше не перезаписывает канонические поля после создания, поэтому блокировка снята.
    const wrapper = await mountWith(linkedProduct)

    expect((wrapper.find('#sku').element as HTMLInputElement).disabled).toBe(false)
    expect((wrapper.find('#name').element as HTMLInputElement).disabled).toBe(false)
    expect((wrapper.find('#description').element as HTMLTextAreaElement).disabled).toBe(false)
    expect((wrapper.find('input[placeholder="Длина"]').element as HTMLInputElement).disabled).toBe(false)
    expect(saveButton(wrapper)).toBeTruthy()
  })

  it('показывает код товара только для чтения и карточку канала', async () => {
    const wrapper = await mountWith(linkedProduct)

    const code = wrapper.find('#code').element as HTMLInputElement
    expect(code.value).toBe('P-000001')
    expect(code.disabled).toBe(true)

    expect(wrapper.find('.product-channel-card').exists()).toBe(true)
    expect(wrapper.find('.product-channel-card').text()).toBe('123456789')
  })

  it('отправляет канонические поля вместе с изменённым SKU', async () => {
    const wrapper = await mountWith(linkedProduct)
    update.mockResolvedValue(undefined)

    await wrapper.find('#sku').setValue('NEW-INTERNAL-SKU')
    await saveButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(update).toHaveBeenCalledWith('product-1', {
      sku: 'NEW-INTERNAL-SKU',
      name: 'Товар',
      description: 'Описание',
      barcodes: [{ value: '4600000000001', type: 'wildberries', isDefault: true }],
      packingUnit: { lengthCm: 10, widthCm: 20, heightCm: 30, weightKg: 1 },
    })
  })

  it('не отправляет SKU, если он не менялся', async () => {
    // Сохранение без правок не должно поднимать SKU, а вместе с ним UpdatedAt.
    const wrapper = await mountWith(linkedProduct)
    update.mockResolvedValue(undefined)

    await saveButton(wrapper)!.trigger('click')
    await flushPromises()

    const payload = update.mock.calls.at(-1)?.[1] as Record<string, unknown>
    expect(payload).not.toHaveProperty('sku')
    expect(payload.name).toBe('Товар')
  })

  it('отклоняет пустой SKU без запроса к API', async () => {
    const wrapper = await mountWith(linkedProduct)

    await wrapper.find('#sku').setValue('   ')
    await saveButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(update).not.toHaveBeenCalled()
  })

  it('показывает сообщение сервера при конфликте SKU', async () => {
    const wrapper = await mountWith(linkedProduct)

    update.mockRejectedValue({
      response: {
        status: 409,
        data: {
          code: 'catalog.product.sku_conflict',
          message: 'Товар с таким артикулом уже существует.',
        },
      },
    })

    const { toast } = await import('vue-sonner')

    await wrapper.find('#sku').setValue('TAKEN-SKU')
    await saveButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Товар с таким артикулом уже существует.')
  })
})

describe('ProductEditView: габариты упаковки', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeParams.value = { id: 'product-1' }
  })

  it('не отправляет нулевые габариты, если размеры не заполнены', async () => {
    // Ноль означает «неизвестно»: пустая форма не должна создавать каноническую строку 0×0×0.
    const wrapper = await mountWith({
      ...baseProduct,
      packingUnit: undefined,
      channelLinks: [],
    })
    update.mockResolvedValue(undefined)

    await saveButton(wrapper)!.trigger('click')
    await flushPromises()

    const payload = update.mock.calls.at(-1)?.[1] as Record<string, unknown>
    expect(payload).not.toHaveProperty('packingUnit')
  })

  it('не подставляет нули вместо незаполненного размера', async () => {
    const wrapper = await mountWith({
      ...baseProduct,
      packingUnit: undefined,
      channelLinks: [],
    })
    update.mockResolvedValue(undefined)

    await wrapper.find('input[placeholder="Длина"]').setValue('12')
    await wrapper.find('input[placeholder="Ширина"]').setValue('8')
    await saveButton(wrapper)!.trigger('click')
    await flushPromises()

    const payload = update.mock.calls.at(-1)?.[1] as { packingUnit?: Record<string, number> }
    // Неполный набор уходит как есть, и сервер отклоняет его вместо молчаливой записи нуля.
    expect(Number.isNaN(payload.packingUnit?.heightCm)).toBe(true)
    expect(payload.packingUnit?.lengthCm).toBe(12)
  })

  it('отправляет полный набор размеров', async () => {
    const wrapper = await mountWith({
      ...baseProduct,
      packingUnit: undefined,
      channelLinks: [],
    })
    update.mockResolvedValue(undefined)

    await wrapper.find('input[placeholder="Длина"]').setValue('12')
    await wrapper.find('input[placeholder="Ширина"]').setValue('8')
    await wrapper.find('input[placeholder="Высота"]').setValue('4')
    await saveButton(wrapper)!.trigger('click')
    await flushPromises()

    const payload = update.mock.calls.at(-1)?.[1] as { packingUnit?: Record<string, number> }
    expect(payload.packingUnit).toEqual({ lengthCm: 12, widthCm: 8, heightCm: 4 })
  })
})

describe('ProductEditView: маршрут', () => {
  beforeEach(() => vi.clearAllMocks())

  it('показывает «не найдено» без запроса, когда параметр id отсутствует', async () => {
    routeParams.value = {}

    const wrapper = factory()
    await flushPromises()

    expect(getById).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Товар не найден')
  })

  it('запрашивает товар по параметру маршрута', async () => {
    routeParams.value = { id: 'product-42' }
    getById.mockResolvedValue({ ...baseProduct, id: 'product-42', channelLinks: [] })

    const wrapper = factory()
    await flushPromises()

    expect(getById).toHaveBeenCalledWith('product-42')
    wrapper.unmount()
  })
})
