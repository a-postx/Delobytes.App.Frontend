<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted, h } from 'vue'
import { Plus, Trash2, PackageOpen, Pencil, Undo2, Tag } from 'lucide-vue-next'
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
import { StatusFilter } from '@/components/ui/status-filter'
import { SearchInput } from '@/components/ui/search-input'
import {
  DataGrid,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@/components/ui/data-grid'
import { toast } from 'vue-sonner'
import { componentsApi, suppliersApi, Unit, isComponentSortKey } from '@/services/api'
import type {
  ComponentItem,
  ComponentSortKey,
  ComponentStatusCounts,
  CreateComponentRequest,
  CreateComponentPriceRequest,
  SupplierItem,
  UpdateComponentRequest,
} from '@/services/api'
import type { ComponentCategory } from '@/types/bom'
import { COMPONENT_CATEGORY_LABELS } from '@/types/bom'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useApiCall } from '@/composables/useApiCall'
import { useTenantMoney } from '@/composables/useTenantMoney'
import { X } from 'lucide-vue-next'

const { canWrite } = useCurrentUser()
const { formatMoney } = useTenantMoney()

const items = ref<ComponentItem[]>([])
const suppliers = ref<SupplierItem[]>([])
const isLoading = ref<boolean>(true)

const createDialogOpen = ref<boolean>(false)
const editDialogOpen = ref<boolean>(false)
const priceDialogOpen = ref<boolean>(false)
const deleteDialogOpen = ref<boolean>(false)
const restoreDialogOpen = ref<boolean>(false)

const editTarget = ref<ComponentItem | null>(null)
const priceTarget = ref<ComponentItem | null>(null)
const deleteTarget = ref<ComponentItem | null>(null)
const restoreTarget = ref<ComponentItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)

const statusFilter = ref<'all' | 'active' | 'inactive'>('active')
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
const sorting = ref<SortingState>([{ id: 'name', desc: false }])
const columnVisibility = ref<VisibilityState>({})
const rowSelection = ref<RowSelectionState>({})
const totalCount = ref<number>(0)
const statusCounts = ref<ComponentStatusCounts>({ active: 0, inactive: 0, all: 0 })

const COLUMN_VISIBILITY_KEY = 'delobytes.components.columns'

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

const today = (): string => new Date().toISOString().slice(0, 10)

const form = ref({
  name: '',
  description: '',
  unit: Unit.Piece,
  category: 'Material' as ComponentCategory,
  pricePerUnit: 0,
  supplierId: '' as string,
  validFrom: today(),
})

const editForm = ref({
  name: '',
  description: '',
  unit: Unit.Piece,
  category: 'Material' as ComponentCategory,
})

const priceForm = ref({
  pricePerUnit: 0,
  supplierId: '' as string,
  validFrom: today(),
})

const filterOptions = computed(() => [
  { value: 'active', label: 'Активные', count: statusCounts.value.active },
  { value: 'all', label: 'Все', count: statusCounts.value.all },
  { value: 'inactive', label: 'Неактивные', count: statusCounts.value.inactive },
])

const unitOptions = [
  { value: Unit.Piece, label: 'шт.' },
  { value: Unit.Kg, label: 'кг' },
  { value: Unit.Meter, label: 'м' },
  { value: Unit.Liter, label: 'л' },
  { value: Unit.Ml, label: 'мл' },
  { value: Unit.Gram, label: 'г' },
]

const unitLabel = (u: Unit): string => unitOptions.find(o => o.value === u)?.label ?? 'шт.'

const categoryOptions = [
  { value: 'Material' as ComponentCategory, label: COMPONENT_CATEGORY_LABELS.Material },
  { value: 'Logistics' as ComponentCategory, label: COMPONENT_CATEGORY_LABELS.Logistics },
  { value: 'Packaging' as ComponentCategory, label: COMPONENT_CATEGORY_LABELS.Packaging },
]

const categoryLabel = (c: ComponentCategory): string => COMPONENT_CATEGORY_LABELS[c] ?? COMPONENT_CATEGORY_LABELS.Material

const categoryBadgeVariant: Record<ComponentCategory, 'secondary' | 'warning' | 'success'> = {
  Material: 'secondary',
  Logistics: 'warning',
  Packaging: 'success',
}

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

const activeSuppliers = (): SupplierItem[] => suppliers.value.filter(s => s.isActive)

const isPriceDateInPast = computed<boolean>(() => {
  if (!priceForm.value.validFrom) return false
  return priceForm.value.validFrom < today()
})

/**
 * id колонки грида → ключ сортировки API. Для неизвестного id возвращаем undefined: запрос уйдёт
 * без sortBy, и сервер применит свой порядок по умолчанию, а не отсортирует не по тому полю.
 */
const toComponentSortKey = (columnId: string | undefined): ComponentSortKey | undefined =>
  isComponentSortKey(columnId) ? columnId : undefined

/** id колонок, которые принимает меню видимости; заданы явно, чтобы совпадать с whitelist. */
const columns = computed<ColumnDef<ComponentItem, unknown>[]>(() => {
  const definitions: ColumnDef<ComponentItem, unknown>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      enableSorting: true,
      enableHiding: false,
      meta: { title: 'Название' },
      header: 'Название',
      cell: ({ row }) => h('div', [
        h('span', { class: 'font-medium' }, row.original.name),
        row.original.description
          ? h('p', { class: 'text-xs text-muted-foreground mt-0.5' }, row.original.description)
          : null,
      ]),
    },
    {
      id: 'unit',
      accessorKey: 'unit',
      enableSorting: false,
      enableHiding: true,
      meta: { title: 'Единица' },
      header: 'Единица',
      cell: ({ row }) => h('span', { class: 'text-sm' }, unitLabel(row.original.unit)),
    },
    {
      id: 'category',
      accessorKey: 'category',
      enableSorting: false,
      enableHiding: true,
      meta: { title: 'Категория' },
      header: 'Категория',
      cell: ({ row }) => h(
        Badge,
        { variant: categoryBadgeVariant[row.original.category] ?? 'secondary' },
        () => categoryLabel(row.original.category),
      ),
    },
    {
      id: 'price',
      accessorFn: (item: ComponentItem) => item.activePrice?.pricePerUnit ?? null,
      enableSorting: false,
      enableHiding: true,
      meta: { title: 'Цена/ед.' },
      header: 'Цена/ед.',
      cell: ({ row }) => h(
        'div',
        { class: 'text-right tabular-nums' },
        formatMoney(row.original.activePrice?.pricePerUnit ?? 0),
      ),
    },
    {
      id: 'supplier',
      accessorFn: (item: ComponentItem) => item.activePrice?.supplierName ?? null,
      enableSorting: true,
      enableHiding: true,
      meta: { title: 'Поставщик' },
      header: 'Поставщик',
      cell: ({ row }) => h(
        'span',
        { class: 'text-sm' },
        row.original.activePrice?.supplierName || '—',
      ),
    },
    {
      id: 'validFrom',
      accessorFn: (item: ComponentItem) => item.activePrice?.validFrom ?? null,
      enableSorting: true,
      enableHiding: true,
      meta: { title: 'Действует с' },
      header: 'Действует с',
      cell: ({ row }) => h(
        'span',
        { class: 'text-sm text-muted-foreground tabular-nums' },
        row.original.activePrice ? formatDate(row.original.activePrice.validFrom) : '—',
      ),
    },
    {
      id: 'status',
      accessorKey: 'isActive',
      enableSorting: false,
      enableHiding: true,
      meta: { title: 'Статус' },
      header: 'Статус',
      cell: ({ row }) => h(
        Badge,
        { variant: row.original.isActive ? 'success' : 'secondary' },
        () => (row.original.isActive ? 'Активен' : 'Неактивен'),
      ),
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      enableSorting: true,
      enableHiding: true,
      meta: { title: 'Добавлен' },
      header: 'Добавлен',
      cell: ({ row }) => h(
        'span',
        { class: 'text-sm text-muted-foreground tabular-nums' },
        formatDate(row.original.createdAt),
      ),
    },
  ]

  /**
   * Колонка действий существует независимо от прав: в её заголовке живёт кнопка настройки
   * колонок, нужная и читателю, и редактору. Сами кнопки рисуются только при праве на запись.
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

const renderActions = (item: ComponentItem): unknown => {
  const editButton = h(
    Button,
    {
      variant: 'ghost',
      size: 'icon-sm',
      title: 'Редактировать',
      onClick: () => openEdit(item),
    },
    () => h(Pencil, { class: 'size-4' }),
  )

  const priceButton = item.isActive
    ? h(
      Button,
      {
        variant: 'ghost',
        size: 'icon-sm',
        title: 'Новая цена',
        onClick: () => openNewPrice(item),
      },
      () => h(Tag, { class: 'size-4' }),
    )
    : null

  const deleteButton = item.isActive
    ? h(
      Button,
      {
        variant: 'ghost',
        size: 'icon-sm',
        title: 'Деактивировать',
        onClick: () => openDelete(item),
      },
      () => h(Trash2, { class: 'size-4 text-destructive' }),
    )
    : null

  const restoreButton = item.isActive
    ? null
    : h(
      Button,
      {
        variant: 'ghost',
        size: 'icon-sm',
        title: 'Восстановить',
        onClick: () => openRestore(item),
      },
      () => h(Undo2, { class: 'size-4 text-green-600' }),
    )

  return h('div', { class: 'flex items-center justify-end gap-1' }, [
    editButton,
    priceButton,
    deleteButton,
    restoreButton,
  ])
}

/**
 * Загружает одну страницу: фильтр по статусу, поиск, порядок и смещение считает сервер.
 * Счётчики вкладок приходят тем же ответом, поэтому отдельного запроса на «Все» больше нет.
 */
const loadItems = async (): Promise<void> => {
  isLoading.value = true
  try {
    const sort = sorting.value[0]
    const resp = await componentsApi.getAll({
      isActive: statusFilter.value === 'all' ? undefined : statusFilter.value === 'active',
      search: searchQuery.value.trim() || undefined,
      page: pagination.value.pageIndex + 1,
      pageSize: pagination.value.pageSize,
      sortBy: toComponentSortKey(sort?.id),
      sortDir: sort?.desc ? 'desc' : 'asc',
      includeCounts: true,
    })
    items.value = resp.items
    totalCount.value = resp.totalCount ?? resp.items.length
    if (resp.statusCounts) {
      statusCounts.value = resp.statusCounts
    }
  } catch {
    toast.error('Не удалось загрузить компоненты')
    return
  } finally {
    isLoading.value = false
  }
}

/**
 * Список поставщиков нужен только диалогам создания и новой цены и от фильтров не зависит,
 * поэтому запрашивается один раз при монтировании, а не вместе со каждой страницей компонентов.
 */
const loadSuppliers = async (): Promise<void> => {
  try {
    const resp = await suppliersApi.getAll()
    suppliers.value = resp.items
  } catch {
    toast.error('Не удалось загрузить поставщиков')
  }
}

const refreshList = async (): Promise<void> => {
  await loadItems()
  if (items.value.length === 0 && pagination.value.pageIndex > 0) {
    pagination.value = { ...pagination.value, pageIndex: pagination.value.pageIndex - 1 }
    await loadItems()
  }
}

watch(statusFilter, () => {
  rowSelection.value = {}
  pagination.value = { ...pagination.value, pageIndex: 0 }
  loadItems()
})

watch(
  [() => pagination.value.pageIndex, () => pagination.value.pageSize],
  ([pageIndex, pageSize], [previousPageIndex, previousPageSize]) => {
    // Сброс страницы при новом поиске не должен сам грузить данные: за это отвечает debounce
    // поиска, иначе на каждый введённый символ уходило бы два одинаковых запроса.
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
  loadSuppliers()
})

onUnmounted(() => {
  if (searchDebounceTimer !== null) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
})

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const { execute: createComponent } = useApiCall({
  fallbackMessage: 'Не удалось создать компонент',
})

const { execute: updateComponent } = useApiCall({
  fallbackMessage: 'Не удалось обновить компонент',
})

const { execute: addComponentPrice } = useApiCall({
  fallbackMessage: 'Не удалось добавить цену',
})

const { execute: deleteComponent } = useApiCall({
  fallbackMessage: 'Не удалось деактивировать компонент',
})

const { execute: restoreComponent } = useApiCall({
  fallbackMessage: 'Не удалось восстановить компонент',
})

const resetForm = (): void => {
  form.value = {
    name: '',
    description: '',
    unit: Unit.Piece,
    category: 'Material',
    pricePerUnit: 0,
    supplierId: '',
    validFrom: today(),
  }
}

const openCreate = (): void => {
  resetForm()
  createDialogOpen.value = true
}

const openEdit = (item: ComponentItem): void => {
  editTarget.value = item
  editForm.value = {
    name: item.name,
    description: item.description ?? '',
    unit: item.unit,
    category: item.category ?? 'Material',
  }
  editDialogOpen.value = true
}

const openNewPrice = (item: ComponentItem): void => {
  priceTarget.value = item
  priceForm.value = {
    pricePerUnit: item.activePrice?.pricePerUnit ?? 0,
    supplierId: item.activePrice?.supplierId ?? '',
    validFrom: today(),
  }
  priceDialogOpen.value = true
}

const openDelete = (item: ComponentItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const openRestore = (item: ComponentItem): void => {
  restoreTarget.value = item
  restoreDialogOpen.value = true
}

const handleCreate = async (): Promise<void> => {
  if (!form.value.name.trim()) { toast.error('Введите название'); return }
  if (Number(form.value.pricePerUnit) <= 0) { toast.error('Укажите цену больше нуля'); return }
  if (!form.value.validFrom) { toast.error('Укажите дату начала действия цены'); return }
  isSaving.value = true
  try {
    const payload: CreateComponentRequest = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      unit: form.value.unit,
      category: form.value.category,
      pricePerUnit: Number(form.value.pricePerUnit),
      supplierId: form.value.supplierId || undefined,
      validFrom: form.value.validFrom,
    }
    await createComponent(() => componentsApi.create(payload))
    toast.success('Компонент добавлен')
    createDialogOpen.value = false
    await refreshList()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isSaving.value = false
  }
}

const handleUpdate = async (): Promise<void> => {
  if (!editTarget.value) return
  if (!editForm.value.name.trim()) {
    toast.error('Введите название')
    return
  }
  isSaving.value = true
  try {
    const payload: UpdateComponentRequest = {
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim() || undefined,
      unit: editForm.value.unit,
      category: editForm.value.category,
    }
    await updateComponent(() => componentsApi.update(editTarget.value!.id, payload))
    toast.success('Компонент обновлён')
    editDialogOpen.value = false
    await refreshList()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isSaving.value = false
  }
}

const handleCreatePrice = async (): Promise<void> => {
  if (!priceTarget.value) return
  if (Number(priceForm.value.pricePerUnit) <= 0) {
    toast.error('Укажите цену больше нуля')
    return
  }
  if (!priceForm.value.validFrom) {
    toast.error('Укажите дату начала действия')
    return
  }
  isSaving.value = true
  try {
    const payload: CreateComponentPriceRequest = {
      pricePerUnit: Number(priceForm.value.pricePerUnit),
      supplierId: priceForm.value.supplierId || undefined,
      validFrom: priceForm.value.validFrom,
    }
    await addComponentPrice(() => componentsApi.createPrice(priceTarget.value!.id, payload))
    toast.success('Новая цена добавлена')
    priceDialogOpen.value = false
    await refreshList()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await deleteComponent(() => componentsApi.delete(deleteTarget.value!.id))
    toast.success('Компонент деактивирован')
    deleteDialogOpen.value = false
    await refreshList()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isDeleting.value = false
  }
}

const handleRestore = async (): Promise<void> => {
  if (!restoreTarget.value) return
  isSaving.value = true
  try {
    await restoreComponent(() => componentsApi.restore(restoreTarget.value!.id))
    toast.success('Компонент восстановлен')
    restoreDialogOpen.value = false
    await refreshList()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isSaving.value = false
  }
}

const dialogContentClass = 'bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[520px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100] overflow-y-auto'
const inputClass = 'mt-1'
const fieldClass = 'flex flex-col gap-1'
const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1'
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-bold flex items-center gap-2">
          <PackageOpen class="size-5 text-primary" />
          Компоненты
        </h1>
        <p class="text-sm text-muted-foreground">Справочник материалов и компонентов</p>
      </div>
      <Button v-if="canWrite" @click="openCreate" class="gap-2">
        <Plus class="size-4" />
        Добавить
      </Button>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <SearchInput
        v-model="searchQuery"
        placeholder="Поиск по названию"
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
      :selectable="false"
      actions-column-id="actions"
    >
      <template #empty>
        <div class="flex flex-col items-center justify-center gap-3 text-center">
          <div class="size-12 rounded-full bg-muted flex items-center justify-center">
            <PackageOpen class="size-6 text-muted-foreground" />
          </div>
          <div>
            <h3 class="font-semibold">
              {{ searchQuery.trim() ? 'Ничего не найдено' : 'Компоненты не добавлены' }}
            </h3>
            <p class="text-sm text-muted-foreground">
              <template v-if="searchQuery.trim()">
                Измените запрос или очистите поле поиска
              </template>
              <template v-else>
                {{ statusFilter === 'inactive' ? 'Нет неактивных компонентов' : 'Добавьте первый компонент' }}
              </template>
            </p>
          </div>
          <div
            v-if="canWrite && statusFilter !== 'inactive' && !searchQuery.trim()"
            class="flex flex-col sm:flex-row gap-2 mt-2"
          >
            <Button @click="openCreate" variant="outline" class="gap-2">
              <Plus class="size-4" />
              Добавить первый
            </Button>
          </div>
        </div>
      </template>
    </DataGrid>

    <!-- Create Dialog -->
    <DialogRoot v-model:open="createDialogOpen">
      <DialogPortal>
        <DialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-start justify-between mb-4">
            <div>
              <DialogTitle class="text-lg font-semibold">Добавить компонент</DialogTitle>
              <DialogDescription class="text-sm text-muted-foreground mt-1">
                Укажите название и параметры компонента и его первую цену
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
              <Label for="create-name">Название *</Label>
              <Input
                id="create-name"
                v-model="form.name"
                placeholder=""
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="create-description">Описание</Label>
              <Input
                id="create-description"
                v-model="form.description"
                placeholder=""
                :class="inputClass"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div :class="fieldClass">
                <Label for="create-unit">Единица измерения *</Label>
                <select
                  id="create-unit"
                  v-model.number="form.unit"
                  :class="selectClass"
                >
                  <option v-for="opt in unitOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div :class="fieldClass">
                <Label for="create-category">Категория *</Label>
                <select
                  id="create-category"
                  v-model="form.category"
                  :class="selectClass"
                >
                  <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div :class="fieldClass">
                <Label for="create-price">Цена за единицу *</Label>
                <Input
                  id="create-price"
                  v-model.number="form.pricePerUnit"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  :class="inputClass"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div :class="fieldClass">
                <Label for="create-supplier">Поставщик</Label>
                <select
                  id="create-supplier"
                  v-model="form.supplierId"
                  :class="selectClass"
                >
                  <option value="">Не выбран</option>
                  <option v-for="s in activeSuppliers()" :key="s.id" :value="s.id">
                    {{ s.name }}
                  </option>
                </select>
              </div>

              <div :class="fieldClass">
                <Label for="create-valid-from">Цена действует с *</Label>
                <Input
                  id="create-valid-from"
                  v-model="form.validFrom"
                  type="date"
                  :class="inputClass"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <DialogClose as-child>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button @click="handleCreate" :disabled="isSaving" class="gap-2">
              <Spinner v-if="isSaving" class="size-4" />
              Создать
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
              <DialogTitle class="text-lg font-semibold">Редактировать компонент</DialogTitle>
              <DialogDescription class="text-sm text-muted-foreground mt-1">
                Изменение категории влияет на распределение затрат в последующих расчётах себестоимости
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
              <Label for="edit-name">Название *</Label>
              <Input
                id="edit-name"
                v-model="editForm.name"
                placeholder=""
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="edit-description">Описание</Label>
              <Input
                id="edit-description"
                v-model="editForm.description"
                placeholder=""
                :class="inputClass"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div :class="fieldClass">
                <Label for="edit-unit">Единица измерения *</Label>
                <select
                  id="edit-unit"
                  v-model.number="editForm.unit"
                  :class="selectClass"
                >
                  <option v-for="opt in unitOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div :class="fieldClass">
                <Label for="edit-category">Категория *</Label>
                <select
                  id="edit-category"
                  v-model="editForm.category"
                  :class="selectClass"
                >
                  <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
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

    <!-- New Price Dialog -->
    <DialogRoot v-model:open="priceDialogOpen">
      <DialogPortal>
        <DialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-start justify-between mb-4">
            <div>
              <DialogTitle class="text-lg font-semibold">Новая цена</DialogTitle>
              <DialogDescription class="text-sm text-muted-foreground mt-1">
                Компонент «{{ priceTarget?.name }}»: текущая активная цена будет закрыта, вместо неё будет создана новая
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
              <Label for="price-value">Цена за единицу *</Label>
              <Input
                id="price-value"
                v-model.number="priceForm.pricePerUnit"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="price-supplier">Поставщик</Label>
              <select
                id="price-supplier"
                v-model="priceForm.supplierId"
                :class="selectClass"
              >
                <option value="">Не выбран</option>
                <option v-for="s in activeSuppliers()" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select>
            </div>

            <div :class="fieldClass">
              <Label for="price-valid-from">Действует с *</Label>
              <Input
                id="price-valid-from"
                v-model="priceForm.validFrom"
                type="date"
                :class="inputClass"
              />
              <p v-if="isPriceDateInPast" class="text-xs text-amber-600 mt-1">
                Дата в прошлом изменит стоимость компонента в прошлых расчётах
              </p>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <DialogClose as-child>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button @click="handleCreatePrice" :disabled="isSaving" class="gap-2">
              <Spinner v-if="isSaving" class="size-4" />
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Delete Confirm -->
    <AlertDialogRoot v-model:open="deleteDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[420px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]">
          <AlertDialogTitle class="text-lg font-semibold">Деактивировать компонент?</AlertDialogTitle>
          <AlertDialogDescription class="text-sm text-muted-foreground mt-2">
            Компонент "{{ deleteTarget?.name }}" будет деактивирован и скрыт из основного списка. Вы сможете восстановить его позже.
          </AlertDialogDescription>
          <div class="flex justify-end gap-2 mt-6">
            <AlertDialogCancel as-child>
              <Button variant="outline">Отмена</Button>
            </AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button @click="handleDelete" :disabled="isDeleting" variant="destructive" class="gap-2">
                <Spinner v-if="isDeleting" class="size-4" />
                Деактивировать
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>

    <!-- Restore Confirm -->
    <AlertDialogRoot v-model:open="restoreDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[420px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]">
          <AlertDialogTitle class="text-lg font-semibold">Восстановить компонент?</AlertDialogTitle>
          <AlertDialogDescription class="text-sm text-muted-foreground mt-2">
            Компонент "{{ restoreTarget?.name }}" снова станет активным вместе с его последней ценой.
          </AlertDialogDescription>
          <div class="flex justify-end gap-2 mt-6">
            <AlertDialogCancel as-child>
              <Button variant="outline">Отмена</Button>
            </AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button @click="handleRestore" :disabled="isSaving" class="gap-2">
                <Spinner v-if="isSaving" class="size-4" />
                Восстановить
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </div>
</template>
