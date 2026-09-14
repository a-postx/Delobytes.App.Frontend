<script setup lang="ts">
import { Home, Sparkles } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ErrorVariantToolbar from '@/components/errors/ErrorVariantToolbar.vue'
</script>

<template>
  <div class="flex min-h-svh flex-col">
    <ErrorVariantToolbar current-key="spotlight" />

    <div class="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-14">
      <!-- Мягкий пульсирующий свет — единственный акцент движения на странице,
           чтобы не отвлекать от текста и кнопки. -->
      <div
        aria-hidden="true"
        class="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[30rem] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-primary/25 blur-[100px]"
      />
      <div
        aria-hidden="true"
        class="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl"
      />

      <div class="animate-fade-in flex max-w-lg flex-col items-center text-center">
        <span class="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles class="size-3.5 text-primary" />
          Ошибка 404
        </span>

        <h1 class="mt-6 bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-6xl font-extrabold tracking-tight text-transparent sm:text-8xl">
          404
        </h1>

        <p class="mt-5 text-lg font-medium text-foreground sm:text-xl">
          Эта страница ушла в отпуск и забыла оставить адрес
        </p>
        <p class="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Проверьте ссылку ещё раз или вернитесь на главную — там всё на месте.
        </p>

        <Button
          as-child
          size="lg"
          class="mt-8"
        >
          <RouterLink to="/">
            <Home />
            Увести меня на главную
          </RouterLink>
        </Button>

        <a
          href="mailto:support@delobytes.ru"
          class="mt-5 text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          Сообщить о проблеме
        </a>
      </div>
    </div>
  </div>
</template>
