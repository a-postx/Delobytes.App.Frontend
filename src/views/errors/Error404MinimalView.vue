<script setup lang="ts">
import { ref } from 'vue'
import type { Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Home, ArrowLeft } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ErrorVariantToolbar from '@/components/errors/ErrorVariantToolbar.vue'

const route = useRoute()
const router = useRouter()

/** Путь, по которому пришёл пользователь. Показываем как есть — это то, что нужно поддержке. */
const attemptedPath: Ref<string> = ref<string>(route.fullPath)

function goBack(): void {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push('/')
}
</script>

<template>
  <div class="flex min-h-svh flex-col">
    <ErrorVariantToolbar current-key="minimal" />

    <div
      class="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-14"
    >
      <div
        aria-hidden="true"
        class="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 -z-10 opacity-70 [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_60%_45%_at_center,black,transparent_70%)]"
      />

      <div class="flex w-full max-w-xl flex-col items-center text-center">
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
          Возможно, адрес устарел или в ссылке опечатка. Данные в системе сохранены — ничего не потеряно.
        </p>

        <!-- Две точки выхода вместо одной: часть пользователей пришла по ссылке (им нужна главная),
             часть — кликнула что-то внутри приложения (им проще вернуться назад). -->
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            as-child
          >
            <RouterLink to="/">
              <Home />
              На главную
            </RouterLink>
          </Button>
          <Button
            variant="outline"
            @click="goBack"
          >
            <ArrowLeft />
            Назад
          </Button>
        </div>

        <p class="mt-8 w-full truncate font-mono text-xs text-muted-foreground/80">
          Запрошенный путь: {{ attemptedPath }}
        </p>
      </div>
    </div>
  </div>
</template>
