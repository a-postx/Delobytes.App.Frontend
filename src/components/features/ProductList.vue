<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { productsApi } from '@/services/api'
import { useApi } from '@/composables/useApi'
import { useNotification } from '@/composables/useNotification'
import { formatCurrency, formatPercentage } from '@/utils/format'
import type { Product, CreateProductRequest } from '@/types'

const products = ref<Product[]>([])
const { loading, error, execute } = useApi<Product[]>()
const { loading: createLoading, execute: executeCreate } = useApi<Product>()
const { loading: deleteLoading, execute: executeDelete } = useApi<void>()
const { success, error: showError } = useNotification()

const showForm = ref(false)
const formData = ref<CreateProductRequest>({
  name: '',
  purchasePrice: 0,
  sellingPrice: 0
})

const loadProducts = async () => {
  const result = await execute(() => productsApi.getAll())
  if (result) {
    products.value = result
  }
}

const createProduct = async () => {
  if (!formData.value.name || formData.value.purchasePrice <= 0 || formData.value.sellingPrice <= 0) {
    showError('Please fill all fields with valid values')
    return
  }
  
  const result = await executeCreate(() => productsApi.create(formData.value))
  if (result) {
    formData.value = { name: '', purchasePrice: 0, sellingPrice: 0 }
    showForm.value = false
    success('Product created successfully')
    await loadProducts()
  }
}

const deleteProduct = async (id: string) => {
  if (!confirm('Are you sure you want to delete this product?')) {
    return
  }
  
  await executeDelete(() => productsApi.delete(id))
  if (!deleteLoading.value) {
    success('Product deleted successfully')
    await loadProducts()
  }
}

onMounted(() => {
  loadProducts()
})
</script>

<template>
  <div class="bg-white shadow rounded-lg p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Products</h2>
      <button
        @click="showForm = !showForm"
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
      >
        {{ showForm ? 'Cancel' : 'Add Product' }}
      </button>
    </div>

    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded">
      <p class="text-red-800">{{ error }}</p>
    </div>

    <div v-if="showForm" class="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
      <h3 class="text-lg font-semibold mb-4">Create New Product</h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            v-model="formData.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Product name"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
          <input
            v-model.number="formData.purchasePrice"
            type="number"
            step="0.01"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
          <input
            v-model.number="formData.sellingPrice"
            type="number"
            step="0.01"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>
      </div>
      <div class="mt-4">
        <button
          @click="createProduct"
          :disabled="createLoading"
          class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400 transition-colors"
        >
          {{ createLoading ? 'Creating...' : 'Create Product' }}
        </button>
      </div>
    </div>

    <div v-if="loading && products.length === 0" class="text-center py-8">
      <p class="text-gray-500">Loading products...</p>
    </div>

    <div v-else-if="products.length === 0" class="text-center py-8">
      <p class="text-gray-500">No products found. Create your first product!</p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Price</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin %</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="product in products" :key="product.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ product.name }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatCurrency(product.purchasePrice) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatCurrency(product.sellingPrice) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatCurrency(product.margin) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatPercentage(product.marginPercentage) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
              <button
                @click="deleteProduct(product.id)"
                class="text-red-600 hover:text-red-900 transition-colors"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
