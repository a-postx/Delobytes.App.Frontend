export type OAuthProviderId = 'google' | 'yandex'

export interface OAuthProviderConfig {
  readonly id: OAuthProviderId
  readonly displayName: string
  readonly genitiveName: string
  readonly stateStorageKey: string
  readonly callbackPath: string
  readonly apiPath: string
}

export const OAUTH_PROVIDERS: Record<OAuthProviderId, OAuthProviderConfig> = {
  google: {
    id: 'google',
    displayName: 'Google',
    genitiveName: 'Google',
    stateStorageKey: 'google_oauth_state',
    callbackPath: '/auth/google/callback',
    apiPath: '/api/auth/google/callback',
  },
  yandex: {
    id: 'yandex',
    displayName: 'Яндекс',
    genitiveName: 'Яндекса',
    stateStorageKey: 'yandex_oauth_state',
    callbackPath: '/auth/yandex/callback',
    apiPath: '/api/auth/yandex/callback',
  },
}

export function resolveOAuthProvider(value: unknown): OAuthProviderConfig {
  const config: OAuthProviderConfig | undefined = OAUTH_PROVIDERS[value as OAuthProviderId]

  if (!config) {
    throw new Error(`Неизвестный OAuth-провайдер в meta маршрута: ${String(value)}`)
  }

  return config
}
