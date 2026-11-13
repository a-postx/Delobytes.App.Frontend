<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { channelDisplayForLink, normalizeChannel } from '@/utils/channelBadges'
import type { ProductChannelLink } from '@/types/products'

const props = defineProps<{
  link: ProductChannelLink
}>()

const marketplaceLabels: Record<string, string> = {
  wildberries: 'WB',
  ozon: 'Ozon',
  'yandex.kit': 'Я.Маркет',
}

const marketplaceLabel = computed<string | null>(() => {
  const normalized = normalizeChannel(props.link.channelCode) ?? normalizeChannel(props.link.channelName)
  return normalized ? marketplaceLabels[normalized] ?? null : null
})

const externalProductIdLabel = computed<string>(() =>
  marketplaceLabel.value ? `Артикул ${marketplaceLabel.value}` : 'Артикул канала',
)

const externalSkuLabel = computed<string>(() =>
  marketplaceLabel.value ? `Артикул продавца ${marketplaceLabel.value}` : 'Артикул продавца',
)

const descriptionExpanded = ref<boolean>(false)

const packingUnitLabel = computed<string>(() => {
  const unit = props.link.packingUnit
  if (!unit) {
    return '—'
  }
  const dimensions = `${unit.lengthCm} × ${unit.widthCm} × ${unit.heightCm} см`
  return unit.weightKg !== undefined && unit.weightKg !== null
    ? `${dimensions}, ${unit.weightKg} кг`
    : dimensions
})

const lastSyncedAtLabel = computed<string>(() => {
  if (!props.link.lastSyncedAt) {
    return 'Не синхронизировано'
  }
  return new Date(props.link.lastSyncedAt).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})
</script>

<template>
  <Card class="flex flex-col">
    <CardHeader class="relative flex-row items-center justify-between gap-2 space-y-0">
      <Badge :variant="channelDisplayForLink(link.channelCode, link.channelName).variant">
        {{ link.channelName }}
      </Badge>
      <Badge v-if="!link.isActive" variant="secondary">Неактивна</Badge>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-muted-foreground">{{ externalProductIdLabel }}</span>
          <span class="font-mono text-sm">{{ link.externalProductId || '—' }}</span>
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-muted-foreground">{{ externalSkuLabel }}</span>
          <span class="font-mono text-sm">{{ link.externalSku || '—' }}</span>
        </div>
      </div>

      <div v-if="link.name" class="flex flex-col gap-0.5">
        <span class="text-xs text-muted-foreground">Название на канале</span>
        <span class="text-sm">{{ link.name }}</span>
      </div>

      <div v-if="link.description" class="flex flex-col gap-1">
        <span class="text-xs text-muted-foreground">Описание на канале</span>
        <p :class="['text-sm text-muted-foreground', descriptionExpanded ? '' : 'line-clamp-3']">
          {{ link.description }}
        </p>
        <Button
          variant="ghost"
          size="sm"
          class="self-start h-auto px-0 gap-1 text-xs"
          @click="descriptionExpanded = !descriptionExpanded"
        >
          {{ descriptionExpanded ? 'Свернуть' : 'Показать полностью' }}
          <ChevronUp v-if="descriptionExpanded" class="size-3" />
          <ChevronDown v-else class="size-3" />
        </Button>
      </div>

      <div class="flex flex-col gap-0.5">
        <span class="text-xs text-muted-foreground">Габариты на канале</span>
        <span class="text-sm">{{ packingUnitLabel }}</span>
      </div>

      <div class="flex flex-col gap-0.5">
        <span class="text-xs text-muted-foreground">Последняя синхронизация</span>
        <span class="text-sm text-muted-foreground">{{ lastSyncedAtLabel }}</span>
      </div>
    </CardContent>
  </Card>
</template>
