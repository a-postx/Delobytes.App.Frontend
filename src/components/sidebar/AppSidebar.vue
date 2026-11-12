<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NavMain from '@/components/sidebar/NavMain.vue'
import NavUser from '@/components/sidebar/NavUser.vue'
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

const router = useRouter()
const { currentUser, fetchCurrentUser, clearCurrentUser } = useCurrentUser()

onMounted(async () => {
  if (!currentUser.value) {
    await fetchCurrentUser()
  }
})

const currentUserInfo = computed(() => ({
  name: currentUser.value?.displayName ?? currentUser.value?.email ?? 'Пользователь',
  email: currentUser.value?.email ?? '',
  avatar: '',
}))

function handleLogout(): void {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('userId')
  localStorage.removeItem('tenantId')
  localStorage.removeItem('currentUser')
  clearCurrentUser()
  window.location.href = '/login'
}

function handleTenantSettings(): void {
  void router.push('/tenant-settings')
}
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader>
      <div
        class="h-8"
        aria-hidden="true"
      />
    </SidebarHeader>
    <SidebarContent>
      <NavMain />
    </SidebarContent>
    <SidebarFooter>
      <NavUser
        :user="currentUserInfo"
        @logout="handleLogout"
        @tenant-settings="handleTenantSettings"
      />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
