<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes['class']
    size?: 'sm' | 'md' | 'lg'
    label?: string
  }>(),
  {
    size: 'md',
    label: 'Загрузка',
  }
)

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'size-4'
    case 'lg':
      return 'size-8'
    default:
      return 'size-6'
  }
})
</script>

<template>
  <span
    :class="cn('app-spinner', sizeClasses, props.class)"
    role="status"
    :aria-label="label"
  />
</template>

<style scoped>
/*
 * Толщина кольца считается в процентах от радиуса, поэтому спиннер остаётся
 * пропорциональным и при переопределении размера утилитой (`size-3` в кнопках).
 * Палитра берётся из currentColor: цвет задаётся на месте, как раньше.
 */
.app-spinner {
  display: inline-block;
  flex: none;
  vertical-align: middle;
  border-radius: 9999px;
  background: conic-gradient(from 0turn, transparent 0deg, currentColor 360deg);
  -webkit-mask: radial-gradient(farthest-side, transparent 82%, #000 82%);
  mask: radial-gradient(farthest-side, transparent 82%, #000 82%);
  /* Полный оборот за 0,85 с — базовая скорость приложения, на местах не переопределяется. */
  animation: app-spinner-rotate 0.85s linear infinite;
}

@keyframes app-spinner-rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-spinner {
    animation-duration: 2.4s;
  }
}
</style>
