import { computed } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
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
  extractErrorCode: () => undefined,
  extractErrorMessage: (error: any, fallback: string): string =>
    error?.response?.data?.message || fallback,
}))

vi.mock('@/composables/useApiFailureCopy', () => ({
  describeFailure: () => ({ title: 'err', description: 'err' }),
}))

const routeQuery = { value: {} as Record<string, string> }

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'product-1' }, query: routeQuery.value }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  onBeforeRouteLeave: vi.fn(),
}))

vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))

import { catalogProductsApi } from '@/services/api'
import ProductEditView from '@/views/ProductEditView.vue'

const getById = catalogProductsApi.getById as ReturnType<typeof vi.fn>

const product: GetProductResponse = {
  id: 'product-1',
  code: 'P-000001',
  sku: 'SKU-001',
  name: 'Товар',
  description: 'Описание',
  status: ProductStatus.Active,
  createdAt: '2024-01-01T00:00:00Z',
  creationSource: 'Manual',
  barcodes: [],
  packingUnit: { lengthCm: 10, widthCm: 20, heightCm: 30, weightKg: 1 },
  photos: [],
  channelLinks: [],
}

const mountedWrappers: VueWrapper[] = []

const factory = (): VueWrapper => {
  const wrapper = mount(ProductEditView, {
    attachTo: document.body,
    global: {
      stubs: {
        ProductPhotoGallery: true,
        ProductChannelSummaryRow: true,
        ProductChannelBadges: true,
        ProductBomEditor: { template: '<div class="product-bom-editor">bom</div>' },
        CopyButton: true,
        Spinner: true,
        Skeleton: true,
      },
    },
  }) as VueWrapper

  mountedWrappers.push(wrapper)
  return wrapper
}

const mountWith = async (): Promise<VueWrapper> => {
  getById.mockResolvedValue(product)
  const wrapper = factory()
  await flushPromises()
  return wrapper
}

const tabByName = (wrapper: VueWrapper, name: string) => {
  const tab = wrapper.findAll('[role="tab"]').find(item => item.text().includes(name))
  if (!tab) {
    throw new Error(`Вкладка «${name}» не найдена`)
  }
  return tab
}

afterEach(() => {
  mountedWrappers.forEach(wrapper => wrapper.unmount())
  mountedWrappers.length = 0
})

describe('ProductEditView: черновик переживает смену вкладок', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeQuery.value = {}
  })

  it('переключает вкладку без диалога и сохраняет введённое', async () => {
    const wrapper = await mountWith()

    await wrapper.find('#name').setValue('Новое название')
    await flushPromises()

    await tabByName(wrapper, 'Себестоимость').trigger('mousedown')
    await flushPromises()

    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull()

    await tabByName(wrapper, 'Основные данные').trigger('mousedown')
    await flushPromises()

    expect((wrapper.find('#name').element as HTMLInputElement).value).toBe('Новое название')
  })
})
