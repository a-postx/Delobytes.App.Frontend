<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <button
    type="button"
    :disabled="loading"
    :class="cn(
      'inline-flex h-9 w-full items-center justify-center gap-2.5 rounded-md px-4 py-2',
      'bg-[#FC3F1D] text-sm font-medium text-white',
      'transition-colors hover:bg-[#E8391A]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FC3F1D]/60 focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      props.class
    )"
    @click="emit('click')"
  >
    <!-- Yandex logo: white circle with red "Я" — matches official button guidelines -->
    <span
      class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold leading-none text-[#FC3F1D]"
      aria-hidden="true"
    >
      Я
    </span>

    <span>{{ loading ? 'Подождите...' : 'Войти с Яндекс ID' }}</span>
  </button>
</template>
