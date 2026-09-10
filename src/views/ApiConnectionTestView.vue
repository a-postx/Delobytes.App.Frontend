<script setup lang="ts">
import { apiClient, healthApi } from '@/services/api'
import { useApi } from '@/composables/useApi'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

const { data: statusResult, loading: statusLoading, error: statusError, execute, reset } = useApi()

const testStatus = async (): Promise<void> => {
  reset()
  await execute(() => healthApi.checkStatus())
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <div class="flex flex-col gap-2">
      <h1 class="text-xl font-bold">API Connection Test</h1>
      <p class="text-muted-foreground">Проверка подключения к бэкенду.</p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Эндпоинт /status</CardTitle>
        <CardDescription>
          Адрес:
          <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
            {{ apiClient.getBaseUrl() }}/status
          </code>
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div>
          <Button @click="testStatus" :disabled="statusLoading" class="gap-2">
            <Spinner v-if="statusLoading" size="sm" />
            {{ statusLoading ? 'Проверяем...' : 'Проверить соединение' }}
          </Button>
        </div>

        <div
          v-if="statusError"
          class="rounded-md border border-destructive/40 bg-destructive/10 p-4"
        >
          <p class="text-sm font-semibold text-destructive">Ошибка</p>
          <p class="mt-1 text-sm text-destructive/80">{{ statusError }}</p>
        </div>

        <div
          v-if="statusResult"
          class="rounded-md border border-border bg-muted/50 p-4"
        >
          <p class="mb-2 text-sm font-semibold text-foreground">Ответ</p>
          <pre class="overflow-x-auto whitespace-pre-wrap break-all font-mono text-sm text-foreground">{{
            JSON.stringify(statusResult, null, 2)
          }}</pre>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
