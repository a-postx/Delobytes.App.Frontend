import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { REDIRECT_QUERY_KEY, rememberRedirect, isSafeRedirect } from '@/utils/redirect'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    const baseURL = this.getApiBaseUrl()
    
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.setupInterceptors()
  }

  private getApiBaseUrl(): string {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL
    }

    const hostname = window.location.hostname
    
    if (hostname.includes('test.delobytes.ru')) {
      return 'https://api.test.delobytes.ru'
    } else if (hostname.includes('app.delobytes.ru')) {
      return 'https://api.app.delobytes.ru'
    }
    
    return 'https://a-postx-delobytes-app-backend-47aa.twc1.net'
  }

  /**
   * Адрес текущей страницы, чтобы вернуть пользователя после повторного входа.
   * Пусто, если мы уже на странице входа или адрес небезопасен.
   */
  private currentLocationAsRedirect(): string | null {
    const path: string = `${window.location.pathname}${window.location.search}`

    if (!isSafeRedirect(path)) {
      return null
    }

    return path
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
        
        // Add JWT token to Authorization header if available
        const token = localStorage.getItem('accessToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const errorData = error.response.data as any
          const correlationId = error.response.headers['x-correlation-id']
          
          // Расширенное логирование с correlation ID и машиночитаемым кодом
          console.error('API Error:', {
            status: error.response.status,
            code: errorData?.code,
            message: errorData?.message,
            correlationId,
            url: error.config?.url,
          })

          // Redirect to login on 401 only for authenticated requests,
          // not for auth endpoints themselves (login, register, etc.)
          const url = error.config?.url ?? ''
          const isAuthEndpoint = url.includes('/api/auth/')

          if (error.response.status === 401 && !isAuthEndpoint) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('userId')
            localStorage.removeItem('tenantId')

            // Перезагрузка через location.href стирает контекст, поэтому адрес
            // текущей страницы сохраняем: после входа вернёмся на него.
            const target: string | null = this.currentLocationAsRedirect()
            if (target) {
              rememberRedirect(target)
              window.location.href = `/login?${REDIRECT_QUERY_KEY}=${encodeURIComponent(target)}`
            } else {
              window.location.href = '/login'
            }
          }
        } else if (error.request) {
          console.error('Network Error: No response received')
        } else {
          console.error('Request Error:', error.message)
        }
        return Promise.reject(error)
      }
    )
  }

  public getBaseUrl(): string {
    return this.client.defaults.baseURL || ''
  }

  public getClient(): AxiosInstance {
    return this.client
  }
}

export const apiClient = new ApiClient()
export const axiosInstance = apiClient.getClient()
