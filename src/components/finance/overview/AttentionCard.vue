<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { AlertTriangle, CheckCircle2, ChevronRight, Globe } from 'lucide-vue-next'
import DashboardWidget from '@/components/dashboard/DashboardWidget.vue'
import type { AttentionItem } from './overviewModel'

interface Props {
  items: AttentionItem[]
  overdueLines: number
  loading: boolean
  error: string | null
  /** Period and channel of the overview, carried into the product table links. */
  productsQuery: Record<string, string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'retry'): void
}>()

/** Operations and quality links stay parameterless; product links keep the overview context. */
function linkTarget(item: AttentionItem): { name: string; query?: Record<string, string> } {
  if (item.to !== 'finance-products') {
    return { name: item.to }
  }

  return {
    name: item.to,
    query: { ...props.productsQuery, ...(item.query ?? {}) },
  }
}

const toneClasses: Record<AttentionItem['tone'], string> = {
  danger: 'bg-badge-destructive text-badge-destructive-foreground',
  warning: 'bg-badge-warning text-badge-warning-foreground',
  info: 'bg-badge-oz text-badge-oz-foreground',
}
</script>

<template>
  <DashboardWidget
    title-class="text-lg"
    title="Требуют внимания"
    :loading="props.loading"
    :error="props.error"
    @retry="emit('retry')"
  >
    <template #actions>
      <span
        v-if="props.overdueLines > 0"
        class="text-xs text-muted-foreground"
      >
        {{ props.overdueLines }} просрочено
      </span>
    </template>

    <div
      v-if="props.items.length === 0"
      class="flex flex-col items-center gap-2 py-8 text-center"
    >
      <CheckCircle2 class="size-6 text-success" />
      <p class="text-sm text-muted-foreground">
        Замечаний нет
      </p>
    </div>

    <div
      v-else
      class="-mx-2 flex flex-col"
    >
      <RouterLink
        v-for="item in props.items"
        :key="item.key"
        :to="linkTarget(item)"
        class="group flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/60"
      >
        <span
          class="flex size-7 shrink-0 items-center justify-center rounded-md"
          :class="toneClasses[item.tone]"
        >
          <Globe
            v-if="item.tone === 'info'"
            class="size-3.5"
          />
          <AlertTriangle
            v-else
            class="size-3.5"
          />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium">{{ item.title }}</span>
          <span class="mt-0.5 block text-xs text-muted-foreground">{{ item.subtitle }}</span>
        </span>
        <ChevronRight class="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </RouterLink>
    </div>
  </DashboardWidget>
</template>
