import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CurrentUser } from '@/types'

// meApi must be mocked before importing useCurrentUser,
// because useCurrentUser holds module-level reactive refs that are
// initialized once on first import — reset them via clearCurrentUser().
vi.mock('@/services/api/endpoints/me', () => ({
  meApi: {
    getCurrentUser: vi.fn(),
  },
}))

// Import after mock registration
const { meApi } = await import('@/services/api/endpoints/me')
const { useCurrentUser } = await import('@/composables/useCurrentUser')

const mockedGetCurrentUser = meApi.getCurrentUser as ReturnType<typeof vi.fn>

const MOCK_USER: CurrentUser = {
  userId: 'user-abc',
  displayName: 'Jane Doe',
  email: 'jane@example.com',
  tenantId: 'tenant-xyz',
  tenantName: 'Acme Corp',
}

describe('useCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset shared state between tests
    useCurrentUser().clearCurrentUser()
  })

  it('starts with null currentUser and no error', () => {
    const { currentUser, loading, error } = useCurrentUser()

    expect(currentUser.value).toBeNull()
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('fetchCurrentUser sets currentUser on success', async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(MOCK_USER)

    const { currentUser, loading, error, fetchCurrentUser } = useCurrentUser()

    await fetchCurrentUser()

    expect(currentUser.value).toEqual(MOCK_USER)
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('fetchCurrentUser sets error and clears currentUser on failure', async () => {
    const apiError = { response: { data: { message: 'Unauthorized' } } }
    mockedGetCurrentUser.mockRejectedValueOnce(apiError)

    const { currentUser, error, fetchCurrentUser } = useCurrentUser()

    await fetchCurrentUser()

    expect(currentUser.value).toBeNull()
    expect(error.value).toBe('Unauthorized')
  })

  it('fetchCurrentUser uses fallback error message when response has no message', async () => {
    mockedGetCurrentUser.mockRejectedValueOnce(new Error('Network Error'))

    const { error, fetchCurrentUser } = useCurrentUser()

    await fetchCurrentUser()

    expect(error.value).toBe('Не удалось загрузить данные пользователя.')
  })

  it('loading is true while fetch is in progress', async () => {
    let resolvePromise!: (value: CurrentUser) => void
    const pending = new Promise<CurrentUser>((res) => { resolvePromise = res })
    mockedGetCurrentUser.mockReturnValueOnce(pending)

    const { loading, fetchCurrentUser } = useCurrentUser()

    const fetchPromise = fetchCurrentUser()
    expect(loading.value).toBe(true)

    resolvePromise(MOCK_USER)
    await fetchPromise

    expect(loading.value).toBe(false)
  })

  it('clearCurrentUser resets state', async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(MOCK_USER)

    const { currentUser, error, fetchCurrentUser, clearCurrentUser } = useCurrentUser()

    await fetchCurrentUser()
    expect(currentUser.value).toEqual(MOCK_USER)

    clearCurrentUser()

    expect(currentUser.value).toBeNull()
    expect(error.value).toBeNull()
  })

  it('shares state across multiple useCurrentUser calls (singleton refs)', async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(MOCK_USER)

    const instance1 = useCurrentUser()
    await instance1.fetchCurrentUser()

    const instance2 = useCurrentUser()
    expect(instance2.currentUser.value).toEqual(MOCK_USER)
  })
})
