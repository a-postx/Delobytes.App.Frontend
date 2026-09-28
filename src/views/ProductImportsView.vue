<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, RefreshCw, Download, ArrowRightLeft } from 'lucide-vue-next'
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
import { usePolling } from '@/composables/usePolling'
import { useRouter } from 'vue-router'

const router = useRouter()
const { canWrite } = useCurrentUser()

const jobs = ref<ProductImportJob[]>([])
const connections = ref<Connection[]>([])
const isLoading = ref<boolean>(true)
const isStarting = ref<boolean>(false)

const activeWildberriesConnection = computed<Connection | null>(() => {
  return connections.value.find(c => c.isActive && c.templateCode === 'wildberries') ?? null
})

const hasActiveJobs = computed<boolean>(() => {
  return jobs.value.some(
    j => j.status === ProductImportStatus.Pending || j.status === ProductImportStatus.Running,
  )
})

const connectionById = computed<Map<string, Connection>>(
  () => new Map(connections.value.map(c => [c.id, c])),
)

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

const getStatusBadgeVariant = (
  status: string,
): 'default' | 'secondary' | 'destructive' | 'success' | 'warning' => {
  switch (status) {
    case ProductImportStatus.Success:
      return 'success'
    case ProductImportStatus.Running:
      return 'secondary'
    case ProductImportStatus.Failed:
      return 'destructive'
    case ProductImportStatus.PartialSuccess:
      return 'warning'
    default:
      return 'secondary'
  }
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case ProductImportStatus.Pending: return 'Ожидание'
    case ProductImportStatus.Running: return 'Выполняется'
    case ProductImportStatus.Success: return 'Успешно'
    case ProductImportStatus.PartialSuccess: return 'Частичный успех'
    case ProductImportStatus.Failed: return 'Ошибка'
    case ProductImportStatus.Cancelled: return 'Отменено'
    default: return status
  }
}

const loadConnections = async (): Promise<void> => {
  try {
    connections.value = await integrationsApi.getConnections()
  } catch (error) {
    console.error('Failed to load connections:', error)
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

// Polling останавливается автоматически когда нет активных задач
// и при размонтировании компонента (onUnmounted внутри usePolling)
const { start: startPolling } = usePolling(loadJobs, {
  interval: 2000,
  shouldContinue: () => hasActiveJobs.value,
  onError: (err) => console.error('Polling error:', err),
})

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
    // Запускаем polling после создания новой задачи
    if (hasActiveJobs.value) {
      startPolling()
    }
  } catch (error: unknown) {
    const apiError = error as { message?: string }
    toast.error(apiError?.message ?? 'Не удалось запустить импорт')
  } finally {
    isStarting.value = false
  }
}

const refreshJobs = async (): Promise<void> => {
  await loadJobs()
  if (hasActiveJobs.value) {
    startPolling()
  }
}

onMounted(async () => {
  await loadData()
  if (hasActiveJobs.value) {
    startPolling()
  }
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Шапка -->
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-bold">Импорт товаров</h1>
        <p class="text-sm text-muted-foreground">История задач импорта из внешних систем.</p>
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          :disabled="isLoading"
          @click="refreshJobs"
          aria-label="Обновить"
        >
          <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" />
        </Button>
        <Button
          v-if="canWrite"
          :disabled="isStarting || isLoading || !activeWildberriesConnection"
          @click="startImport"
          class="gap-2"
        >
          <Spinner v-if="isStarting" class="size-4" />
          <Plus v-else class="size-4" />
          Запустить импорт
        </Button>
      </div>
    </div>

    <!-- Баннер: нет подключения WB -->
    <div
      v-if="!isLoading && !activeWildberriesConnection"
      class="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4"
    >
      <p class="text-sm text-muted-foreground">
        Для запуска импорта необходимо активное подключение Wildberries.
      </p>
      <Button variant="outline" size="sm" class="shrink-0 gap-2" @click="router.push({ name: 'sales-channels' })">
        <ArrowRightLeft class="size-4" />
        Настроить интеграцию
      </Button>
    </div>

    <!-- Skeleton при загрузке -->
    <div v-if="isLoading" class="flex flex-col gap-2">
      <Skeleton v-for="n in 4" :key="n" class="h-10 w-full rounded-lg" />
    </div>

    <!-- Пустое состояние -->
    <div
      v-else-if="jobs.length === 0"
      class="rounded-xl border border-border bg-card p-12"
    >
      <div class="flex flex-col items-center justify-center gap-3 text-center">
        <div class="size-12 rounded-full bg-muted flex items-center justify-center">
          <Download class="size-6 text-muted-foreground" />
        </div>
        <div>
          <h3 class="font-semibold">Нет задач импорта</h3>
          <p class="text-sm text-muted-foreground">
            Запустите первый импорт товаров из Wildberries.
          </p>
        </div>
        <Button
          v-if="canWrite && activeWildberriesConnection"
          :disabled="isStarting"
          @click="startImport"
          variant="outline"
          class="gap-2 mt-2"
        >
          <Spinner v-if="isStarting" class="size-4" />
          <Plus v-else class="size-4" />
          Запустить импорт
        </Button>
        <Button
          v-else-if="canWrite && !activeWildberriesConnection"
          variant="outline"
          class="gap-2 mt-2"
          @click="router.push({ name: 'sales-channels' })"
        >
          <ArrowRightLeft class="size-4" />
          Настроить интеграцию
        </Button>
      </div>
    </div>

    <!-- Таблица задач -->
    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Создана</TableHead>
            <TableHead>Подключение</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Завершена</TableHead>
            <TableHead class="text-right tabular-nums">Обработано</TableHead>
            <TableHead class="text-right tabular-nums">Создано</TableHead>
            <TableHead class="text-right tabular-nums">Обновлено</TableHead>
            <TableHead class="text-right tabular-nums">Пропущено</TableHead>
            <TableHead class="text-right tabular-nums">Ошибок</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="job in jobs" :key="job.id" class="hover:bg-muted/50 transition-colors">
            <TableCell class="font-medium whitespace-nowrap">
              {{ formatDate(job.createdAt) }}
            </TableCell>
            <TableCell>
              <span class="text-sm">
                {{ connectionById.get(job.connectionId)?.templateDisplayName ?? '—' }}
              </span>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Spinner
                  v-if="job.status === ProductImportStatus.Running || job.status === ProductImportStatus.Pending"
                  class="size-3.5 shrink-0"
                />
                <Badge :variant="getStatusBadgeVariant(job.status)">
                  {{ getStatusLabel(job.status) }}
                </Badge>
              </div>
            </TableCell>
            <TableCell class="whitespace-nowrap text-sm text-muted-foreground">
              {{ formatDate(job.completedAt) }}
            </TableCell>
            <TableCell class="text-right tabular-nums text-sm">
              {{ job.recordsProcessed }}
            </TableCell>
            <TableCell class="text-right tabular-nums text-sm">
              {{ job.recordsCreated }}
            </TableCell>
            <TableCell class="text-right tabular-nums text-sm">
              {{ job.recordsUpdated }}
            </TableCell>
            <TableCell class="text-right tabular-nums text-sm">
              {{ job.recordsSkipped }}
            </TableCell>
            <TableCell class="text-right tabular-nums text-sm">
              <span :class="{ 'text-destructive font-medium': job.recordsFailed > 0 }">
                {{ job.recordsFailed }}
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
