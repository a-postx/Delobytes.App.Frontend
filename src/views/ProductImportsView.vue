<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { ComputedRef } from 'vue'
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
import type { ProductImportJob, GetProductImportsResponse, Connection } from '@/types'
import { ProductImportStatus } from '@/types'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { usePolling } from '@/composables/usePolling'
import { useAsyncResource } from '@/composables/useAsyncResource'
import { describeFailure } from '@/composables/useApiFailureCopy'
import type { FailureCopy } from '@/composables/useApiFailureCopy'
import type { ApiError } from '@/types/errors'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { canWrite } = useCurrentUser()

/**
 * Два независимых ресурса: упавшее подключение не должно скрывать историю задач
 * и наоборот. Каждый сам показывает свой сбой, поэтому один запрос не обнуляет второй.
 */
const jobsResource = useAsyncResource<GetProductImportsResponse>({
  fetcher: () => integrationsApi.getProductImports(),
  fallbackMessage: 'Не удалось загрузить задачи импорта',
})

const connectionsResource = useAsyncResource<Connection[]>({
  fetcher: () => integrationsApi.getConnections(),
  fallbackMessage: 'Не удалось загрузить подключения',
})

const jobs: ComputedRef<ProductImportJob[]> = computed<ProductImportJob[]>(
  () => jobsResource.data.value?.jobs ?? [],
)
const connections: ComputedRef<Connection[]> = computed<Connection[]>(
  () => connectionsResource.data.value ?? [],
)
/**
 * Скелетон показываем только пока данных нет вовсе: при фоновом опросе таблица обязана
 * оставаться на месте, иначе каждая итерация размонтирует её.
 */
const isInitialLoading: ComputedRef<boolean> = computed<boolean>(
  () => jobsResource.isInitialLoading.value || connectionsResource.isInitialLoading.value,
)
/** Сбой задач без данных: показываем блок ошибки на месте таблицы. */
const jobsFailureCopy: ComputedRef<FailureCopy | null> = computed<FailureCopy | null>(() => {
  const error: ApiError | null = jobsResource.error.value
  return error && jobsResource.isLoadingError.value
    ? describeFailure(error, 'Не удалось загрузить задачи импорта')
    : null
})

/** Сбой подключений: своей таблицы у них нет, поэтому показываем отдельным баннером. */
const connectionsFailureCopy: ComputedRef<FailureCopy | null> = computed<FailureCopy | null>(() => {
  const error: ApiError | null = connectionsResource.error.value
  return error && connectionsResource.isLoadingError.value
    ? describeFailure(error, 'Не удалось загрузить подключения')
    : null
})

/** Подключения загружены успешно хотя бы раз — можно судить об отсутствии активного WB. */
const connectionsLoaded: ComputedRef<boolean> = computed<boolean>(
  () => connectionsResource.status.value === 'success',
)

const isStarting = ref<boolean>(false)
const isManualRefreshing = ref<boolean>(false)

/** Время последнего успешного опроса в формате ЧЧ:ММ:СС. */
const lastUpdatedLabel: ComputedRef<string | null> = computed<string | null>(() => {
  const updatedAt: number | null = jobsResource.lastUpdatedAt.value
  if (updatedAt === null) {
    return null
  }
  return new Date(updatedAt).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
})

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

/**
 * Backend JobDto больше не содержит агрегированного RecordsProcessed (Stage 13): счётчик
 * восстанавливается на фронтенде как сумма Created/Updated/Skipped/Failed.
 */
const recordsProcessed = (job: ProductImportJob): number => {
  return job.recordsCreated + job.recordsUpdated + job.recordsSkipped + job.recordsFailed
}

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
    default:
      return 'secondary'
  }
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case ProductImportStatus.Pending: return 'Ожидание'
    case ProductImportStatus.Running: return 'Выполняется'
    case ProductImportStatus.Success: return 'Успешно'
    case ProductImportStatus.Failed: return 'Ошибка'
    case ProductImportStatus.Cancelled: return 'Отменено'
    default: return status
  }
}

const loadConnections = async (): Promise<void> => {
  await connectionsResource.load()
}

/**
 * Возвращает признак успеха для usePolling: загрузчик резолвится в null и не бросает,
 * поэтому бэкофф и остановку опроса можно включить только по явному результату.
 */
const loadJobs = async (): Promise<boolean> => {
  const result: GetProductImportsResponse | null = await jobsResource.load()
  return result !== null
}

const loadData = async (): Promise<void> => {
  await Promise.all([loadConnections(), loadJobs()])
}

// Polling останавливается сам: когда нет активных задач, после серии неудачных запросов
// и при размонтировании компонента (onUnmounted внутри usePolling).
const { start: startPolling } = usePolling(loadJobs, {
  interval: 2000,
  shouldContinue: () => hasActiveJobs.value,
  onError: (err) => console.error('Polling error:', err),
})

const startImport = async (): Promise<void> => {
  if (!activeWildberriesConnection.value) {
    toast.error('Нет активного подключения Wildberries')
    void router.push({ name: 'sales-channels' })
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
  isManualRefreshing.value = true
  try {
    await loadJobs()
    if (hasActiveJobs.value) {
      startPolling()
    }
  } finally {
    isManualRefreshing.value = false
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
        <span v-if="lastUpdatedLabel" class="text-xs text-muted-foreground tabular-nums">
          Обновлено в {{ lastUpdatedLabel }}
        </span>
        <Button
          variant="outline"
          size="icon"
          :disabled="isInitialLoading || isManualRefreshing"
          @click="refreshJobs"
          aria-label="Обновить"
        >
          <RefreshCw class="size-4" :class="{ 'animate-spin': isManualRefreshing }" />
        </Button>
        <Button
          v-if="canWrite"
          :disabled="isStarting || isInitialLoading || !activeWildberriesConnection"
          @click="startImport"
          class="gap-2"
        >
          <Spinner v-if="isStarting" class="size-4" />
          <Plus v-else class="size-4" />
          Запустить импорт
        </Button>
      </div>
    </div>

    <!-- Сбой подключений: их список грузится отдельно от задач, поэтому показываем баннером -->
    <div
      v-if="connectionsFailureCopy"
      class="rounded-xl border border-destructive/40 bg-destructive/5 p-4 flex items-center justify-between gap-4"
    >
      <div class="flex flex-col gap-1">
        <p class="text-sm font-medium">{{ connectionsFailureCopy.title }}</p>
        <p class="text-sm text-muted-foreground">{{ connectionsFailureCopy.description }}</p>
      </div>
      <Button variant="outline" size="sm" class="shrink-0" @click="loadConnections">
        Повторить
      </Button>
    </div>

    <!-- Баннер: нет подключения WB -->
    <div
      v-else-if="!isInitialLoading && connectionsLoaded && !activeWildberriesConnection"
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

    <!-- Skeleton при первой загрузке: только пока данных ещё нет -->
    <div v-if="isInitialLoading" class="flex flex-col gap-2">
      <Skeleton v-for="n in 4" :key="n" class="h-10 w-full rounded-lg" />
    </div>

    <!-- Ошибка загрузки: важнее пустого состояния, иначе недоступный бэкенд выглядит как «задач ещё нет» -->
    <ErrorState
      v-else-if="jobsFailureCopy"
      variant="embedded"
      :title="jobsFailureCopy.title"
      :description="jobsFailureCopy.description"
      retry-label="Повторить"
      @retry="loadData"
    />

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
              {{ recordsProcessed(job) }}
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
