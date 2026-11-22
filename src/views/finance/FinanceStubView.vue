<script setup lang="ts">
import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, Construction } from 'lucide-vue-next'

const route = useRoute()

const pageTitle: ComputedRef<string> = computed<string>(() => (route.meta.title as string) ?? '')
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <h1 class="text-2xl font-semibold tracking-tight">
      {{ pageTitle }}
    </h1>

    <div class="flex flex-col items-start gap-4 rounded-xl border border-dashed border-border bg-card p-8">
      <span class="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Construction class="size-5" />
      </span>
      <div class="flex flex-col gap-1">
        <p class="text-base font-medium">
          Раздел в разработке
        </p>
        <p class="max-w-prose text-sm text-muted-foreground">
          Экономика товаров, операции и качество данных появятся в следующих итерациях.
          Пока все деньги периода собраны в обзоре.
        </p>
      </div>
      <RouterLink
        :to="{ name: 'finance-overview' }"
        class="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline hover:underline-offset-4"
      >
        <ArrowLeft class="size-4" />
        К обзору финансов
      </RouterLink>
    </div>
  </div>
</template>
