<script setup lang="ts">
import { computed } from 'vue'
import { ChevronsUpDown, Building2 } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { tenantApi } from '@/services/api'
import { toast } from 'vue-sonner'

const { isMobile } = useSidebar()
const { currentUser, fetchCurrentUser } = useCurrentUser()

const activeTenant = computed(() => {
  if (!currentUser.value) return null
  return {
    id: currentUser.value.tenantId,
    name: currentUser.value.tenantName,
  }
})

const availableTenants = computed(() => {
  if (!currentUser.value?.tenants || currentUser.value.tenants.length === 0) {
    // Fallback: if tenants array is not available, use current tenant info
    if (currentUser.value) {
      return [{
        id: currentUser.value.tenantId,
        name: currentUser.value.tenantName,
        role: currentUser.value.role || 'Unknown',
      }]
    }
    return []
  }
  return currentUser.value.tenants.map((t) => ({
    id: t.tenantId,
    name: t.tenantName,
    role: t.role,
  }))
})

async function selectTenant(tenantId: string): Promise<void> {
  if (tenantId === activeTenant.value?.id) return

  try {
    const response = await tenantApi.switchTenant(tenantId)
    localStorage.setItem('accessToken', response.accessToken)
    await fetchCurrentUser()
    toast.success('Пространство успешно переключено')
    window.location.reload()
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } } }
    const message: string = apiError.response?.data?.message ?? 'Не удалось переключить пространство'
    toast.error(message)
  }
}
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Building2 class="size-4" />
            </div>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-medium">
                {{ activeTenant?.name || '...' }}
              </span>
            </div>
            <ChevronsUpDown class="ml-auto" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          v-if="availableTenants.length > 0"
          class="w-[var(--reka-dropdown-menu-trigger-width)] min-w-56 rounded-lg"
          align="start"
          :side="isMobile ? 'bottom' : 'right'"
          :side-offset="4"
        >
          <DropdownMenuLabel class="text-xs text-muted-foreground">
            Пространства
          </DropdownMenuLabel>
          <DropdownMenuItem
            v-for="tenant in availableTenants"
            :key="tenant.id"
            class="gap-2 p-2"
            :class="{ 'bg-accent': tenant.id === activeTenant?.id }"
            @click="selectTenant(tenant.id)"
          >
            <div class="flex size-6 items-center justify-center rounded-sm border">
              <Building2 class="size-3.5 shrink-0" />
            </div>
            <div class="flex flex-col">
              <span>{{ tenant.name }}</span>
              <span class="text-xs text-muted-foreground">{{ tenant.role }}</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
