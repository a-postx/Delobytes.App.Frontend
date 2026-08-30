import { axiosInstance } from '../client'
import type { CurrentUser } from '@/types'

export const meApi = {
  getCurrentUser: async (): Promise<CurrentUser> => {
    const response = await axiosInstance.get<CurrentUser>('/api/me')
    return response.data
  },
}
