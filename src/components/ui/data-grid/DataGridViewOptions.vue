<script setup lang="ts" generic="T">
import type { Table } from '@tanstack/vue-table'
import { Settings } from 'lucide-vue-next'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Props {
  table: Table<T>
}

const props = defineProps<Props>()

const activatableColumns = computed(() =>
  props.table.getAllLeafColumns().filter(column => column.getCanHide()),
)

function isVisible(columnId: string): boolean {
  return props.table.getColumn(columnId)?.getIsVisible() ?? false
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
        size="icon"
        class="size-7"
        title="Настроить колонки"
        aria-label="Настроить колонки"
      >
        <Settings class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      class="w-52"
    >
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
