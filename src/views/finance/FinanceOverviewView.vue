<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import { AlertTriangle, ChartLine, Info, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import StatsStrip from '@/components/ui/stats-strip/StatsStrip.vue'
import { useFinanceOverviewFilters } from '@/composables/useFinanceOverviewFilters'
import { useFinanceOverviewData } from '@/composables/useFinanceOverviewData'
import { useTenantToday } from '@/composables/useTenantToday'
import FinanceOverviewHeader from '@/components/finance/overview/FinanceOverviewHeader.vue'
import FinanceOverviewToolbar from '@/components/finance/overview/FinanceOverviewToolbar.vue'
import MarginCard from '@/components/finance/overview/MarginCard.vue'
import DynamicsCard from '@/components/finance/overview/DynamicsCard.vue'
import ChannelsCard from '@/components/finance/overview/ChannelsCard.vue'
import AttentionCard from '@/components/finance/overview/AttentionCard.vue'
import SkuEconomicsCard from '@/components/finance/overview/SkuEconomicsCard.vue'
import type { FinanceGranularity } from '@/utils/financePeriod'

const router = useRouter()
const { timeZone } = useTenantToday()
const filters = useFinanceOverviewFilters()

const {
  preset,
  currentRange,
  channelId,
  step,
  rangeLabel,
  setPreset,
  setCustomRange,
  setChannel,
  setStep,
} = filters

const {
  currency,
  totalsRow,
  previousRow,
  channelItems,
  freshnessView,
  provisional,
  kpis,
  coverageBanner,
  channelRows,
  attentionItems,
  overdueLines,
  productCount,
  rankings,
  dynamicsPoints,
  dynamicsTable,
  activeChannels,
  noFinanceData,
  emptyPeriod,
  loading,
  errors,
  retry,
} = useFinanceOverviewData(filters)

function handleStep(value: FinanceGranularity): void {
  setStep(value)
}

function openProduct(): void {
  void router.push({ name: 'finance-products' })
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <FinanceOverviewHeader
      :provisional-share="provisional"
      :freshness="freshnessView"
    />

    <template v-if="noFinanceData">
      <div class="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-14 text-center">
        <span class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ChartLine class="size-5" />
        </span>
        <h2 class="text-base font-semibold">
          Финансовых данных пока нет
        </h2>
        <p class="max-w-lg text-sm text-muted-foreground">
          <template v-if="activeChannels.length === 0">
            Подключите Wildberries или Ozon с доступом к финансовым отчётам — первые цифры
            появятся после загрузки первого отчёта.
          </template>
          <template v-else>
            Каналы подключены, но финансовые отчёты ещё не загружены. Первые цифры появятся
            после первой загрузки.
          </template>
        </p>
        <Button
          v-if="activeChannels.length === 0"
          size="sm"
          as-child
        >
          <RouterLink :to="{ name: 'sales-channels' }">
            Подключить канал
          </RouterLink>
        </Button>
        <Button
          v-else
          size="sm"
          variant="outline"
          as-child
        >
          <RouterLink :to="{ name: 'finance-quality' }">
            Качество данных
          </RouterLink>
        </Button>
      </div>
    </template>

    <template v-else>
      <FinanceOverviewToolbar
        :preset="preset"
        :range="currentRange"
        :range-label="rangeLabel"
        :channel-id="channelId"
        :channels="channelItems"
        :time-zone="timeZone"
        @update:preset="setPreset"
        @update:range="setCustomRange"
        @update:channel="setChannel"
      />

      <div
        v-if="coverageBanner"
        class="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-badge-warning px-3.5 py-2.5 text-xs text-badge-warning-foreground"
      >
        <AlertTriangle class="mt-0.5 size-4 shrink-0" />
        <div>
          <b class="block font-semibold">{{ coverageBanner.title }}</b>
          {{ coverageBanner.description }}
        </div>
      </div>

      <StatsStrip
        :items="kpis"
        :columns="5"
        class="max-md:!grid-cols-2"
      />

      <div
        v-if="emptyPeriod"
        class="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-6 py-12 text-center"
      >
        <Info class="size-6 text-muted-foreground" />
        <h2 class="text-base font-semibold">
          За выбранный период операций нет
        </h2>
        <p class="text-sm text-muted-foreground">
          Выберите другой период или канал.
        </p>
        <Button
          size="sm"
          variant="outline"
          class="mt-1"
          @click="retry.period"
        >
          <RefreshCw class="size-3.5" />
          Обновить
        </Button>
      </div>

      <div
        v-else
        class="grid grid-cols-1 gap-4 xl:grid-cols-12"
      >
        <MarginCard
          class="xl:col-span-7"
          :totals="totalsRow"
          :previous="previousRow"
          :currency="currency"
          :range-label="rangeLabel"
          :loading="loading.totals"
          :error="errors.totals"
          @retry="retry.totals"
        />

        <DynamicsCard
          class="xl:col-span-5"
          :points="dynamicsPoints"
          :table-rows="dynamicsTable"
          :step="step"
          :range="currentRange"
          :currency="currency"
          :loading="loading.series"
          :error="errors.series"
          @update:step="handleStep"
          @retry="retry.series"
        />

        <ChannelsCard
          class="xl:col-span-7"
          :rows="channelRows"
          :totals="totalsRow"
          :currency="currency"
          :loading="loading.channels"
          :error="errors.channels"
          :show-share="channelId === null"
          @retry="retry.channels"
        />

        <AttentionCard
          class="xl:col-span-5"
          :items="attentionItems"
          :overdue-lines="overdueLines"
          :loading="loading.attention"
          :error="errors.attention"
          @retry="retry.attention"
        />

        <SkuEconomicsCard
          class="xl:col-span-12"
          :rankings="rankings"
          :product-count="productCount"
          :loading="loading.rankings"
          :error="errors.rankings"
          @retry="retry.rankings"
          @select="openProduct"
        />
      </div>
    </template>
  </div>
</template>
