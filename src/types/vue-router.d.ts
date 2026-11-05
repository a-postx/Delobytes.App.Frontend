import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** Провайдер OAuth для общего маршрута callback. Выставляется в routes.ts. */
    oauthProvider?: 'google' | 'yandex'
  }
}
