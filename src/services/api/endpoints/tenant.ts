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

export interface CreateTenantForUserRequest {
  tenantName: string
}

export interface CreateTenantForUserResponse {
  tenantId: string
  tenantName: string
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

  createTenantForUser: async (tenantName: string): Promise<CreateTenantForUserResponse> => {
    const response = await axiosInstance.post<CreateTenantForUserResponse>(
      '/api/tenant/create',
      { tenantName } as CreateTenantForUserRequest
    )
    return response.data
  },
}
