import { describe, it, expect, vi, beforeEach } from 'vitest'
import { channelParametersApi } from '@/services/api'
import { axiosInstance } from '@/services/api/client'
import type { ChannelParameterSetItem } from '@/services/api'

vi.mock('@/services/api/client', () => ({
  axiosInstance: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const get = axiosInstance.get as unknown as ReturnType<typeof vi.fn>
const post = axiosInstance.post as unknown as ReturnType<typeof vi.fn>

const version: ChannelParameterSetItem = {
  id: 'ps-1',
  channelId: 'channel-1',
  commissionPercent: 0.15,
  acquiringPercent: 0.02,
  sppPercent: 0.05,
  sppEnabled: true,
  validFrom: '2025-01-01',
  createdAt: '2025-01-01T00:00:00Z',
}

describe('channelParametersApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('запрашивает все версии параметров канала', async () => {
    get.mockResolvedValue({ data: { items: [version] } })

    const result = await channelParametersApi.getAll('channel-1')

    expect(get).toHaveBeenCalledWith('/api/catalogs/channels/channel-1/parameter-sets')
    expect(result.items).toEqual([version])
  })

  it('возвращает found: true для существующей активной версии', async () => {
    get.mockResolvedValue({ data: { ...version, found: true } })

    const result = await channelParametersApi.getActive('channel-1')

    expect(get).toHaveBeenCalledWith('/api/catalogs/channels/channel-1/parameter-sets/active')
    expect(result.found).toBe(true)
    expect(result.commissionPercent).toBe(0.15)
  })

  it('превращает 404 в found: false, не выбрасывая ошибку', async () => {
    get.mockRejectedValue({ response: { status: 404 } })

    const result = await channelParametersApi.getActive('channel-1')

    expect(result.found).toBe(false)
    expect(result.channelId).toBe('channel-1')
  })

  it('пробрасывает ошибки, отличные от 404', async () => {
    get.mockRejectedValue({ response: { status: 500 } })

    await expect(channelParametersApi.getActive('channel-1')).rejects.toMatchObject({
      response: { status: 500 },
    })
  })

  it('создаёт новую версию параметров', async () => {
    post.mockResolvedValue({ data: { id: 'ps-2', channelFound: true } })

    const result = await channelParametersApi.create('channel-1', {
      commissionPercent: 0.18,
      acquiringPercent: 0.02,
      sppPercent: 0.05,
      sppEnabled: true,
      validFrom: '2025-03-01',
    })

    expect(post).toHaveBeenCalledWith('/api/catalogs/channels/channel-1/parameter-sets', {
      commissionPercent: 0.18,
      acquiringPercent: 0.02,
      sppPercent: 0.05,
      sppEnabled: true,
      validFrom: '2025-03-01',
    })
    expect(result.id).toBe('ps-2')
  })
})
