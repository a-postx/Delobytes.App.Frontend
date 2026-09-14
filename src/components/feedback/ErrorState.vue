<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Вид состояния ошибки. `page` — самостоятельная страница на всю высоту,
 * `embedded` — блок внутри рабочей области, когда каркас приложения остаётся на месте.
 */
export type ErrorStateVariant = 'page' | 'embedded'

interface Props {
  title: string
  description?: string
  /** Код состояния для монотипного бейджа: 404, 500 и т. д. */
  code?: string
  variant?: ErrorStateVariant
  /** Текст кнопки повтора. Если не задан — кнопка не отображается. */
  retryLabel?: string
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'page',
})

const emit = defineEmits<{
  (event: 'retry'): void
}>()

const isPage: ComputedRef<boolean> = computed<boolean>(() => props.variant === 'page')
</script>

<template>
  <div
    :class="
      cn(
        'relative isolate flex w-full flex-col items-center justify-center overflow-hidden text-center',
        isPage ? 'min-h-svh px-6 py-16' : 'min-h-[60svh] px-6 py-12',
        props.class,
      )
    "
  >
    <!-- Мягкое световое пятно в цвете primary: привязывает состояние к палитре приложения. -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl motion-safe:animate-pulse"
    />
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:22px_22px] opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
    />

    <div class="flex w-full max-w-xl flex-col items-center gap-5">
      <span
        v-if="code"
        class="rounded-full border border-border/60 bg-background/70 px-3 py-1 font-mono text-xs tracking-widest text-muted-foreground backdrop-blur"
      >
        {{ code }}
      </span>

      <slot name="visual" />

      <h1 class="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {{ title }}
      </h1>

      <p
        v-if="description"
        class="max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base"
      >
        {{ description }}
      </p>

      <div class="mt-1 flex w-full flex-col items-center gap-3">
        <slot name="actions" />

        <Button
          v-if="retryLabel"
          variant="outline"
          size="sm"
          type="button"
          @click="emit('retry')"
        >
          <RotateCcw />
          {{ retryLabel }}
        </Button>
      </div>

      <slot name="footer" />
    </div>
  </div>
</template>
