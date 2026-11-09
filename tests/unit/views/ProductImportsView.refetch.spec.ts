import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/services/api', () => ({
  integrationsApi: {
    getProductImports: vi.fn(),
    getConnections: vi.fn(),
    createProductImport: vi.fn(),
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

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({ canWrite: true }),
}))

import { integrationsApi } from '@/services/api'
import ProductImportsView from '@/views/ProductImportsView.vue'

const getProductImports = integrationsApi.getProductImports as ReturnType<typeof vi.fn>
const getConnections = integrationsApi.getConnections as ReturnType<typeof vi.fn>

const connection = {
  id: 'conn-1',
  isActive: true,
  templateCode: 'wildberries',
  templateDisplayName: 'Wildberries',
}

const runningJob = {
  id: 'job-1',
  type: 'products-import',
  connectionId: 'conn-1',
  status: 'Running',
  recordsCreated: 0,
  recordsUpdated: 0,
  recordsSkipped: 0,
  recordsFailed: 0,
  createdAt: '2026-01-01T10:00:00Z',
  startedAt: '2026-01-01T10:00:01Z',
  completedAt: null,
  error: null,
}

const finishedJob = { ...runningJob, status: 'Success', completedAt: '2026-01-01T10:05:00Z' }

/**
 * Регрессия: фоновый опрос статуса не должен размонтировать таблицу задач.
 * До правки useAsyncResource поднимал общий loading на каждой итерации, и таблица
 * на время запроса подменялась скелетоном, а кнопка запуска блокировалась.
 */
describe('ProductImportsView: фоновый опрос не скрывает таблицу', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    getConnections.mockResolvedValue([connection])
  })

  it('держит таблицу в DOM в момент запроса обновления статуса', async () => {
    getProductImports.mockResolvedValue({
      jobs: [runningJob],
      totalCount: 1,
      page: 1,
      pageSize: 50,
    })

    const wrapper = mount(ProductImportsView, {
      global: { stubs: { RouterLink: true } },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Выполняется')

    // Ответ на следующую итерацию опроса задерживаем — это и есть окно мерцания.
    let releaseRefresh: (value: unknown) => void = () => {}
    getProductImports.mockImplementationOnce(
      () => new Promise(resolve => { releaseRefresh = resolve }),
    )

    // Интервал опроса 2000 мс; сдвигаем время, чтобы итерация стартовала.
    await vi.advanceTimersByTimeAsync(2100)
    await flushPromises()

    expect(wrapper.text()).toContain('Выполняется')
    // Скелетон не подменил таблицу.
    expect(wrapper.html()).toContain('Завершена')

    releaseRefresh({ jobs: [finishedJob], totalCount: 1, page: 1, pageSize: 50 })
    await flushPromises()

    expect(wrapper.text()).toContain('Успешно')
    wrapper.unmount()
  })

  it('не вращает иконку Обновить во время фонового опроса', async () => {
    getProductImports.mockResolvedValue({
      jobs: [runningJob],
      totalCount: 1,
      page: 1,
      pageSize: 50,
    })

    const wrapper = mount(ProductImportsView, {
      global: { stubs: { RouterLink: true } },
    })
    await flushPromises()

    const refreshButton = (): ReturnType<typeof wrapper.find> =>
      wrapper.find('button[aria-label="\u041e\u0431\u043d\u043e\u0432\u0438\u0442\u044c"]')

    expect(refreshButton().html()).not.toContain('animate-spin')

    // Задерживаем ответ, чтобы застать опрос в полёте.
    let releaseRefresh: (value: unknown) => void = () => {}
    getProductImports.mockImplementationOnce(
      () => new Promise(resolve => { releaseRefresh = resolve }),
    )

    await vi.advanceTimersByTimeAsync(2100)
    await flushPromises()

    // Иконка не должна реагировать на фоновые запросы: иначе она
    // начинает и бросает вращение каждые 2 секунды.
    expect(refreshButton().html()).not.toContain('animate-spin')

    releaseRefresh({ jobs: [finishedJob], totalCount: 1, page: 1, pageSize: 50 })
    await flushPromises()

    expect(refreshButton().html()).not.toContain('animate-spin')
    wrapper.unmount()
  })

  it('оставляет таблицу при сбое фонового обновления', async () => {
    getProductImports.mockResolvedValue({
      jobs: [runningJob],
      totalCount: 1,
      page: 1,
      pageSize: 50,
    })

    const wrapper = mount(ProductImportsView, {
      global: { stubs: { RouterLink: true } },
    })
    await flushPromises()

    getProductImports.mockRejectedValue({ response: { status: 500, data: { message: 'Сбой' } } })

    await vi.advanceTimersByTimeAsync(2100)
    await flushPromises()

    // Данные предыдущего успеха остались, полноэкранной ошибки нет.
    expect(wrapper.text()).toContain('Выполняется')
    expect(wrapper.text()).not.toContain('Не удалось загрузить задачи импорта')
    wrapper.unmount()
  })

  it('показывает блок ошибки, если первая загрузка упала', async () => {
    getProductImports.mockRejectedValue({
      response: { status: 500, data: { message: 'Сбой' } },
    })

    const wrapper = mount(ProductImportsView, {
      global: { stubs: { RouterLink: true } },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Сервер вернул ошибку')
    wrapper.unmount()
  })
})
