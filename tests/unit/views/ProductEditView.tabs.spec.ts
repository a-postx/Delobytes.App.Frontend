import { computed, ref } from 'vue'
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

const routeQuery = ref<Record<string, string>>({})
const routerReplace = vi.fn()
const routerPush = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'product-1' }, query: routeQuery.value }),
  useRouter: () => ({ push: routerPush, replace: routerReplace }),
  onBeforeRouteLeave: vi.fn(),
}))

vi.mock('vue-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { catalogProductsApi } from '@/services/api'
import ProductEditView from '@/views/ProductEditView.vue'

const getById = catalogProductsApi.getById as ReturnType<typeof vi.fn>

const productWithChannels: GetProductResponse = {
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
  channelLinks: [
    {
      channelId: 'channel-wb',
      channelName: 'Wildberries',
      channelCode: 'wildberries',
      externalProductId: '123456789',
      isActive: true,
    },
  ],
}

const bomEditorMounts = vi.fn()

// attachTo: document.body реально монтирует разметку в документ; без явного unmount
// телепортированные диалоги накапливаются между тестами.
const mountedWrappers: VueWrapper[] = []

const factory = (): VueWrapper => {
  const wrapper = mount(ProductEditView, {
    attachTo: document.body,
    global: {
      stubs: {
        ProductPhotoGallery: true,
        ProductChannelSummaryRow: {
          props: ['link'],
          template: '<div class="product-channel-summary-row">{{ link.externalProductId }}</div>',
        },
        ProductChannelBadges: true,
        ProductBomEditor: {
          props: ['productId'],
          mounted() {
            bomEditorMounts()
          },
          template: '<div class="product-bom-editor">bom</div>',
        },
        CopyButton: true,
        Spinner: true,
        Skeleton: true,
      },
    },
  }) as VueWrapper

  mountedWrappers.push(wrapper)
  return wrapper
}

const mountWith = async (product: GetProductResponse): Promise<VueWrapper> => {
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

const clickBodyButton = async (label: string): Promise<void> => {
  const button = Array.from(document.body.querySelectorAll('button'))
    .find(item => item.textContent?.trim() === label)
  if (!button) {
    throw new Error(`Кнопка «${label}» не найдена`)
  }
  button.dispatchEvent(new Event('click', { bubbles: true }))
  await flushPromises()
}

afterEach(() => {
  mountedWrappers.forEach(wrapper => wrapper.unmount())
  mountedWrappers.length = 0
})

describe('ProductEditView: вкладки', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeQuery.value = {}
    bomEditorMounts.mockClear()
  })

  it('открывает «Основные данные» по умолчанию', async () => {
    const wrapper = await mountWith(productWithChannels)

    expect(wrapper.find('#name').exists()).toBe(true)
    expect(tabByName(wrapper, 'Основные данные').attributes('data-state')).toBe('active')
  })

  it('открывает вкладку из query-параметра', async () => {
    routeQuery.value = { tab: 'channels' }
    const wrapper = await mountWith(productWithChannels)

    expect(wrapper.find('.product-channel-summary-row').exists()).toBe(true)
    expect(tabByName(wrapper, 'Каналы продаж').attributes('data-state')).toBe('active')
  })

  it('игнорирует неизвестное значение query и открывает «Основные данные»', async () => {
    routeQuery.value = { tab: 'unknown' }
    const wrapper = await mountWith(productWithChannels)

    expect(tabByName(wrapper, 'Основные данные').attributes('data-state')).toBe('active')
  })

  it('переключает вкладку и пишет её в query', async () => {
    const wrapper = await mountWith(productWithChannels)

    await tabByName(wrapper, 'Каналы продаж').trigger('mousedown')
    await flushPromises()

    expect(tabByName(wrapper, 'Каналы продаж').attributes('data-state')).toBe('active')
    expect(routerReplace).toHaveBeenCalledWith({ query: { tab: 'channels' } })
  })

  it('показывает счётчик каналов только при их наличии', async () => {
    const withChannels = await mountWith(productWithChannels)
    expect(tabByName(withChannels, 'Каналы продаж').text()).toContain('1')

    const withoutChannels = await mountWith({ ...productWithChannels, channelLinks: [] })
    expect(tabByName(withoutChannels, 'Каналы продаж').text()).not.toContain('1')
  })

  it('не монтирует редактор состава, пока не открыта «Себестоимость»', async () => {
    const wrapper = await mountWith(productWithChannels)
    expect(bomEditorMounts).not.toHaveBeenCalled()

    await tabByName(wrapper, 'Себестоимость').trigger('mousedown')
    await flushPromises()

    expect(wrapper.find('.product-bom-editor').exists()).toBe(true)
    expect(bomEditorMounts).toHaveBeenCalledTimes(1)
  })

  it('спрашивает подтверждение при уходе из «Основных данных» с несохранёнными правками', async () => {
    const wrapper = await mountWith(productWithChannels)

    await wrapper.find('#name').setValue('Новое название')
    await tabByName(wrapper, 'Себестоимость').trigger('mousedown')
    await flushPromises()

    // Вкладка не сменилась, показан вопрос. Диалог телепортирован в document.body.
    expect(tabByName(wrapper, 'Основные данные').attributes('data-state')).toBe('active')
    expect(document.body.querySelector('[role="alertdialog"]')).not.toBeNull()

    await clickBodyButton('Перейти')

    expect(tabByName(wrapper, 'Себестоимость').attributes('data-state')).toBe('active')
    expect(wrapper.find('.product-bom-editor').exists()).toBe(true)
  })

  it('остаётся на вкладке, если переход отменён', async () => {
    const wrapper = await mountWith(productWithChannels)

    await wrapper.find('#name').setValue('Новое название')
    await tabByName(wrapper, 'Себестоимость').trigger('mousedown')
    await flushPromises()

    await clickBodyButton('Остаться')

    expect(tabByName(wrapper, 'Основные данные').attributes('data-state')).toBe('active')
    expect(bomEditorMounts).not.toHaveBeenCalled()
  })

  it('переключает вкладку без вопроса, если правок нет', async () => {
    const wrapper = await mountWith(productWithChannels)

    await tabByName(wrapper, 'Себестоимость').trigger('mousedown')
    await flushPromises()

    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull()
    expect(tabByName(wrapper, 'Себестоимость').attributes('data-state')).toBe('active')
  })
})

describe('ProductEditView: бар сохранения', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeQuery.value = {}
  })

  it('не показывает бар, пока правок нет', async () => {
    await mountWith(productWithChannels)

    expect(document.body.querySelector('[role="status"]')).toBeNull()
  })

  it('сохраняет бар видимым при переходе на другую вкладку', async () => {
    const wrapper = await mountWith(productWithChannels)

    await wrapper.find('#name').setValue('Новое название')
    await flushPromises()

    const bar = document.body.querySelector('[role="status"]')
    expect(bar).not.toBeNull()
    expect(bar!.textContent).toContain('Есть несохранённые изменения')

    await tabByName(wrapper, 'Каналы продаж').trigger('mousedown')
    await flushPromises()

    // Панель «Основных данных» скрыта, но бар живёт на уровне страницы и остаётся виден.
    expect(document.body.querySelector('[role="status"]')).not.toBeNull()
  })

  it('сбрасывает правки по кнопке «Отмена» в баре', async () => {
    const wrapper = await mountWith(productWithChannels)

    await wrapper.find('#name').setValue('Новое название')
    await flushPromises()

    await clickBodyButton('Отмена')

    expect((wrapper.find('#name').element as HTMLInputElement).value).toBe('Товар')
    expect(document.body.querySelector('[role="status"]')).toBeNull()
  })
})

describe('ProductEditView: пустое состояние каналов', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeQuery.value = { tab: 'channels' }
  })

  it('объясняет отсутствие каналов и ведёт в каналы продаж', async () => {
    const wrapper = await mountWith({ ...productWithChannels, channelLinks: [] })

    expect(wrapper.text()).toContain('Товар не привязан ни к одному каналу')

    const goButton = wrapper.findAll('button')
      .find(button => button.text().includes('Перейти к каналам продаж'))
    await goButton!.trigger('click')

    expect(routerPush).toHaveBeenCalledWith({ name: 'sales-channels' })
  })
})
