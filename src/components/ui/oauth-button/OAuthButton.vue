<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, ref } from 'vue'
import { cn } from '@/lib/utils'
import GoogleLogo from './icons/GoogleLogo.vue'
import YandexLogo from './icons/YandexLogo.vue'

type OAuthProvider = 'google' | 'yandex'

interface Props {
  provider: OAuthProvider
  loading?: boolean
  class?: HTMLAttributes['class']
}

interface ProviderConfig {
  label: string
  ariaLabel: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const CONFIG: Record<OAuthProvider, ProviderConfig> = {
  google: {
    label: 'Google',
    ariaLabel: 'Войти через учётную запись Google',
  },
  yandex: {
    label: 'Яндекс',
    ariaLabel: 'Войти через Яндекс ID',
  },
}

const root = ref<HTMLElement | null>(null)

const config = computed<ProviderConfig>(() => CONFIG[props.provider])

/*
 * Координаты курсора живут в CSS-переменных, а не в реактивном состоянии:
 * pointermove срабатывает десятки раз в секунду, и перерисовка компонента
 * на каждое движение мыши была бы лишней работой ради одного градиента.
 */
function trackPointer(event: PointerEvent): void {
  const element: HTMLElement | null = root.value
  if (!element || event.pointerType !== 'mouse') {
    return
  }

  const rect: DOMRect = element.getBoundingClientRect()
  element.style.setProperty('--oauth-x', `${event.clientX - rect.left}px`)
  element.style.setProperty('--oauth-y', `${event.clientY - rect.top}px`)
}

function resetPointer(): void {
  const element: HTMLElement | null = root.value
  if (!element) {
    return
  }

  element.style.removeProperty('--oauth-x')
  element.style.removeProperty('--oauth-y')
}
</script>

<template>
  <span
    ref="root"
    class="oauth-button group relative block w-full rounded-md"
    @pointermove="trackPointer"
    @pointerleave="resetPointer"
  >
    <button
      type="button"
      :disabled="props.loading"
      :aria-label="config.ariaLabel"
      :data-provider="props.provider"
      :class="
        cn(
          'relative inline-flex h-9 w-full items-center justify-center gap-2.5 rounded-md px-4',
          'border border-border bg-card text-sm font-medium text-foreground shadow-xs',
          'transition-colors duration-150 hover:border-border hover:bg-muted/60',
          'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-50',
          props.class,
        )
      "
      @click="emit('click')"
    >
      <YandexLogo
        v-if="props.provider === 'yandex'"
        class="relative"
      />
      <GoogleLogo
        v-else
        class="relative"
      />

      <span class="relative">
        {{ props.loading ? 'Подождите...' : config.label }}
      </span>

      <!--
        Кольцо рисуется поверх 1px рамки кнопки: слой маскируется по контуру,
        поэтому подсвечивается только грань, а не вся площадь.
      -->
      <span
        class="oauth-ring rounded-md"
        aria-hidden="true"
      />
    </button>
  </span>
</template>

<style scoped>
.oauth-ring {
  position: absolute;
  inset: -1px;
  padding: 1px;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  transition: opacity 160ms ease;
  background: radial-gradient(
    120px circle at var(--oauth-x, 50%) var(--oauth-y, 50%),
    hsl(var(--primary)),
    hsl(var(--primary) / 0.3) 55%,
    transparent 80%
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
}

@media (hover: hover) and (pointer: fine) {
  .oauth-button:hover .oauth-ring {
    opacity: 1;
  }
}

/*
 * На тач-устройствах курсора нет, и градиент зафиксировался бы в случайной точке.
 * Вместо него — равномерная подсветка всей рамки брендовым цветом.
 */
@media not all and (pointer: fine) {
  .oauth-button:hover .oauth-ring,
  .oauth-button:active .oauth-ring {
    opacity: 1;
    background: hsl(var(--primary) / 0.55);
  }
}

.oauth-button:has(button:focus-visible) .oauth-ring {
  opacity: 1;
  background: hsl(var(--primary) / 0.55);
}

@media (prefers-reduced-motion: reduce) {
  .oauth-ring {
    transition: none;
  }
}
</style>
