<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import type { ColumnDef, RowSelectionState, SortingState, VisibilityState } from '@tanstack/vue-table'
import { ChevronRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { DataGrid } from '@/components/ui/data-grid'
import type { DataGridPaginationState } from '@/components/ui/data-grid'
import ProductMetricCell from './ProductMetricCell.vue'
import ProductSkuCell from './ProductSkuCell.vue'
import type { FinanceProductRow, FinanceProductTableItem } from '@/types/financeProducts'
import { MINUS, formatMoney, formatNumber, formatPercent, formatSignedMoney } from '@/utils/financeFormat'

interface Props {
  items: FinanceProductTableItem[]
  totalCount: number
  isLoading: boolean
  currency: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'open', productId: string): void
}>()

const pagination = defineModel<DataGridPaginationState>('pagination', { required: true })
const sorting = defineModel<SortingState>('sorting', { required: true })

const COLUMN_VISIBILITY_KEY = 'delobytes.finance.products.columns'

function readStoredColumnVisibility(): VisibilityState {
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
    // A damaged value must not break the page: fall back to the defaults.
    return {}
  }
}

const columnVisibility = ref<VisibilityState>(readStoredColumnVisibility())
const rowSelection = ref<RowSelectionState>({})

watch(columnVisibility, (value: VisibilityState) => {
  localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(value))
}, { deep: true })

function coverageHint(row: FinanceProductRow): string | null {
  if (row.costCoverage !== 'Partial' || row.marginCoveragePercent === null) {
    return null
  }
  return `Посчитано по ${formatPercent(row.marginCoveragePercent)} выручки товара`
}

function soldCostText(value: number | null): string {
  if (value === null) {
    return '—'
  }
  return value === 0 ? formatMoney(0, props.currency) : `${MINUS}${formatMoney(value, props.currency)}`
}

const columns = computed<ColumnDef<FinanceProductTableItem, unknown>[]>(() => {
  const currency: string = props.currency

  function money(value: number | null): unknown {
    return h('span', { class: 'tabular-nums' }, formatMoney(value, currency))
  }

  function metric(
    value: number | null,
    options: {
      bold?: boolean
      currency?: boolean
      negative?: boolean
      hint?: string | null
    } = {},
  ): unknown {
    const text: string = options.currency
      ? formatMoney(value, currency)
      : formatPercent(value)

    return h(ProductMetricCell, {
      text,
      bold: options.bold ?? false,
      tone: options.negative === true ? 'negative' : 'default',
      hint: options.hint ?? null,
    })
  }

  return [
    {
      id: 'sku',
      accessorKey: 'sku',
      header: 'SKU',
      meta: { title: 'SKU' },
      enableSorting: true,
      enableHiding: true,
      cell: ({ row }) => h(ProductSkuCell, {
        productId: row.original.productId,
        sku: row.original.sku,
        coverage: row.original.costCoverage,
      }),
    },
    {
      id: 'revenueGroup',
      header: 'Выручка и удержания, ₽',
      meta: { title: 'Выручка и удержания, ₽' },
      columns: [
        {
          id: 'revenue',
          accessorKey: 'revenueAmount',
          header: 'Выручка',
          meta: { title: 'Выручка' },
          enableSorting: true,
          enableHiding: true,
          cell: ({ row }) => money(row.original.revenueAmount),
        },
        {
          id: 'deductions',
          accessorKey: 'deductionsAmount',
          header: 'Удержания',
          meta: { title: 'Удержания' },
          enableSorting: true,
          enableHiding: true,
          cell: ({ row }) => h(
            'span',
            { class: 'tabular-nums' },
            formatSignedMoney(row.original.deductionsAmount, currency),
          ),
        },
        {
          id: 'netRevenue',
          accessorKey: 'netRevenueAmount',
          header: 'Чистая',
          meta: { title: 'Чистая' },
          enableSorting: true,
          enableHiding: true,
          cell: ({ row }) => money(row.original.netRevenueAmount),
        },
      ],
    },
    {
      id: 'resultGroup',
      header: 'Результат',
      meta: { title: 'Результат' },
      columns: [
        {
          id: 'soldCost',
          accessorKey: 'soldCostAmount',
          header: 'Себестоимость',
          meta: { title: 'Себестоимость' },
          enableSorting: true,
          enableHiding: true,
          cell: ({ row }) => h(
            'span',
            { class: 'tabular-nums' },
            soldCostText(row.original.soldCostAmount),
          ),
        },
        {
          id: 'margin',
          accessorKey: 'margin',
          header: 'Маржа',
          meta: { title: 'Маржа' },
          enableSorting: true,
          enableHiding: true,
          cell: ({ row }) => metric(row.original.margin, {
            bold: true,
            currency: true,
            negative: (row.original.margin ?? 0) < 0,
            hint: coverageHint(row.original),
          }),
        },
        {
          id: 'contributionMarginPercent',
          accessorKey: 'contributionMarginPercent',
          header: 'Маржинальность',
          meta: { title: 'Маржинальность' },
          enableSorting: true,
          enableHiding: true,
          cell: ({ row }) => metric(row.original.contributionMarginPercent, {
            negative: (row.original.contributionMarginPercent ?? 0) < 0,
            hint: coverageHint(row.original),
          }),
        },
        {
          id: 'returnOnSoldCostPercent',
          accessorKey: 'returnOnSoldCostPercent',
          header: 'ROI',
          meta: {
            title: 'ROI',
            sortDisabledReason: 'Маржинальная прибыль к себестоимости проданных товаров',
          },
          enableSorting: true,
          enableHiding: true,
          cell: ({ row }) => metric(row.original.returnOnSoldCostPercent, {
            negative: (row.original.returnOnSoldCostPercent ?? 0) < 0,
            hint: coverageHint(row.original),
          }),
        },
      ],
    },
    {
      id: 'salesGroup',
      header: 'Продажи',
      meta: { title: 'Продажи' },
      columns: [
        {
          id: 'quantitySold',
          accessorKey: 'quantitySold',
          header: 'Продано',
          meta: { title: 'Продано' },
          enableSorting: true,
          enableHiding: true,
          cell: ({ row }) => h(
            'span',
            { class: 'tabular-nums' },
            `${formatNumber(row.original.quantitySold)} шт`,
          ),
        },
        {
          id: 'buyoutPercent',
          accessorKey: 'buyoutPercent',
          header: 'Выкуп',
          meta: { title: 'Выкуп' },
          enableSorting: true,
          enableHiding: true,
          cell: ({ row }) => metric(row.original.buyoutPercent),
        },
      ],
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      meta: { title: 'Действия' },
      header: () => h('span', { class: 'sr-only' }, 'Действия'),
      cell: ({ row }) => h(
        Button,
        {
          variant: 'ghost',
          size: 'icon',
          class: 'size-7',
          'aria-label': 'Открыть карточку товара',
          onClick: (event: MouseEvent) => {
            event.stopPropagation()
            emit('open', row.original.productId)
          },
        },
        () => h(ChevronRight, { class: 'size-4' }),
      ),
    },
  ]
})
</script>

<template>
  <DataGrid
    v-model:pagination="pagination"
    v-model:sorting="sorting"
    v-model:column-visibility="columnVisibility"
    v-model:row-selection="rowSelection"
    :data="props.items"
    :columns="columns"
    :total-count="props.totalCount"
    :is-loading="props.isLoading"
    :selectable="false"
    actions-column-id="actions"
    @row-click="(row) => emit('open', row.productId)"
  >
    <template #empty>
      <slot name="empty" />
    </template>
  </DataGrid>
</template>
