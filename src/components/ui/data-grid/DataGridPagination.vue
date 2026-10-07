<script setup lang="ts">
import { computed } from 'vue'
import {
  PaginationEllipsis,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  PaginationRoot,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DATA_GRID_PAGE_SIZES, type DataGridPaginationState } from './types'

interface Props {
  /** Всего строк на сервере, а не длина текущей страницы. */
  totalCount: number
  pagination: DataGridPaginationState
  isLoading?: boolean
  showPageSizeSelector?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  showPageSizeSelector: true,
})

const emit = defineEmits<{
  (event: 'update:pagination', value: DataGridPaginationState): void
}>()

/**
 * `PaginationRoot` работает с абсолютным номером страницы, а состояние хранится
 * как `pageIndex`; конвертация живёт здесь, чтобы наружу торчал один формат.
 */
const page = computed<number>({
  get: () => props.pagination.pageIndex + 1,
  set: (value: number) => {
    const pageIndex = Math.max(0, value - 1)
    if (pageIndex === props.pagination.pageIndex) {
      return
    }
    emit('update:pagination', { pageIndex, pageSize: props.pagination.pageSize })
  },
})

const pageSizeModel = computed<string>({
  get: () => String(props.pagination.pageSize),
  set: (value: string) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed === props.pagination.pageSize) {
      return
    }
    // Смена размера страницы возвращает на первую — иначе текущая страница может выйти за границы выборки.
    emit('update:pagination', { pageIndex: 0, pageSize: parsed })
  },
})

const firstRow = computed<number>(() =>
  props.totalCount === 0 ? 0 : props.pagination.pageIndex * props.pagination.pageSize + 1,
)

const lastRow = computed<number>(() =>
  Math.min(firstRow.value + props.pagination.pageSize - 1, props.totalCount),
)

const rangeText = computed<string>(() => {
  if (props.totalCount === 0) {
    return 'Ничего не найдено'
  }
  return `${firstRow.value}–${lastRow.value} из ${props.totalCount}`
})

const navButtonClass = 'grid size-8 place-items-center rounded-md text-foreground hover:bg-muted disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors'
const pageItemClass = 'grid size-8 place-items-center rounded-md text-sm text-foreground hover:bg-muted data-[selected]:bg-primary data-[selected]:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors'
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-3">
      <p class="text-xs text-muted-foreground">
        {{ rangeText }}
      </p>
      <div
        v-if="showPageSizeSelector"
        class="flex items-center gap-2"
      >
        <span class="text-xs text-muted-foreground">Строк:</span>
        <Select v-model="pageSizeModel">
          <SelectTrigger
            size="sm"
            class="w-[4.5rem]"
            aria-label="Строк на странице"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="size in DATA_GRID_PAGE_SIZES"
              :key="size"
              :value="String(size)"
            >
              {{ size }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <PaginationRoot
      v-if="totalCount > 0"
      :page="page"
      :total="totalCount"
      :items-per-page="pagination.pageSize"
      :sibling-count="1"
      @update:page="page = $event"
    >
      <PaginationList
        v-slot="{ items }"
        class="flex items-center gap-1"
      >
        <PaginationPrev :class="navButtonClass" />
        <template v-for="(item, index) in items">
          <PaginationListItem
            v-if="item.type === 'page'"
            :key="`page-${item.value}`"
            :value="item.value"
            :class="pageItemClass"
          >
            {{ item.value }}
          </PaginationListItem>
          <PaginationEllipsis
            v-else
            :key="`ellipsis-${index}`"
            :index="index"
            class="grid size-8 place-items-center text-muted-foreground"
          >
            &#8230;
          </PaginationEllipsis>
        </template>
        <PaginationNext :class="navButtonClass" />
      </PaginationList>
    </PaginationRoot>
  </div>
</template>
