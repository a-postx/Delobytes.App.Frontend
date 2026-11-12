export const PRODUCTION_API_BASE_URL = 'https://api.delobytes.ru'
export const TEST_API_BASE_URL = 'https://api.test.delobytes.ru'
export const LOCAL_API_BASE_URL = 'http://localhost:5245'

export interface ApiBackendRule {
  readonly hostname: string
  readonly apiBaseUrl: string
}

export const API_BACKEND_RULES: readonly ApiBackendRule[] = [
  { hostname: 'app.delobytes.ru', apiBaseUrl: PRODUCTION_API_BASE_URL },
  { hostname: 'www.app.delobytes.ru', apiBaseUrl: PRODUCTION_API_BASE_URL },
  { hostname: 'test.app.delobytes.ru', apiBaseUrl: TEST_API_BASE_URL },
  { hostname: 'app.test.delobytes.ru', apiBaseUrl: TEST_API_BASE_URL },
  { hostname: 'localhost', apiBaseUrl: LOCAL_API_BASE_URL },
  { hostname: '127.0.0.1', apiBaseUrl: LOCAL_API_BASE_URL },
]

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '')
}

export function resolveApiBaseUrl(hostname: string): string {
  const normalized: string = normalizeHostname(hostname)
  const rule: ApiBackendRule | undefined = API_BACKEND_RULES.find(
    (candidate) => candidate.hostname === normalized
  )

  return rule ? rule.apiBaseUrl : PRODUCTION_API_BASE_URL
}
