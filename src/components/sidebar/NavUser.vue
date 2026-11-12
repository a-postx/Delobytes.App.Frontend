<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Building2, Check, LogOut, Moon, Settings, Sun } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useTheme } from '@/composables/useTheme'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { tenantApi } from '@/services/api'

const router = useRouter()
const { isDark, toggleTheme } = useTheme()
const { currentUser, fetchCurrentUser } = useCurrentUser()

const themeIcon = computed(() => (isDark.value ? Sun : Moon))
const themeLabel = computed(() => (isDark.value ? 'Светлая тема' : 'Тёмная тема'))

defineProps<{
  user: {
    name: string
    email: string
    avatar: string
  }
}>()

const emit = defineEmits<{
  logout: []
  tenantSettings: []
}>()

const { isMobile } = useSidebar()

const activeTenantId = computed(() => currentUser.value?.tenantId ?? '')
const tenantName = computed(() => currentUser.value?.tenantName ?? '')

const availableTenants = computed(() => {
  if (!currentUser.value?.tenants || currentUser.value.tenants.length === 0) {
    if (currentUser.value) {
      return [{
        id: currentUser.value.tenantId,
        name: currentUser.value.tenantName,
        role: currentUser.value.role || 'Unknown',
      }]
    }
    return []
  }
  return currentUser.value.tenants.map((tenant) => ({
    id: tenant.tenantId,
    name: tenant.tenantName,
    role: tenant.role,
  }))
})

async function selectTenant(tenantId: string): Promise<void> {
  if (tenantId === activeTenantId.value) return

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
            <Avatar class="h-8 w-8 rounded-lg">
              <AvatarImage
                :src="user.avatar"
                :alt="user.name"
              />
              <AvatarFallback class="rounded-lg">
                {{ user.name.substring(0, 2).toUpperCase() }}
              </AvatarFallback>
            </Avatar>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-medium">{{ user.name }}</span>
              <span
                v-if="tenantName"
                class="truncate text-xs text-muted-foreground"
              >
                {{ tenantName }}
              </span>
            </div>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-[var(--reka-dropdown-menu-trigger-width)] min-w-56 rounded-lg"
          :side="isMobile ? 'bottom' : 'right'"
          align="end"
          :side-offset="4"
        >
          <DropdownMenuItem
            class="p-0 font-normal"
            @click="router.push('/settings')"
          >
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar class="h-8 w-8 rounded-lg">
                <AvatarImage
                  :src="user.avatar"
                  :alt="user.name"
                />
                <AvatarFallback class="rounded-lg">
                  {{ user.name.substring(0, 2).toUpperCase() }}
                </AvatarFallback>
              </Avatar>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">{{ user.email }}</span>
                <span class="truncate text-xs text-muted-foreground underline">Настройки</span>
              </div>
            </div>
          </DropdownMenuItem>
          <template v-if="availableTenants.length > 0">
            <DropdownMenuSeparator />
            <DropdownMenuLabel class="text-xs text-muted-foreground">
              Организации
            </DropdownMenuLabel>
            <DropdownMenuItem
              v-for="tenant in availableTenants"
              :key="tenant.id"
              class="gap-2 p-2"
              @click="selectTenant(tenant.id)"
            >
              <div class="flex size-6 items-center justify-center rounded-sm border">
                <Building2 class="size-3.5 shrink-0" />
              </div>
              <div class="flex min-w-0 flex-col">
                <span class="truncate">{{ tenant.name }}</span>
                <span class="text-xs text-muted-foreground">{{ tenant.role }}</span>
              </div>
              <Check
                v-if="tenant.id === activeTenantId"
                class="ml-auto size-4 shrink-0"
              />
            </DropdownMenuItem>
          </template>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem @click="emit('tenantSettings')">
              <Settings />
              Настройки пространства
            </DropdownMenuItem>
            <DropdownMenuItem @click="toggleTheme">
              <component :is="themeIcon" />
              {{ themeLabel }}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="emit('logout')">
            <LogOut />
            Выход
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
