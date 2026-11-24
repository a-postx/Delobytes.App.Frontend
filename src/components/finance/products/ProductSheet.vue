<script setup lang="ts">
import { computed, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { RouterLink } from 'vue-router'
import { CheckCircle2, Info, TriangleAlert } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BreakdownBar } from '@/components/ui/breakdown-bar'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { useAsyncResource } from '@/composables/useAsyncResource'
import { failureMessage } from '@/composables/useApiFailureCopy'
import { catalogProductsApi, financeProductsApi } from '@/services/api'
import type { ChannelItem } from '@/services/api'
import type { FinanceProductDetailsResponse, FinanceProductRow } from '@/types/financeProducts'
import type { GetProductResponse, ProductChannelLink } from '@/types/products'
import { channelDisplay } from '@/utils/channelBadges'
import type { ChannelBadgeVariant } from '@/utils/channelBadges'
import { MINUS, formatMoney, formatNumber, formatPercent, pluralRu } from '@/utils/financeFormat'
import {
  buildDocumentViews,
  buildProductAmounts,
  buildRevenueFlow,
  productTitle,
  quantityLabel,
} from './productsModel'

interface Props {
  productId: string | null
  from: string
  to: string
  channelId: string | null
  channels: ChannelItem[]
  timeZone: string
  rangeLabel: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'close'): void
}>()

const open = computed<boolean>({
  get: () => props.productId !== null,
  set: (value: boolean) => {
    if (!value) {
      emit('close')
    }
  },
})

const details = useAsyncResource<FinanceProductDetailsResponse>({
  fetcher: () => financeProductsApi.getDetails(props.productId!, {
    from: props.from,
    to: props.to,
    channelId: props.channelId ?? undefined,
    completeness: 'all',
  }),
  fallbackMessage: 'Не удалось загрузить карточку товара',
})

const catalog = useAsyncResource<GetProductResponse>({
  fetcher: () => catalogProductsApi.getById(props.productId!),
  fallbackMessage: 'Не удалось загрузить товар',
})

watch(
  () => [props.productId, props.from, props.to, props.channelId] as const,
  () => {
    if (props.productId === null) {
      details.reset()
      return
    }
    void details.load()
  },
  { immediate: true },
)

watch(
  () => props.productId,
  () => {
    if (props.productId === null) {
      catalog.reset()
      return
    }
    void catalog.load()
  },
  { immediate: true },
)

const product: ComputedRef<FinanceProductRow | null> = computed<FinanceProductRow | null>(
  () => details.data.value?.product ?? null,
)

// `details` is a plain object of refs: the template cannot unwrap its nested computeds, so the
// two state flags are exposed at the top level.
const detailsLoading = details.isInitialLoading
const detailsFailed = details.isLoadingError

const currency: ComputedRef<string> = computed<string>(() => details.data.value?.currency ?? 'RUB')

const catalogName: ComputedRef<string | null> = computed<string | null>(() => {
  const value: GetProductResponse | null = catalog.data.value
  return value !== null ? value.name : null
})

const channelLinks: ComputedRef<ProductChannelLink[]> = computed<ProductChannelLink[]>(
  () => catalog.data.value?.channelLinks ?? [],
)

const headerMeta: ComputedRef<string> = computed<string>(() => {
  const value: FinanceProductRow | null = product.value
  if (value === null) {
    return props.rangeLabel
  }

  const lines: string = `${formatNumber(value.lines)} ${pluralRu(value.lines, ['строка', 'строки', 'строк'])}`
  return `${props.rangeLabel} · ${quantityLabel(value)} · ${lines}`
})

const marginPercent: ComputedRef<string | null> = computed<string | null>(() => {
  const value = product.value?.contributionMarginPercent
  return value === null || value === undefined ? null : formatPercent(value)
})

const revenueFlow = computed(() => {
  const value = product.value
  return value === null
    ? { caption: '', ariaLabel: '', segments: [], lossFormatted: null }
    : buildRevenueFlow(value, currency.value)
})

const amounts = computed(() => {
  const value = product.value
  return value === null ? [] : buildProductAmounts(value, currency.value)
})

const documentViews = computed(() => {
  const data = details.data.value
  const value = product.value
  if (data === null || value === null) {
    return []
  }
  return buildDocumentViews(data.documents, value.lines, currency.value, props.timeZone)
})

const finalShare: ComputedRef<number> = computed<number>(() => {
  const value = product.value?.finalRevenuePercent
  if (value === null || value === undefined) {
    return 0
  }
  return Math.min(100, Math.max(0, value))
})

const finalLabel: ComputedRef<string | null> = computed<string | null>(() => {
  const value = product.value?.finalRevenuePercent
  return value === null || value === undefined
    ? null
    : `${formatPercent(value)} выручки финально`
})

const channelToneClasses: Record<ChannelBadgeVariant, string> = {
  'marketplace-wb': 'bg-badge-wb text-badge-wb-foreground',
  'marketplace-oz': 'bg-badge-oz text-badge-oz-foreground',
  'marketplace-ym': 'bg-badge-warning text-badge-warning-foreground',
  default: 'bg-muted text-muted-foreground',
}

function channelShortLabel(code: string | null, name: string): string {
  const normalized: string | undefined = code?.trim().toLowerCase()

  if (normalized === 'wildberries' || normalized === 'wb') {
    return 'WB'
  }
  if (normalized === 'ozon' || normalized === 'oz') {
    return 'OZ'
  }
  if (normalized === 'yandex' || normalized === 'yandex.kit' || normalized === 'ym') {
    return 'ЯМ'
  }

  return name
}

interface ChannelLinkView {
  key: string
  label: string
  tone: string
  active: boolean
}

const channelLinkViews: ComputedRef<ChannelLinkView[]> = computed<ChannelLinkView[]>(() =>
  channelLinks.value.map((link: ProductChannelLink) => ({
    key: `${link.channelId}-${link.externalProductId}`,
    label: `${channelShortLabel(link.channelCode, link.channelName)} · ${link.externalProductId}`,
    tone: channelToneClasses[channelDisplay(link.channelCode).variant],
    active: link.isActive,
  })),
)

interface ChannelRowView {
  key: string
  label: string
  tone: string
  revenue: string
  margin: string
  percent: string
}

const channelRows: ComputedRef<ChannelRowView[]> = computed<ChannelRowView[]>(() => {
  const data = details.data.value
  if (data === null) {
    return []
  }

  return data.channels.map((row) => {
    const known = props.channels.find((channel: ChannelItem) => channel.id === row.channelId)
    const label: string = known
      ? channelShortLabel(known.code, known.name)
      : row.channelId === null
        ? 'Без канала'
        : `Канал ${row.channelId.slice(0, 8)}`

    return {
      key: row.channelId ?? 'no-channel',
      label,
      tone: channelToneClasses[channelDisplay(known?.code).variant],
      revenue: formatMoney(row.revenueAmount, currency.value),
      margin: formatMoney(row.margin, currency.value),
      percent: formatPercent(row.contributionMarginPercent),
    }
  })
})

const channelMeta: ComputedRef<string | null> = computed<string | null>(() => {
  const data = details.data.value
  if (data === null || data.channels.length < 2) {
    return null
  }

  const first = data.channels[0]
  const known = props.channels.find((channel: ChannelItem) => channel.id === first.channelId)
  const name: string = known
    ? channelShortLabel(known.code, known.name)
    : first.channelId === null
      ? 'Без канала'
      : `Канал ${first.channelId.slice(0, 8)}`

  return `${name} ${formatPercent(first.revenueSharePercent)} выручки`
})

const detailsErrorMessage: ComputedRef<string | null> = computed<string | null>(() => {
  const error = details.error.value
  return error === null ? null : failureMessage(error)
})

const investedRows = computed(() => {
  const value = product.value
  if (value === null) {
    return []
  }

  const rows: { key: string; label: string; value: string; chip?: string }[] = [
    { key: 'invested', label: 'Вложено в заказ', value: formatMoney(value.investedCostAmount, currency.value) },
    { key: 'soldCost', label: 'Себестоимость проданного', value: formatMoney(value.soldCostAmount, currency.value) },
  ]

  if (value.frozenCostAmount !== null && value.frozenCostAmount > 0) {
    rows.push({
      key: 'frozen',
      label: 'Заморожено в невыкупе',
      value: formatMoney(value.frozenCostAmount, currency.value),
    })
  }

  rows.push({
    key: 'roi',
    label: 'Отдача на вложенное',
    value: formatPercent(value.roiPercent),
    chip: value.isRoiComplete ? undefined : 'частично',
  })

  rows.push({
    key: 'return',
    label: 'Отдача на проданное (ROI)',
    value: formatPercent(value.returnOnSoldCostPercent),
  })

  return rows
})

function retryDetails(): void {
  void details.load()
}
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent
      side="right"
      class="w-full overflow-y-auto p-4 sm:max-w-[440px]"
    >
      <SheetHeader class="p-0">
        <SheetTitle class="text-base">
          {{ product === null ? 'Товар' : productTitle(product.sku) }}
        </SheetTitle>
        <p
          v-if="catalogName"
          class="text-sm text-muted-foreground"
        >
          {{ catalogName }}
        </p>
        <SheetDescription class="text-xs">
          {{ headerMeta }}
        </SheetDescription>
      </SheetHeader>

      <div
        v-if="channelLinkViews.length > 0"
        class="flex flex-wrap items-center gap-1.5"
      >
        <span
          v-for="link in channelLinkViews"
          :key="link.key"
          class="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
          :class="[link.tone, link.active ? '' : 'opacity-60']"
        >
          {{ link.label }}
        </span>
      </div>

      <div
        v-if="detailsLoading"
        class="flex flex-col gap-3"
      >
        <Skeleton class="h-4 w-2/3" />
        <Skeleton class="h-6 w-full" />
        <Skeleton class="h-4 w-full" />
        <Skeleton class="h-4 w-5/6" />
        <Skeleton class="h-24 w-full" />
      </div>

      <ErrorState
        v-else-if="detailsFailed"
        variant="compact"
        title="Не удалось загрузить карточку товара"
        :description="detailsErrorMessage ?? undefined"
        retry-label="Повторить"
        @retry="retryDetails"
      />

      <p
        v-else-if="product === null"
        class="py-6 text-sm text-muted-foreground"
      >
        За выбранный период по товару нет операций.
      </p>

      <template v-else>
        <section class="flex flex-col gap-2 border-t border-border pt-3">
          <div class="flex items-baseline justify-between gap-3 text-sm font-semibold">
            <span>Из чего сложилась выручка</span>
            <span
              v-if="marginPercent"
              class="text-xs font-normal text-muted-foreground"
            >
              маржа {{ marginPercent }} от чистой
            </span>
          </div>

          <BreakdownBar
            :caption="revenueFlow.caption"
            :segments="revenueFlow.segments"
            :aria-label="revenueFlow.ariaLabel"
          />

          <p
            v-if="revenueFlow.lossFormatted"
            class="text-xs font-medium text-destructive"
          >
            убыток {{ revenueFlow.lossFormatted }}
          </p>

          <dl class="grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
            <div
              v-for="item in amounts"
              :key="item.key"
            >
              <dt class="text-muted-foreground">
                {{ item.label }}
              </dt>
              <dd
                class="mt-0.5 font-semibold tabular-nums"
                :class="item.positive ? 'text-success' : ''"
              >
                {{ item.value }}
              </dd>
            </div>
          </dl>
        </section>

        <section
          v-if="channelRows.length > 0 && channelId === null"
          class="flex flex-col gap-2 border-t border-border pt-3"
        >
          <div class="flex items-baseline justify-between gap-3 text-sm font-semibold">
            <span>Каналы</span>
            <span
              v-if="channelMeta"
              class="text-xs font-normal text-muted-foreground"
            >
              {{ channelMeta }}
            </span>
          </div>

          <div class="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-x-3 gap-y-1.5 text-xs">
            <template
              v-for="row in channelRows"
              :key="row.key"
            >
              <span
                class="inline-flex items-center rounded px-1.5 py-0.5 font-medium"
                :class="row.tone"
              >
                {{ row.label }}
              </span>
              <span class="text-right tabular-nums">{{ row.revenue }}</span>
              <span class="text-right tabular-nums">{{ row.margin }}</span>
              <span class="text-right tabular-nums text-muted-foreground">{{ row.percent }}</span>
            </template>
          </div>
        </section>

        <section
          v-if="product.investedCostAmount > 0"
          class="flex flex-col gap-2 border-t border-border pt-3"
        >
          <div class="flex items-baseline justify-between gap-3 text-sm font-semibold">
            <span>Вложено в товар</span>
            <span
              v-if="product.nonBuyoutQuantity > 0"
              class="text-xs font-normal text-muted-foreground"
            >
              невыкуп {{ product.nonBuyoutQuantity }} шт
            </span>
          </div>

          <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div
              v-for="row in investedRows"
              :key="row.key"
            >
              <dt class="text-muted-foreground">
                {{ row.label }}
              </dt>
              <dd class="mt-0.5 flex items-center gap-1.5 font-semibold tabular-nums">
                {{ row.value }}
                <span
                  v-if="row.chip"
                  class="inline-flex items-center rounded border border-dashed border-border px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground"
                >
                  {{ row.chip }}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section
          v-if="product.margin !== null"
          class="flex flex-col gap-2 border-t border-border pt-3"
        >
          <div class="flex items-baseline justify-between gap-3 text-sm font-semibold">
            <span>После налога</span>
            <span
              v-if="product.estimatedTax !== null"
              class="text-xs font-normal text-muted-foreground"
            >
              оценка по налоговому профилю
            </span>
          </div>

          <template v-if="product.estimatedTax !== null">
            <div class="grid grid-cols-3 gap-3 text-xs">
              <span>
                <span class="block text-muted-foreground">Налог</span>
                <b class="mt-0.5 block tabular-nums">{{ MINUS }}{{ formatMoney(product.estimatedTax, currency) }}</b>
              </span>
              <span>
                <span class="block text-muted-foreground">Маржа после налога</span>
                <b class="mt-0.5 block tabular-nums">{{ formatMoney(product.taxAdjustedMargin, currency) }}</b>
              </span>
              <span>
                <span class="block text-muted-foreground">Отдача на вложенное</span>
                <b class="mt-0.5 block tabular-nums">
                  {{ product.isTaxAdjustedRoiComplete && product.taxAdjustedRoiPercent !== null
                    ? formatPercent(product.taxAdjustedRoiPercent)
                    : '—' }}
                </b>
              </span>
            </div>
            <p
              v-if="!product.isTaxAdjustedMarginComplete"
              class="text-xs text-muted-foreground"
            >
              по части продаж
            </p>
          </template>

          <p
            v-else
            class="text-xs text-muted-foreground"
          >
            Налог не рассчитан: не задан налоговый профиль.
            <RouterLink
              :to="{ name: 'tenant-settings' }"
              class="font-medium text-primary hover:underline hover:underline-offset-4"
            >
              Настроить
            </RouterLink>
          </p>
        </section>

        <section class="flex flex-col gap-2 border-t border-border pt-3">
          <div class="flex items-baseline justify-between gap-3 text-sm font-semibold">
            <span>Надёжность цифр</span>
            <span
              v-if="finalLabel"
              class="text-xs font-normal text-muted-foreground"
            >
              {{ finalLabel }}
            </span>
          </div>

          <div
            v-if="finalLabel"
            class="flex h-1.5 overflow-hidden rounded-full bg-muted"
            role="img"
            :aria-label="finalLabel"
          >
            <span
              class="h-full bg-success"
              :style="{ width: `${finalShare}%` }"
            />
            <span
              class="h-full bg-chart-3"
              :style="{ width: `${100 - finalShare}%` }"
            />
          </div>

          <ul
            v-if="documentViews.length > 0"
            class="flex flex-col gap-2 text-xs"
          >
            <li
              v-for="view in documentViews"
              :key="view.key"
              class="flex items-start gap-2"
            >
              <TriangleAlert
                v-if="view.tone !== 'info'"
                class="mt-0.5 size-3.5 shrink-0"
                :class="view.tone === 'danger' ? 'text-destructive' : 'text-warning'"
              />
              <Info
                v-else
                class="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
              />
              <span class="min-w-0">
                <b class="block font-semibold">{{ view.title }}</b>
                <span
                  v-if="view.meta"
                  class="block text-muted-foreground"
                >{{ view.meta }}</span>
              </span>
            </li>
          </ul>

          <p
            v-else
            class="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <CheckCircle2 class="size-3.5 text-success" />
            Все документы получены, расхождений нет
          </p>
        </section>

        <div class="sticky bottom-0 -mx-4 mt-2 flex flex-wrap gap-2 border-t border-border bg-background px-4 py-3">
          <Button
            size="sm"
            as-child
          >
            <RouterLink :to="{ name: 'finance-operations' }">
              Операции по товару
            </RouterLink>
          </Button>
          <Button
            size="sm"
            variant="outline"
            as-child
          >
            <RouterLink :to="{ name: 'finance-quality' }">
              Очередь документов
            </RouterLink>
          </Button>
        </div>
      </template>
    </SheetContent>
  </Sheet>
</template>
