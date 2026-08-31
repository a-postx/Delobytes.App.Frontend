import { axiosInstance } from '../client'

export interface UpdateTenantNameRequest {
  name: string
}

export interface UpdateTenantNameResponse {
  tenantId: string
  name: string
}

export const tenantApi = {
  updateTenantName: async (name: string): Promise<UpdateTenantNameResponse> => {
    const response = await axiosInstance.patch<UpdateTenantNameResponse>(
      '/api/tenant/name',
      { name } as UpdateTenantNameRequest
    )
    return response.data
  },
}
