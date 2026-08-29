import axios, { type AxiosInstance, type AxiosError } from 'axios'

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
          console.error('API Error:', error.response.status, error.response.data)
          
          // Handle 401 Unauthorized - clear token and redirect to login
          if (error.response.status === 401) {
            localStorage.removeItem('accessToken')
            localStorage.removeItem('userId')
            localStorage.removeItem('tenantId')
            window.location.href = '/login'
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
