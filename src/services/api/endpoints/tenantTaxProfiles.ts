import { axiosInstance } from '../client'
import type { VatType } from '@/types'

export const TaxRegime = {
  UsnIncome: 'UsnIncome',
} as const

export type TaxRegime = typeof TaxRegime[keyof typeof TaxRegime]

export const TAX_REGIME_OPTIONS: { value: TaxRegime; label: string }[] = [
  { value: TaxRegime.UsnIncome, label: 'УСН «Доходы»' },
]

export interface TenantTaxProfileItem {
  id: string
  regime: TaxRegime
  /** Ставка в процентах: 6 — это 6 %, а не доля 0,06. */
  ratePercent: number
  vat: VatType
  /** Дата начала действия, YYYY-MM-DD. */
  validFrom: string
  createdAt: string
}

export interface GetTenantTaxProfilesResponse {
  items: TenantTaxProfileItem[]
}

/**
 * Бэкенд отдаёт активный профиль плоским объектом, а не вложенным `profile`,
 * и сообщает об отсутствии профиля через `found: false` со статусом 200.
 */
export interface GetActiveTenantTaxProfileResponse {
  found: boolean
  id: string
  regime: TaxRegime
  ratePercent: number
  vat: VatType
  validFrom: string
}

export interface CreateTenantTaxProfileRequest {
  regime: TaxRegime
  ratePercent: number
  vat: VatType
  validFrom: string
}

export interface CreateTenantTaxProfileResponse {
  id: string
  conflict: boolean
}

export interface DeleteTenantTaxProfileResponse {
  found: boolean
  notLatest: boolean
}

export const tenantTaxProfilesApi = {
  getAll: async (): Promise<GetTenantTaxProfilesResponse> => {
    const response = await axiosInstance.get<GetTenantTaxProfilesResponse>(
      '/api/tenant/tax-profiles'
    )
    return response.data
  },

  getActive: async (at?: string): Promise<GetActiveTenantTaxProfileResponse> => {
    const response = await axiosInstance.get<GetActiveTenantTaxProfileResponse>(
      '/api/tenant/tax-profiles/active',
      { params: at ? { at } : undefined }
    )
    return response.data
  },

  create: async (data: CreateTenantTaxProfileRequest): Promise<CreateTenantTaxProfileResponse> => {
    const response = await axiosInstance.post<CreateTenantTaxProfileResponse>(
      '/api/tenant/tax-profiles',
      data
    )
    return response.data
  },

  remove: async (id: string): Promise<DeleteTenantTaxProfileResponse> => {
    const response = await axiosInstance.delete<DeleteTenantTaxProfileResponse>(
      `/api/tenant/tax-profiles/${id}`
    )
    return response.data
  },
}
