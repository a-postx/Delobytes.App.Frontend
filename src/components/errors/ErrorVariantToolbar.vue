<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, ArrowRight, LayoutGrid } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { errorPageVariants } from '@/views/errors/errorPageVariants'

/**
 * Служебная панель для сравнения вариантов дизайна. Визуально отделена
 * (мелкий шрифт, приглушённый фон) от самой страницы ошибки, чтобы не
 * искажать восприятие оцениваемого дизайна.
 */
const props = defineProps<{
  currentKey: string
}>()

const currentIndex = computed<number>(() =>
  errorPageVariants.findIndex((variant) => variant.key === props.currentKey),
)

const prevVariant = computed(() => {
  const total = errorPageVariants.length
  return errorPageVariants[(currentIndex.value - 1 + total) % total]
})

const nextVariant = computed(() => {
  const total = errorPageVariants.length
  return errorPageVariants[(currentIndex.value + 1) % total]
})

const currentLabel = computed<string>(
  () => errorPageVariants[currentIndex.value]?.label ?? '',
)
</script>

<template>
  <div
    class="sticky top-0 z-50 flex w-full flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/60 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-muted/40"
  >
    <div class="flex items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="secondary">
        Дизайн-система ошибок
      </Badge>
      <span class="hidden sm:inline">·</span>
      <span class="hidden font-medium text-foreground sm:inline">{{ currentLabel }}</span>
    </div>

    <div class="flex items-center gap-1.5">
      <Button
        as-child
        variant="ghost"
        size="sm"
      >
        <RouterLink :to="{ name: prevVariant.routeName }">
          <ArrowLeft />
          <span class="hidden md:inline">{{ prevVariant.shortLabel }}</span>
        </RouterLink>
      </Button>

      <Button
        as-child
        variant="outline"
        size="sm"
      >
        <RouterLink :to="{ name: 'error-pages-gallery' }">
          <LayoutGrid />
          Все варианты
        </RouterLink>
      </Button>

      <Button
        as-child
        variant="ghost"
        size="sm"
      >
        <RouterLink :to="{ name: nextVariant.routeName }">
          <span class="hidden md:inline">{{ nextVariant.shortLabel }}</span>
          <ArrowRight />
        </RouterLink>
      </Button>
    </div>
  </div>
</template>
