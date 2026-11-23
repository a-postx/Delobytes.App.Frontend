import { axiosInstance } from '../client'

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export const authApi = {
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await axiosInstance.post('/api/auth/change-password', {
      currentPassword,
      newPassword,
    } as ChangePasswordRequest)
  },
}
