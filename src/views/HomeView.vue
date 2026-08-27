<script setup lang="ts">
import { ref } from 'vue'
import ProductList from '@/components/features/ProductList.vue'
import ApiTester from '@/components/features/ApiTester.vue'

const activeTab = ref<'products' | 'api-test'>('products')
</script>

<template>
  <div>
    <div class="mb-6 border-b border-gray-200">
      <nav class="-mb-px flex space-x-8">
        <button
          @click="activeTab = 'products'"
          :class="[
            activeTab === 'products'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
          ]"
        >
          Products
        </button>
        <button
          @click="activeTab = 'api-test'"
          :class="[
            activeTab === 'api-test'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
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
