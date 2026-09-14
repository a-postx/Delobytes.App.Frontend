<script setup lang="ts">
import AppNavBar from '@/components/AppNavBar.vue'
import AppSidebar from '@/components/sidebar/AppSidebar.vue'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { RouterView } from 'vue-router'
import AppErrorBoundary from '@/components/feedback/AppErrorBoundary.vue'
</script>

<template>
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <AppNavBar />
      <main class="flex flex-1 flex-col gap-4 p-4 pt-0">
        <!-- Отдельная граница для содержимого: ошибка страницы не сносит сайдбар и навигацию. -->
        <AppErrorBoundary>
          <RouterView />
        </AppErrorBoundary>
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
