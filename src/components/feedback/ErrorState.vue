<script setup lang="ts">
/* eslint-disable vue/require-default-prop -- необязательность выражена типом; default изменил бы контракт пропса */
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { RotateCcw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Вид состояния ошибки.
 *
 * `page` — самостоятельная страница на всю высоту.
 * `embedded` — блок внутри рабочей области, когда каркас приложения остаётся на месте.
 * `compact` — для небольших контейнеров (виджет дашборда, карточка настроек): без декора,
 * с заголовком обычного размера, чтобы сообщение об ошибке не распирало контейнер по высоте
 * и не ломало сетку. Тексты те же, что и в остальных видах.
 */
export type ErrorStateVariant = 'page' | 'embedded' | 'compact'

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
const isCompact: ComputedRef<boolean> = computed<boolean>(() => props.variant === 'compact')

/**
 * Отступы и минимальная высота контейнера.
 *
 * У `embedded` минимум в 60svh задан для полноразмерных разделов; внутри виджета он превращает
 * маленькую карточку в блок на пол-экрана. Компактный вид не навязывает высоту вовсе —
 * контейнер сохраняет свою форму, а размер задаёт родитель.
 */
const containerClass: ComputedRef<string> = computed<string>(() => {
  if (isPage.value) {
    return 'min-h-svh px-6 py-16'
  }

  if (isCompact.value) {
    return 'py-2'
  }

  return 'min-h-[60svh] px-6 py-12'
})

const contentGapClass: ComputedRef<string> = computed<string>(() =>
  isCompact.value ? 'gap-2' : 'gap-5',
)

const titleClass: ComputedRef<string> = computed<string>(() =>
  isCompact.value
    ? 'text-balance text-sm font-medium tracking-tight text-foreground'
    : 'text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl',
)

const descriptionClass: ComputedRef<string> = computed<string>(() =>
  isCompact.value
    ? 'max-w-md text-pretty text-xs leading-relaxed text-muted-foreground'
    : 'max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base',
)

const codeClass: ComputedRef<string> = computed<string>(() => {
  if (isCompact.value) {
    return 'text-xl'
  }

  return isPage.value ? 'text-6xl sm:text-7xl' : 'text-4xl sm:text-5xl'
})
</script>

<template>
  <div
    :class="
      cn(
        'relative isolate flex w-full flex-col items-center justify-center overflow-hidden text-center',
        containerClass,
        props.class,
      )
    "
  >
    <!-- Мягкое световое пятно в цвете primary: привязывает состояние к палитре приложения. -->
    <div
      v-if="!isCompact"
      aria-hidden="true"
      class="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl motion-safe:animate-pulse"
    />
    <!-- Радиусы маски заданы явно: иначе эллипс считается до дальнего угла
         и затухание обнуляется ровно на кромке — снизу виден резкий обрыв. -->
    <div
      v-if="!isCompact"
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:22px_22px] opacity-60 [mask-image:radial-gradient(ellipse_60%_45%_at_center,black,transparent_70%)]"
    />

    <div :class="cn('flex w-full flex-col items-center', isCompact ? 'max-w-sm' : 'max-w-xl', contentGapClass)">
      <!--
        Тот же паттерн, что и на странице 404: крупный моно-код с градиентом
        и тонкий разделитель перед заголовком. Один визуальный язык для всех
        кодов ошибок (403/404/500/503) — читается как «код → расшифровка».
      -->
      <div
        v-if="code"
        class="flex flex-col items-center"
      >
        <p
          aria-hidden="true"
          :class="cn(
            'select-none bg-gradient-to-b from-foreground/90 via-foreground/70 to-foreground/50 bg-clip-text font-mono font-bold leading-none tracking-tighter text-transparent',
            codeClass,
          )"
        >
          {{ code }}
        </p>
        <span
          aria-hidden="true"
          class="mt-4 h-px w-16 bg-gradient-to-r from-transparent via-border to-transparent"
        />
      </div>

      <slot name="visual" />

      <h1 :class="titleClass">
        {{ title }}
      </h1>

      <p
        v-if="description"
        :class="descriptionClass"
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
