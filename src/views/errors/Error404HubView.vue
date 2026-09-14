<script setup lang="ts">
import { ref } from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Home, Settings, Puzzle, Truck, LifeBuoy, ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ErrorVariantToolbar from '@/components/errors/ErrorVariantToolbar.vue'

const router = useRouter()
const searchQuery: Ref<string> = ref<string>('')

/** Реальные разделы приложения — не выдумка, чтобы ссылки вели куда-то полезное. */
const quickLinks = [
  { to: '/', label: 'Главная', description: 'Обзор и текущие показатели', icon: Home },
  { to: '/catalogs/suppliers', label: 'Контрагенты', description: 'Справочник поставщиков', icon: Truck },
  { to: '/integrations', label: 'Интеграции', description: 'Подключённые сервисы', icon: Puzzle },
  { to: '/settings', label: 'Настройки', description: 'Параметры аккаунта', icon: Settings },
]

function handleSearchSubmit(): void {
  const query: string = searchQuery.value.trim()
  if (query.length === 0) {
    router.push('/')
    return
  }
  // Поиска по всему приложению пока нет — ведём на главную с параметром,
  // чтобы в будущем страница могла подхватить query и что-то с ним сделать.
  router.push({ path: '/', query: { q: query } })
}
</script>

<template>
  <div class="flex min-h-svh flex-col">
    <ErrorVariantToolbar current-key="hub" />

    <div class="flex flex-1 flex-col items-center justify-center px-6 py-14">
      <div class="w-full max-w-lg">
        <div class="flex flex-col items-center text-center">
          <span
            class="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
          >
            Ошибка 404
          </span>
          <h1 class="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Такой страницы нет — но мы знаем, куда вам нужно
          </h1>
          <p class="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Введите название раздела или воспользуйтесь ссылками ниже.
          </p>
        </div>

        <!-- Поиск — главное действие. По UX-практике SaaS такая страница возвращает
             пользователя к задаче, а не просто извиняется за ошибку. -->
        <form
          class="mt-6 flex items-center gap-2"
          @submit.prevent="handleSearchSubmit"
        >
          <div class="relative flex-1">
            <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              v-model="searchQuery"
              type="text"
              placeholder="Например: поставщики, тарифы, настройки..."
              class="pl-9"
            />
          </div>
          <Button type="submit">
            Найти
          </Button>
        </form>

        <div class="mt-8">
          <p class="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Популярные разделы
          </p>
          <ul class="divide-y divide-border rounded-xl border border-border bg-card">
            <li
              v-for="link in quickLinks"
              :key="link.to"
            >
              <RouterLink
                :to="link.to"
                class="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
              >
                <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <component
                    :is="link.icon"
                    class="size-4"
                  />
                </span>
                <span class="flex-1">
                  <span class="block text-sm font-medium text-foreground">{{ link.label }}</span>
                  <span class="block text-xs text-muted-foreground">{{ link.description }}</span>
                </span>
                <ArrowRight class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </RouterLink>
            </li>
          </ul>
        </div>

        <div class="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <LifeBuoy class="size-3.5" />
          <span>Не нашли нужное? </span>
          <a
            href="mailto:support@delobytes.ru"
            class="font-medium text-primary underline-offset-4 hover:underline"
          >
            Напишите в поддержку
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
