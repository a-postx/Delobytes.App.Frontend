<script setup lang="ts">
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { RouterLink } from 'vue-router'
import { AlertTriangle } from 'lucide-vue-next'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { FreshnessView } from '@/components/finance/overview/overviewModel'

interface Props {
  freshness: FreshnessView
}

const props = defineProps<Props>()

const hasFreshness: ComputedRef<boolean> = computed<boolean>(
  () => props.freshness.updatedLabel !== '',
)
</script>

<template>
  <p
    v-if="hasFreshness"
    class="flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1 text-xs text-muted-foreground max-sm:justify-start"
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
</template>
