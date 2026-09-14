<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { ArrowLeft, Home, LayoutDashboard, PackageOpen, Search, Truck } from 'lucide-vue-next'
import type { Component } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface QuickLink {
  label: string
  to: string
  icon: Component
}

const route = useRoute()
const router = useRouter()

/** Путь, по которому пришёл пользователь. Показываем как есть — это то, что нужно поддержке. */
const attemptedPath: Ref<string> = ref<string>(route.fullPath)

const isAuthenticated: ComputedRef<boolean> = computed<boolean>(
  () => localStorage.getItem('accessToken') !== null,
)

const quickLinks: ComputedRef<QuickLink[]> = computed<QuickLink[]>(() =>
  isAuthenticated.value
    ? [
        { label: 'Главная', to: '/', icon: LayoutDashboard },
        { label: 'Контрагенты', to: '/catalogs/suppliers', icon: Truck },
        { label: 'Компоненты', to: '/catalogs/components', icon: PackageOpen },
      ]
    : [{ label: 'На страницу входа', to: '/login', icon: Home }],
)

const canGoBack: ComputedRef<boolean> = computed<boolean>(() => window.history.length > 1)

function goBack(): void {
  router.back()
}

/** Раздел поиска появится позже; сообщаем честно, чтобы кнопка не выглядела сломанной. */
function handleSearch(): void {
  toast.info('Поиск по разделам появится в одном из ближайших обновлений.')
}
</script>

<template>
  <div
    class="relative isolate flex min-h-[70svh] w-full flex-1 flex-col items-center justify-center overflow-hidden px-6 py-14"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
    />
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-10 opacity-70 [background-image:radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
    />

    <div class="flex w-full max-w-2xl flex-col items-center gap-6 text-center">
      <p
        aria-hidden="true"
        class="select-none bg-gradient-to-b from-foreground/90 via-foreground/40 to-transparent bg-clip-text font-mono text-7xl font-bold leading-none tracking-tighter text-transparent sm:text-8xl"
      >
        404
      </p>

      <div class="flex flex-col items-center gap-3">
        <span
          class="rounded-full border border-border/60 bg-background/60 px-3 py-1 font-mono text-xs uppercase tracking-widest text-muted-foreground backdrop-blur"
        >
          Страница не найдена
        </span>
        <h1 class="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          Такой страницы здесь нет
        </h1>
        <p class="max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          Возможно, адрес устарел или в ссылке опечатка. Данные не потеряны — выберите раздел ниже
          или вернитесь на предыдущий шаг.
        </p>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-2">
        <Button
          v-for="link in quickLinks"
          :key="link.to"
          as-child
          variant="outline"
          size="sm"
        >
          <RouterLink :to="link.to">
            <component :is="link.icon" />
            {{ link.label }}
          </RouterLink>
        </Button>
      </div>

      <div class="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <form
          class="flex w-full max-w-sm items-center gap-2"
          role="search"
          @submit.prevent="handleSearch"
        >
          <Input
            aria-label="Поиск по разделам"
            placeholder="Что вы искали?"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Найти"
            class="shrink-0"
          >
            <Search />
          </Button>
        </form>

        <Button
          v-if="canGoBack"
          variant="ghost"
          size="sm"
          type="button"
          @click="goBack"
        >
          <ArrowLeft />
          Назад
        </Button>
      </div>

      <p class="mt-2 w-full truncate font-mono text-xs text-muted-foreground/80">
        Запрошенный путь: {{ attemptedPath }}
      </p>
    </div>
  </div>
</template>
