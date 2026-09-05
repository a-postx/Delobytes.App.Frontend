import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useCurrentUser } from './useCurrentUser'

/**
 * Permission names matching backend Permission constants.
 */
export const Permission = {
  EditTenantSettings: 'tenant:edit',
  ManageMembers: 'members:manage',
  CreateTenant: 'tenant:create',
  ViewTenant: 'tenant:view',
  ManageProducts: 'products:manage',
  ViewProducts: 'products:view',
} as const

export type PermissionType = typeof Permission[keyof typeof Permission]

/**
 * Role names matching backend Role enum.
 */
export enum Role {
  Administrator = 'Administrator',
  Manager = 'Manager',
  ReadOnly = 'ReadOnly',
}

/**
 * Maps roles to their permissions.
 */
const rolePermissions: Record<string, Set<PermissionType>> = {
  [Role.Administrator]: new Set([
    Permission.EditTenantSettings,
    Permission.ManageMembers,
    Permission.CreateTenant,
    Permission.ViewTenant,
    Permission.ManageProducts,
    Permission.ViewProducts,
  ]),
  [Role.Manager]: new Set([
    Permission.ViewTenant,
    Permission.ManageProducts,
    Permission.ViewProducts,
  ]),
  [Role.ReadOnly]: new Set([
    Permission.ViewTenant,
    Permission.ViewProducts,
  ]),
}

export interface PermissionsComposable {
  isAdministrator: ComputedRef<boolean>
  isManager: ComputedRef<boolean>
  isReadOnly: ComputedRef<boolean>
  isManagerOrHigher: ComputedRef<boolean>
  canEditTenantSettings: ComputedRef<boolean>
  canManageMembers: ComputedRef<boolean>
  canCreateTenant: ComputedRef<boolean>
  canViewTenant: ComputedRef<boolean>
  canManageProducts: ComputedRef<boolean>
  canViewProducts: ComputedRef<boolean>
  hasPermission: (permission: PermissionType) => boolean
  hasAnyPermission: (...permissions: PermissionType[]) => boolean
  hasAllPermissions: (...permissions: PermissionType[]) => boolean
}

/**
 * Composable for checking user permissions based on their role.
 * Centralizes all authorization logic for the frontend.
 */
export function usePermissions(): PermissionsComposable {
  const { currentUser } = useCurrentUser()

  const userRole = computed<string | null>(() => currentUser.value?.role ?? null)

  const isAdministrator = computed<boolean>(() => userRole.value === Role.Administrator)
  const isManager = computed<boolean>(() => userRole.value === Role.Manager)
  const isReadOnly = computed<boolean>(() => userRole.value === Role.ReadOnly)

  const isManagerOrHigher = computed<boolean>(() => 
    [Role.Administrator, Role.Manager].includes(userRole.value as Role)
  )

  const hasPermission = (permission: PermissionType): boolean => {
    if (!userRole.value) {
      return false
    }

    const permissions: Set<PermissionType> | undefined = rolePermissions[userRole.value]
    return permissions?.has(permission) ?? false
  }

  const hasAnyPermission = (...permissions: PermissionType[]): boolean => {
    return permissions.some(hasPermission)
  }

  const hasAllPermissions = (...permissions: PermissionType[]): boolean => {
    return permissions.every(hasPermission)
  }

  const canEditTenantSettings = computed<boolean>(() => 
    hasPermission(Permission.EditTenantSettings)
  )

  const canManageMembers = computed<boolean>(() => 
    hasPermission(Permission.ManageMembers)
  )

  const canCreateTenant = computed<boolean>(() => 
    hasPermission(Permission.CreateTenant)
  )

  const canViewTenant = computed<boolean>(() => 
    hasPermission(Permission.ViewTenant)
  )

  const canManageProducts = computed<boolean>(() => 
    hasPermission(Permission.ManageProducts)
  )

  const canViewProducts = computed<boolean>(() => 
    hasPermission(Permission.ViewProducts)
  )

  return {
    isAdministrator,
    isManager,
    isReadOnly,
    isManagerOrHigher,
    canEditTenantSettings,
    canManageMembers,
    canCreateTenant,
    canViewTenant,
    canManageProducts,
    canViewProducts,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  }
}
