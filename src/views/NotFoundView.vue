<script setup lang="ts">
import { ref } from 'vue'
import type { Ref } from 'vue'
import { useRoute } from 'vue-router'
import { Home } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const route = useRoute()

/** Путь, по которому пришёл пользователь. Показываем как есть — это то, что нужно поддержке. */
const attemptedPath: Ref<string> = ref<string>(route.fullPath)
</script>

<template>
  <div
    class="relative isolate flex min-h-[70svh] w-full flex-1 flex-col items-center justify-center overflow-hidden px-6 py-14"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
    />
    <!--
      Радиусы маски заданы явно (60% / 45%). Без них браузер строит эллипс
      до дальнего угла, и затухание обнуляется ровно на кромке бокса — внизу
      получается резкий обрыв. С явными процентами оно заканчивается до края.
    -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-10 opacity-70 [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_60%_45%_at_center,black,transparent_70%)]"
    />

    <div class="flex w-full max-w-xl flex-col items-center text-center">
      <!--
        Код состояния и его название — одна группа. Монотипный шрифт у обоих,
        короткий шаг и разделитель между ними читаются как «код → расшифровка»,
        а не как два независимых блока.
      -->
      <div class="flex flex-col items-center">
        <p
          aria-hidden="true"
          class="select-none bg-gradient-to-b from-foreground/90 via-foreground/40 to-transparent bg-clip-text font-mono text-7xl font-bold leading-none tracking-tighter text-transparent sm:text-8xl"
        >
          404
        </p>
        <span
          aria-hidden="true"
          class="mt-5 h-px w-16 bg-gradient-to-r from-transparent via-border to-transparent"
        />
        <h1
          class="mt-4 font-mono text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground sm:text-base"
        >
          Страница не найдена
        </h1>
      </div>

      <p class="mt-6 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground">
        Возможно, адрес устарел или в ссылке опечатка. Данные в системе сохранены.
      </p>

      <!-- Единственное действие. Для неавторизованного гард сам уведёт на вход. -->
      <Button
        as-child
        class="mt-8"
      >
        <RouterLink to="/">
          <Home />
          Главная
        </RouterLink>
      </Button>

      <p class="mt-8 w-full truncate font-mono text-xs text-muted-foreground/80">
        Запрошенный путь: {{ attemptedPath }}
      </p>
    </div>
  </div>
</template>
