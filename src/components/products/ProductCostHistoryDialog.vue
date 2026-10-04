<script setup lang="ts">
import { ref, watch } from 'vue'
import { History, X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { productCostApi } from '@/services/api'
import type { ProductCostSnapshotDto } from '@/types/bom'
import { useTenantMoney } from '@/composables/useTenantMoney'

const props = defineProps<{ productId: string }>()
const open = defineModel<boolean>('open', { required: true })

const { formatMoney } = useTenantMoney()

const items = ref<ProductCostSnapshotDto[]>([])
const totalCount = ref<number>(0)
const isLoading = ref<boolean>(false)

/** Машиночитаемая причина фиксации снимка (TriggerReason) → подпись для пользователя. */
const triggerLabels: Record<string, string> = {
  BomChanged: 'Изменился состав',
  ComponentPriceChanged: 'Изменилась цена компонента',
  WorkRateChanged: 'Изменилась норма выработки',
}

const triggerLabel = (reason: string): string => triggerLabels[reason] ?? reason

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

const formatDateTime = (dateStr: string): string =>
  new Date(dateStr).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const loadHistory = async (): Promise<void> => {
  isLoading.value = true
  try {
    const resp = await productCostApi.getHistory(props.productId)
    items.value = resp.items
    totalCount.value = resp.totalCount
  } catch {
    toast.error('Не удалось загрузить историю себестоимости')
  } finally {
    isLoading.value = false
  }
}

// Данные загружаются лениво — только при первом открытии диалога, не на монтировании родителя.
watch(open, (isOpen) => {
  if (isOpen) {
    loadHistory()
  }
})
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
      <DialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[720px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100] overflow-y-auto">
        <div class="flex items-start justify-between mb-4">
          <div class="flex flex-col gap-1">
            <DialogTitle class="text-lg font-semibold flex items-center gap-2">
              <History class="size-5 text-primary" />
              История себестоимости
            </DialogTitle>
            <DialogDescription class="text-sm text-muted-foreground">
              Зафиксированные снимки расчёта — каждый сохраняет сумму на момент изменения входных данных
            </DialogDescription>
          </div>
          <DialogClose as-child>
            <Button variant="ghost" size="icon" class="size-8"><X class="size-4" /></Button>
          </DialogClose>
        </div>

        <div v-if="isLoading" class="flex flex-col gap-3">
          <Skeleton v-for="n in 4" :key="n" class="h-10 w-full rounded-lg" />
        </div>

        <div
          v-else-if="items.length === 0"
          class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center"
        >
          <History class="size-8 text-muted-foreground/40" />
          <p class="text-sm text-muted-foreground">Снимков себестоимости пока нет</p>
        </div>

        <div v-else class="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow class="border-b border-border">
                <TableHead>Дата расчёта</TableHead>
                <TableHead>Триггер изменения</TableHead>
                <TableHead class="text-right">Итого</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Зафиксировано</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="item in items" :key="item.id" class="hover:bg-muted/40 transition-colors">
                <TableCell class="tabular-nums">{{ formatDate(item.asOfDate) }}</TableCell>
                <TableCell class="text-muted-foreground">{{ triggerLabel(item.triggerReason) }}</TableCell>
                <TableCell class="text-right tabular-nums font-medium">{{ formatMoney(item.totalCost) }}</TableCell>
                <TableCell>
                  <Badge :variant="item.isComplete ? 'success' : 'warning'">
                    {{ item.isComplete ? 'Полный' : 'Неполный' }}
                  </Badge>
                </TableCell>
                <TableCell class="tabular-nums text-muted-foreground text-sm">{{ formatDateTime(item.calculatedAt) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <p v-if="totalCount > items.length" class="text-xs text-muted-foreground mt-3">
          Показаны последние {{ items.length }} из {{ totalCount }} записей
        </p>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
