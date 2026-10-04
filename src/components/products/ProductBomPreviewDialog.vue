<script setup lang="ts">
import { ref, watch } from 'vue'
import { Eye, X, TrendingUp, TrendingDown, Minus, Info } from 'lucide-vue-next'
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
import { toast } from 'vue-sonner'
import { productCostApi } from '@/services/api'
import type { UpsertProductBomLine, ProductCostResponse } from '@/types/bom'
import { useTenantMoney } from '@/composables/useTenantMoney'

const props = defineProps<{
  productId: string
  draftLines: UpsertProductBomLine[]
  asOfDate: string
}>()

const open = defineModel<boolean>('open', { required: true })

const { formatMoney } = useTenantMoney()

const currentCost = ref<ProductCostResponse | null>(null)
const previewCost = ref<ProductCostResponse | null>(null)
const isLoading = ref<boolean>(false)

interface CostDelta {
  materialDelta: number
  logisticsDelta: number
  packagingDelta: number
  laborDelta: number
  totalDelta: number
}

const costDelta = ref<CostDelta | null>(null)

const deltaVariant = (delta: number): 'success' | 'warning' | 'secondary' => {
  if (delta < 0) return 'success'
  if (delta > 0) return 'warning'
  return 'secondary'
}

const deltaIcon = (delta: number) => {
  if (delta < 0) return TrendingDown
  if (delta > 0) return TrendingUp
  return Minus
}

const deltaClass = (delta: number): string => {
  if (delta < 0) return 'text-green-700 dark:text-green-400'
  if (delta > 0) return 'text-yellow-700 dark:text-yellow-400'
  return 'text-muted-foreground'
}

const deltaText = (delta: number): string => `${delta >= 0 ? '+' : ''}${formatMoney(delta)}`

/**
 * Считает себестоимость по текущему составу и по черновику.
 * Черновик уходит в отдельный эндпоинт предпросмотра, который ничего не записывает,
 * поэтому после закрытия диалога состав товара в БД остаётся прежним.
 */
const loadPreview = async (): Promise<void> => {
  isLoading.value = true
  costDelta.value = null
  try {
    currentCost.value = await productCostApi.getCost(props.productId, props.asOfDate)

    const previewResponse = await productCostApi.previewCost(props.productId, {
      lines: props.draftLines,
      asOf: props.asOfDate,
    })
    previewCost.value = previewResponse.preview

    if (previewCost.value && currentCost.value) {
      costDelta.value = {
        materialDelta: previewCost.value.materialCost - currentCost.value.materialCost,
        logisticsDelta: previewCost.value.logisticsCost - currentCost.value.logisticsCost,
        packagingDelta: previewCost.value.packagingCost - currentCost.value.packagingCost,
        laborDelta: previewCost.value.laborCost - currentCost.value.laborCost,
        totalDelta: previewCost.value.totalCost - currentCost.value.totalCost,
      }
    }
  } catch {
    toast.error('Не удалось рассчитать превью себестоимости')
    currentCost.value = null
    previewCost.value = null
    costDelta.value = null
  } finally {
    isLoading.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    loadPreview()
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
              <Eye class="size-5 text-primary" />
              Предпросмотр изменений себестоимости
            </DialogTitle>
            <DialogDescription class="text-sm text-muted-foreground">
              Сравнение текущей себестоимости и той, что получится после сохранения состава
            </DialogDescription>
          </div>
          <DialogClose as-child>
            <Button variant="ghost" size="icon" class="size-8"><X class="size-4" /></Button>
          </DialogClose>
        </div>

        <div v-if="isLoading" class="flex flex-col gap-4">
          <Skeleton class="h-24 w-full rounded-lg" />
          <Skeleton class="h-32 w-full rounded-lg" />
        </div>

        <template v-else-if="currentCost && previewCost && costDelta">
          <!-- Итоговое изменение -->
          <div
            class="rounded-lg border-2 p-4 mb-4"
            :class="deltaVariant(costDelta.totalDelta) === 'success'
              ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
              : deltaVariant(costDelta.totalDelta) === 'warning'
                ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20'
                : 'border-border bg-muted/30'"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-muted-foreground">Изменение итоговой себестоимости</span>
              <component :is="deltaIcon(costDelta.totalDelta)" class="size-5" :class="deltaClass(costDelta.totalDelta)" />
            </div>
            <div class="flex items-baseline gap-3 flex-wrap">
              <span class="text-2xl font-bold tabular-nums">{{ formatMoney(previewCost.totalCost) }}</span>
              <span class="text-base font-medium tabular-nums" :class="deltaClass(costDelta.totalDelta)">
                {{ deltaText(costDelta.totalDelta) }}
              </span>
            </div>
            <div class="text-xs text-muted-foreground mt-1">
              Было: {{ formatMoney(currentCost.totalCost) }}
            </div>
          </div>

          <!-- Детализация по категориям -->
          <div class="rounded-lg border border-border overflow-hidden mb-4">
            <div class="bg-muted/40 px-4 py-2 border-b border-border">
              <span class="text-sm font-medium">Изменения по статьям затрат</span>
            </div>
            <div class="divide-y divide-border">
              <div class="px-4 py-3 flex items-center justify-between gap-4 hover:bg-muted/40 transition-colors">
                <div class="flex flex-col gap-1 min-w-0">
                  <span class="text-sm font-medium">Материалы</span>
                  <span class="text-xs text-muted-foreground">
                    {{ formatMoney(currentCost.materialCost) }} → {{ formatMoney(previewCost.materialCost) }}
                  </span>
                </div>
                <Badge :variant="deltaVariant(costDelta.materialDelta)" class="shrink-0">
                  <component :is="deltaIcon(costDelta.materialDelta)" class="size-3 mr-1" />
                  {{ deltaText(costDelta.materialDelta) }}
                </Badge>
              </div>

              <div class="px-4 py-3 flex items-center justify-between gap-4 hover:bg-muted/40 transition-colors">
                <div class="flex flex-col gap-1 min-w-0">
                  <span class="text-sm font-medium">Логистика</span>
                  <span class="text-xs text-muted-foreground">
                    {{ formatMoney(currentCost.logisticsCost) }} → {{ formatMoney(previewCost.logisticsCost) }}
                  </span>
                </div>
                <Badge :variant="deltaVariant(costDelta.logisticsDelta)" class="shrink-0">
                  <component :is="deltaIcon(costDelta.logisticsDelta)" class="size-3 mr-1" />
                  {{ deltaText(costDelta.logisticsDelta) }}
                </Badge>
              </div>

              <div class="px-4 py-3 flex items-center justify-between gap-4 hover:bg-muted/40 transition-colors">
                <div class="flex flex-col gap-1 min-w-0">
                  <span class="text-sm font-medium">Упаковка</span>
                  <span class="text-xs text-muted-foreground">
                    {{ formatMoney(currentCost.packagingCost) }} → {{ formatMoney(previewCost.packagingCost) }}
                  </span>
                </div>
                <Badge :variant="deltaVariant(costDelta.packagingDelta)" class="shrink-0">
                  <component :is="deltaIcon(costDelta.packagingDelta)" class="size-3 mr-1" />
                  {{ deltaText(costDelta.packagingDelta) }}
                </Badge>
              </div>

              <div class="px-4 py-3 flex items-center justify-between gap-4 hover:bg-muted/40 transition-colors">
                <div class="flex flex-col gap-1 min-w-0">
                  <span class="text-sm font-medium">Работа</span>
                  <span class="text-xs text-muted-foreground">
                    {{ formatMoney(currentCost.laborCost) }} → {{ formatMoney(previewCost.laborCost) }}
                  </span>
                </div>
                <Badge :variant="deltaVariant(costDelta.laborDelta)" class="shrink-0">
                  <component :is="deltaIcon(costDelta.laborDelta)" class="size-3 mr-1" />
                  {{ deltaText(costDelta.laborDelta) }}
                </Badge>
              </div>
            </div>
          </div>

          <!-- Предупреждения по новому расчёту -->
          <div
            v-if="!previewCost.isComplete"
            class="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm mb-4"
          >
            <p class="font-medium text-foreground mb-1">Расчёт по новому составу неполный</p>
            <ul class="list-disc pl-4 text-muted-foreground">
              <li v-for="(warning, idx) in previewCost.warnings" :key="idx">{{ warning.message }}</li>
            </ul>
          </div>

          <!-- Напоминание, что состав ещё не сохранён -->
          <div class="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <Info class="size-4 mt-0.5 shrink-0 text-muted-foreground" />
            <p class="text-muted-foreground">
              Предпросмотр ничего не сохраняет. Чтобы применить изменения, нажмите
              «Сохранить состав».
            </p>
          </div>

          <div class="flex justify-end gap-3 mt-4">
            <Button variant="outline" @click="open = false">Закрыть</Button>
          </div>
        </template>

        <div v-else class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
          <Eye class="size-8 text-muted-foreground/40" />
          <p class="text-sm text-muted-foreground">Не удалось загрузить данные для превью</p>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
