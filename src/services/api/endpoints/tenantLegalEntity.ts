import { axiosInstance } from '../client'
import type { TaxType, VatType } from '@/types'

export interface GetTenantLegalEntityResponse {
  tenantId: string
  legalName: string | null
  inn: string | null
  taxType: TaxType
  taxRatePercent: number
  vatType: VatType
}

export interface UpdateTenantLegalEntityRequest {
  legalName: string | null
  inn: string | null
  taxType: TaxType
  taxRatePercent: number
  vatType: VatType
}

export interface UpdateTenantLegalEntityResponse {
  tenantId: string
  legalName: string | null
  inn: string | null
  taxType: TaxType
  taxRatePercent: number
  vatType: VatType
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
