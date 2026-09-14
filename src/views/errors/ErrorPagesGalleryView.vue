<script setup lang="ts">
import { ArrowRight, Palette } from 'lucide-vue-next'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { errorPageVariants } from '@/views/errors/errorPageVariants'
</script>

<template>
  <div class="mx-auto w-full max-w-5xl px-6 py-10">
    <div class="flex items-center gap-2 text-muted-foreground">
      <Palette class="size-4" />
      <span class="text-xs font-medium uppercase tracking-[0.15em]">Дизайн-система ошибок</span>
    </div>

    <h1 class="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
      Варианты страницы 404
    </h1>
    <p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
      Пять самостоятельных реализаций одной и той же страницы «не найдено» — с разным тоном подачи
      и разным акцентом на восстановление пользователя после ошибки. Каждый вариант — рабочая
      страница по собственному адресу, между ними можно переключаться прямо на странице.
      После выбора лучший вариант станет единым паттерном и для остальных кодов ошибок (403, 500, 503).
    </p>

    <div class="mt-8 grid gap-5 sm:grid-cols-2">
      <Card
        v-for="variant in errorPageVariants"
        :key="variant.key"
        class="flex flex-col"
      >
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle>{{ variant.label }}</CardTitle>
            <Badge variant="secondary">
              404
            </Badge>
          </div>
          <CardDescription>{{ variant.summary }}</CardDescription>
        </CardHeader>
        <CardContent class="flex-1">
          <div class="flex flex-wrap gap-1.5">
            <Badge
              v-for="tag in variant.tags"
              :key="tag"
              variant="default"
            >
              {{ tag }}
            </Badge>
          </div>
          <p class="mt-3 font-mono text-xs text-muted-foreground">
            {{ variant.path }}
          </p>
        </CardContent>
        <CardFooter>
          <Button
            as-child
            class="w-full"
          >
            <RouterLink :to="{ name: variant.routeName }">
              Открыть вариант
              <ArrowRight />
            </RouterLink>
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>
