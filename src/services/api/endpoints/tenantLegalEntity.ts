import { axiosInstance } from '../client'

export interface GetTenantLegalEntityResponse {
  tenantId: string
  legalName: string | null
  inn: string | null
}

export interface UpdateTenantLegalEntityRequest {
  legalName: string | null
  inn: string | null
}

export interface UpdateTenantLegalEntityResponse {
  tenantId: string
  legalName: string | null
  inn: string | null
}

export const tenantLegalEntityApi = {
  get: async (): Promise<GetTenantLegalEntityResponse> => {
    const response = await axiosInstance.get<GetTenantLegalEntityResponse>('/api/tenant/legal-entity')
    return response.data
  },

  update: async (payload: UpdateTenantLegalEntityRequest): Promise<UpdateTenantLegalEntityResponse> => {
    const response = await axiosInstance.patch<UpdateTenantLegalEntityResponse>(
      '/api/tenant/legal-entity',
      payload
    )
    return response.data
  },
}
