<script setup lang="ts">
import { ref } from 'vue'
import { apiClient } from '@/services/api'

const statusResult = ref<string>('')
const statusLoading = ref(false)
const statusError = ref<string | null>(null)

const testStatus = async () => {
  statusLoading.value = true
  statusError.value = null
  statusResult.value = ''
  
  try {
    const response = await apiClient.checkStatus()
    statusResult.value = JSON.stringify(response, null, 2)
  } catch (error: any) {
    statusError.value = error.message || 'Failed to connect to API'
  } finally {
    statusLoading.value = false
  }
}
</script>

<template>
  <div class="bg-white shadow rounded-lg p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-4">API Connection Test</h2>
    
    <div class="mb-6">
      <p class="text-gray-600 mb-4">
        Test the connection to the backend API at <code class="bg-gray-100 px-2 py-1 rounded">{{ apiClient.getBaseUrl() }}/status</code>
      </p>
      
      <button
        @click="testStatus"
        :disabled="statusLoading"
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
      >
        {{ statusLoading ? 'Testing...' : 'Test /status endpoint' }}
      </button>
    </div>

    <div v-if="statusError" class="mb-4 p-4 bg-red-50 border border-red-200 rounded">
      <p class="text-red-800 font-semibold">Error:</p>
      <p class="text-red-600">{{ statusError }}</p>
    </div>

    <div v-if="statusResult" class="mb-4">
      <p class="text-green-800 font-semibold mb-2">Success:</p>
      <pre class="bg-gray-50 p-4 rounded border border-gray-200 overflow-x-auto text-sm">{{ statusResult }}</pre>
    </div>
  </div>
</template>
