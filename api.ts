import axios, { type AxiosInstance } from 'axios'
import type { Product, CreateProductRequest, UpdateProductRequest } from '@/types'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    // Determine API base URL based on environment
    const baseURL = this.getApiBaseUrl()
    
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error('API Error:', error.response.status, error.response.data)
        } else if (error.request) {
          console.error('Network Error: No response received')
        } else {
          console.error('Request Error:', error.message)
        }
        return Promise.reject(error)
      }
    )
  }

  private getApiBaseUrl(): string {
    // In production, use api.{domain} subdomain
    // In development, use environment variable or localhost
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL
    }

    // Detect if running on deployed domain
    const hostname = window.location.hostname
    
    if (hostname.includes('test.delobytes.ru')) {
      return 'https://api.test.delobytes.ru'
    } else if (hostname.includes('app.delobytes.ru')) {
      return 'https://api.app.delobytes.ru'
    }
    
    // Default to localhost for development
    return 'http://localhost:5000'
  }

  public getBaseUrl(): string {
    return this.client.defaults.baseURL || ''
  }

  // Health check endpoints
  async checkStatus(): Promise<any> {
    const response = await this.client.get('/status')
    return response.data
  }

  async checkMetrics(): Promise<any> {
    const response = await this.client.get('/metrics')
    return response.data
  }

  // Product endpoints
  async getProducts(): Promise<Product[]> {
    const response = await this.client.get('/api/products')
    return response.data
  }

  async getProduct(id: string): Promise<Product> {
    const response = await this.client.get(`/api/products/${id}`)
    return response.data
  }

  async createProduct(data: CreateProductRequest): Promise<Product> {
    const response = await this.client.post('/api/products', data)
    return response.data
  }

  async updateProduct(id: string, data: UpdateProductRequest): Promise<Product> {
    const response = await this.client.put(`/api/products/${id}`, data)
    return response.data
  }

  async deleteProduct(id: string): Promise<void> {
    await this.client.delete(`/api/products/${id}`)
  }
}

export const apiClient = new ApiClient()
