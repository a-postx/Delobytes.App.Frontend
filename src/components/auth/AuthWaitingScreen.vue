<script setup lang="ts">
import Spinner from '@/components/ui/spinner/Spinner.vue'

withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
  }>(),
  {
    title: 'Почти готово',
    subtitle: 'Загружаем ваш профиль',
  }
)
</script>

<template>
  <div class="relative flex min-h-svh items-center justify-center overflow-hidden bg-muted p-6 md:p-10">
    <div class="auth-waiting__glow" aria-hidden="true" />

    <div
      class="relative flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border bg-card px-6 py-8 text-center shadow-xs"
      role="status"
      aria-live="polite"
    >
      <Spinner size="lg" class="text-primary" />

      <div class="flex flex-col gap-1">
        <h1 class="text-base font-semibold tracking-tight">
          {{ title }}
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ subtitle }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-waiting__glow {
  position: absolute;
  inset: -40%;
  background:
    radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.16), transparent 55%),
    repeating-linear-gradient(0deg, hsl(var(--foreground) / 0.04) 0 1px, transparent 1px 26px),
    repeating-linear-gradient(90deg, hsl(var(--foreground) / 0.04) 0 1px, transparent 1px 26px);
  -webkit-mask: radial-gradient(circle at 50% 45%, #000 20%, transparent 72%);
  mask: radial-gradient(circle at 50% 45%, #000 20%, transparent 72%);
  pointer-events: none;
}
</style>
