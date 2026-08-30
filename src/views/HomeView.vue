<script setup lang="ts">
import { ref } from 'vue'
import ProductList from '@/components/features/ProductList.vue'
import ApiTester from '@/components/features/ApiTester.vue'

const activeTab = ref<'products' | 'api-test'>('products')
</script>

<template>
  <div>
    <div class="mb-6 border-b border-border">
      <nav class="-mb-px flex space-x-8">
        <button
          @click="activeTab = 'products'"
          :class="[
            activeTab === 'products'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
          ]"
        >
          Products
        </button>
        <button
          @click="activeTab = 'api-test'"
          :class="[
            activeTab === 'api-test'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
          ]"
        >
          API Test
        </button>
      </nav>
    </div>

    <ProductList v-if="activeTab === 'products'" />
    <ApiTester v-if="activeTab === 'api-test'" />
  </div>
</template>
