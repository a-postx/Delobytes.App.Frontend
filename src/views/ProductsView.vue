<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted, h } from 'vue'
import { Plus, Pencil, Trash2, Archive, Undo2, Package, MoreHorizontal, X as XIcon, Download } from 'lucide-vue-next'
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { StatusFilter } from '@/components/ui/status-filter'
import { SearchInput } from '@/components/ui/search-input'
import {
  DataGrid,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@/components/ui/data-grid'
import ProductStatusBadge from '@/components/products/ProductStatusBadge.vue'
import ProductChannelBadges from '@/components/products/ProductChannelBadges.vue'
import { channelDisplay, normalizeChannel } from '@/utils/channelBadges'
import { toast } from 'vue-sonner'
import { catalogProductsApi, integrationsApi } from '@/services/api'
import type { ProductItem, CreateProductRequest, ProductBarcode, PackingUnit, ProductSortKey } from '@/types/products'
import type { Connection } from '@/types'
import { ProductStatus, isProductSortKey } from '@/types/products'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useRouter } from 'vue-router'
import { X } from 'lucide-vue-next'

const { canWrite } = useCurrentUser()
const router = useRouter()

const items = ref<ProductItem[]>([])
const isLoading = ref<boolean>(true)
const connections = ref<Connection[]>([])
const isLoadingConnections = ref<boolean>(false)

const createDialogOpen = ref<boolean>(false)
const deleteDialogOpen = ref<boolean>(false)
const archiveDialogOpen = ref<boolean>(false)
const restoreDialogOpen = ref<boolean>(false)

const deleteTarget = ref<ProductItem | null>(null)
const archiveTarget = ref<ProductItem | null>(null)
const restoreTarget = ref<ProductItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)
const deletingProductIds = ref<Set<string>>(new Set())

const statusFilter = ref<'all' | 'active' | 'archived'>('active')
const searchQuery = ref<string>('')

/**
 * Поиск уходит на сервер, поэтому запрос отправляем только после паузы в наборе:
 * иначе каждая буква названия — отдельный запрос к каталогу.
 */
const SEARCH_DEBOUNCE_MS = 300

/**
 * Состояние грида принадлежит странице, потому что сортировку и нарезку на страницы
 * выполняет сервер: грид показывает ровно тот набор строк, который пришёл в ответе.
 */
const pagination = ref<{ pageIndex: number; pageSize: number }>({ pageIndex: 0, pageSize: 25 })
const sorting = ref<SortingState>([{ id: 'updatedAt', desc: true }])
const columnVisibility = ref<VisibilityState>({})
const rowSelection = ref<RowSelectionState>({})
const totalCount = ref<number>(0)
const statusCounts = ref<{ active: number; archived: number; all: number }>({ active: 0, archived: 0, all: 0 })

/** Соответствие вкладок значениям перечисления задано явно, а не сравнением строк наудачу. */
const statusByFilter: Record<'active' | 'archived', ProductStatus> = {
  active: ProductStatus.Active,
  archived: ProductStatus.Archived,
}

const COLUMN_VISIBILITY_KEY = 'delobytes.products.columns'

const readStoredColumnVisibility = (): VisibilityState => {
  try {
    const raw = localStorage.getItem(COLUMN_VISIBILITY_KEY)
    if (!raw) {
      return {}
    }
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    return parsed as VisibilityState
  } catch {
    // Повреждённое значение в хранилище не должно ломать страницу: откатываемся к умолчаниям.
    return {}
  }
}

columnVisibility.value = readStoredColumnVisibility()

watch(columnVisibility, (value: VisibilityState) => {
  localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(value))
}, { deep: true })

// Поля ввода всегда дают строку, поэтому габариты в форме — это PackingUnit
// с текстовыми значениями; числами они становятся на отправке.
type PackingUnitForm = {
  [K in keyof Required<PackingUnit>]: string
}

interface FormData {
  sku: string
  name: string
  description: string
  barcodes: ProductBarcode[]
  packingUnit: PackingUnitForm
}

const emptyForm = (): FormData => ({
  sku: '',
  name: '',
  description: '',
  barcodes: [],
  packingUnit: {
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    weightKg: ''
  }
})

const form = ref<FormData>(emptyForm())

const newBarcode = ref({ value: '', type: '', isDefault: false })

let pollingInterval: number | null = null
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const filterOptions = computed(() => [
  { value: 'active', label: 'Активные', count: statusCounts.value.active },
  { value: 'all', label: 'Все', count: statusCounts.value.all },
  { value: 'archived', label: 'Архив', count: statusCounts.value.archived },
])

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

/**
 * Время показываем вместе с датой, иначе порядок строк в колонке «Изменено» выглядит
 * случайным: сервер сортирует по моменту правки, а в ячейке была бы только дата.
 */
const formatDateTime = (dateStr: string): string =>
  new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

/** Товар, который ни разу не меняли, «изменён» в момент создания — так же считает и сервер. */
const lastModifiedAt = (item: ProductItem): string => item.updatedAt ?? item.createdAt

/**
 * id колонки грида → ключ сортировки API. Для неизвестного id возвращаем undefined: запрос уйдёт
 * без sortBy, и сервер применит свой порядок по умолчанию, а не отсортирует не по тому полю.
 */
const toProductSortKey = (columnId: string | undefined): ProductSortKey | undefined =>
  isProductSortKey(columnId) ? columnId : undefined

const getBarcodeVariant = (type?: string): 'default' | 'marketplace-wb' | 'marketplace-oz' | 'marketplace-ym' =>
  channelDisplay(normalizeChannel(type)).variant

/** Сортируемым колонкам id совпадает с ключом из whitelist бэкенда; остальным он нужен для меню видимости. */
const columns = computed<ColumnDef<ProductItem, unknown>[]>(() => {
  const definitions: ColumnDef<ProductItem, unknown>[] = [
    {
      id: 'photos',
      accessorKey: 'photos',
      enableSorting: false,
      enableHiding: false,
      meta: { title: 'Фото' },
      header: 'Фото',
      cell: ({ row }) => h('div', {
        class: 'w-10 aspect-[3/4] rounded-md overflow-hidden border border-border bg-muted flex items-center justify-center flex-shrink-0',
      }, [
        row.original.photos && row.original.photos.length > 0
          ? h('img', {
            src: row.original.photos[0].url,
            alt: row.original.name,
            class: 'size-full object-contain',
            loading: 'lazy',
          })
          : h('span', { class: 'text-muted-foreground text-xs leading-none select-none' }, '—'),
      ]),
    },
    {
      id: 'sku',
      accessorKey: 'sku',
      enableSorting: true,
      enableHiding: true,
      meta: { title: 'SKU' },
      header: 'SKU',
      cell: ({ row }) => h('span', { class: 'font-mono text-sm' }, row.original.sku),
    },
    {
      id: 'name',
      accessorKey: 'name',
      enableSorting: true,
      enableHiding: true,
      meta: { title: 'Название' },
      header: 'Название',
      cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.name),
    },
    {
      id: 'channelLinks',
      accessorKey: 'channelLinks',
      enableSorting: false,
      enableHiding: true,
      meta: { title: 'Артикул' },
      header: 'Артикул',
      cell: ({ row }) => row.original.channelLinks?.length
        ? h(ProductChannelBadges, { links: row.original.channelLinks })
        : h('span', { class: 'text-muted-foreground text-sm' }, '—'),
    },
    {
      id: 'barcodes',
      accessorKey: 'barcodes',
      enableSorting: false,
      enableHiding: true,
      meta: { title: 'Баркоды' },
      header: 'Баркоды',
      cell: ({ row }) => {
        if (!row.original.barcodes || row.original.barcodes.length === 0) {
          return h('span', { class: 'text-muted-foreground text-sm' }, '—')
        }
        return h('div', { class: 'flex flex-wrap gap-1' }, row.original.barcodes.map((barcode, index) =>
          h(Badge, {
            key: index,
            variant: getBarcodeVariant(barcode.type),
            class: 'text-xs',
          }, barcode.value)
        ))
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      enableSorting: true,
      enableHiding: true,
      meta: { title: 'Статус' },
      header: 'Статус',
      cell: ({ row }) => h(ProductStatusBadge, { status: row.original.status }),
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      enableSorting: true,
      enableHiding: true,
      meta: { title: 'Создан' },
      header: 'Создан',
      cell: ({ row }) => h('span', { class: 'text-muted-foreground text-sm' }, formatDate(row.original.createdAt)),
    },
    {
      id: 'updatedAt',
      accessorKey: 'updatedAt',
      enableSorting: true,
      enableHiding: true,
      meta: { title: 'Изменено' },
      header: 'Изменено',
      cell: ({ row }) => h(
        'span',
        { class: 'text-muted-foreground text-sm whitespace-nowrap' },
        formatDateTime(lastModifiedAt(row.original)),
      ),
    },
  ]

  /**
   * Колонка действий существует независимо от прав: в её заголовке живёт кнопка настройки
   * колонок, нужная и читателю, и редактору. Само меню действий рисуется только при праве на запись.
   */
  definitions.push({
    id: 'actions',
    enableSorting: false,
    enableHiding: false,
    meta: { title: 'Действия' },
    header: () => h('span', { class: 'sr-only' }, 'Действия'),
    cell: ({ row }) => (canWrite.value ? renderActions(row.original) : null),
  })

  return definitions
})

const renderActions = (item: ProductItem): unknown => {
  const editItem = h(DropdownMenuItem, { onClick: () => openEdit(item) }, () => [
    h(Pencil, { class: 'size-4 mr-2' }),
    'Изменить',
  ])
  const archiveItem = h(DropdownMenuItem, { onClick: () => openArchive(item) }, () => [
    h(Archive, { class: 'size-4 mr-2' }),
    'Архивировать',
  ])
  const deleteItem = h(DropdownMenuItem, { class: 'text-destructive', onClick: () => openDelete(item) }, () => [
    h(Trash2, { class: 'size-4 mr-2' }),
    'Удалить',
  ])
  const restoreItem = h(DropdownMenuItem, { onClick: () => openRestore(item) }, () => [
    h(Undo2, { class: 'size-4 mr-2' }),
    'Восстановить',
  ])

  const menu = (children: unknown[]) => h('div', { class: 'text-right' }, [
    h(DropdownMenu, {}, () => [
      h(DropdownMenuTrigger, { asChild: true }, () => h(Button, { variant: 'ghost', size: 'icon', class: 'size-8' }, () => h(MoreHorizontal, { class: 'size-4' }))),
      h(DropdownMenuContent, { align: 'end' }, () => children),
    ]),
  ])

  if (item.status === ProductStatus.Active) {
    return menu([editItem, archiveItem, deleteItem])
  }

  if (item.status === ProductStatus.Archived) {
    return menu([restoreItem])
  }

  if (item.status === ProductStatus.DeletionPending) {
    return h('span', { class: 'text-xs text-muted-foreground' }, 'Проверяем историю продаж...')
  }

  if (item.status === ProductStatus.DeletionFailed) {
    return menu([restoreItem, archiveItem])
  }

  return null
}

/**
 * Загружает одну страницу: фильтр по статусу, поиск, порядок и смещение считает сервер.
 * Счётчики вкладок приходят тем же ответом, поэтому второго запроса на «Все» больше нет.
 */
const loadItems = async (): Promise<void> => {
  isLoading.value = true
  try {
    const sort = sorting.value[0]
    const resp = await catalogProductsApi.getAll(
      statusFilter.value === 'all' ? undefined : statusByFilter[statusFilter.value],
      {
        page: pagination.value.pageIndex + 1,
        pageSize: pagination.value.pageSize,
        sortBy: toProductSortKey(sort?.id),
        sortDir: sort?.desc ? 'desc' : 'asc',
        includeCounts: true,
        search: searchQuery.value.trim() || undefined,
      },
    )
    items.value = resp.items
    totalCount.value = resp.totalCount ?? resp.items.length
    if (resp.statusCounts) {
      statusCounts.value = resp.statusCounts
    }
  } catch {
    toast.error('Не удалось загрузить товары')
    return
  } finally {
    isLoading.value = false
  }
}

const loadConnections = async (): Promise<void> => {
  isLoadingConnections.value = true
  try {
    connections.value = await integrationsApi.getConnections()
  } catch (error) {
    console.error('Failed to load connections:', error)
    connections.value = []
  } finally {
    isLoadingConnections.value = false
  }
}

const activeWildberriesConnection = computed<Connection | null>(() => {
  return connections.value.find(
    c => c.isActive && c.templateCode === 'wildberries'
  ) ?? null
})

const checkDeletionStatus = async (): Promise<void> => {
  const pendingProducts = items.value.filter(p => p.status === ProductStatus.DeletionPending)

  if (pendingProducts.length === 0) {
    return
  }

  let deletedFromPage = false

  for (const product of pendingProducts) {
    try {
      const status = await catalogProductsApi.getDeletionStatus(product.id)

      if (status.status === ProductStatus.Deleted) {
        items.value = items.value.filter(p => p.id !== product.id)
        deletingProductIds.value.delete(product.id)
        deletedFromPage = true
        toast.success(`Товар "${product.name}" успешно удалён`)
      } else if (status.status === ProductStatus.DeletionFailed) {
        const index = items.value.findIndex(p => p.id === product.id)
        if (index !== -1) {
          items.value[index] = { ...items.value[index], status: ProductStatus.DeletionFailed }
        }
        deletingProductIds.value.delete(product.id)
        toast.error(`Невозможно удалить товар "${product.name}": есть история продаж`)
      }
    } catch (error) {
      console.error('Error checking deletion status:', error)
    }
  }

  // Строка исчезла со страницы, значит и `totalCount` устарел: перезапрашиваем страницу,
  // иначе пагинация будет считать места под уже удалённые товары.
  if (deletedFromPage) {
    await loadItems()
  }
}

const startPolling = (): void => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
  }
  pollingInterval = window.setInterval(checkDeletionStatus, 2000)
}

const stopPolling = (): void => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

watch(() => items.value, (newItems) => {
  const hasPending = newItems.some(p => p.status === ProductStatus.DeletionPending)
  if (hasPending) {
    startPolling()
  } else {
    stopPolling()
  }
}, { deep: true })

// Смена фильтра, порядка или страницы меняет набор строк под курсором, поэтому выделение
// сбрасывается: таскать скрытые id между страницами — верный путь к «удалил 3, исчезло 40».
watch(statusFilter, () => {
  rowSelection.value = {}
  pagination.value = { ...pagination.value, pageIndex: 0 }
  loadItems()
})

watch(
  [() => pagination.value.pageIndex, () => pagination.value.pageSize],
  ([pageIndex, pageSize], [previousPageIndex, previousPageSize]) => {
    // Сброс страницы при новом поиске не должен сам грузить данные: за это отвечает
    // debounce поиска, иначе на каждый введённый символ уходило бы два одинаковых запроса.
    if (pageIndex === previousPageIndex && pageSize === previousPageSize) {
      return
    }
    rowSelection.value = {}
    loadItems()
  },
)

watch(sorting, () => {
  rowSelection.value = {}
  pagination.value = { ...pagination.value, pageIndex: 0 }
  loadItems()
}, { deep: true })

/**
 * Поиск меняет набор строк, поэтому выделение и страница сбрасываются сразу, а запрос уходит
 * после паузы в наборе. Смена вкладки и сортировки строку поиска не трогает: она не часть
 * их состояния.
 */
watch(searchQuery, () => {
  rowSelection.value = {}
  pagination.value = { ...pagination.value, pageIndex: 0 }
  if (searchDebounceTimer !== null) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    loadItems()
  }, SEARCH_DEBOUNCE_MS)
})

onMounted(() => {
  loadItems()
  loadConnections()
})

onUnmounted(() => {
  stopPolling()
  if (searchDebounceTimer !== null) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
})

const openCreate = (): void => {
  form.value = emptyForm()
  newBarcode.value = { value: '', type: '', isDefault: false }
  createDialogOpen.value = true
}

const openEdit = (item: ProductItem): void => {
  window.open(`/catalogs/product?productId=${item.id}`, '_blank')
}

const openDelete = (item: ProductItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const openArchive = (item: ProductItem): void => {
  archiveTarget.value = item
  archiveDialogOpen.value = true
}

const openRestore = (item: ProductItem): void => {
  restoreTarget.value = item
  restoreDialogOpen.value = true
}

const addBarcode = (): void => {
  if (!newBarcode.value.value.trim()) {
    toast.error('Введите значение баркода')
    return
  }
  form.value.barcodes.push({ ...newBarcode.value })
  newBarcode.value = { value: '', type: '', isDefault: false }
}

const removeBarcode = (index: number): void => {
  form.value.barcodes.splice(index, 1)
}

const handleCreate = async (): Promise<void> => {
  if (!form.value.sku.trim()) { toast.error('Введите SKU'); return }
  if (!form.value.name.trim()) { toast.error('Введите название'); return }

  isSaving.value = true
  try {
    const payload: CreateProductRequest = {
      sku: form.value.sku.trim(),
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
    }

    if (form.value.barcodes.length > 0) {
      payload.barcodes = form.value.barcodes.map(b => ({
        value: b.value.trim(),
        type: b.type?.trim() || undefined,
        isDefault: b.isDefault
      }))
    }

    if (form.value.packingUnit.lengthCm && form.value.packingUnit.widthCm && form.value.packingUnit.heightCm) {
      payload.packingUnit = {
        lengthCm: parseFloat(form.value.packingUnit.lengthCm),
        widthCm: parseFloat(form.value.packingUnit.widthCm),
        heightCm: parseFloat(form.value.packingUnit.heightCm),
        weightKg: form.value.packingUnit.weightKg ? parseFloat(form.value.packingUnit.weightKg) : undefined
      }
    }

    await catalogProductsApi.create(payload)
    toast.success('Товар добавлен')
    createDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось создать товар')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await catalogProductsApi.requestDeletion(deleteTarget.value.id)

    const index = items.value.findIndex(p => p.id === deleteTarget.value!.id)
    if (index !== -1) {
      items.value[index] = {
        ...items.value[index],
        status: ProductStatus.DeletionPending,
        deletionRequestedAt: new Date().toISOString()
      }
    }
    deletingProductIds.value.add(deleteTarget.value.id)

    toast.info('Запрос на удаление отправлен, проверяем историю продаж...')
    deleteDialogOpen.value = false
  } catch {
    toast.error('Не удалось удалить товар')
  } finally {
    isDeleting.value = false
  }
}

const handleArchive = async (): Promise<void> => {
  if (!archiveTarget.value) return
  isSaving.value = true
  try {
    await catalogProductsApi.archive(archiveTarget.value.id)
    toast.success('Товар перемещён в архив')
    archiveDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось архивировать товар')
  } finally {
    isSaving.value = false
  }
}

const handleRestore = async (): Promise<void> => {
  if (!restoreTarget.value) return
  isSaving.value = true
  try {
    await catalogProductsApi.restore(restoreTarget.value.id)
    toast.success('Товар восстановлен')
    restoreDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось восстановить товар')
  } finally {
    isSaving.value = false
  }
}

const dialogContentClass = 'bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[560px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100] overflow-y-auto'
const fieldClass = 'flex flex-col gap-1'
const inputClass = 'mt-1'
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-bold flex items-center gap-2">
          <Package class="size-5 text-primary" />
          Товары
        </h1>
        <p class="text-sm text-muted-foreground">Справочник товаров и SKU</p>
      </div>
      <Button v-if="canWrite" @click="openCreate" class="gap-2">
        <Plus class="size-4" />
        Добавить
      </Button>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <SearchInput
        v-model="searchQuery"
        placeholder="Поиск по названию или SKU"
        class="w-full sm:w-80"
      />
      <StatusFilter v-model="statusFilter" :options="filterOptions" />
    </div>

    <DataGrid
      v-model:pagination="pagination"
      v-model:sorting="sorting"
      v-model:column-visibility="columnVisibility"
      v-model:row-selection="rowSelection"
      :data="items"
      :columns="columns"
      :total-count="totalCount"
      :is-loading="isLoading"
      actions-column-id="actions"
    >
      <template #empty>
        <div class="flex flex-col items-center justify-center gap-3 text-center">
          <div class="size-12 rounded-full bg-muted flex items-center justify-center">
            <Package class="size-6 text-muted-foreground" />
          </div>
          <div>
            <h3 class="font-semibold">
              {{ searchQuery.trim() ? 'Ничего не найдено по запросу' : 'Нет товаров' }}
            </h3>
            <p class="text-sm text-muted-foreground">
              <template v-if="searchQuery.trim()">
                Измените запрос или очистите поле поиска
              </template>
              <template v-else>
                {{ statusFilter === 'active' ? 'Добавьте первый товар' : 'В этом разделе пока ничего нет' }}
              </template>
            </p>
          </div>
          <div
            v-if="canWrite && statusFilter === 'active' && !searchQuery.trim()"
            class="flex flex-col sm:flex-row gap-2 mt-2"
          >
            <Button @click="openCreate" variant="outline" class="gap-2">
              <Plus class="size-4" />
              Добавить товар
            </Button>
            <Button
              v-if="!isLoadingConnections && activeWildberriesConnection"
              @click="router.push('/catalogs/products/imports')"
              variant="default"
              class="gap-2"
            >
              <Download class="size-4" />
              Импорт из Wildberries
            </Button>
            <Button
              v-else-if="!isLoadingConnections && !activeWildberriesConnection"
              @click="router.push('/catalogs/sales-channels')"
              variant="outline"
              class="gap-2"
            >
              Настроить интеграцию
            </Button>
          </div>
        </div>
      </template>

      <!--
        Точка расширения под массовые операции: выделение строк уже живёт в `rowSelection`
        (в границах видимой страницы), но действий по нему в этой задаче нет — под них нужны
        отдельные batch-эндпоинты бэкенда.
      -->
    </DataGrid>

    <!-- Create Dialog -->
    <DialogRoot v-model:open="createDialogOpen">
      <DialogPortal>
        <DialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-start justify-between mb-4">
            <div>
              <DialogTitle class="text-lg font-semibold">Добавить товар</DialogTitle>
              <DialogDescription class="text-sm text-muted-foreground mt-1">
                Создайте новый товар в каталоге
              </DialogDescription>
            </div>
            <DialogClose as-child>
              <Button variant="ghost" size="sm" class="size-8 p-0">
                <X class="size-4" />
              </Button>
            </DialogClose>
          </div>

          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label for="create-sku">SKU *</Label>
              <Input 
                id="create-sku" 
                v-model="form.sku" 
                placeholder="PROD-001" 
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="create-name">Название *</Label>
              <Input 
                id="create-name" 
                v-model="form.name" 
                placeholder="Название товара" 
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="create-description">Описание</Label>
              <Textarea 
                id="create-description" 
                v-model="form.description" 
                placeholder="Краткое описание" 
                :rows="3"
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label>Баркоды товара</Label>
              <div class="flex flex-col gap-2 mt-1">
                <div v-if="form.barcodes.length > 0" class="flex flex-col gap-2 mb-2">
                  <div 
                    v-for="(barcode, idx) in form.barcodes" 
                    :key="idx"
                    class="flex items-center gap-2 p-2 bg-muted rounded-md"
                  >
                    <Badge :variant="getBarcodeVariant(barcode.type)" class="flex-shrink-0">
                      {{ barcode.value }}
                    </Badge>
                    <span v-if="barcode.type" class="text-xs text-muted-foreground">{{ barcode.type }}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      class="size-6 ml-auto" 
                      @click="removeBarcode(idx)"
                    >
                      <XIcon class="size-3" />
                    </Button>
                  </div>
                </div>
                <div class="flex gap-2">
                  <Input 
                    v-model="newBarcode.value" 
                    placeholder="Значение баркода" 
                    class="flex-1"
                  />
                  <Input 
                    v-model="newBarcode.type" 
                    placeholder="Тип (опц.)" 
                    class="w-32"
                  />
                  <Button variant="outline" size="sm" @click="addBarcode">
                    <Plus class="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div :class="fieldClass">
              <Label>Габариты упаковки (см, кг)</Label>
              <div class="flex gap-2 mt-1">
                <Input 
                  v-model="form.packingUnit.lengthCm" 
                  placeholder="Длина" 
                  type="number" 
                  step="0.01"
                />
                <Input 
                  v-model="form.packingUnit.widthCm" 
                  placeholder="Ширина" 
                  type="number" 
                  step="0.01"
                />
              </div>
              <div class="flex gap-2 mt-1">
                <Input 
                  v-model="form.packingUnit.heightCm" 
                  placeholder="Высота" 
                  type="number" 
                  step="0.01"
                />
                <Input 
                  v-model="form.packingUnit.weightKg" 
                  placeholder="Вес" 
                  type="number" 
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <DialogClose as-child>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button @click="handleCreate" :disabled="isSaving">
              <Spinner v-if="isSaving" class="mr-2" />
              {{ isSaving ? 'Сохранение...' : 'Создать' }}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Delete Dialog -->
    <AlertDialogRoot v-model:open="deleteDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/50" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[480px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]">
          <div class="flex flex-col gap-4">
            <div class="flex items-start gap-3">
              <div class="mt-1">
                <AlertTriangle class="size-5 text-destructive" />
              </div>
              <div class="flex-1">
                <AlertDialogTitle class="text-lg font-semibold">Удалить товар?</AlertDialogTitle>
                <AlertDialogDescription class="text-sm text-muted-foreground mt-2">
                  Вы действительно хотите удалить товар <strong>{{ deleteTarget?.name }}</strong>?
                  <br />
                  Система проверит историю продаж. Если товар продавался, удаление будет отклонено.
                </AlertDialogDescription>
              </div>
            </div>
            <div class="flex justify-end gap-3 mt-2">
              <AlertDialogCancel as-child>
                <Button variant="outline" :disabled="isDeleting">Отмена</Button>
              </AlertDialogCancel>
              <AlertDialogAction as-child>
                <Button variant="destructive" @click="handleDelete" :disabled="isDeleting">
                  <Spinner v-if="isDeleting" class="mr-2" />
                  {{ isDeleting ? 'Удаление...' : 'Удалить' }}
                </Button>
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>

    <!-- Archive Dialog -->
    <AlertDialogRoot v-model:open="archiveDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/50" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[480px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]">
          <div class="flex flex-col gap-4">
            <div class="flex items-start gap-3">
              <div class="mt-1">
                <Archive class="size-5 text-muted-foreground" />
              </div>
              <div class="flex-1">
                <AlertDialogTitle class="text-lg font-semibold">Архивировать товар?</AlertDialogTitle>
                <AlertDialogDescription class="text-sm text-muted-foreground mt-2">
                  Товар <strong>{{ archiveTarget?.name }}</strong> будет перемещён в архив.
                </AlertDialogDescription>
              </div>
            </div>
            <div class="flex justify-end gap-3 mt-2">
              <AlertDialogCancel as-child>
                <Button variant="outline" :disabled="isSaving">Отмена</Button>
              </AlertDialogCancel>
              <AlertDialogAction as-child>
                <Button @click="handleArchive" :disabled="isSaving">
                  <Spinner v-if="isSaving" class="mr-2" />
                  {{ isSaving ? 'Архивирование...' : 'Архивировать' }}
                </Button>
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>

    <!-- Restore Dialog -->
    <AlertDialogRoot v-model:open="restoreDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/50" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[480px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]">
          <div class="flex flex-col gap-4">
            <div class="flex items-start gap-3">
              <div class="mt-1">
                <Undo2 class="size-5 text-muted-foreground" />
              </div>
              <div class="flex-1">
                <AlertDialogTitle class="text-lg font-semibold">Восстановить товар?</AlertDialogTitle>
                <AlertDialogDescription class="text-sm text-muted-foreground mt-2">
                  Товар <strong>{{ restoreTarget?.name }}</strong> будет возвращён в активные.
                </AlertDialogDescription>
              </div>
            </div>
            <div class="flex justify-end gap-3 mt-2">
              <AlertDialogCancel as-child>
                <Button variant="outline" :disabled="isSaving">Отмена</Button>
              </AlertDialogCancel>
              <AlertDialogAction as-child>
                <Button @click="handleRestore" :disabled="isSaving">
                  <Spinner v-if="isSaving" class="mr-2" />
                  {{ isSaving ? 'Восстановление...' : 'Восстановить' }}
                </Button>
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </div>
</template>