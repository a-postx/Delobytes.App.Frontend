<script setup lang="ts" generic="T extends DataGridRow">
import type { ColumnDef, RowSelectionState, SortingState, VisibilityState } from '@tanstack/vue-table'
import { FlexRender, getCoreRowModel, useVueTable } from '@tanstack/vue-table'
import { Check, Minus, Package } from 'lucide-vue-next'
import { computed, toRef } from 'vue'
import { CheckboxIndicator, CheckboxRoot } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import DataGridColumnHeader from './DataGridColumnHeader.vue'
import DataGridPagination from './DataGridPagination.vue'
import DataGridViewOptions from './DataGridViewOptions.vue'
import {
  DATA_GRID_EMPTY_DESCRIPTION,
  DATA_GRID_EMPTY_TITLE,
  type DataGridPaginationState,
  type DataGridRow,
} from './types'

interface Props {
  /** Только строки текущей страницы: сортировка и нарезка выполняются сервером. */
  data: T[]
  columns: ColumnDef<T, unknown>[]
  /** Общее число строк на сервере; от него считается футер. */
  totalCount: number
  selectable?: boolean
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: unknown
  /** Id колонки действий: она остаётся видимой и не попадает в меню видимости. */
  actionsColumnId?: string
  showPageSizeSelector?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selectable: true,
  isLoading: false,
  showPageSizeSelector: true,
})

const emit = defineEmits<{
  (event: 'rowClick', row: T): void
}>()

const pagination = defineModel<DataGridPaginationState>('pagination', { required: true })
const sorting = defineModel<SortingState>('sorting', { required: true })
const columnVisibility = defineModel<VisibilityState>('columnVisibility', { required: true })
const rowSelection = defineModel<RowSelectionState>('rowSelection', { required: true })

const rows = toRef(props, 'data')

const showSkeleton = computed<boolean>(() => props.isLoading === true)
const isEmpty = computed<boolean>(() => !showSkeleton.value && rows.value.length === 0)

/**
 * Меню видимости не должно давать спрятать колонку действий: вместе с ней из
 * строки уйдут все операции над товаром.
 */
const resolvedColumns = computed<ColumnDef<T, unknown>[]>(() => {
  if (!props.actionsColumnId) {
    return props.columns
  }
  return props.columns.map((column: ColumnDef<T, unknown>) => {
    const columnId = column.id ?? ('accessorKey' in column ? String(column.accessorKey) : '')
    return columnId === props.actionsColumnId ? { ...column, enableHiding: false } : column
  })
})

/**
 * Сортировку, фильтрацию и нарезку делает сервер, поэтому все режимы объявлены
 * manual: `useVueTable` не должен переупорядочивать или обрезать `data` сам.
 */
const table = useVueTable({
  get data() {
    return rows.value
  },
  get columns() {
    return resolvedColumns.value
  },
  getRowId: (row: T): string => row.id,
  getCoreRowModel: getCoreRowModel(),
  manualSorting: true,
  manualPagination: true,
  manualFiltering: true,
  enableRowSelection: true,
  get rowCount() {
    return props.totalCount
  },
  state: {
    get sorting() {
      return sorting.value
    },
    get columnVisibility() {
      return columnVisibility.value
    },
    get rowSelection() {
      return rowSelection.value
    },
    get pagination() {
      return pagination.value
    },
  },
  onSortingChange: (updater) => {
    sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
    // Смена порядка обнуляет смысл открытой страницы: она относится к прежней выборке.
    if (pagination.value.pageIndex !== 0) {
      pagination.value = { ...pagination.value, pageIndex: 0 }
    }
  },
  onColumnVisibilityChange: (updater) => {
    columnVisibility.value = typeof updater === 'function' ? updater(columnVisibility.value) : updater
  },
  onRowSelectionChange: (updater) => {
    rowSelection.value = typeof updater === 'function' ? updater(rowSelection.value) : updater
  },
  onPaginationChange: (updater) => {
    pagination.value = typeof updater === 'function' ? updater(pagination.value) : updater
  },
})

/**
 * Выбор сознательно ограничен загруженной страницей: `toggleAllPageRowsSelected`
 * трогает только строки из `data`, поэтому в состояние не попадают id невидимых строк.
 */
function toggleAllPageRows(checked: boolean | 'indeterminate'): void {
  table.toggleAllPageRowsSelected(checked === true)
}

function toggleRow(rowId: string, checked: boolean | 'indeterminate'): void {
  const next: RowSelectionState = { ...rowSelection.value }
  if (checked === true) {
    next[rowId] = true
  } else {
    delete next[rowId]
  }
  rowSelection.value = next
}

const selectAllState = computed<boolean | 'indeterminate'>(() => {
  if (table.getIsAllPageRowsSelected()) {
    return true
  }
  return table.getIsSomePageRowsSelected() ? 'indeterminate' : false
})

const selectedCount = computed<number>(() =>
  Object.keys(rowSelection.value).filter((key: string) => rowSelection.value[key]).length,
)

const selectedSummary = computed<string>(() => `${selectedCount.value} из ${props.totalCount} выбрано`)

const checkboxClass = 'grid size-4 shrink-0 place-items-center rounded border border-muted-foreground/40 bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors'

const selectCellClass = 'w-9 px-3 py-2.5'
const summaryClass = 'text-xs text-muted-foreground'
</script>

<template>
  <div class="rounded-xl border border-border bg-card overflow-hidden">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2">
      <div class="flex items-center gap-2">
        <slot name="toolbar" />
      </div>
      <div class="flex items-center gap-2">
        <slot name="toolbar-actions" />
        <DataGridViewOptions :table="table" />
      </div>
    </div>

    <div
      v-if="showSkeleton"
      class="p-4 flex flex-col gap-3"
    >
      <Skeleton
        v-for="n in 5"
        :key="n"
        class="h-10 w-full rounded-lg"
      />
    </div>

    <div
      v-else-if="isEmpty"
      class="p-12"
    >
      <slot name="empty">
        <div class="flex flex-col items-center justify-center gap-3 text-center">
          <div class="size-12 rounded-full bg-muted flex items-center justify-center">
            <component
              :is="props.emptyIcon ?? Package"
              class="size-6 text-muted-foreground"
            />
          </div>
          <div>
            <h3 class="font-semibold">
              {{ props.emptyTitle }}
            </h3>
            <p class="text-sm text-muted-foreground">
              {{ props.emptyDescription }}
            </p>
          </div>
        </div>
      </slot>
    </div>

    <Table v-else>
      <TableHeader>
        <TableRow
          v-for="headerGroup in table.getHeaderGroups()"
          :key="headerGroup.id"
        >
          <TableHead
            v-if="props.selectable"
            :class="selectCellClass"
          >
            <CheckboxRoot
              :model-value="selectAllState"
              :class="checkboxClass"
              aria-label="Выбрать все строки на странице"
              @update:model-value="toggleAllPageRows"
            >
              <CheckboxIndicator class="text-primary-foreground">
                <Minus
                  v-if="selectAllState === 'indeterminate'"
                  class="size-3"
                />
                <Check
                  v-else
                  class="size-3"
                />
              </CheckboxIndicator>
            </CheckboxRoot>
          </TableHead>
          <TableHead
            v-for="header in headerGroup.headers"
            :key="header.id"
          >
            <DataGridColumnHeader
              :column="header.column"
              :title="header.column.columnDef.meta?.title ?? header.column.id"
            >
              <FlexRender
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              />
            </DataGridColumnHeader>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="row in table.getRowModel().rows"
          :key="row.id"
          class="hover:bg-muted/40 transition-colors"
          :class="row.getIsSelected() ? 'bg-muted/60' : undefined"
        >
          <TableCell
            v-if="props.selectable"
            :class="selectCellClass"
          >
            <CheckboxRoot
              :model-value="row.getIsSelected()"
              :class="checkboxClass"
              aria-label="Выбрать строку"
              @click.stop
              @update:model-value="toggleRow(row.id, $event)"
            >
              <CheckboxIndicator class="text-primary-foreground">
                <Check class="size-3" />
              </CheckboxIndicator>
            </CheckboxRoot>
          </TableCell>
          <TableCell
            v-for="cell in row.getVisibleCells()"
            :key="cell.id"
            @click="emit('rowClick', row.original)"
          >
            <FlexRender
              :render="cell.column.columnDef.cell"
              :props="cell.getContext()"
            />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2.5">
      <!-- Точка расширения под массовые операции: сейчас здесь только сводка по выбору. -->
      <p
        v-if="props.selectable"
        :class="summaryClass"
      >
        {{ selectedSummary }}
      </p>
      <span v-else />
      <DataGridPagination
        :total-count="props.totalCount"
        :pagination="pagination"
        :is-loading="props.isLoading"
        :show-page-size-selector="props.showPageSizeSelector"
        @update:pagination="pagination = $event"
      />
    </div>
  </div>
</template>
