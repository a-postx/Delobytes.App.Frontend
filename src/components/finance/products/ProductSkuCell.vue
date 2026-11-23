<script setup lang="ts">
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { costCoverageLabel } from './productsModel'
import type { PnlProductCostCoverage } from '@/types/financeProducts'

interface Props {
  productId: string
  sku: string | null
  coverage: PnlProductCostCoverage
}

const props = defineProps<Props>()

const label: ComputedRef<string | null> = computed<string | null>(
  () => costCoverageLabel(props.coverage),
)
</script>

<template>
  <button
    type="button"
    :data-product-row="props.productId"
    class="flex items-center gap-2 rounded-sm text-left font-mono text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1"
  >
    <span>{{ props.sku ?? 'Без SKU' }}</span>
    <span
      v-if="label"
      class="inline-flex items-center rounded border border-dashed border-border px-1.5 py-0.5 font-sans text-[11px] font-normal text-muted-foreground"
    >
      {{ label }}
    </span>
  </button>
</template>
