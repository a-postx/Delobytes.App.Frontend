<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { ComputedRef } from 'vue'
import { Plus, RefreshCw, Download, ArrowRightLeft } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import type { ProductImportJob, GetProductImportsResponse, Connection, ProductImportJobType } from '@/types'
import {
  ProductImportStatus,
  PRODUCTS_IMPORT_JOB_TYPE,
  OZON_PRODUCTS_IMPORT_JOB_TYPE,
} from '@/types'
import { usePermissions } from '@/composables/usePermissions'
import { usePolling } from '@/composables/usePolling'
import { useAsyncResource } from '@/composables/useAsyncResource'
import { describeFailure } from '@/composables/useApiFailureCopy'
import type { FailureCopy } from '@/composables/useApiFailureCopy'
import type { ApiError } from '@/types/errors'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { isAdministrator } = usePermissions()

/**
 * Шаблоны каналов, из которых возможен импорт карточек. Публикуемые задания ограничены администратором
 * (StartJobCommand), поэтому права на запись товаров здесь не дают права на запуск импорта.
 */
const IMPORTABLE_TEMPLATE_CODES: readonly string[] = ['wildberries', 'ozon']

const jobTypeByTemplateCode: Record<string, ProductImportJobType> = {
  wildberries: PRODUCTS_IMPORT_JOB_TYPE,
  ozon: OZON_PRODUCTS_IMPORT_JOB_TYPE,
}

const marketplaceByJobType: Record<string, string> = {
  [PRODUCTS_IMPORT_JOB_TYPE]: 'Wildberries',
  [OZON_PRODUCTS_IMPORT_JOB_TYPE]: 'Ozon',
}

/** Результат объединённой загрузки: без фиктивных page/pageSize, которых у двух независимых выборок нет. */
interface CombinedJobsResult {
  jobs: ProductImportJob[]
}

/**
 * Два независимых ресурса: упавшее подключение не должно скрывать историю задач
 * и наоборот. Каждый сам показывает свой сбой, поэтому один запрос не обнуляет второй.
 */
const jobsResource = useAsyncResource<CombinedJobsResult>({
  fetcher: async () => {
    const [wildberries, ozon] = await Promise.all([
      integrationsApi.getProductImports(PRODUCTS_IMPORT_JOB_TYPE),
      integrationsApi.getProductImports(OZON_PRODUCTS_IMPORT_JOB_TYPE),
    ])
    return { jobs: mergeJobs(wildberries, ozon) }
  },
  fallbackMessage: 'Не удалось загрузить задачи импорта',
})

const connectionsResource = useAsyncResource<Connection[]>({
  fetcher: () => integrationsApi.getConnections(),
  fallbackMessage: 'Не удалось загрузить подключения',
})

/**
 * Оба запроса обязательны: частичный ответ одного типа нельзя выдавать за полную историю,
 * поэтому сбой любого из них — сбой объединённой загрузки.
 */
const mergeJobs = (
  first: GetProductImportsResponse,
  second: GetProductImportsResponse,
): ProductImportJob[] =>
  [...first.jobs, ...second.jobs].sort((left, right) => {
    const byCreatedAt = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    if (byCreatedAt !== 0) {
      return byCreatedAt
    }
    return left.id.localeCompare(right.id)
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

const connectionsLoaded: ComputedRef<boolean> = computed<boolean>(
  () => connectionsResource.status.value === 'success',
)

const selectContentClass = 'z-[110] pointer-events-auto'

const isManualRefreshing = ref<boolean>(false)
const isLaunchDialogOpen = ref<boolean>(false)
const isStarting = ref<boolean>(false)
const selectedConnectionId = ref<string>('')

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

const isJobActive = (job: ProductImportJob): boolean =>
  job.status === ProductImportStatus.Pending || job.status === ProductImportStatus.Running

const hasActiveJobs = computed<boolean>(() => jobs.value.some(isJobActive))

const activeEligibleConnections = computed<Connection[]>(() =>
  connections.value.filter(
    c => c.isActive && IMPORTABLE_TEMPLATE_CODES.includes(c.templateCode),
  ),
)

const connectionById = computed<Map<string, Connection>>(
  () => new Map(connections.value.map(c => [c.id, c])),
)

const jobTypeForConnection = (connection: Connection): ProductImportJobType | null =>
  jobTypeByTemplateCode[connection.templateCode] ?? null

/** Задание этого подключения и его типа импорта уже в работе — запускать второе нельзя. */
const hasRunningJobFor = (connection: Connection): boolean => {
  const type = jobTypeForConnection(connection)
  if (!type) {
    return false
  }
  return jobs.value.some(job => job.connectionId === connection.id && job.type === type && isJobActive(job))
}

const selectedConnection = computed<Connection | null>(() =>
  activeEligibleConnections.value.find(c => c.id === selectedConnectionId.value) ?? null,
)

const selectedJobType = computed<ProductImportJobType | null>(() =>
  selectedConnection.value ? jobTypeForConnection(selectedConnection.value) : null,
)

const canSubmitLaunch = computed<boolean>(() =>
  isAdministrator.value
  && !isStarting.value
  && selectedConnection.value !== null
  && selectedJobType.value !== null
  && !hasRunningJobFor(selectedConnection.value),
)

const shortConnectionId = (id: string): string => id.slice(0, 8)

const connectionOptionLabel = (connection: Connection): string => {
  const marketplace = connection.templateDisplayName || connection.templateCode
  return `${marketplace} · ${shortConnectionId(connection.id)}`
}

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

/** Неизвестный тип не выдаём за Wildberries: показываем сам токен. */
const marketplaceForJob = (job: ProductImportJob): string =>
  marketplaceByJobType[job.type] ?? job.type

const connectionLabelForJob = (job: ProductImportJob): string => {
  const connection = connectionById.value.get(job.connectionId)
  if (!connection) {
    return `Подключение удалено · ${shortConnectionId(job.connectionId)}`
  }
  return connectionOptionLabel(connection)
}

const loadConnections = async (): Promise<void> => {
  await connectionsResource.load()
}

/**
 * Возвращает признак успеха для usePolling: загрузчик резолвится в null и не бросает,
 * поэтому бэкофф и остановку опроса можно включить только по явному результату.
 */
const loadJobs = async (): Promise<boolean> => {
  const result: CombinedJobsResult | null = await jobsResource.load()
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

const openLaunchDialog = (): void => {
  if (!isAdministrator.value || activeEligibleConnections.value.length === 0) {
    return
  }
  // Выбор всегда начинается пустым: целевой маркетплейс должен быть явным.
  selectedConnectionId.value = ''
  isLaunchDialogOpen.value = true
}

const handleLaunchDialogOpenChange = (open: boolean): void => {
  // Пока POST в полёте, диалог не закрываем: иначе пользователь потеряет контекст ошибки.
  if (isStarting.value && !open) {
    return
  }
  isLaunchDialogOpen.value = open
  if (!open) {
    selectedConnectionId.value = ''
  }
}

const startImport = async (): Promise<void> => {
  const connection = selectedConnection.value
  const type = selectedJobType.value

  if (!connection || !type || !canSubmitLaunch.value) {
    return
  }

  isStarting.value = true
  try {
    await integrationsApi.createProductImport(type, { connectionId: connection.id })
    toast.success(`Импорт карточек ${marketplaceByJobType[type] ?? connection.templateDisplayName} запущен`)
    isLaunchDialogOpen.value = false
    selectedConnectionId.value = ''
    await loadJobs()
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
        <p class="text-sm text-muted-foreground">История задач импорта карточек из Wildberries и Ozon.</p>
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
          v-if="isAdministrator"
          :disabled="isInitialLoading || activeEligibleConnections.length === 0"
          @click="openLaunchDialog"
          class="gap-2"
        >
          <Plus class="size-4" />
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

    <!-- Баннер: нет ни одного активного подключения с поддержкой импорта карточек -->
    <div
      v-else-if="!isInitialLoading && connectionsLoaded && activeEligibleConnections.length === 0"
      class="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4"
    >
      <p class="text-sm text-muted-foreground">
        Для запуска импорта необходимо активное подключение Wildberries или Ozon.
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
          <h3 class="font-semibold">Задач импорта ещё нет</h3>
          <p class="text-sm text-muted-foreground">
            Запустите первый импорт карточек из Wildberries или Ozon.
          </p>
        </div>
        <Button
          v-if="isAdministrator && activeEligibleConnections.length > 0"
          :disabled="isInitialLoading"
          @click="openLaunchDialog"
          variant="outline"
          class="gap-2 mt-2"
        >
          <Plus class="size-4" />
          Запустить импорт
        </Button>
        <Button
          v-else-if="isAdministrator && connectionsLoaded"
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
            <TableHead>Маркетплейс</TableHead>
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
            <TableCell class="whitespace-nowrap">
              <Badge variant="secondary">{{ marketplaceForJob(job) }}</Badge>
            </TableCell>
            <TableCell>
              <span
                class="text-sm"
                :title="job.connectionId"
              >
                {{ connectionLabelForJob(job) }}
              </span>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Spinner
                  v-if="isJobActive(job)"
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

    <!-- Диалог запуска импорта -->
    <DialogRoot :open="isLaunchDialogOpen" @update:open="handleLaunchDialogOpenChange">
      <DialogPortal>
        <DialogOverlay class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-black/80" />
        <DialogContent
          class="data-[state=open]:animate-contentShow bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]"
          @escape-key-down="isStarting ? $event.preventDefault() : undefined"
        >
          <DialogTitle class="text-foreground m-0 text-lg font-semibold">
            Запустить импорт карточек
          </DialogTitle>
          <DialogDescription class="text-muted-foreground mt-2 mb-4 text-sm leading-normal">
            Импорт карточек из выбранного подключения. Задача выполняется в фоне, прогресс и результат
            появятся в истории ниже.
          </DialogDescription>

          <div class="flex flex-col gap-1">
            <Label for="import-connection">Подключение</Label>
            <Select v-model="selectedConnectionId">
              <SelectTrigger id="import-connection" class="mt-1 w-full">
                <SelectValue placeholder="Выберите подключение" />
              </SelectTrigger>
              <SelectContent :class="selectContentClass">
                <SelectItem
                  v-for="connection in activeEligibleConnections"
                  :key="connection.id"
                  :value="connection.id"
                  :disabled="hasRunningJobFor(connection)"
                >
                  <span class="flex flex-col">
                    <span>{{ connectionOptionLabel(connection) }}</span>
                    <span v-if="hasRunningJobFor(connection)" class="text-xs text-muted-foreground">
                      Импорт уже выполняется
                    </span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p
              v-if="selectedConnection && selectedConnection.templateCode === 'ozon'"
              class="text-xs text-muted-foreground mt-1"
            >
              Будут импортированы только видимые карточки, доступные к продаже на Ozon.
            </p>
            <p
              v-if="selectedConnection && hasRunningJobFor(selectedConnection)"
              class="text-xs text-warning mt-1"
            >
              Для этого подключения импорт уже выполняется. Дождитесь завершения текущей задачи.
            </p>
          </div>

          <div class="mt-6 flex justify-end gap-2">
            <DialogClose as-child>
              <Button variant="outline" :disabled="isStarting">
                Отмена
              </Button>
            </DialogClose>
            <Button :disabled="!canSubmitLaunch" @click="startImport" class="gap-2">
              <Spinner v-if="isStarting" class="size-4" />
              Запустить импорт
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </div>
</template>
