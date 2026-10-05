import { describe, it, expect, beforeEach } from 'vitest'
import {
  PENDING_INVITATION_KEY,
  readPendingInvitationToken,
} from '@/utils/pendingInvitation'

describe('pendingInvitation: токен приглашения, отложенный до входа', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('ключ совпадает с тем, что кладёт страница принятия приглашения', () => {
    expect(PENDING_INVITATION_KEY).toBe('pendingInvitationToken')
  })

  it('возвращает null, когда приглашения нет', () => {
    expect(readPendingInvitationToken()).toBeNull()
  })

  it('возвращает сохранённый токен', () => {
    sessionStorage.setItem(PENDING_INVITATION_KEY, 'invite-token-1')

    expect(readPendingInvitationToken()).toBe('invite-token-1')
  })

  it('по умолчанию забирает токен: повторный вызов возвращает null', () => {
    sessionStorage.setItem(PENDING_INVITATION_KEY, 'invite-token-1')

    expect(readPendingInvitationToken()).toBe('invite-token-1')
    expect(readPendingInvitationToken()).toBeNull()
    expect(sessionStorage.getItem(PENDING_INVITATION_KEY)).toBeNull()
  })

  it('с consume=false только читает и оставляет токен в хранилище', () => {
    sessionStorage.setItem(PENDING_INVITATION_KEY, 'invite-token-1')

    expect(readPendingInvitationToken(false)).toBe('invite-token-1')
    expect(sessionStorage.getItem(PENDING_INVITATION_KEY)).toBe('invite-token-1')
    expect(readPendingInvitationToken(false)).toBe('invite-token-1')
  })

  it('возвращает пустую строку как есть, не подменяя её на null', () => {
    sessionStorage.setItem(PENDING_INVITATION_KEY, '')

    // Проверка на пустоту — дело вызывающего кода, утилита не угадывает.
    expect(readPendingInvitationToken()).toBe('')
  })
})
