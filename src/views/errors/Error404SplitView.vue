<script setup lang="ts">
import { ref } from 'vue'
import type { Ref } from 'vue'
import { useRoute } from 'vue-router'
import { Home, LifeBuoy, Compass, MapPinOff } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ErrorVariantToolbar from '@/components/errors/ErrorVariantToolbar.vue'

const route = useRoute()
const attemptedPath: Ref<string> = ref<string>(route.fullPath)

const suggestions = [
  { to: '/', label: 'Перейти на главную' },
  { to: '/catalogs/suppliers', label: 'Открыть справочник контрагентов' },
  { to: '/settings', label: 'Проверить настройки аккаунта' },
]
</script>

<template>
  <div class="flex min-h-svh flex-col">
    <ErrorVariantToolbar current-key="split" />

    <div class="grid flex-1 md:grid-cols-2">
      <!-- Визуальная панель. На мобильных сокращается по высоте и уходит наверх,
           чтобы не отнимать место у текста и действий. -->
      <div
        class="relative isolate flex min-h-[220px] items-center justify-center overflow-hidden bg-secondary/40 px-8 py-12 md:min-h-full"
      >
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(hsl(var(--primary)/0.18)_1px,transparent_1px)] [background-size:26px_26px]"
        />
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -left-16 -top-16 size-72 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -bottom-20 -right-10 size-72 rounded-full bg-accent/20 blur-3xl"
        />

        <div class="relative z-10 flex flex-col items-center text-center">
          <div class="flex size-20 items-center justify-center rounded-2xl border border-border/60 bg-card shadow-sm">
            <MapPinOff class="size-9 text-primary" />
          </div>
          <p class="mt-6 font-mono text-6xl font-bold tracking-tighter text-foreground/80 sm:text-7xl">
            404
          </p>
        </div>
      </div>

      <!-- Смысловая панель: заголовок, объяснение, два равнозначных действия. -->
      <div class="flex flex-col justify-center px-8 py-14 sm:px-14">
        <div class="max-w-md">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Compass class="size-3.5" />
            Страница не найдена
          </span>

          <h1 class="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Похоже, мы сбились с маршрута
          </h1>

          <p class="mt-4 text-sm leading-relaxed text-muted-foreground">
            Страница по адресу
            <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{{ attemptedPath }}</code>
            не существует или была перемещена. Выберите, куда продолжить:
          </p>

          <div class="mt-7 flex flex-wrap gap-3">
            <Button
              as-child
              size="lg"
            >
              <RouterLink to="/">
                <Home />
                На главную
              </RouterLink>
            </Button>
            <Button
              as-child
              variant="outline"
              size="lg"
            >
              <a href="mailto:support@delobytes.ru">
                <LifeBuoy />
                Написать в поддержку
              </a>
            </Button>
          </div>

          <ul class="mt-8 space-y-2 border-t border-border pt-5">
            <li
              v-for="item in suggestions"
              :key="item.to"
            >
              <RouterLink
                :to="item.to"
                class="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
