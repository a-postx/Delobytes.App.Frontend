<script setup lang="ts">
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

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: 'icon',
})

const tenants = [
  {
    name: 'Мой тенант',
    logo: Building2,
  },
]

const currentUser = {
  name: 'Пользователь',
  email: 'user@example.com',
  avatar: '',
}

function handleLogout(): void {
  localStorage.removeItem('accessToken')
  window.location.href = '/login'
}

function handleProfile(): void {
  // TODO: navigate to profile page
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
        :user="currentUser"
        @logout="handleLogout"
        @profile="handleProfile"
      />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
