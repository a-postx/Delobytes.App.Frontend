import { axiosInstance } from '../client'

export interface UpdateTenantSettingsRequest {
  timeZone: string
}

export interface UpdateTenantSettingsResponse {
  tenantId: string
  timeZone: string
}

export const tenantSettingsApi = {
  update: async (timeZone: string): Promise<UpdateTenantSettingsResponse> => {
    const response = await axiosInstance.patch<UpdateTenantSettingsResponse>(
      '/api/tenant/settings',
      { timeZone } as UpdateTenantSettingsRequest
    )
    return response.data
  },
}
