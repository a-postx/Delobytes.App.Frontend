import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** Провайдер OAuth для общего маршрута callback. Выставляется в routes.ts. */
    oauthProvider?: 'google' | 'yandex'
    /**
     * Страница участвует в схеме черновиков и обязана вызвать provideDraftRegistry().
     * Отсутствие реестра ловит dev-ассерт в router/index.ts.
     */
    saveGuard?: 'page'
  }
}
