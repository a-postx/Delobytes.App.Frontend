<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { ChevronLeft, ChevronRight, X, ZoomIn, ImageOff } from 'lucide-vue-next'
import type { ProductPhoto } from '@/types/products'

interface Props {
  photos: ProductPhoto[]
}

const props = defineProps<Props>()

const lightboxOpen = ref<boolean>(false)
const activeIndex = ref<number>(0)
const loadErrors = ref<Set<string>>(new Set())
const lightboxEl = ref<HTMLElement | null>(null)

const largePhotos = computed<ProductPhoto[]>(() =>
  props.photos
    .filter(p => p.sizeVariant === 'large')
    .sort((a, b) => a.displayOrder - b.displayOrder)
)

const openLightbox = (index: number): void => {
  activeIndex.value = index
  lightboxOpen.value = true
  nextTick(() => {
    lightboxEl.value?.focus()
  })
}

const closeLightbox = (): void => {
  lightboxOpen.value = false
}

const prev = (): void => {
  activeIndex.value = (activeIndex.value - 1 + largePhotos.value.length) % largePhotos.value.length
}

const next = (): void => {
  activeIndex.value = (activeIndex.value + 1) % largePhotos.value.length
}

const onLightboxKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
  if (e.key === 'ArrowRight') { e.preventDefault(); next() }
  if (e.key === 'Escape') { e.preventDefault(); closeLightbox() }
}

const handleImageError = (photoId: string): void => {
  loadErrors.value = new Set([...loadErrors.value, photoId])
}
</script>

<template>
  <div v-if="largePhotos.length > 0" class="photo-gallery">
    <div class="photo-grid">
      <button
        v-for="(photo, idx) in largePhotos"
        :key="photo.id"
        class="photo-tile"
        type="button"
        :aria-label="`Просмотр фото ${photo.displayOrder}`"
        @click.stop="openLightbox(idx)"
      >
        <div v-if="loadErrors.has(photo.id)" class="photo-error">
          <ImageOff class="size-5 text-muted-foreground" />
        </div>
        <template v-else>
          <img
            :src="photo.url"
            :alt="`Фото ${photo.displayOrder}`"
            class="photo-img"
            loading="lazy"
            @error="handleImageError(photo.id)"
          />
          <div class="photo-overlay" aria-hidden="true">
            <ZoomIn class="size-4" />
          </div>
        </template>
        <span class="photo-badge" aria-hidden="true">{{ photo.displayOrder }}</span>
      </button>
    </div>

    <!-- Лайтбокс рендерится внутри компонента (без Teleport),
         чтобы оставаться в DOM-дереве DialogContent и не провоцировать
         его закрытие библиотекой reka-ui. Position: fixed внутри
         transformed-предка ведёт себя как absolute — покрывает весь диалог. -->
    <div
      v-if="lightboxOpen"
      ref="lightboxEl"
      class="lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="`Фото ${largePhotos[activeIndex]?.displayOrder ?? ''}`"
      tabindex="0"
      @click.stop="closeLightbox"
      @keydown="onLightboxKeydown"
    >
      <button
        class="lightbox-close"
        type="button"
        aria-label="Закрыть"
        @click.stop="closeLightbox"
      >
        <X class="size-5" />
      </button>

      <button
        v-if="largePhotos.length > 1"
        class="lightbox-nav lightbox-nav--prev"
        type="button"
        aria-label="Предыдущее фото"
        @click.stop="prev"
      >
        <ChevronLeft class="size-6" />
      </button>

      <div class="lightbox-img-wrap" @click.stop>
        <img
          :src="largePhotos[activeIndex]?.url"
          :alt="`Фото ${largePhotos[activeIndex]?.displayOrder}`"
          class="lightbox-img"
        />
      </div>

      <button
        v-if="largePhotos.length > 1"
        class="lightbox-nav lightbox-nav--next"
        type="button"
        aria-label="Следующее фото"
        @click.stop="next"
      >
        <ChevronRight class="size-6" />
      </button>

      <div v-if="largePhotos.length > 1" class="lightbox-counter" aria-live="polite">
        {{ activeIndex + 1 }} / {{ largePhotos.length }}
      </div>
    </div>
  </div>

  <div v-else class="photo-empty">
    <ImageOff class="size-5 text-muted-foreground" />
    <span class="text-sm text-muted-foreground">Фотографии не загружены</span>
  </div>
</template>

<style scoped>
.photo-gallery {
  position: relative;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 8px;
}

/* Tile */
.photo-tile {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: border-color 120ms ease, transform 120ms ease;
}

.photo-tile:hover {
  border-color: hsl(var(--primary));
  transform: scale(1.025);
}

.photo-tile:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

.photo-tile:active {
  transform: scale(0.98);
}

.photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.photo-overlay {
  position: absolute;
  inset: 0;
  background: hsl(var(--foreground) / 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity 120ms ease;
}

.photo-tile:hover .photo-overlay {
  opacity: 1;
}

.photo-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  background: hsl(var(--background) / 0.82);
  color: hsl(var(--foreground));
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
}

.photo-error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* Empty state */
.photo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  border: 1px dashed hsl(var(--border));
  border-radius: var(--radius);
  background: hsl(var(--muted) / 0.4);
}

/* Lightbox — position: fixed внутри transformed-предка (DialogContent)
   ведёт себя как absolute: перекрывает весь диалог, не выходя за его bounds.
   z-index 50 достаточен внутри этого stacking context. */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: hsl(0 0% 0% / 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  border-radius: var(--radius);
}

.lightbox-img-wrap {
  max-width: calc(100% - 128px);
  max-height: calc(100% - 88px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-img {
  max-width: 100%;
  max-height: calc(100% - 88px);
  object-fit: contain;
  border-radius: var(--radius);
}

.lightbox-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: hsl(0 0% 100% / 0.15);
  border: 1px solid hsl(0 0% 100% / 0.2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 120ms ease;
}

.lightbox-close:hover {
  background: hsl(0 0% 100% / 0.28);
}

.lightbox-close:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: hsl(0 0% 100% / 0.15);
  border: 1px solid hsl(0 0% 100% / 0.2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 120ms ease;
}

.lightbox-nav:hover {
  background: hsl(0 0% 100% / 0.28);
}

.lightbox-nav:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

.lightbox-nav--prev {
  left: 12px;
}

.lightbox-nav--next {
  right: 12px;
}

.lightbox-counter {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  font-size: 13px;
  background: hsl(0 0% 100% / 0.15);
  padding: 3px 10px;
  border-radius: 100px;
  backdrop-filter: blur(4px);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .photo-tile,
  .photo-overlay,
  .lightbox-close,
  .lightbox-nav {
    transition: none;
  }
}
</style>
