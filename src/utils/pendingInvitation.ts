/**
 * Работа с приглашением, отложенным до входа.
 *
 * Сценарий: пользователь открыл ссылку-приглашение без активной сессии,
 * AcceptInvitationView кладёт токен в sessionStorage и уводит на /login.
 * Все точки входа (пароль, Яндекс ID, Google ID) обязаны проверить этот токен
 * после успешной аутентификации: приглашение имеет приоритет над экраном
 * создания собственного пространства.
 *
 * Ключ собран в одном месте, чтобы входы не разошлись по разным литералам.
 */
export const PENDING_INVITATION_KEY = 'pendingInvitationToken'

/**
 * Читает отложенный токен приглашения.
 *
 * @param consume Удалять токен из sessionStorage. True — когда вызывающий код
 *   забирает приглашение себе (например, уводит на страницу принятия).
 *   False — когда нужно только узнать о наличии, не прерывая начатый сценарий:
 *   посещение /setup-tenant в режиме ?redirect=... не должно стирать токен
 *   у сценария, который ещё не завершился.
 */
export function readPendingInvitationToken(consume: boolean = true): string | null {
  const token: string | null = sessionStorage.getItem(PENDING_INVITATION_KEY)

  if (consume) {
    sessionStorage.removeItem(PENDING_INVITATION_KEY)
  }

  return token
}
