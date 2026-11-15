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

const job = (overrides: Record<string, unknown> = {}) => ({
  id: 'job-1',
  type: PRODUCTS_IMPORT_JOB_TYPE,
  connectionId: 'conn-1',
  status: 'Success',
  recordsCreated: 1,
  recordsUpdated: 0,
  recordsSkipped: 0,
  recordsFailed: 0,
  createdAt: '2026-01-01T10:00:00Z',
  startedAt: '2026-01-01T10:00:01Z',
  completedAt: '2026-01-01T10:05:00Z',
  error: null,
  ...overrides,
})

const responseFor = (jobs: unknown[]) => ({
  jobs,
  totalCount: jobs.length,
  page: 1,
  pageSize: 50,
})

const mountView = async (wildberriesJobs: unknown[], ozonJobs: unknown[]) => {
  getProductImports.mockImplementation((type: string) =>
    Promise.resolve(type === PRODUCTS_IMPORT_JOB_TYPE ? responseFor(wildberriesJobs) : responseFor(ozonJobs)),
  )

  const wrapper = mount(ProductImportsView, {
    global: { stubs: { RouterLink: true } },
  })
  await flushPromises()
  return wrapper
}

describe('ProductImportsView: columns and channel badges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getConnections.mockResolvedValue([
      {
        id: 'conn-1',
        isActive: true,
        templateCode: 'wildberries',
        templateDisplayName: 'Wildberries',
      },
    ])
  })

  it('does not render the connection column', async () => {
    const wrapper = await mountView([job()], [])

    expect(wrapper.find('thead').text()).not.toContain('Подключение')
    expect(wrapper.find('tbody').text()).not.toContain('Подключение')
    wrapper.unmount()
  })

  it('colours a Wildberries job badge with the channel colour', async () => {
    const wrapper = await mountView([job()], [])

    const badge = wrapper.findAll('tbody span').find(node => node.text() === 'Wildberries')
    expect(badge).toBeTruthy()
    expect(badge!.classes()).toContain('bg-badge-wb')
    wrapper.unmount()
  })

  it('colours an Ozon job badge with the channel colour', async () => {
    const wrapper = await mountView([], [job({ id: 'job-2', type: OZON_PRODUCTS_IMPORT_JOB_TYPE })])

    const badge = wrapper.findAll('tbody span').find(node => node.text() === 'Ozon')
    expect(badge).toBeTruthy()
    expect(badge!.classes()).toContain('bg-badge-oz')
    wrapper.unmount()
  })

  it('keeps an unknown job type grey and shows the raw token', async () => {
    const wrapper = await mountView([job({ id: 'job-3', type: 'mystery-import' })], [])

    const badge = wrapper.findAll('tbody span').find(node => node.text() === 'mystery-import')
    expect(badge).toBeTruthy()
    expect(badge!.classes()).toContain('bg-secondary')
    expect(badge!.classes()).not.toContain('bg-badge-wb')
    wrapper.unmount()
  })
})
