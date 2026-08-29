<script setup lang="ts">
import { RouterView } from 'vue-router'
import { APP_NAME } from '@/utils/constants'
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold text-gray-900">
          {{ APP_NAME }} Margin Accounting
        </h1>
      </div>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>
