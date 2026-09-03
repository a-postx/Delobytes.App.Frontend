import { axiosInstance } from '../client'

export interface UpdateTenantNameRequest {
  name: string
}

export interface UpdateTenantNameResponse {
  tenantId: string
  name: string
}

export interface SwitchTenantRequest {
  targetTenantId: string
}

export interface SwitchTenantResponse {
  accessToken: string
}

export const tenantApi = {
  updateTenantName: async (name: string): Promise<UpdateTenantNameResponse> => {
    const response = await axiosInstance.patch<UpdateTenantNameResponse>(
      '/api/tenant/name',
      { name } as UpdateTenantNameRequest
    )
    return response.data
  },

  switchTenant: async (targetTenantId: string): Promise<SwitchTenantResponse> => {
    const response = await axiosInstance.post<SwitchTenantResponse>(
      '/api/tenant/switch',
      { targetTenantId } as SwitchTenantRequest
    )
    return response.data
  },
}
