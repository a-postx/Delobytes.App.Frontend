import { computed } from 'vue'
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
  extractErrorMessage: (error: any, fallback: string): string =>
    error?.response?.data?.message || fallback,
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { productId: 'product-1' } }),
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
    isActive: true,
  }],
}

const factory = () => mount(ProductEditView, {
  global: {
    stubs: {
      ProductPhotoGallery: true,
      ProductBomEditor: true,
      ProductChannelBadges: {
        props: ['links'],
        template: '<div class="product-channel-badges">{{ links.length }}</div>',
      },
      Button: {
        props: ['disabled'],
        template: '<button :disabled="disabled"><slot /></button>',
      },
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

describe('ProductEditView SKU editing', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps the SKU input enabled for a marketplace-linked product', async () => {
    // The whole point of the change: the SKU is not part of what the import rewrites after the
    // product is created, so its field must not be locked together with the imported ones.
    const wrapper = await mountWith(linkedProduct)

    const sku = wrapper.find('#sku').element as HTMLInputElement
    expect(sku.disabled).toBe(false)
  })

  it('keeps the imported fields disabled and shows the save button', async () => {
    const wrapper = await mountWith(linkedProduct)

    expect((wrapper.find('#name').element as HTMLInputElement).disabled).toBe(true)
    expect((wrapper.find('#description').element as HTMLTextAreaElement).disabled).toBe(true)
    expect((wrapper.find('input[placeholder="Длина"]').element as HTMLInputElement).disabled).toBe(true)

    expect(wrapper.text()).toContain('Данные получены из Wildberries')
    expect(saveButton(wrapper)).toBeTruthy()
  })

  it('sends only the SKU when a linked product is saved', async () => {
    // Sending Name/Description/Barcodes/PackingUnit here would write the values the form read
    // back from the API over the same fields the import owns.
    const wrapper = await mountWith(linkedProduct)
    update.mockResolvedValue(undefined)

    await wrapper.find('#sku').setValue('NEW-INTERNAL-SKU')
    await saveButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(update).toHaveBeenCalledWith('product-1', { sku: 'NEW-INTERNAL-SKU' })
  })

  it('rejects an empty SKU without calling the API', async () => {
    const wrapper = await mountWith(linkedProduct)

    await wrapper.find('#sku').setValue('   ')
    await saveButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(update).not.toHaveBeenCalled()
  })

  it('omits the SKU from the payload when it was not changed', async () => {
    // A save with no edits must not bump the SKU, and with it UpdatedAt.
    const wrapper = await mountWith(linkedProduct)
    update.mockResolvedValue(undefined)

    await saveButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(update).toHaveBeenCalledWith('product-1', {})
  })

  it('surfaces the server message when the SKU is already taken', async () => {
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

describe('ProductEditView unlinked product', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps every field editable', async () => {
    const wrapper = await mountWith({ ...baseProduct, channelLinks: [] })

    expect((wrapper.find('#sku').element as HTMLInputElement).disabled).toBe(false)
    expect((wrapper.find('#name').element as HTMLInputElement).disabled).toBe(false)
    expect((wrapper.find('#description').element as HTMLTextAreaElement).disabled).toBe(false)
    expect((wrapper.find('input[placeholder="Длина"]').element as HTMLInputElement).disabled).toBe(false)
    expect(saveButton(wrapper)).toBeTruthy()
  })

  it('sends the full payload including the SKU', async () => {
    const wrapper = await mountWith({ ...baseProduct, channelLinks: [] })
    update.mockResolvedValue(undefined)

    await wrapper.find('#sku').setValue('SKU-002')
    await saveButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(update).toHaveBeenCalledWith('product-1', {
      sku: 'SKU-002',
      name: 'Товар',
      description: 'Описание',
      barcodes: [{ value: '4600000000001', type: 'wildberries', isDefault: true }],
      packingUnit: { lengthCm: 10, widthCm: 20, heightCm: 30, weightKg: 1 },
    })
  })
})