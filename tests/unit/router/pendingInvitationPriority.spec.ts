import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

/**
 * Структурная проверка «сквозного инварианта».
 *
 * Баг был класса «забыли повторить правило в одной из точек входа»: парольный вход приглашение
 * обрабатывал, а callback'и Яндекс ID и Google ID — нет. После объединения callback'ов точка входа
 * одна, но список файлов сохранён: он стережёт появление новых провайдеров.
 */

const currentDir: string = dirname(fileURLToPath(import.meta.url))
const srcRoot: string = resolve(currentDir, '../../../src')

function readSource(relativePath: string): string {
  return readFileSync(resolve(srcRoot, relativePath), 'utf-8')
}

/** Файлы, через которые пользователь попадает в приложение после аутентификации. */
const AUTH_ENTRY_POINTS: ReadonlyArray<string> = [
  'views/LoginView.vue',
  'views/OAuthCallbackView.vue',
  'views/SetupTenantView.vue',
]

describe('Приглашение: приоритет во всех точках входа', () => {
  it.each(AUTH_ENTRY_POINTS)('%s читает отложенный токен приглашения', (entryPoint: string) => {
    const source: string = readSource(entryPoint)

    expect(source).toContain('readPendingInvitationToken')
  })

  it.each(AUTH_ENTRY_POINTS)('%s уводит на маршрут accept-invitation', (entryPoint: string) => {
    const source: string = readSource(entryPoint)

    expect(source).toContain("name: 'accept-invitation'")
  })

  it('страница принятия приглашения пишет токен тем же ключом', () => {
    const source: string = readSource('views/AcceptInvitationView.vue')

    expect(source).toContain('PENDING_INVITATION_KEY')
  })

  it('в точках входа не осталось обращений к ключу голым литералом', () => {
    for (const entryPoint of AUTH_ENTRY_POINTS) {
      const source: string = readSource(entryPoint)

      expect(source).not.toContain("'pendingInvitationToken'")
    }
  })

  it('callback не записывает tenantId до проверки приглашения', () => {
    const source: string = readSource('views/OAuthCallbackView.vue')

    const invitationCheckIndex: number = source.indexOf('if (pendingInvitationToken)')
    const tenantIdWriteIndex: number = source.indexOf("setItem('tenantId'")

    expect(invitationCheckIndex).toBeGreaterThan(-1)
    expect(tenantIdWriteIndex).toBeGreaterThan(-1)
    expect(invitationCheckIndex).toBeLessThan(tenantIdWriteIndex)
  })
})
