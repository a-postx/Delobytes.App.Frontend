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

export interface CreateInvitationRequest {
  email: string
  role: string
}

export interface CreateInvitationResponse {
  invitationId: string
  token: string
  email: string
  role: string
  expiresAt: string
}

export interface AcceptInvitationRequest {
  token: string
}

export interface AcceptInvitationResponse {
  tenantId: string
  tenantName: string
  role: string
  accessToken: string
}

export interface TenantMemberInfo {
  userId: string
  membershipId: string
  email: string
  displayName?: string
  role: string
  joinedAt: string
}

export interface PendingInvitationInfo {
  invitationId: string
  email: string
  role: string
  token: string
  createdAt: string
  expiresAt: string
}

export interface GetTenantMembersResponse {
  members: TenantMemberInfo[]
  pendingInvitations: PendingInvitationInfo[]
}

export interface UpdateMemberRoleRequest {
  role: string
}

export interface UpdateMembershipRoleResponse {
  membershipId: string
  userId: string
  role: string
}

export interface RemoveTenantMemberResponse {
  success: boolean
}

export interface RevokeInvitationResponse {
  success: boolean
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

  createInvitation: async (email: string, role: string): Promise<CreateInvitationResponse> => {
    const response = await axiosInstance.post<CreateInvitationResponse>(
      '/api/tenant/invitations',
      { email, role } as CreateInvitationRequest
    )
    return response.data
  },

  acceptInvitation: async (token: string): Promise<AcceptInvitationResponse> => {
    const response = await axiosInstance.post<AcceptInvitationResponse>(
      '/api/tenant/invitations/accept',
      { token } as AcceptInvitationRequest
    )
    return response.data
  },

  revokeInvitation: async (invitationId: string): Promise<RevokeInvitationResponse> => {
    const response = await axiosInstance.delete<RevokeInvitationResponse>(
      `/api/tenant/invitations/${invitationId}`
    )
    return response.data
  },

  getTenantMembers: async (): Promise<GetTenantMembersResponse> => {
    const response = await axiosInstance.get<GetTenantMembersResponse>('/api/tenant/members')
    return response.data
  },

  updateMemberRole: async (userId: string, role: string): Promise<UpdateMembershipRoleResponse> => {
    const response = await axiosInstance.patch<UpdateMembershipRoleResponse>(
      `/api/tenant/members/${userId}/role`,
      { role } as UpdateMemberRoleRequest
    )
    return response.data
  },

  removeMember: async (userId: string): Promise<RemoveTenantMemberResponse> => {
    const response = await axiosInstance.delete<RemoveTenantMemberResponse>(
      `/api/tenant/members/${userId}`
    )
    return response.data
  },
}
