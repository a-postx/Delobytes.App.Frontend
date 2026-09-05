import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { usePermissions, Permission, Role } from '@/composables/usePermissions'
import type { CurrentUser } from '@/types'

vi.mock('@/composables/useCurrentUser', () => ({
  useCurrentUser: () => ({
    currentUser: mockCurrentUser,
    loading: ref(false),
    error: ref(null),
    fetchCurrentUser: vi.fn(),
    clearCurrentUser: vi.fn(),
  }),
}))

let mockCurrentUser = ref<CurrentUser | null>(null)

describe('usePermissions', () => {
  beforeEach(() => {
    mockCurrentUser.value = null
  })

  describe('Role checks', () => {
    it('should identify Administrator role correctly', () => {
      mockCurrentUser.value = createMockUser(Role.Administrator)
      const { isAdministrator, isManager, isReadOnly } = usePermissions()

      expect(isAdministrator.value).toBe(true)
      expect(isManager.value).toBe(false)
      expect(isReadOnly.value).toBe(false)
    })

    it('should identify Manager role correctly', () => {
      mockCurrentUser.value = createMockUser(Role.Manager)
      const { isAdministrator, isManager, isReadOnly } = usePermissions()

      expect(isAdministrator.value).toBe(false)
      expect(isManager.value).toBe(true)
      expect(isReadOnly.value).toBe(false)
    })

    it('should identify ReadOnly role correctly', () => {
      mockCurrentUser.value = createMockUser(Role.ReadOnly)
      const { isAdministrator, isManager, isReadOnly } = usePermissions()

      expect(isAdministrator.value).toBe(false)
      expect(isManager.value).toBe(false)
      expect(isReadOnly.value).toBe(true)
    })

    it('should return false for all roles when user is null', () => {
      mockCurrentUser.value = null
      const { isAdministrator, isManager, isReadOnly } = usePermissions()

      expect(isAdministrator.value).toBe(false)
      expect(isManager.value).toBe(false)
      expect(isReadOnly.value).toBe(false)
    })
  })

  describe('isManagerOrHigher', () => {
    it('should return true for Administrator', () => {
      mockCurrentUser.value = createMockUser(Role.Administrator)
      const { isManagerOrHigher } = usePermissions()

      expect(isManagerOrHigher.value).toBe(true)
    })

    it('should return true for Manager', () => {
      mockCurrentUser.value = createMockUser(Role.Manager)
      const { isManagerOrHigher } = usePermissions()

      expect(isManagerOrHigher.value).toBe(true)
    })

    it('should return false for ReadOnly', () => {
      mockCurrentUser.value = createMockUser(Role.ReadOnly)
      const { isManagerOrHigher } = usePermissions()

      expect(isManagerOrHigher.value).toBe(false)
    })
  })

  describe('Administrator permissions', () => {
    beforeEach(() => {
      mockCurrentUser.value = createMockUser(Role.Administrator)
    })

    it('should have all permissions', () => {
      const {
        canEditTenantSettings,
        canManageMembers,
        canCreateTenant,
        canViewTenant,
        canManageProducts,
        canViewProducts,
      } = usePermissions()

      expect(canEditTenantSettings.value).toBe(true)
      expect(canManageMembers.value).toBe(true)
      expect(canCreateTenant.value).toBe(true)
      expect(canViewTenant.value).toBe(true)
      expect(canManageProducts.value).toBe(true)
      expect(canViewProducts.value).toBe(true)
    })
  })

  describe('Manager permissions', () => {
    beforeEach(() => {
      mockCurrentUser.value = createMockUser(Role.Manager)
    })

    it('should have correct permissions', () => {
      const {
        canEditTenantSettings,
        canManageMembers,
        canCreateTenant,
        canViewTenant,
        canManageProducts,
        canViewProducts,
      } = usePermissions()

      expect(canEditTenantSettings.value).toBe(false)
      expect(canManageMembers.value).toBe(false)
      expect(canCreateTenant.value).toBe(false)
      expect(canViewTenant.value).toBe(true)
      expect(canManageProducts.value).toBe(true)
      expect(canViewProducts.value).toBe(true)
    })
  })

  describe('ReadOnly permissions', () => {
    beforeEach(() => {
      mockCurrentUser.value = createMockUser(Role.ReadOnly)
    })

    it('should have minimal permissions', () => {
      const {
        canEditTenantSettings,
        canManageMembers,
        canCreateTenant,
        canViewTenant,
        canManageProducts,
        canViewProducts,
      } = usePermissions()

      expect(canEditTenantSettings.value).toBe(false)
      expect(canManageMembers.value).toBe(false)
      expect(canCreateTenant.value).toBe(false)
      expect(canViewTenant.value).toBe(true)
      expect(canManageProducts.value).toBe(false)
      expect(canViewProducts.value).toBe(true)
    })
  })

  describe('hasPermission', () => {
    it('should check single permission correctly for Administrator', () => {
      mockCurrentUser.value = createMockUser(Role.Administrator)
      const { hasPermission } = usePermissions()

      expect(hasPermission(Permission.EditTenantSettings)).toBe(true)
      expect(hasPermission(Permission.ManageMembers)).toBe(true)
    })

    it('should check single permission correctly for Manager', () => {
      mockCurrentUser.value = createMockUser(Role.Manager)
      const { hasPermission } = usePermissions()

      expect(hasPermission(Permission.EditTenantSettings)).toBe(false)
      expect(hasPermission(Permission.ManageProducts)).toBe(true)
    })

    it('should return false when user is null', () => {
      mockCurrentUser.value = null
      const { hasPermission } = usePermissions()

      expect(hasPermission(Permission.EditTenantSettings)).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('should return true if user has at least one permission', () => {
      mockCurrentUser.value = createMockUser(Role.Manager)
      const { hasAnyPermission } = usePermissions()

      const result = hasAnyPermission(
        Permission.EditTenantSettings,
        Permission.ManageProducts
      )

      expect(result).toBe(true)
    })

    it('should return false if user has none of the permissions', () => {
      mockCurrentUser.value = createMockUser(Role.ReadOnly)
      const { hasAnyPermission } = usePermissions()

      const result = hasAnyPermission(
        Permission.EditTenantSettings,
        Permission.ManageMembers
      )

      expect(result).toBe(false)
    })

    it('should return false when user is null', () => {
      mockCurrentUser.value = null
      const { hasAnyPermission } = usePermissions()

      const result = hasAnyPermission(
        Permission.ViewTenant,
        Permission.ViewProducts
      )

      expect(result).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', () => {
      mockCurrentUser.value = createMockUser(Role.Administrator)
      const { hasAllPermissions } = usePermissions()

      const result = hasAllPermissions(
        Permission.EditTenantSettings,
        Permission.ManageMembers
      )

      expect(result).toBe(true)
    })

    it('should return false if user is missing at least one permission', () => {
      mockCurrentUser.value = createMockUser(Role.Manager)
      const { hasAllPermissions } = usePermissions()

      const result = hasAllPermissions(
        Permission.ManageProducts,
        Permission.EditTenantSettings
      )

      expect(result).toBe(false)
    })

    it('should return false when user is null', () => {
      mockCurrentUser.value = null
      const { hasAllPermissions } = usePermissions()

      const result = hasAllPermissions(
        Permission.ViewTenant,
        Permission.ViewProducts
      )

      expect(result).toBe(false)
    })
  })

  describe('Permission constants', () => {
    it('should have correct permission values', () => {
      expect(Permission.EditTenantSettings).toBe('tenant:edit')
      expect(Permission.ManageMembers).toBe('members:manage')
      expect(Permission.CreateTenant).toBe('tenant:create')
      expect(Permission.ViewTenant).toBe('tenant:view')
      expect(Permission.ManageProducts).toBe('products:manage')
      expect(Permission.ViewProducts).toBe('products:view')
    })
  })

  describe('Role enum', () => {
    it('should have correct role values', () => {
      expect(Role.Administrator).toBe('Administrator')
      expect(Role.Manager).toBe('Manager')
      expect(Role.ReadOnly).toBe('ReadOnly')
    })
  })
})

function createMockUser(role: Role): CurrentUser {
  return {
    userId: 'test-user-id',
    displayName: 'Test User',
    email: 'test@example.com',
    tenantId: 'test-tenant-id',
    tenantName: 'Test Tenant',
    role,
    tenants: [],
  }
}
