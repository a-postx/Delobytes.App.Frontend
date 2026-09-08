import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api/client', () => ({
  axiosInstance: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

import { axiosInstance } from '@/services/api/client'
import { integrationsApi } from '@/services/api/endpoints/integrations'
import type { AvailableChannel, Connection, CreateConnectionPayload } from '@/types'

const ax = axiosInstance as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

const stubChannel: AvailableChannel = {
  code: 'ozon',
  displayName: 'Ozon',
  description: 'Маркетплейс',
  apiVersion: 'v3',
  isConnected: false,
  connectionId: null,
  maskedApiKey: null,
  customerName: null,
  legalName: null,
  inn: null,
}

const stubConnection: Connection = {
  id: 'conn-1',
  channelCode: 'ozon',
  channelDisplayName: 'Ozon',
  isActive: true,
  lastSyncAt: null,
  createdAt: '2024-01-01T00:00:00Z',
}

describe('integrationsApi.getAvailableChannels', () => {
  beforeEach(() => vi.clearAllMocks())

  it('запрашивает /api/integrations/channels и возвращает items', async () => {
    ax.get.mockResolvedValue({ data: { items: [stubChannel] } })

    const result = await integrationsApi.getAvailableChannels()

    expect(ax.get).toHaveBeenCalledWith('/api/integrations/channels')
    expect(result).toEqual([stubChannel])
  })
})

describe('integrationsApi.getConnections', () => {
  beforeEach(() => vi.clearAllMocks())

  it('запрашивает /api/integrations/connections и возвращает items', async () => {
    ax.get.mockResolvedValue({ data: { items: [stubConnection] } })

    const result = await integrationsApi.getConnections()

    expect(ax.get).toHaveBeenCalledWith('/api/integrations/connections')
    expect(result).toEqual([stubConnection])
  })
})

describe('integrationsApi.createConnection', () => {
  beforeEach(() => vi.clearAllMocks())

  const payload: CreateConnectionPayload = {
    systemChannelTemplateCode: 'ozon',
    apiKey: 'test-api-key-1234',
  }

  it('возвращает CreateConnectionResult при успехе', async () => {
    const expected = { connectionId: 'c-1', channelId: 'ch-1' }
    ax.post.mockResolvedValue({ data: expected })

    const result = await integrationsApi.createConnection(payload)

    expect(ax.post).toHaveBeenCalledWith('/api/integrations/connections', payload)
    expect(result).toEqual(expected)
  })

  it('пробрасывает { message } при статусе 400', async () => {
    ax.post.mockRejectedValue({
      response: { status: 400, data: { message: 'Невалидный ключ' } },
    })

    await expect(integrationsApi.createConnection(payload)).rejects.toEqual({
      message: 'Невалидный ключ',
    })
  })

  it('пробрасывает { message } при статусе 409', async () => {
    ax.post.mockRejectedValue({
      response: { status: 409, data: { message: 'Канал уже подключён' } },
    })

    await expect(integrationsApi.createConnection(payload)).rejects.toEqual({
      message: 'Канал уже подключён',
    })
  })

  it('прокидывает оригинальную ошибку при статусе 404', async () => {
    const error = { response: { status: 404, data: { message: 'Не найден' } } }
    ax.post.mockRejectedValue(error)

    await expect(integrationsApi.createConnection(payload)).rejects.toEqual(error)
  })

  it('прокидывает сетевую ошибку без response', async () => {
    const error = new Error('Network Error')
    ax.post.mockRejectedValue(error)

    await expect(integrationsApi.createConnection(payload)).rejects.toThrow('Network Error')
  })
})

describe('integrationsApi.deleteConnection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('вызывает DELETE с правильным id', async () => {
    ax.delete.mockResolvedValue({})

    await integrationsApi.deleteConnection('conn-42')

    expect(ax.delete).toHaveBeenCalledWith('/api/integrations/connections/conn-42')
  })
})