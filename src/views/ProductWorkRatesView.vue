<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted, h, type VNode } from 'vue'
import { Plus, Tag, Gauge, Pencil, Trash2, X, ChevronDown, ChevronRight, SearchX } from 'lucide-vue-next'
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
import {
  DataGrid,
  type ColumnDef,
  type ExpandedState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@/components/ui/data-grid'
import { StatusFilter } from '@/components/ui/status-filter'
import ProductCombobox from '@/components/products/ProductCombobox.vue'
import { toast } from 'vue-sonner'
import { RouterLink } from 'vue-router'
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
  isDateTaken,
  filterOptionsFromCounts,
  formatIsoDate,
  groupWorkRates,
  nextFreeDate,
  statusBadge,
  validateCreateForm,
  validateEditForm,
} from '@/utils/productWorkRates'
import type { WorkRateGroup } from '@/utils/productWorkRates'

const { canWrite } = useCurrentUser()
const { formatMoney } = useTenantMoney()

/**
 * Строка грида. Родительская строка — товар: значения колонок берутся у действующей версии, а
 * вложенные строки приходят из `history`. Поля версии нужны и на подстроке, поэтому тип включает
 * их сразу, а не описывает два разных вида строк.
 */
interface GridRow {
  id: string
  productId: string
  productName: string
  productSku: string
  workRateId: string
  assemblyRatePerDay: number
  validFrom: string
  status: ProductWorkRateItem['status']
  removedFrom?: string | null
  /** Действующая версия товара или null — источник строчных действий. */
  current: ProductWorkRateItem | null
  /** История товара; у подстроки всегда пуста. */
  history: ProductWorkRateItem[]
  /** Подстрока, у которой нет собственной истории. */
  isVersionRow?: boolean
}

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
 * Срез списка считает сервер, поэтому состояние пагинации живёт на странице, а не внутри грида:
 * грид отсутствует, остаётся только футер грида.
 */
const pagination = ref<{ pageIndex: number; pageSize: number }>({ pageIndex: 0, pageSize: 25 })
const sorting = ref<SortingState>([{ id: 'updatedAt', desc: true }])
const columnVisibility = ref<VisibilityState>({})
const rowSelection = ref<RowSelectionState>({})
const expanded = ref<ExpandedState>({})

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
  fallbackMessage: 'Не удалось снять норму',
  errorHandlers: {
    [ErrorCodes.Common.Conflict]: () => {
      toast.error(conflictMessage)
      deleteDialogOpen.value = false
      void loadRates()
    },
  },
})

const loadRates = async (): Promise<void> => {
  await fetchData(async () => {
    const sort = sorting.value[0]
    const response = await productWorkRatesApi.getAll({
      status: statusByFilter[statusFilter.value],
      search: searchQuery.value.trim() || undefined,
      page: pagination.value.pageIndex + 1,
      pageSize: pagination.value.pageSize,
      sortBy: toWorkRateSortKey(sort?.id),
      sortDir: sort?.desc ? 'desc' : 'asc',
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
  rowSelection.value = {}
  expanded.value = {}
  pagination.value = { ...pagination.value, pageIndex: 0 }
  void loadRates()
})

watch(
  [() => pagination.value.pageIndex, () => pagination.value.pageSize],
  ([pageIndex, pageSize], [previousPageIndex, previousPageSize]) => {
    if (pageIndex === previousPageIndex && pageSize === previousPageSize) {
      return
    }
    expanded.value = {}
    void loadRates()
  },
)

/**
 * Порядок строк считает сервер, поэтому смена ключа — это новый запрос, а не перестановка
 * загруженного набора. Страница при этом сбрасывается: старая относилась к прежнему порядку.
 */
watch(sorting, () => {
  expanded.value = {}
  pagination.value = { ...pagination.value, pageIndex: 0 }
  void loadRates()
})

watch(searchQuery, () => {
  pagination.value = { ...pagination.value, pageIndex: 0 }
  expanded.value = {}
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

const activeWorkRates = (): WorkRateItem[] => workRates.value.filter(rate => rate.isActive)

const workRateLabel = (id: string): string => {
  const rate = workRates.value.find(item => item.id === id)
  if (!rate) {
    return id.slice(0, 8) + '...'
  }
  return `${rate.name} (${formatMoney(rate.dailyWage)}/день)`
}

/**
 * Строки грида: одна родительская строка на товар, версии — её подстроки. Отдельная строка-переключатель
 * истории не нужна, поэтому раскрытие живёт в `expanded` и в модели строк TanStack.
 */
const gridRows = computed<GridRow[]>(() => groups.value.map((group: WorkRateGroup) => {
  const current = group.current[0] ?? null
  const newest = current ?? group.history[0]
  return {
    id: group.productId,
    productId: group.productId,
    productName: group.productName,
    productSku: group.productSku,
    workRateId: newest?.workRateId ?? '',
    assemblyRatePerDay: newest?.assemblyRatePerDay ?? 0,
    validFrom: newest?.validFrom ?? '',
    status: newest?.status ?? 'Active',
    removedFrom: newest?.removedFrom ?? null,
    current,
    history: group.history,
  }
}))

const subRowsOf = (row: GridRow): GridRow[] | undefined => {
  if (row.isVersionRow || row.history.length === 0) {
    return undefined
  }
  return row.history.map(version => ({
    id: version.id,
    productId: version.productId,
    productName: version.productName,
    productSku: version.productSku,
    workRateId: version.workRateId,
    assemblyRatePerDay: version.assemblyRatePerDay,
    validFrom: version.validFrom,
    status: version.status,
    removedFrom: version.removedFrom,
    current: null,
    history: [],
    isVersionRow: true,
  }))
}

/**
 * id колонки грида → ключ сортировки API. Для неизвестного id возвращаем undefined: запрос уйдёт
 * без sortBy, и сервер применит порядок по умолчанию, а не отсортирует не по тому полю.
 */
const toWorkRateSortKey = (columnId: string | undefined): 'productName' | 'updatedAt' | 'validFrom' | undefined => {
  if (columnId === 'productName' || columnId === 'updatedAt' || columnId === 'validFrom') {
    return columnId
  }
  return undefined
}

const renderProductName = (row: GridRow): VNode => {
  // Подстрока — версия товара, а не товар: имя в ней уже названо родителем, ссылка на карточку
  // товара повторялась бы в каждой строке истории.
  if (row.isVersionRow) {
    return h('span', { class: 'px-2 text-xs text-muted-foreground/60' }, '↳')
  }
  return h('div', { class: 'flex flex-col gap-0.5' }, [
    h(RouterLink, {
      to: { name: 'product-edit', query: { productId: row.productId } },
      class: 'font-medium hover:underline leading-snug',
    }, () => row.productName),
    h('span', { class: 'font-mono text-xs text-muted-foreground' }, row.productSku),
  ])
}

const rateLabelOf = (row: GridRow): string => (row.workRateId ? workRateLabel(row.workRateId) : '—')

const actionsFor = (row: GridRow): VNode | null => {
  if (!canWrite.value || row.isVersionRow) {
    return null
  }
  const current = row.current
  if (!current) {
    return h('div', { class: 'flex items-center justify-end gap-1' }, [
      h(Button, {
        variant: 'ghost',
        size: 'icon-sm',
        title: 'Добавить норму',
        onClick: () => openCreateForProduct(row.productId, `${row.productName} · ${row.productSku}`),
      }, () => h(Plus, { class: 'size-4' })),
    ])
  }
  // Снятая версия не возвращается в силу, а вытесненная не влияет на расчёт, поэтому снятие
  // предлагается только действующей версии; товару без неё — завод новой нормы.
  return h('div', { class: 'flex items-center justify-end gap-1' }, [
    h(Button, {
      variant: 'ghost',
      size: 'icon-sm',
      title: 'Изменить',
      onClick: () => openEdit(current),
    }, () => h(Pencil, { class: 'size-4' })),
    h(Button, {
      variant: 'ghost',
      size: 'icon-sm',
      title: 'Новая норма',
      onClick: () => openNewRate(current),
    }, () => h(Tag, { class: 'size-4' })),
    h(Button, {
      variant: 'ghost',
      size: 'icon-sm',
      title: 'Снять норму',
      onClick: () => openDelete(current),
    }, () => h(Trash2, { class: 'size-4 text-destructive' })),
  ])
}

const columns = computed<ColumnDef<GridRow, unknown>[]>(() => [
  {
    id: 'productName',
    accessorKey: 'productName',
    enableSorting: true,
    enableHiding: false,
    meta: { title: 'Товар' },
    header: 'Товар',
    cell: ({ row }) => {
      const toggle = row.getCanExpand()
        ? h('button', {
          type: 'button',
          class: 'flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground',
          'aria-expanded': row.getIsExpanded(),
          // У иконки нет текста: без aria-label экранный диктор не назовёт назначение кнопки.
          'aria-label': row.getIsExpanded() ? 'Скрыть историю' : 'Показать историю',
          onClick: (event: Event) => {
            event.stopPropagation()
            row.toggleExpanded()
          },
        }, [h(row.getIsExpanded() ? ChevronDown : ChevronRight, { class: 'size-4' })])
        : h('span', { class: 'size-6 shrink-0', 'aria-hidden': 'true' })
      return h('div', { class: 'flex items-center gap-2' }, [toggle, renderProductName(row.original)])
    },
  },
  {
    id: 'workRateId',
    accessorKey: 'workRateId',
    enableSorting: false,
    enableHiding: true,
    meta: { title: 'Ставка работы' },
    header: 'Ставка работы',
    cell: ({ row }) => h('span', { class: 'text-muted-foreground' }, rateLabelOf(row.original)),
  },
  {
    id: 'assemblyRatePerDay',
    accessorKey: 'assemblyRatePerDay',
    enableSorting: false,
    enableHiding: true,
    meta: { title: 'Норма / день (шт.)' },
    header: 'Норма / день (шт.)',
    cell: ({ row }) => h('div', { class: 'text-right tabular-nums font-medium' }, String(row.original.assemblyRatePerDay)),
  },
  {
    id: 'validFrom',
    accessorKey: 'validFrom',
    enableSorting: true,
    enableHiding: true,
    meta: { title: 'Действует с' },
    header: 'Действует с',
    cell: ({ row }) => h(
      'span',
      { class: 'tabular-nums text-muted-foreground' },
      row.original.validFrom ? formatIsoDate(row.original.validFrom) : '—',
    ),
  },
  {
    id: 'status',
    accessorKey: 'status',
    enableSorting: false,
    enableHiding: true,
    meta: { title: 'Статус' },
    header: 'Статус',
    cell: ({ row }) => {
      if (row.original.isVersionRow) {
        const badge = statusBadge(row.original)
        return h(Badge, { variant: badge.variant }, () => badge.label)
      }
      if (row.original.current) {
        const badge = statusBadge({ status: 'Active', removedFrom: null })
        return h(Badge, { variant: badge.variant }, () => badge.label)
      }
      // У товара нет действующей версии: показывать статус снятой истории в колонке товара
      // значило бы утверждать, что норма действует.
      return h(Badge, { variant: 'secondary' }, () => 'Нет активной')
    },
  },
  {
    id: 'actions',
    enableSorting: false,
    enableHiding: false,
    meta: { title: 'Действия' },
    header: () => h('span', { class: 'sr-only' }, 'Действия'),
    cell: ({ row }) => actionsFor(row.original),
  },
])

/**
 * Прибавляет к `YYYY-MM-DD` указанное число дней. Арифметика идёт в UTC: локальная полночь
 * сдвигала бы результат на день назад в отрицательных часовых поясах.
 */
const addDaysIso = (isoDate: string, days: number): string => {
  const parts: string[] = isoDate.split('-')
  if (parts.length !== 3) {
    return isoDate
  }
  const shifted = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + days))
  return shifted.toISOString().slice(0, 10)
}

const effectiveRemovalDate = computed<string>(() => {
  const target = deleteTarget.value
  if (!target) {
    return today()
  }
  // Зеркало серверного правила: версия может выйти из силы только с даты, на которой она уже
  // начала действовать, иначе снятие заявило бы, что её никогда не было.
  const now = today()
  return now > target.validFrom ? now : addDaysIso(target.validFrom, 1)
})

const deletionSummary = computed<string>(() => {
  if (!deleteTarget.value) {
    return ''
  }
  return `Норма выработки для ${deleteTarget.value.productName} будет снята с ${formatIsoDate(effectiveRemovalDate.value)}. С этой даты трудозатраты товара не рассчитываются.`
})

const resetCreateForm = (): void => {
  form.value = {
    productId: '',
    workRateId: activeWorkRates()[0]?.id ?? '',
    assemblyRatePerDay: 0,
    validFrom: nextFreeDate(items.value, undefined, today()),
  }
}

const openCreate = (): void => {
  resetCreateForm()
  isProductLocked.value = false
  lockedProductName.value = ''
  createDialogOpen.value = true
}

/** Новая версия по строке: товар и текущая ставка подставляются, дата — первая свободная. */
const openNewRate = (item: ProductWorkRateItem): void => {
  form.value = {
    productId: item.productId,
    workRateId: item.workRateId,
    assemblyRatePerDay: item.assemblyRatePerDay,
    validFrom: nextFreeDate(items.value, item.productId, today()),
  }
  isProductLocked.value = true
  lockedProductName.value = `${item.productSku} · ${item.productName}`
  createDialogOpen.value = true
}

/** Завод нормы товару без действующей версии: дата тоже подставляется, чтобы не ловить 409. */
const openCreateForProduct = (productId: string, label: string): void => {
  resetCreateForm()
  form.value = {
    ...form.value,
    productId,
    validFrom: nextFreeDate(items.value, productId, today()),
  }
  isProductLocked.value = true
  lockedProductName.value = label
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
  // Занятая дата отклоняется сервером; здесь она отсекается до запроса, чтобы отказ не приходил
  // тостом после круга до сервера.
  if (isDateTaken(items.value, form.value.productId, form.value.validFrom)) {
    toast.error('Версия с такой датой начала уже существует')
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
    toast.success('Норма снята')
    deleteDialogOpen.value = false
    await loadRates()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isDeleting.value = false
  }
}

/**
 * `overflow-y-auto` в одиночку переводит ось X в `auto`, поэтому любое переполнение по ширине давало
 * горизонтальную полосу. По ширине контент диалога обязан ужиматься, а не прокручиваться.
 */
const dialogContentClass = 'bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[480px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100] overflow-y-auto overflow-x-hidden'
const fieldClass = 'flex min-w-0 flex-col gap-1'
const inputClass = 'mt-1'
const selectClass = 'mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'

/**
 * Заголовок и описание пустого состояния нужны и пропсам грида, и его слоту `#empty`:
 * кастомный слот полностью замещает дефолтный, вместе с иконкой и текстами.
 */
const emptyText = computed<string>(() => {
  if (hasEmptyCatalog.value) {
    return 'Сначала добавьте товары в систему'
  }
  return statusFilter.value === 'inactive' ? 'Нет неактивных записей' : 'Нормы выработки не добавлены'
})

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
      v-else-if="gridRows.length === 0 && isSearchActive"
      class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center"
    >
      <SearchX class="size-10 text-muted-foreground/40" />
      <div>
        <p class="text-sm font-medium">Ничего не найдено</p>
        <p class="text-sm text-muted-foreground">Измените запрос или очистите поле поиска</p>
      </div>
    </div>

    <!-- Grid: one row per product, versions as sub-rows -->
    <DataGrid
      v-else
      v-model:pagination="pagination"
      v-model:sorting="sorting"
      v-model:column-visibility="columnVisibility"
      v-model:row-selection="rowSelection"
      v-model:expanded="expanded"
      :data="gridRows"
      :columns="columns"
      :total-count="totalCount"
      :is-loading="isLoading"
      :selectable="false"
      :get-sub-rows="subRowsOf"
      actions-column-id="actions"
    >
      <template #empty>
        <div class="flex flex-col items-center justify-center gap-3 text-center">
          <Gauge class="size-10 text-muted-foreground/40" />
          <p class="text-sm text-muted-foreground">{{ emptyText }}</p>
          <Button
            v-if="canWrite && statusFilter !== 'inactive' && !hasEmptyCatalog"
            variant="outline"
            size="sm"
            class="gap-2"
            @click="openCreate"
          >
            <Plus class="size-4" /> Добавить первую
          </Button>
        </div>
      </template>
    </DataGrid>

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
            Запись добавляется как новая версия, предыдущая активная норма по этому товару становится вытесненной.
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
                Дата в прошлом изменит расчёты себестоимости задним числом
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

    <!-- Removal Confirmation -->
    <AlertDialogRoot v-model:open="deleteDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]">
          <AlertDialogTitle class="text-lg font-semibold mb-2">Снять норму?</AlertDialogTitle>
          <AlertDialogDescription class="text-sm text-muted-foreground mb-6">
            {{ deletionSummary }}
          </AlertDialogDescription>
          <div class="flex justify-end gap-2">
            <AlertDialogCancel as-child>
              <Button variant="outline">Отмена</Button>
            </AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button variant="destructive" @click="handleDelete" :disabled="isDeleting" class="gap-2">
                <Spinner v-if="isDeleting" class="size-4" />
                Снять
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </div>
</template>
