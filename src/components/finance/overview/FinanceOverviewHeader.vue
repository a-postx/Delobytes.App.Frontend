<script setup lang="ts">
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { RouterLink } from 'vue-router'
import { AlertTriangle } from 'lucide-vue-next'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatPercent } from '@/utils/financeFormat'
import type { FreshnessView } from './overviewModel'

interface Props {
  provisionalShare: number | null
  freshness: FreshnessView
}

const props = defineProps<Props>()

const provisionalLabel: ComputedRef<string | null> = computed<string | null>(() => {
  if (props.provisionalShare === null || props.provisionalShare <= 0) {
    return null
  }
  return `${formatPercent(props.provisionalShare)} выручки пока предварительно`
})

const hasFreshness: ComputedRef<boolean> = computed<boolean>(
  () => props.freshness.updatedLabel !== '',
)

const hasMeta: ComputedRef<boolean> = computed<boolean>(
  () => provisionalLabel.value !== null || hasFreshness.value,
)
</script>

<template>
  <header class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex flex-col gap-1">
      <h1 class="text-xl font-bold">
        Финансы
      </h1>
      <p class="text-sm text-muted-foreground">
        Выручка, удержания и маржинальная прибыль по финансовым отчётам маркетплейсов
      </p>
    </div>

    <div
      v-if="hasMeta"
      class="flex max-w-full flex-col items-end gap-1 text-right text-xs text-muted-foreground max-sm:items-start max-sm:text-left"
    >
      <p
        v-if="provisionalLabel"
        class="flex items-center gap-1.5 text-foreground/80"
      >
        <span class="size-1.5 shrink-0 rounded-full bg-warning" />
        {{ provisionalLabel }}
      </p>

      <p
        v-if="hasFreshness"
        class="flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1 max-sm:justify-start"
      >
        <span>Обновлено {{ props.freshness.updatedLabel }}</span>
        <span
          v-for="channel in props.freshness.channels"
          :key="channel.channelId"
          class="inline-flex items-center gap-1"
        >
          ·
          <TooltipProvider v-if="channel.warning">
            <Tooltip>
              <TooltipTrigger as-child>
                <span class="inline-flex cursor-help items-center gap-1 text-warning underline decoration-dotted underline-offset-4">
                  <AlertTriangle class="size-3" />
                  {{ channel.label }}
                </span>
              </TooltipTrigger>
              <TooltipContent>{{ channel.warningText }}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span v-else>{{ channel.label }}</span>
        </span>
        <span>·</span>
        <RouterLink
          :to="{ name: 'finance-quality' }"
          class="font-medium text-primary hover:underline hover:underline-offset-4"
        >
          Качество данных
        </RouterLink>
      </p>
    </div>
  </header>
</template>
