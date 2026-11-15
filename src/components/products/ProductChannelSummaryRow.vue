<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, ChevronUp, X } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { channelDisplayForLink } from '@/utils/channelBadges'
import type { ChannelProductBarcode, ProductChannelLink, ProductChannelPhoto } from '@/types/products'

// Deliberate placeholder for the planned comparison/propagation screen: this row is the only
// entry point to channel data on the product page. The next step adds per-attribute diff markers
// next to the form fields and a compare panel behind this row; propagation ("apply to channels")
// acts per attribute, never on the whole card.
const props = defineProps<{
  link: ProductChannelLink
}>()

const expanded = ref<boolean>(false)
const descriptionExpanded = ref<boolean>(false)
const lightboxIndex = ref<number | null>(null)

const channelVariant = computed(() =>
  channelDisplayForLink(props.link.channelCode, props.link.channelName).variant,
)

const barcodes = computed<ChannelProductBarcode[]>(() => props.link.barcodes ?? [])

const thumbnails = computed<ProductChannelPhoto[]>(() =>
  (props.link.photos ?? [])
    .filter((photo: ProductChannelPhoto) => photo.sizeVariant === 'thumbnail')
    .slice()
    .sort((left: ProductChannelPhoto, right: ProductChannelPhoto) => left.displayOrder - right.displayOrder),
)

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

const activeThumbnail = computed<ProductChannelPhoto | null>(() =>
  lightboxIndex.value === null ? null : thumbnails.value[lightboxIndex.value] ?? null,
)

const openPhoto = (index: number): void => {
  lightboxIndex.value = index
}

const closePhoto = (): void => {
  lightboxIndex.value = null
}

const previousPhoto = (): void => {
  if (lightboxIndex.value === null || thumbnails.value.length === 0) {
    return
  }
  lightboxIndex.value = (lightboxIndex.value - 1 + thumbnails.value.length) % thumbnails.value.length
}

const nextPhoto = (): void => {
  if (lightboxIndex.value === null || thumbnails.value.length === 0) {
    return
  }
  lightboxIndex.value = (lightboxIndex.value + 1) % thumbnails.value.length
}
</script>

<template>
  <div class="rounded-xl border border-border bg-card">
    <button
      type="button"
      class="flex w-full flex-wrap items-center gap-3 p-4 text-left"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <Badge :variant="channelVariant">{{ link.channelName }}</Badge>
      <span class="font-mono text-sm">{{ link.externalProductId }}</span>
      <span class="text-xs text-muted-foreground">Фото: {{ thumbnails.length }}</span>
      <span class="text-xs text-muted-foreground">Баркоды: {{ barcodes.length }}</span>
      <span class="text-xs text-muted-foreground">Синхронизация: {{ lastSyncedAtLabel }}</span>
      <Badge v-if="!link.isActive" variant="secondary">Неактивна</Badge>
      <span class="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
        {{ expanded ? 'Свернуть' : 'Подробнее' }}
        <ChevronUp v-if="expanded" class="size-4" />
        <ChevronDown v-else class="size-4" />
      </span>
    </button>

    <div v-if="expanded" class="grid gap-6 border-t border-border p-4 lg:grid-cols-2">
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-muted-foreground">Название</span>
          <span class="text-sm">{{ link.name || '—' }}</span>
        </div>

        <div class="flex flex-col gap-1">
          <span class="text-xs text-muted-foreground">Баркоды</span>
          <div v-if="barcodes.length === 0" class="text-sm text-muted-foreground">Баркоды не указаны</div>
          <div v-else class="flex flex-wrap gap-1">
            <Badge
              v-for="barcode in barcodes"
              :key="barcode.value"
              :variant="channelVariant"
            >
              {{ barcode.value }}
            </Badge>
          </div>
        </div>

        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-muted-foreground">Артикул продавца</span>
          <span class="font-mono text-sm">{{ link.externalSku || '—' }}</span>
        </div>

        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-muted-foreground">Канал</span>
          <span class="text-sm">{{ link.channelName }}</span>
        </div>

        <div v-if="link.description" class="flex flex-col gap-1">
          <span class="text-xs text-muted-foreground">Описание</span>
          <p :class="['text-sm text-muted-foreground', descriptionExpanded ? '' : 'line-clamp-3']">
            {{ link.description }}
          </p>
          <button
            type="button"
            class="self-start text-xs text-primary"
            @click="descriptionExpanded = !descriptionExpanded"
          >
            {{ descriptionExpanded ? 'Свернуть' : 'Показать полностью' }}
          </button>
        </div>

        <div class="flex flex-col gap-0.5">
          <span class="text-xs text-muted-foreground">Габариты</span>
          <span class="text-sm">{{ packingUnitLabel }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-xs text-muted-foreground">Фотографии</span>
        <div v-if="thumbnails.length === 0" class="text-sm text-muted-foreground">
          Фотографии в канале отсутствуют
        </div>
        <div v-else class="grid grid-cols-3 gap-2 sm:grid-cols-4">
          <button
            v-for="(photo, index) in thumbnails"
            :key="`${photo.displayOrder}-${photo.sizeVariant}-${index}`"
            type="button"
            class="aspect-[3/4] overflow-hidden rounded-md border border-border bg-muted"
            :aria-label="`Открыть фото ${photo.displayOrder}`"
            @click="openPhoto(index)"
          >
            <img :src="photo.url" :alt="`Фото ${photo.displayOrder}`" class="size-full object-cover" loading="lazy" />
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="activeThumbnail"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
        role="dialog"
        aria-modal="true"
        :aria-label="`Фото ${activeThumbnail.displayOrder}`"
        @click="closePhoto"
      >
        <button
          type="button"
          class="absolute top-4 right-4 rounded-md border border-white/20 bg-black/60 p-2 text-white"
          aria-label="Закрыть"
          @click.stop="closePhoto"
        >
          <X class="size-5" />
        </button>
        <button
          v-if="thumbnails.length > 1"
          type="button"
          class="absolute left-4 rounded-full border border-white/20 bg-black/60 p-2 text-white"
          aria-label="Предыдущее фото"
          @click.stop="previousPhoto"
        >
          ‹
        </button>
        <img
          :src="activeThumbnail.url"
          :alt="`Фото ${activeThumbnail.displayOrder}`"
          class="max-h-[85vh] max-w-[90vw] object-contain"
          @click.stop
        />
        <button
          v-if="thumbnails.length > 1"
          type="button"
          class="absolute right-4 rounded-full border border-white/20 bg-black/60 p-2 text-white"
          aria-label="Следующее фото"
          @click.stop="nextPhoto"
        >
          ›
        </button>
      </div>
    </Teleport>
  </div>
</template>
