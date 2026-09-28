<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { Plus, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'vue-sonner'
import { integrationsApi } from '@/services/api'
import type { ProductImportJob, Connection } from '@/types'
import { ProductImportStatus } from '@/types'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useRouter } from 'vue-router'

const router = useRouter()
const { canWrite } = useCurrentUser()

const jobs = ref<ProductImportJob[]>([])
const connections = ref<Connection[]>([])
const isLoading = ref<boolean>(true)
const isStarting = ref<boolean>(false)

let pollingInterval: number | null = null

const activeWildberriesConnection = computed(() => {
  return connections.value.find(c => c.isActive && c.templateCode === 'wildberries')
})

const hasActiveJobs = computed(() => {
  return jobs.value.some(j => 
    j.status === ProductImportStatus.Pending || j.status === ProductImportStatus.Running
  )
})

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'success' | 'warning' => {
  switch (status) {
    case ProductImportStatus.Success:
      return 'success'
    case ProductImportStatus.Running:
      return 'secondary'
    case ProductImportStatus.Failed:
      return 'destructive'
    case ProductImportStatus.PartialSuccess:
      return 'warning'
    case ProductImportStatus.Cancelled:
      return 'secondary'
    default:
      return 'secondary'
  }
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case ProductImportStatus.Pending:
      return 'Ожидание'
    case ProductImportStatus.Running:
      return 'Выполняется'
    case ProductImportStatus.Success:
      return 'Успешно'
    case ProductImportStatus.PartialSuccess:
      return 'Частичный успех'
    case ProductImportStatus.Failed:
      return 'Ошибка'
    case ProductImportStatus.Cancelled:
      return 'Отменено'
    default:
      return status
  }
}

const loadConnections = async (): Promise<void> => {
  try {
    connections.value = await integrationsApi.getConnections()
  } catch (error) {
    console.error('Failed to load connections:', error)
    toast.error('Не удалось загрузить подключения')
  }
}

const loadJobs = async (): Promise<void> => {
  try {
    const response = await integrationsApi.getProductImports()
    jobs.value = response.items
  } catch (error) {
    console.error('Failed to load import jobs:', error)
    toast.error('Не удалось загрузить задачи импорта')
  }
}

const loadData = async (): Promise<void> => {
  isLoading.value = true
  try {
    await Promise.all([loadConnections(), loadJobs()])
  } finally {
    isLoading.value = false
  }
}

const startImport = async (): Promise<void> => {
  if (!activeWildberriesConnection.value) {
    toast.error('Нет активного подключения Wildberries')
    router.push({ name: 'sales-channels' })
    return
  }

  isStarting.value = true
  try {
    await integrationsApi.createProductImport({
      connectionId: activeWildberriesConnection.value.id,
    })
    toast.success('Импорт запущен')
    await loadJobs()
  } catch (error: unknown) {
    const apiError = error as { message?: string }
    const message = apiError?.message ?? 'Не удалось запустить импорт'
    toast.error(message)
  } finally {
    isStarting.value = false
  }
}

const refreshJobs = async (): Promise<void> => {
  await loadJobs()
}

const startPolling = (): void => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
  }
  pollingInterval = window.setInterval(() => {
    if (hasActiveJobs.value) {
      loadJobs()
    } else {
      stopPolling()
    }
  }, 3000)
}

const stopPolling = (): void => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

onMounted(async () => {
  await loadData()
  if (hasActiveJobs.value) {
    startPolling()
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="container mx-auto py-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Импорт товаров</h1>
        <p class="text-muted-foreground mt-2">
          История задач импорта товаров из внешних систем
        </p>
      </div>
      <div class="flex gap-2">
        <Button
          variant="outline"
          size="default"
          @click="refreshJobs"
          :disabled="isLoading"
        >
          <RefreshCw :class="{ 'animate-spin': isLoading }" class="h-4 w-4" />
        </Button>
        <Button
          v-if="canWrite"
          @click="startImport"
          :disabled="isStarting || !activeWildberriesConnection"
        >
          <Plus class="h-4 w-4 mr-2" />
          Запустить импорт
        </Button>
      </div>
    </div>

    <div v-if="!activeWildberriesConnection && !isLoading" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <p class="text-sm text-yellow-800">
        Для запуска импорта необходимо активное подключение Wildberries.
        <router-link :to="{ name: 'sales-channels' }" class="underline font-medium">
          Настроить подключение
        </router-link>
      </p>
    </div>

    <div v-if="isLoading" class="space-y-3">
      <Skeleton class="h-12 w-full" />
      <Skeleton class="h-12 w-full" />
      <Skeleton class="h-12 w-full" />
    </div>

    <div v-else-if="jobs.length === 0" class="text-center py-12 bg-muted/50 rounded-lg">
      <p class="text-muted-foreground">Нет задач импорта</p>
      <p class="text-sm text-muted-foreground mt-1">
        Запустите первый импорт товаров из Wildberries
      </p>
    </div>

    <div v-else class="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Создана</TableHead>
            <TableHead>Подключение</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Завершена</TableHead>
            <TableHead class="text-right">Обработано</TableHead>
            <TableHead class="text-right">Создано</TableHead>
            <TableHead class="text-right">Обновлено</TableHead>
            <TableHead class="text-right">Пропущено</TableHead>
            <TableHead class="text-right">Ошибки</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="job in jobs" :key="job.id">
            <TableCell class="font-medium">
              {{ formatDate(job.createdAt) }}
            </TableCell>
            <TableCell>
              <span class="text-sm">
                {{ connections.find(c => c.id === job.connectionId)?.templateDisplayName ?? '—' }}
              </span>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Badge :variant="getStatusBadgeVariant(job.status)">
                  {{ getStatusLabel(job.status) }}
                </Badge>
                <Spinner v-if="job.status === ProductImportStatus.Running" class="h-4 w-4" />
              </div>
            </TableCell>
            <TableCell>
              {{ formatDate(job.completedAt) }}
            </TableCell>
            <TableCell class="text-right">
              {{ job.recordsProcessed }}
            </TableCell>
            <TableCell class="text-right">
              {{ job.recordsCreated }}
            </TableCell>
            <TableCell class="text-right">
              {{ job.recordsUpdated }}
            </TableCell>
            <TableCell class="text-right">
              {{ job.recordsSkipped }}
            </TableCell>
            <TableCell class="text-right">
              <span :class="{ 'text-destructive font-medium': job.recordsFailed > 0 }">
                {{ job.recordsFailed }}
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <div v-if="jobs.some(j => j.errorMessage)" class="space-y-2">
      <h3 class="text-sm font-medium">Ошибки импорта</h3>
      <div
        v-for="job in jobs.filter(j => j.errorMessage)"
        :key="job.id"
        class="bg-destructive/10 border border-destructive/20 rounded-lg p-3"
      >
        <div class="flex items-start gap-2">
          <Badge variant="destructive" class="shrink-0">
            {{ formatDate(job.createdAt) }}
          </Badge>
          <p class="text-sm text-destructive">
            {{ job.errorMessage }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>