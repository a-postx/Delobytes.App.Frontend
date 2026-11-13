import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
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
  useCurrentUser: () => ({ currentUser: ref({ role: 'Administrator' }), canWrite: true }),
}))

import { integrationsApi } from '@/services/api'
import ProductImportsView from '@/views/ProductImportsView.vue'
import { PRODUCTS_IMPORT_JOB_TYPE, OZON_PRODUCTS_IMPORT_JOB_TYPE } from '@/types'

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
 * Экран запрашивает оба типа импорта параллельно, поэтому мок отвечает по типу:
 * Wildberries отдаёт задачу, Ozon — пустую историю.
 */
const respondWildberries = (job: unknown) => ({
  jobs: job ? [job] : [],
  totalCount: job ? 1 : 0,
  page: 1,
  pageSize: 50,
})

const emptyOzon = () => respondWildberries(null)

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
    getProductImports.mockImplementation((type: string) =>
      Promise.resolve(type === PRODUCTS_IMPORT_JOB_TYPE ? respondWildberries(runningJob) : emptyOzon()),
    )
  })

  it('держит таблицу в DOM в момент запроса обновления статуса', async () => {
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

    releaseRefresh(respondWildberries(finishedJob))
    await flushPromises()

    expect(wrapper.text()).toContain('Успешно')
    wrapper.unmount()
  })

  it('не вращает иконку Обновить во время фонового опроса', async () => {
    const wrapper = mount(ProductImportsView, {
      global: { stubs: { RouterLink: true } },
    })
    await flushPromises()

    const refreshButton = (): ReturnType<typeof wrapper.find> =>
      wrapper.find('button[aria-label="Обновить"]')

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

    releaseRefresh(respondWildberries(finishedJob))
    await flushPromises()

    expect(refreshButton().html()).not.toContain('animate-spin')
    wrapper.unmount()
  })

  it('оставляет таблицу при сбое фонового обновления', async () => {
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

  it('объединяет историю обоих типов и подписывает маркетплейс по типу задания', async () => {
    const ozonJob = {
      ...finishedJob,
      id: 'job-2',
      type: OZON_PRODUCTS_IMPORT_JOB_TYPE,
      connectionId: 'conn-deleted',
      createdAt: '2026-01-02T10:00:00Z',
    }

    getProductImports.mockImplementation((type: string) =>
      Promise.resolve(
        type === PRODUCTS_IMPORT_JOB_TYPE ? respondWildberries(finishedJob) : respondWildberries(ozonJob),
      ),
    )

    const wrapper = mount(ProductImportsView, {
      global: { stubs: { RouterLink: true } },
    })
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Wildberries')
    expect(text).toContain('Ozon')

    // Ozon-задача старше по createdAt и идёт первой; подключение уже удалено.
    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(2)
    expect(rows[0].text()).toContain('Ozon')
    expect(rows[0].text()).toContain('Подключение удалено')
    expect(rows[1].text()).toContain('Wildberries')
    wrapper.unmount()
  })
})
