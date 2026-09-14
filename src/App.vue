<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'
import AppErrorBoundary from '@/components/feedback/AppErrorBoundary.vue'
import { useTheme } from '@/composables/useTheme'
import 'vue-sonner/style.css'

const { initTheme } = useTheme()

onMounted(() => {
  initTheme()
})
</script>

<template>
  <!-- Граница охватывает весь роутер: падение любого экрана не должно оставлять пустое окно. -->
  <AppErrorBoundary>
    <RouterView />
  </AppErrorBoundary>
  <Toaster position="top-right" />
</template>
