<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ChartLine } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

interface Props {
  /** Channels are connected but no finance report has arrived yet. */
  hasActiveChannels: boolean
}

const props = defineProps<Props>()
</script>

<template>
  <div class="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-14 text-center">
    <span class="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <ChartLine class="size-5" />
    </span>
    <h2 class="text-base font-semibold">
      Финансовых данных пока нет
    </h2>
    <p class="max-w-lg text-sm text-muted-foreground">
      <template v-if="!props.hasActiveChannels">
        Подключите Wildberries или Ozon с доступом к финансовым отчётам — первые цифры
        появятся после загрузки первого отчёта.
      </template>
      <template v-else>
        Каналы подключены, но финансовые отчёты ещё не загружены. Первые цифры появятся
        после первой загрузки.
      </template>
    </p>
    <Button
      v-if="!props.hasActiveChannels"
      size="sm"
      as-child
    >
      <RouterLink :to="{ name: 'sales-channels' }">
        Подключить канал
      </RouterLink>
    </Button>
    <Button
      v-else
      size="sm"
      variant="outline"
      as-child
    >
      <RouterLink :to="{ name: 'finance-quality' }">
        Качество данных
      </RouterLink>
    </Button>
  </div>
</template>
