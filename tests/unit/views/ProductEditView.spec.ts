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
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { productId: 'product-1' } }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { catalogProductsApi } from '@/services/api'
import ProductEditView from '@/views/ProductEditView.vue'

const getById = catalogProductsApi.getById as ReturnType<typeof vi.fn>

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

const factory = () => mount(ProductEditView, {
  global: {
    stubs: {
      ProductPhotoGallery: true,
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

describe('ProductEditView channel links', () => {
  beforeEach(() => vi.clearAllMocks())

  it('disables imported product fields and hides the save button', async () => {
    getById.mockResolvedValue({
      ...baseProduct,
      channelLinks: [{
        channelId: 'channel-wb',
        channelName: 'Wildberries',
        channelCode: 'wildberries',
        externalProductId: '123456789',
        isActive: true,
      }],
    })

    const wrapper = factory()
    await flushPromises()

    expect((wrapper.find('#name').element as HTMLInputElement).disabled).toBe(true)
    expect((wrapper.find('#description').element as HTMLTextAreaElement).disabled).toBe(true)
    expect((wrapper.find('input[placeholder="Длина"]').element as HTMLInputElement).disabled).toBe(true)
    expect(wrapper.text()).toContain('Данные получены из Wildberries')
    expect(wrapper.text()).not.toContain('Сохранить')
  })

  it('keeps an unlinked product editable', async () => {
    getById.mockResolvedValue({ ...baseProduct, channelLinks: [] })

    const wrapper = factory()
    await flushPromises()

    expect((wrapper.find('#name').element as HTMLInputElement).disabled).toBe(false)
    expect((wrapper.find('#description').element as HTMLTextAreaElement).disabled).toBe(false)
    expect((wrapper.find('input[placeholder="Длина"]').element as HTMLInputElement).disabled).toBe(false)
    expect(wrapper.text()).toContain('Сохранить')
  })
})
