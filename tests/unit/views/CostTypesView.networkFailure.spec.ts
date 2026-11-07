import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('@/services/api', () => ({
  costTypesApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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

import { costTypesApi } from '@/services/api'
import AppErrorBoundary from '@/components/feedback/AppErrorBoundary.vue'
import CostTypesView from '@/views/CostTypesView.vue'

const getAll = costTypesApi.getAll as ReturnType<typeof vi.fn>

const PassthroughStub = defineComponent({ template: '<div><slot /></div>' })
const DialogRootStub = defineComponent({
  props: { open: Boolean },
  template: '<div v-if="open"><slot /></div>',
})

const dialogStubs = {
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
}

/**
 * Монтирует страницу внутри AppErrorBoundary — так же, как в реальном приложении
 * (router-view оборачивается в границу ошибок). Если дефект R5/R6 вернётся, граница
 * перехватит необработанный reject из onMounted и подменит страницу на полноэкранную
 * ошибку, что тест немедленно обнаружит.
 */
const mountInsideBoundary = () =>
  mount(AppErrorBoundary, {
    global: { stubs: dialogStubs },
    slots: { default: () => h(CostTypesView) },
  })

describe('CostTypesView — деградация при недоступном backend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('не схлопывается в AppErrorBoundary при отклонённом запросе', async () => {
    getAll.mockRejectedValue({ message: 'Network Error' })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Не удалось отобразить раздел')
    expect(wrapper.text()).toContain('Типы расходов')
  })

  it('показывает встроенный блок ошибки с текстом про отсутствие связи для сетевого сбоя', async () => {
    getAll.mockRejectedValue({ message: 'Network Error' })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).toContain('Нет связи с сервером')
    expect(wrapper.text()).not.toContain('500')
  })

  it('различает сетевой сбой и ответ 500 по тексту', async () => {
    getAll.mockRejectedValue({ response: { status: 500, data: { message: 'Внутренняя ошибка' } } })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).toContain('Сервер вернул ошибку')
    expect(wrapper.text()).not.toContain('Нет связи с сервером')
  })

  it('повторяет запрос при нажатии кнопки "Повторить" и восстанавливается без перезагрузки страницы', async () => {
    getAll.mockRejectedValueOnce({ message: 'Network Error' })
    getAll.mockResolvedValueOnce({ items: [{ id: '1', name: 'Логистика', isActive: true, createdAt: '2024-01-01T00:00:00Z' }] })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).toContain('Нет связи с сервером')

    const retryButton = wrapper.findAll('button').find(b => b.text() === 'Повторить')
    expect(retryButton).toBeTruthy()

    await retryButton!.trigger('click')
    await flushPromises()

    expect(getAll).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Логистика')
    expect(wrapper.text()).not.toContain('Нет связи с сервером')
  })

  it('показывает пустой каталог, только когда ошибки действительно нет', async () => {
    getAll.mockResolvedValue({ items: [] })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).toContain('Типы расходов не добавлены')
    expect(wrapper.text()).not.toContain('Нет связи с сервером')
  })
})
