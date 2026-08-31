<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Building2 } from 'lucide-vue-next'
import NavMain from '@/components/sidebar/NavMain.vue'
import NavUser from '@/components/sidebar/NavUser.vue'
import TenantSwitcher from '@/components/sidebar/TenantSwitcher.vue'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import type { SidebarProps } from '@/components/ui/sidebar'
import { useCurrentUser } from '@/composables/useCurrentUser'

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: 'icon',
})

const { currentUser, fetchCurrentUser } = useCurrentUser()

onMounted(async () => {
  if (!currentUser.value) {
    await fetchCurrentUser()
  }
})

const tenants = computed(() => [
  {
    name: currentUser.value?.tenantName ?? '...',
    logo: Building2,
  },
])

const currentUserInfo = computed(() => ({
  name: currentUser.value?.displayName ?? currentUser.value?.email ?? 'Пользователь',
  email: currentUser.value?.email ?? '',
  avatar: '',
}))

function handleLogout(): void {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('userId')
  localStorage.removeItem('tenantId')
  window.location.href = '/login'
}

function handleSettings(): void {
  window.location.href = '/settings'
}

function handleTenantSettings(): void {
  window.location.href = '/tenant-settings'
}
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader>
      <TenantSwitcher :tenants="tenants" />
    </SidebarHeader>
    <SidebarContent>
      <NavMain />
    </SidebarContent>
    <SidebarFooter>
      <NavUser
        :user="currentUserInfo"
        @logout="handleLogout"
        @settings="handleSettings"
        @tenant-settings="handleTenantSettings"
      />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
