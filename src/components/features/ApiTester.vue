<script setup lang="ts">
import { apiClient, healthApi } from '@/services/api'
import { useApi } from '@/composables/useApi'

const { data: statusResult, loading: statusLoading, error: statusError, execute } = useApi()

const testStatus = async () => {
  await execute(() => healthApi.checkStatus())
}
</script>

<template>
  <div class="bg-white shadow rounded-lg p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-4">API Connection Test</h2>
    
    <div class="mb-6">
      <p class="text-gray-600 mb-4">
        Test the connection to the backend API at 
        <code class="bg-gray-100 px-2 py-1 rounded font-mono text-sm">{{ apiClient.getBaseUrl() }}/status</code>
      </p>
      
      <button
        @click="testStatus"
        :disabled="statusLoading"
        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400 transition-colors"
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
      <pre class="bg-gray-100 p-4 rounded border border-gray-200 overflow-x-auto text-sm">{{ JSON.stringify(statusResult, null, 2) }}</pre>
    </div>
  </div>
</template>
