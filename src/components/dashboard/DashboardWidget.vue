<script setup lang="ts">
import ErrorState from '@/components/feedback/ErrorState.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  description?: string
  loading?: boolean
  error?: string | null
  compact?: boolean
  /** Размер заголовка задаёт страница: у финансовых карточек он мельче, чем у виджетов дашборда. */
  titleClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  description: undefined,
  loading: false,
  error: null,
  compact: false,
  titleClass: undefined,
})

const emit = defineEmits<{
  (event: 'retry'): void
}>()
</script>

<template>
  <Card class="flex h-full flex-col">
    <!--
      Компактная карточка (KPI) не переносит шапку: иначе ширина бейджа дельты
      решает, займёт ли шапка одну или две строки, и карточка прыгает по высоте.
      У некомпактных виджетов (график) в слоте действий панель управления,
      ей перенос по-прежнему нужен.
    -->
    <CardHeader
      :class="cn(
        'flex flex-row justify-between gap-3',
        props.compact ? 'flex-nowrap items-center p-4' : 'flex-wrap items-start',
      )"
    >
      <div class="flex min-w-0 flex-col gap-1">
        <CardTitle
          :class="cn(props.compact ? 'truncate text-base' : undefined, props.titleClass)"
          :title="props.compact ? props.title : undefined"
        >
          {{ props.title }}
        </CardTitle>
        <p
          v-if="props.description"
          class="text-sm text-muted-foreground"
        >
          {{ props.description }}
        </p>
      </div>
      <div
        data-slot="dashboard-widget-actions"
        :class="cn(
          'flex min-w-0 items-center gap-2',
          props.compact ? 'shrink-0 justify-end' : 'w-full flex-wrap justify-end sm:w-auto',
        )"
      >
        <slot name="actions" />
      </div>
    </CardHeader>

    <CardContent :class="cn('flex-1', props.compact ? 'p-4 pt-0' : undefined)">
      <ErrorState
        v-if="props.error"
        variant="compact"
        title="Не удалось загрузить данные"
        :description="props.error"
        retry-label="Повторить"
        @retry="emit('retry')"
      />
      <template v-else-if="props.loading">
        <slot name="skeleton">
          <div class="flex flex-col gap-2">
            <Skeleton class="h-6 w-2/3" />
            <Skeleton class="h-4 w-1/3" />
          </div>
        </slot>
      </template>
      <slot v-else />
    </CardContent>
  </Card>
</template>
