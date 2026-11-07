import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('@/services/api', () => ({
  workRatesApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addVersion: vi.fn(),
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

import { workRatesApi } from '@/services/api'
import AppErrorBoundary from '@/components/feedback/AppErrorBoundary.vue'
import WorkRatesView from '@/views/WorkRatesView.vue'

const getAll = workRatesApi.getAll as ReturnType<typeof vi.fn>

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
 * До исправления R1.1/R5.2 необработанный reject из `onMounted` на этой странице уходил
 * в errorCaptured и подменял весь раздел на полноэкранную заглушку. Монтирование внутри
 * настоящего AppErrorBoundary воспроизводит этот путь буквально, а не через мок.
 */
const mountInsideBoundary = () =>
  mount(AppErrorBoundary, {
    global: { stubs: dialogStubs },
    slots: { default: () => h(WorkRatesView) },
  })

describe('WorkRatesView — деградация при недоступном backend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('не схлопывается в AppErrorBoundary при отклонённом запросе', async () => {
    getAll.mockRejectedValue({ message: 'Network Error' })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Не удалось отобразить раздел')
    expect(wrapper.text()).toContain('Ставки работ')
  })

  it('показывает встроенный блок ошибки с retry вместо тихого отказа', async () => {
    getAll.mockRejectedValue({ message: 'Network Error' })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    expect(wrapper.text()).toContain('Нет связи с сервером')

    const retryButton = wrapper.findAll('button').find(b => b.text().trim() === 'Повторить')
    expect(retryButton).toBeTruthy()
  })

  it('восстанавливается после повторного запроса без перезагрузки страницы', async () => {
    getAll.mockRejectedValueOnce({ message: 'Network Error' })
    getAll.mockResolvedValueOnce({
      items: [{ id: '1', name: 'Сборка', dailyWage: 2000, isActive: true, createdAt: '2024-01-01T00:00:00Z' }],
    })

    const wrapper = mountInsideBoundary()
    await flushPromises()

    const retryButton = wrapper.findAll('button').find(b => b.text().trim() === 'Повторить')
    await retryButton!.trigger('click')
    await flushPromises()

    expect(getAll).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Сборка')
    expect(wrapper.text()).not.toContain('Нет связи с сервером')
  })
})
