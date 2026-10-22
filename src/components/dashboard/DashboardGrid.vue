<script setup lang="ts">
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import AppErrorBoundary from '@/components/feedback/AppErrorBoundary.vue'
import { usePermissions } from '@/composables/usePermissions'
import { dashboardWidgetRegistry } from './widgetRegistry'
import type { DashboardWidgetDefinition, DashboardWidgetSpan } from './types'

// Static map because Tailwind JIT cannot see dynamically built class names.
const SPAN_CLASS_MAP: Record<DashboardWidgetSpan, string> = {
  quarter: 'md:col-span-3 xl:col-span-3',
  half: 'md:col-span-6 xl:col-span-6',
  full: 'col-span-full',
}

const { hasPermission } = usePermissions()

const visibleWidgets: ComputedRef<DashboardWidgetDefinition[]> = computed<DashboardWidgetDefinition[]>(() =>
  dashboardWidgetRegistry.filter(
    (def: DashboardWidgetDefinition) => !def.permission || hasPermission(def.permission),
  ),
)
</script>

<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12">
    <div
      v-for="def in visibleWidgets"
      :key="def.id"
      :class="SPAN_CLASS_MAP[def.span]"
    >
      <AppErrorBoundary>
        <component
          :is="def.component"
          v-bind="def.props"
        />
      </AppErrorBoundary>
    </div>
  </div>
</template>
