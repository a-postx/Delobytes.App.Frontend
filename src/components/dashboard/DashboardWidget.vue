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
}

const props = withDefaults(defineProps<Props>(), {
  description: undefined,
  loading: false,
  error: null,
  compact: false,
})

const emit = defineEmits<{
  (event: 'retry'): void
}>()
</script>

<template>
  <Card class="flex flex-col">
    <CardHeader :class="cn('flex flex-row flex-nowrap items-start justify-between gap-3', props.compact ? 'p-4' : undefined)">
      <div class="flex min-w-0 flex-col gap-1">
        <CardTitle :class="props.compact ? 'text-base' : undefined">
          {{ props.title }}
        </CardTitle>
        <p
          v-if="props.description"
          class="text-sm text-muted-foreground"
        >
          {{ props.description }}
        </p>
      </div>
      <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
        <slot name="actions" />
      </div>
    </CardHeader>

    <CardContent :class="cn('flex-1', props.compact ? 'p-4 pt-0' : undefined)">
      <ErrorState
        v-if="props.error"
        variant="embedded"
        title="Не удалось загрузить данные"
        :description="props.error"
        retry-label="Повторить"
        class="min-h-0 py-6"
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
