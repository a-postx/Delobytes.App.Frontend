<script setup lang="ts" generic="T extends Record<string, any>">
import { Check, Minus, ArrowUp, ArrowDown, ChevronsUpDown, Ellipsis, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import {
  CheckboxIndicator,
  CheckboxRoot,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  PaginationEllipsis,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  PaginationRoot,
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from 'reka-ui'
import { computed, ref } from 'vue'
import type { DataTableColumn, DataTableAction, DataTableSortState } from './types/datatable'

interface Props {
  data: T[]
  columns: DataTableColumn<T>[]
  actions?: DataTableAction<T>[]
  itemsPerPage?: number
  headerClass?: string
  rowHoverEnabled?: boolean
  selectable?: boolean
  keyField?: string
}

const props = withDefaults(defineProps<Props>(), {
  itemsPerPage: 10,
  headerClass: '',
  rowHoverEnabled: true,
  selectable: true,
  keyField: 'id',
  actions: () => [],
})

const selected = ref(new Set<any>())
const sortState = ref<DataTableSortState>({ key: null, descending: false })
const page = ref(1)

const sorted = computed(() => {
  if (!sortState.value.key) {
    return [...props.data]
  }

  return [...props.data].sort((a, b) => {
    const key: string = sortState.value.key as string
    const left = a[key]
    const right = b[key]
    
    let order = 0
    if (typeof left === 'number' && typeof right === 'number') {
      order = left - right
    } else {
      order = String(left).localeCompare(String(right))
    }
    
    return sortState.value.descending ? -order : order
  })
})

const pageRows = computed(() => 
  sorted.value.slice((page.value - 1) * props.itemsPerPage, page.value * props.itemsPerPage)
)

const pageSelection = computed<boolean | 'indeterminate'>({
  get() {
    if (pageRows.value.length === 0) {
      return false
    }
    
    const count = pageRows.value.filter(row => selected.value.has(row[props.keyField])).length
    if (count === 0) {
      return false
    }
    return count === pageRows.value.length ? true : 'indeterminate'
  },
  set(value) {
    for (const row of pageRows.value) {
      if (value === true) {
        selected.value.add(row[props.keyField])
      } else {
        selected.value.delete(row[props.keyField])
      }
    }
  },
})

function toggleRow(row: T, checked: boolean | 'indeterminate') {
  if (checked === true) {
    selected.value.add(row[props.keyField])
  } else {
    selected.value.delete(row[props.keyField])
  }
}

function toggleSort(key: string) {
  if (sortState.value.key === key) {
    sortState.value.descending = !sortState.value.descending
  } else {
    sortState.value.key = key
    sortState.value.descending = false
  }
  page.value = 1
}

function getCellValue(row: T, column: DataTableColumn<T>): string {
  const value = row[column.key]
  if (column.format) {
    return column.format(value, row)
  }
  return String(value ?? '')
}

function getAlignClass(align?: 'left' | 'center' | 'right'): string {
  if (align === 'center') return 'text-center'
  if (align === 'right') return 'text-right'
  return 'text-left'
}

const checkboxClass = 'grid size-4 shrink-0 place-items-center rounded border border-muted-foreground/40 bg-background data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors'
const menuContentClass = 'z-[100] min-w-[11rem] rounded-lg border border-border bg-popover p-1 shadow-lg will-change-[opacity,transform] data-[side=bottom]:animate-in data-[side=top]:animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2'
const menuItemClass = 'flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm text-popover-foreground outline-none data-[highlighted]:bg-muted transition-colors'
</script>

<template>
  <div class="w-full">
    <ScrollAreaRoot
      class="overflow-hidden rounded-xl border border-border bg-card"
      type="auto"
    >
      <ScrollAreaViewport class="w-full">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr
              class="border-b border-border text-left"
              :class="headerClass"
            >
              <th
                v-if="selectable"
                scope="col"
                class="w-9 px-3 py-2.5"
              >
                <CheckboxRoot
                  v-model="pageSelection"
                  :class="checkboxClass"
                  aria-label="Выбрать все строки на странице"
                >
                  <CheckboxIndicator class="text-primary-foreground">
                    <Minus v-if="pageSelection === 'indeterminate'" class="size-3" />
                    <Check v-else class="size-3" />
                  </CheckboxIndicator>
                </CheckboxRoot>
              </th>
              <th
                v-for="column in columns"
                :key="column.key"
                scope="col"
                class="px-3 py-2.5 font-medium"
                :class="getAlignClass(column.align)"
                :style="column.width ? { width: column.width } : {}"
              >
                <button
                  v-if="column.sortable"
                  type="button"
                  class="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 rounded transition-colors"
                  @click="toggleSort(column.key)"
                >
                  {{ column.label }}
                  <ArrowDown v-if="sortState.key === column.key && sortState.descending" class="size-3.5" />
                  <ArrowUp v-else-if="sortState.key === column.key" class="size-3.5" />
                  <ChevronsUpDown v-else class="size-3.5" />
                </button>
                <span
                  v-else
                  class="text-muted-foreground"
                >
                  {{ column.label }}
                </span>
              </th>
              <th
                v-if="actions && actions.length > 0"
                scope="col"
                class="w-10 px-3 py-2.5"
              >
                <span class="sr-only">Действия</span>
              </th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="row in pageRows"
              :key="row[keyField]"
              class="border-b border-border last:border-0"
              :class="[
                selected.has(row[keyField]) && 'bg-muted/60',
                rowHoverEnabled && 'hover:bg-muted/40 transition-colors'
              ]"
            >
              <td
                v-if="selectable"
                class="px-3 py-2.5"
              >
                <CheckboxRoot
                  :model-value="selected.has(row[keyField])"
                  :class="checkboxClass"
                  :aria-label="`Выбрать строку`"
                  @update:model-value="toggleRow(row, $event)"
                >
                  <CheckboxIndicator class="text-primary-foreground">
                    <Check class="size-3" />
                  </CheckboxIndicator>
                </CheckboxRoot>
              </td>
              <td
                v-for="column in columns"
                :key="column.key"
                class="px-3 py-2.5 text-foreground"
                :class="getAlignClass(column.align)"
              >
                <slot
                  :name="`cell-${column.key}`"
                  :row="row"
                  :value="row[column.key]"
                >
                  {{ getCellValue(row, column) }}
                </slot>
              </td>
              <td
                v-if="actions && actions.length > 0"
                class="px-3 py-2.5"
              >
                <DropdownMenuRoot>
                  <DropdownMenuTrigger
                    class="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
                    aria-label="Действия"
                  >
                    <Ellipsis class="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuContent
                      :class="menuContentClass"
                      align="end"
                      :side-offset="4"
                    >
                      <template
                        v-for="action in actions"
                        :key="action.id"
                      >
                        <DropdownMenuSeparator
                          v-if="action.destructive"
                          class="my-1 h-px bg-border"
                        />
                        <DropdownMenuItem
                          :class="[menuItemClass, action.destructive && 'text-destructive']"
                          @select="action.handler(row)"
                        >
                          <component :is="action.icon" class="size-4" />
                          {{ action.label }}
                        </DropdownMenuItem>
                      </template>
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenuRoot>
              </td>
            </tr>
          </tbody>
        </table>
      </ScrollAreaViewport>

      <ScrollAreaScrollbar
        class="flex h-2 touch-none select-none bg-muted/50 p-0.5"
        orientation="horizontal"
      >
        <ScrollAreaThumb class="relative flex-1 rounded-full bg-muted-foreground/40" />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>

    <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p class="text-xs text-muted-foreground">
        {{ selected.size }} из {{ data.length }} выбрано
      </p>

      <PaginationRoot
        v-model:page="page"
        :total="data.length"
        :items-per-page="itemsPerPage"
        :sibling-count="1"
      >
        <PaginationList
          v-slot="{ items }"
          class="flex items-center gap-1"
        >
          <PaginationPrev class="grid size-8 place-items-center rounded-md text-foreground hover:bg-muted disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors">
            <ChevronLeft class="size-4" />
          </PaginationPrev>
          <template v-for="(item, index) in items">
            <PaginationListItem
              v-if="item.type === 'page'"
              :key="index"
              :value="item.value"
              class="grid size-8 place-items-center rounded-md text-sm text-foreground hover:bg-muted data-[selected]:bg-primary data-[selected]:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
            >
              {{ item.value }}
            </PaginationListItem>
            <PaginationEllipsis
              v-else
              :key="item.type"
              :index="index"
              class="grid size-8 place-items-center text-muted-foreground"
            >
              &#8230;
            </PaginationEllipsis>
          </template>
          <PaginationNext class="grid size-8 place-items-center rounded-md text-foreground hover:bg-muted disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors">
            <ChevronRight class="size-4" />
          </PaginationNext>
        </PaginationList>
      </PaginationRoot>
    </div>
  </div>
</template>
