<script setup lang="ts" generic="T">
import type { Table } from '@tanstack/vue-table'
import { Settings2 } from 'lucide-vue-next'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Props {
  table: Table<T>
}

const props = defineProps<Props>()

const activatableColumns = computed(() =>
  props.table.getAllLeafColumns().filter(column => column.getCanHide()),
)

const allVisible = computed<boolean>(() => props.table.getIsAllColumnsVisible())

function isVisible(columnId: string): boolean {
  return props.table.getColumn(columnId)?.getIsVisible() ?? false
}

function setAllColumnsVisible(visible: boolean | 'indeterminate'): void {
  props.table.toggleAllColumnsVisible(visible !== false)
}

function setColumnVisible(columnId: string, visible: boolean | 'indeterminate'): void {
  props.table.getColumn(columnId)?.toggleVisibility(visible === true)
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        class="gap-2"
        aria-label="Настроить колонки"
      >
        <Settings2 class="size-4" />
        Колонки
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      class="w-52"
    >
      <DropdownMenuLabel>Колонки</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem
        :model-value="allVisible"
        @update:model-value="setAllColumnsVisible"
      >
        Показать все
      </DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem
        v-for="column in activatableColumns"
        :key="column.id"
        :model-value="isVisible(column.id)"
        @update:model-value="setColumnVisible(column.id, $event)"
        @select.prevent
      >
        {{ table.getColumn(column.id)?.columnDef.meta?.title ?? column.id }}
      </DropdownMenuCheckboxItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
