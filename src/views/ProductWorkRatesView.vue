<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { Plus, Trash2, Gauge, Pencil, History, X, ChevronDown, ChevronRight, SearchX } from 'lucide-vue-next'
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
  AlertDialogRoot,
  AlertDialogPortal,
} from 'reka-ui'
import {
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchInput } from '@/components/ui/search-input'
import { DataGridPagination } from '@/components/ui/data-grid'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusFilter } from '@/components/ui/status-filter'
import ProductCombobox from '@/components/products/ProductCombobox.vue'
import { toast } from 'vue-sonner'
import { productWorkRatesApi, catalogProductsApi, workRatesApi } from '@/services/api'
import type {
  ProductWorkRateItem,
  ProductWorkRateStatusCounts,
  CreateProductWorkRateRequest,
  UpdateProductWorkRateRequest,
  WorkRateItem,
} from '@/services/api'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useTenantMoney } from '@/composables/useTenantMoney'
import { useApiCall } from '@/composables/useApiCall'
import { ErrorCodes } from '@/types/errors'
import type { ApiError } from '@/types/errors'
import {
  countInactive,
  filterOptionsFromCounts,
  formatIsoDate,
  groupWorkRates,
  validateCreateForm,
  validateEditForm,
} from '@/utils/productWorkRates'
import type { WorkRateGroup } from '@/utils/productWorkRates'

const { canWrite } = useCurrentUser()
const { formatMoney } = useTenantMoney()

const items = ref<ProductWorkRateItem[]>([])
const workRates = ref<WorkRateItem[]>([])
const totalCount = ref<number>(0)
const statusCounts = ref<ProductWorkRateStatusCounts>({ active: 0, inactive: 0, all: 0 })
const hasEmptyCatalog = ref<boolean>(false)

const createDialogOpen = ref<boolean>(false)
const editDialogOpen = ref<boolean>(false)
const deleteDialogOpen = ref<boolean>(false)

const editTarget = ref<ProductWorkRateItem | null>(null)
const deleteTarget = ref<ProductWorkRateItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)
/** Диалог, открытый кнопкой «Новая версия» строки, привязан к товару этой строки: менять его нельзя. */
const isProductLocked = ref<boolean>(false)
const lockedProductName = ref<string>('')

const statusFilter = ref<'all' | 'active' | 'inactive'>('active')
const searchQuery = ref<string>('')

/**
 * Срез списка считает сервер, поэтому состояние пагинации живёт на странице,
 * а не внутри грида: грид отсутствует, остаётся только футер `DataGridPagination`.
 */
const pagination = ref<{ pageIndex: number; pageSize: number }>({ pageIndex: 0, pageSize: 25 })

/** Товары, чей архив версий раскрыт вручную. Сбрасывается при смене страницы, фильтра и поиска. */
const expandedGroups = ref<Set<string>>(new Set())

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const SEARCH_DEBOUNCE_MS = 300

const statusByFilter: Record<'all' | 'active' | 'inactive', 'Active' | 'All' | 'Inactive'> = {
  active: 'Active',
  all: 'All',
  inactive: 'Inactive',
}

const today = (): string => new Date().toISOString().slice(0, 10)

const form = ref({ productId: '', workRateId: '', assemblyRatePerDay: 0, validFrom: today() })
const editForm = ref({ workRateId: '', assemblyRatePerDay: 0, validFrom: '' })

const groups = computed(() => groupWorkRates(items.value))

const filterOptions = computed(() => filterOptionsFromCounts(statusCounts.value))

const columnCount = computed<number>(() => (canWrite.value ? 6 : 5))

const isSearchActive = computed<boolean>(() => searchQuery.value.trim().length > 0)

const isNewRateDateInPast = computed<boolean>(() => {
  if (!form.value.validFrom) {
    return false
  }
  return form.value.validFrom < today()
})

const { loading: isLoading, execute: fetchData } = useApiCall({
  fallbackMessage: 'Не удалось загрузить данные',
})

const conflictMessage = 'Запись была изменена другим пользователем. Закройте диалог и попробуйте снова.'

const { execute: createRate } = useApiCall({
  fallbackMessage: 'Не удалось создать запись нормы выработки',
  errorHandlers: {
    [ErrorCodes.Catalog.ProductWorkRateValidFromConflict]: (error: ApiError) => {
      toast.error(error.message || 'Версия с такой датой начала уже существует')
    },
    [ErrorCodes.Common.Conflict]: () => {
      toast.error(conflictMessage)
      createDialogOpen.value = false
      void loadRates()
    },
  },
})

const { execute: updateRate } = useApiCall({
  fallbackMessage: 'Не удалось сохранить изменения',
  errorHandlers: {
    [ErrorCodes.Catalog.ProductWorkRateValidFromConflict]: (error: ApiError) => {
      toast.error(error.message || 'Версия с такой датой начала уже существует')
    },
    [ErrorCodes.Catalog.ProductWorkRateValidFromNotLatest]: (error: ApiError) => {
      toast.error(error.message || 'Дата начала действия должна быть позже даты предыдущей версии')
    },
    [ErrorCodes.Catalog.ProductWorkRateNotFound]: () => {
      toast.error('Запись больше не активна и не может быть отредактирована')
      editDialogOpen.value = false
      void loadRates()
    },
    [ErrorCodes.Common.Conflict]: () => {
      toast.error(conflictMessage)
      editDialogOpen.value = false
      void loadRates()
    },
  },
})

const { execute: deleteRate } = useApiCall({
  fallbackMessage: 'Не удалось удалить запись',
})

const loadRates = async (): Promise<void> => {
  await fetchData(async () => {
    const response = await productWorkRatesApi.getAll({
      status: statusByFilter[statusFilter.value],
      search: searchQuery.value.trim() || undefined,
      page: pagination.value.pageIndex + 1,
      pageSize: pagination.value.pageSize,
      includeCounts: true,
    })
    items.value = response.items
    totalCount.value = response.totalCount ?? response.items.length
    if (response.statusCounts) {
      statusCounts.value = {
        active: response.statusCounts.active,
        inactive: response.statusCounts.inactive,
        all: response.statusCounts.all,
      }
    }
    return response
  })
}

/**
 * Каталог нужен только как признак «есть ли куда заводить норму». Полная выгрузка товаров
 * на открытии страницы не грузится: хватает одной строки со счётчиками.
 */
const loadCatalogProbe = async (): Promise<void> => {
  try {
    const probe = await catalogProductsApi.getAll(undefined, {
      page: 1,
      pageSize: 1,
      includeCounts: true,
    })
    hasEmptyCatalog.value = (probe.statusCounts?.all ?? 0) === 0
  } catch {
    hasEmptyCatalog.value = false
  }
}

const loadWorkRates = async (): Promise<void> => {
  try {
    const response = await workRatesApi.getAll()
    workRates.value = response.items
  } catch {
    workRates.value = []
  }
}

onMounted(async () => {
  await Promise.all([loadRates(), loadWorkRates(), loadCatalogProbe()])
})

watch(statusFilter, () => {
  expandedGroups.value = new Set()
  pagination.value = { ...pagination.value, pageIndex: 0 }
  void loadRates()
})

watch(
  [() => pagination.value.pageIndex, () => pagination.value.pageSize],
  ([pageIndex, pageSize], [previousPageIndex, previousPageSize]) => {
    if (pageIndex === previousPageIndex && pageSize === previousPageSize) {
      return
    }
    expandedGroups.value = new Set()
    void loadRates()
  },
)

watch(searchQuery, () => {
  pagination.value = { ...pagination.value, pageIndex: 0 }
  expandedGroups.value = new Set()
  if (searchDebounceTimer !== null) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    void loadRates()
  }, SEARCH_DEBOUNCE_MS)
})

onUnmounted(() => {
  if (searchDebounceTimer !== null) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
})

const isGroupExpanded = (productId: string): boolean => {
  if (statusFilter.value === 'inactive') {
    return true
  }
  return expandedGroups.value.has(productId)
}

const canToggleGroup = (group: WorkRateGroup): boolean => {
  return statusFilter.value !== 'inactive' && countInactive(group) > 0
}

const toggleGroup = (productId: string): void => {
  const next = new Set(expandedGroups.value)
  if (next.has(productId)) {
    next.delete(productId)
  } else {
    next.add(productId)
  }
  expandedGroups.value = next
}

const activeWorkRates = (): WorkRateItem[] => workRates.value.filter(rate => rate.isActive)

const workRateLabel = (id: string): string => {
  const rate = workRates.value.find(item => item.id === id)
  if (!rate) {
    return id.slice(0, 8) + '...'
  }
  return `${rate.name} (${formatMoney(rate.dailyWage)}/день)`
}

const resetCreateForm = (): void => {
  form.value = {
    productId: '',
    workRateId: activeWorkRates()[0]?.id ?? '',
    assemblyRatePerDay: 0,
    validFrom: today(),
  }
}

const openCreate = (): void => {
  resetCreateForm()
  isProductLocked.value = false
  lockedProductName.value = ''
  createDialogOpen.value = true
}

/** Новая версия по строке: товар и текущая ставка подставляются, дата — сегодня. */
const openNewRate = (item: ProductWorkRateItem): void => {
  form.value = {
    productId: item.productId,
    workRateId: item.workRateId,
    assemblyRatePerDay: item.assemblyRatePerDay,
    validFrom: today(),
  }
  isProductLocked.value = true
  lockedProductName.value = `${item.productName} · ${item.productSku}`
  createDialogOpen.value = true
}

const openEdit = (item: ProductWorkRateItem): void => {
  editTarget.value = item
  editForm.value = {
    workRateId: item.workRateId,
    assemblyRatePerDay: item.assemblyRatePerDay,
    validFrom: item.validFrom,
  }
  editDialogOpen.value = true
}

const openDelete = (item: ProductWorkRateItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const handleCreate = async (): Promise<void> => {
  const validationError = validateCreateForm(form.value)
  if (validationError) {
    toast.error(validationError)
    return
  }
  isSaving.value = true
  try {
    const payload: CreateProductWorkRateRequest = {
      productId: form.value.productId,
      workRateId: form.value.workRateId,
      assemblyRatePerDay: Number(form.value.assemblyRatePerDay),
      validFrom: form.value.validFrom,
    }
    await createRate(() => productWorkRatesApi.create(payload))
    toast.success('Норма выработки добавлена')
    createDialogOpen.value = false
    await loadRates()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isSaving.value = false
  }
}

const handleUpdate = async (): Promise<void> => {
  if (!editTarget.value) {
    return
  }
  const validationError = validateEditForm(
    items.value,
    editTarget.value.id,
    editTarget.value.productId,
    editForm.value,
  )
  if (validationError) {
    toast.error(validationError)
    return
  }
  isSaving.value = true
  try {
    const payload: UpdateProductWorkRateRequest = {
      workRateId: editForm.value.workRateId,
      assemblyRatePerDay: Number(editForm.value.assemblyRatePerDay),
      validFrom: editForm.value.validFrom,
    }
    await updateRate(() => productWorkRatesApi.update(editTarget.value!.id, payload))
    toast.success('Норма выработки обновлена')
    editDialogOpen.value = false
    await loadRates()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) {
    return
  }
  isDeleting.value = true
  try {
    await deleteRate(() => productWorkRatesApi.delete(deleteTarget.value!.id))
    toast.success('Запись удалена')
    deleteDialogOpen.value = false
    await loadRates()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isDeleting.value = false
  }
}

const dialogContentClass = 'bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[480px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100] overflow-y-auto'
const fieldClass = 'flex flex-col gap-1'
const inputClass = 'mt-1'
const selectClass = 'mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-bold flex items-center gap-2">
          <Gauge class="size-5 text-primary" />
          Нормы выработки
        </h1>
        <p class="text-sm text-muted-foreground">Количество единиц товара в день на одного сотрудника по товару</p>
      </div>
      <Button v-if="canWrite" @click="openCreate" :disabled="hasEmptyCatalog" class="gap-2">
        <Plus class="size-4" />
        Добавить запись
      </Button>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <SearchInput
        v-model="searchQuery"
        placeholder="Название или SKU"
        class="w-full sm:w-80"
      />
      <StatusFilter v-model="statusFilter" :options="filterOptions" />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="rounded-xl border border-border bg-card overflow-hidden">
      <div class="p-4 flex flex-col gap-3">
        <Skeleton v-for="n in 4" :key="n" class="h-10 w-full rounded-lg" />
      </div>
    </div>

    <!-- Empty: search returned nothing -->
    <div
      v-else-if="groups.length === 0 && isSearchActive"
      class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center"
    >
      <SearchX class="size-10 text-muted-foreground/40" />
      <div>
        <p class="text-sm font-medium">Ничего не найдено</p>
        <p class="text-sm text-muted-foreground">Измените запрос или очистите поле поиска</p>
      </div>
    </div>

    <!-- Empty: no data at all -->
    <div
      v-else-if="groups.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center"
    >
      <Gauge class="size-10 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">
        {{ statusFilter === 'inactive' ? 'Нет неактивных записей' : 'Нормы выработки не добавлены' }}
      </p>
      <Button
        v-if="canWrite && statusFilter !== 'inactive' && !hasEmptyCatalog"
        variant="outline"
        size="sm"
        @click="openCreate"
        class="gap-2"
      >
        <Plus class="size-4" /> Добавить первую
      </Button>
      <p v-if="hasEmptyCatalog" class="text-xs text-muted-foreground">
        Сначала добавьте товары в систему
      </p>
    </div>

    <!-- Master-detail table -->
    <div v-else class="flex flex-col gap-4">
      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow class="border-b border-border">
              <TableHead>Товар</TableHead>
              <TableHead>Ставка работы</TableHead>
              <TableHead class="text-right">Норма / день (шт.)</TableHead>
              <TableHead>Действует с</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead v-if="canWrite" class="w-32 text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-for="group in groups" :key="group.productId">

              <!-- Master row: active version or placeholder when only inactive exist -->
              <TableRow class="hover:bg-muted/40 transition-colors">
                <!-- Product identity: name + SKU, links to product edit -->
                <TableCell class="py-3">
                  <div class="flex flex-col gap-0.5">
                    <RouterLink
                      :to="{ name: 'product-edit', query: { productId: group.productId } }"
                      class="font-medium hover:underline leading-snug"
                    >
                      {{ group.productName }}
                    </RouterLink>
                    <span class="font-mono text-xs text-muted-foreground">{{ group.productSku }}</span>
                  </div>
                </TableCell>

                <template v-if="group.active[0]">
                  <TableCell class="text-muted-foreground">{{ workRateLabel(group.active[0].workRateId) }}</TableCell>
                  <TableCell class="text-right tabular-nums font-medium">{{ group.active[0].assemblyRatePerDay }}</TableCell>
                  <TableCell class="tabular-nums text-muted-foreground">{{ formatIsoDate(group.active[0].validFrom) }}</TableCell>
                  <TableCell><Badge variant="success">Активна</Badge></TableCell>
                  <TableCell v-if="canWrite" class="text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" @click="openEdit(group.active[0])" title="Изменить">
                        <Pencil class="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" @click="openNewRate(group.active[0])" title="Новая норма">
                        <History class="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" @click="openDelete(group.active[0])" title="Удалить">
                        <Trash2 class="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </template>

                <!-- No active version: product has only archived records -->
                <template v-else>
                  <TableCell colspan="3" class="text-muted-foreground text-sm">—</TableCell>
                  <TableCell><Badge variant="secondary">Нет активной</Badge></TableCell>
                  <TableCell v-if="canWrite" class="text-right">
                    <Button variant="ghost" size="icon-sm" @click="openCreate" title="Добавить норму">
                      <Plus class="size-4" />
                    </Button>
                  </TableCell>
                </template>
              </TableRow>

              <!-- History toggle -->
              <TableRow v-if="canToggleGroup(group)" class="hover:bg-transparent border-0">
                <TableCell :colspan="columnCount" class="py-1 pl-4">
                  <button
                    type="button"
                    class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    :aria-expanded="isGroupExpanded(group.productId)"
                    @click="toggleGroup(group.productId)"
                  >
                    <component :is="isGroupExpanded(group.productId) ? ChevronDown : ChevronRight" class="size-3.5" />
                    {{ isGroupExpanded(group.productId)
                      ? 'Скрыть историю'
                      : `История (${countInactive(group)})` }}
                  </button>
                </TableCell>
              </TableRow>

              <!-- Detail rows: archived versions -->
              <template v-if="isGroupExpanded(group.productId)">
                <TableRow
                  v-for="item in group.inactive"
                  :key="item.id"
                  class="bg-muted/20 text-muted-foreground hover:bg-muted/30 transition-colors"
                >
                  <TableCell class="pl-8 py-2">
                    <span class="text-xs text-muted-foreground/60">↳</span>
                  </TableCell>
                  <TableCell class="py-2 text-sm">{{ workRateLabel(item.workRateId) }}</TableCell>
                  <TableCell class="py-2 text-right tabular-nums text-sm">{{ item.assemblyRatePerDay }}</TableCell>
                  <TableCell class="py-2 tabular-nums text-sm">{{ formatIsoDate(item.validFrom) }}</TableCell>
                  <TableCell class="py-2"><Badge variant="secondary">Неактивна</Badge></TableCell>
                  <TableCell v-if="canWrite" class="py-2 text-right">
                    <Button variant="ghost" size="icon-sm" @click="openDelete(item)" title="Удалить">
                      <Trash2 class="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              </template>

            </template>
          </TableBody>
        </Table>
      </div>

      <DataGridPagination
        v-model:pagination="pagination"
        :total-count="totalCount"
        :is-loading="isLoading"
        show-page-size-selector
      />
    </div>

    <!-- Create / New Version Dialog -->
    <DialogRoot v-model:open="createDialogOpen">
      <DialogPortal>
        <DialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-center justify-between mb-4">
            <DialogTitle class="text-lg font-semibold">Новая норма</DialogTitle>
            <DialogClose as-child>
              <Button variant="ghost" size="icon" class="size-8"><X class="size-4" /></Button>
            </DialogClose>
          </div>
          <DialogDescription class="text-sm text-muted-foreground mb-4">
            Запись добавляется как новая версия, предыдущая активная норма по этому товару деактивируется.
          </DialogDescription>

          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label>Товар *</Label>
              <p v-if="isProductLocked" class="text-sm font-medium mt-1">
                {{ lockedProductName }}
              </p>
              <ProductCombobox v-else v-model="form.productId" />
            </div>

            <div :class="fieldClass">
              <Label>Ставка работы *</Label>
              <select
                v-model="form.workRateId"
                :class="selectClass"
              >
                <option v-if="activeWorkRates().length === 0" value="">Нет активных ставок</option>
                <option v-for="r in activeWorkRates()" :key="r.id" :value="r.id">
                  {{ r.name }} ({{ formatMoney(r.dailyWage) }}/день)
                </option>
              </select>
              <p v-if="activeWorkRates().length === 0" class="text-xs text-destructive">
                Сначала добавьте ставку работы в справочнике «Нормы выработки».
              </p>
            </div>

            <div :class="fieldClass">
              <Label>Норма в день (шт.)</Label>
              <Input :class="inputClass" v-model.number="form.assemblyRatePerDay" type="number" min="1" step="1" placeholder="100" />
            </div>

            <div :class="fieldClass">
              <Label>Действует с</Label>
              <Input :class="inputClass" v-model="form.validFrom" type="date" />
              <p v-if="isNewRateDateInPast" class="text-xs text-amber-600 mt-1">
                Дата в прошлом изменит расчёты себестоимости за прошлые периоды
              </p>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <DialogClose as-child>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button @click="handleCreate" :disabled="isSaving || !form.workRateId || !form.productId" class="gap-2">
              <Spinner v-if="isSaving" class="size-4" />
              Добавить
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Edit Dialog -->
    <DialogRoot v-model:open="editDialogOpen">
      <DialogPortal>
        <DialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-start justify-between mb-4">
            <div>
              <DialogTitle class="text-lg font-semibold">Изменить норму</DialogTitle>
              <DialogDescription class="text-sm text-muted-foreground mt-1">
                Исправление ставки, нормы или даты в текущей версии без создания новой записи истории
              </DialogDescription>
            </div>
            <DialogClose as-child>
              <Button variant="ghost" size="icon-sm">
                <X class="size-4" />
              </Button>
            </DialogClose>
          </div>

          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label>Товар</Label>
              <p class="text-sm font-medium mt-1">{{ editTarget ? editTarget.productName : '' }}</p>
            </div>

            <div :class="fieldClass">
              <Label for="edit-work-rate">Ставка работы *</Label>
              <select id="edit-work-rate" v-model="editForm.workRateId" :class="selectClass">
                <option
                  v-if="editTarget && !activeWorkRates().some(r => r.id === editTarget!.workRateId)"
                  :value="editTarget.workRateId"
                >
                  {{ workRateLabel(editTarget.workRateId) }} (неактивна)
                </option>
                <option v-for="r in activeWorkRates()" :key="r.id" :value="r.id">
                  {{ r.name }} ({{ formatMoney(r.dailyWage) }}/день)
                </option>
              </select>
            </div>

            <div :class="fieldClass">
              <Label for="edit-rate-per-day">Норма в день (шт.)</Label>
              <Input id="edit-rate-per-day" :class="inputClass" v-model.number="editForm.assemblyRatePerDay" type="number" min="1" step="1" />
            </div>

            <div :class="fieldClass">
              <Label for="edit-valid-from">Действует с</Label>
              <Input id="edit-valid-from" :class="inputClass" v-model="editForm.validFrom" type="date" />
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <DialogClose as-child>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button @click="handleUpdate" :disabled="isSaving" class="gap-2">
              <Spinner v-if="isSaving" class="size-4" />
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Delete Confirmation -->
    <AlertDialogRoot v-model:open="deleteDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]">
          <AlertDialogTitle class="text-lg font-semibold mb-2">Удалить запись?</AlertDialogTitle>
          <AlertDialogDescription class="text-sm text-muted-foreground mb-6">
            Норма выработки для
            <span class="font-medium">{{ deleteTarget?.productName }}</span>
            будет удалена без возможности восстановления.
          </AlertDialogDescription>
          <div class="flex justify-end gap-2">
            <AlertDialogCancel as-child>
              <Button variant="outline">Отмена</Button>
            </AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button variant="destructive" @click="handleDelete" :disabled="isDeleting" class="gap-2">
                <Spinner v-if="isDeleting" class="size-4" />
                Удалить
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </div>
</template>
