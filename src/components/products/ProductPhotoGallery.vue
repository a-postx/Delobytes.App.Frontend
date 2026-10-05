<script setup lang="ts">
import { ref, computed, nextTick, watch, onBeforeUnmount } from 'vue'
import { ChevronLeft, ChevronRight, X, ZoomIn, ImageOff, Images } from 'lucide-vue-next'
import type { ProductPhoto } from '@/types/products'

interface Props {
  photos: ProductPhoto[]
  maxVisibleTiles?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxVisibleTiles: 5,
})

const lightboxOpen = ref<boolean>(false)
const activeIndex = ref<number>(0)
const loadErrors = ref<Set<string>>(new Set())
const lightboxEl = ref<HTMLElement | null>(null)
const thumbnailStripEl = ref<HTMLElement | null>(null)

const largePhotos = computed<ProductPhoto[]>(() =>
  props.photos
    .filter(p => p.sizeVariant === 'large')
    .sort((a, b) => a.displayOrder - b.displayOrder)
)

const mainPhoto = computed<ProductPhoto | null>(() => largePhotos.value[0] ?? null)

const visibleRestPhotos = computed<ProductPhoto[]>(() => {
  const rest = largePhotos.value.slice(1)
  return rest.slice(0, props.maxVisibleTiles)
})

const remainingCount = computed<number>(() => {
  const rest = largePhotos.value.slice(1)
  return Math.max(0, rest.length - props.maxVisibleTiles)
})

const openLightbox = (index: number): void => {
  activeIndex.value = index
  lightboxOpen.value = true
  nextTick(() => {
    lightboxEl.value?.focus()
    scrollThumbnailIntoView(index)
  })
}

const closeLightbox = (): void => {
  lightboxOpen.value = false
}

const prev = (): void => {
  activeIndex.value = (activeIndex.value - 1 + largePhotos.value.length) % largePhotos.value.length
  nextTick(() => scrollThumbnailIntoView(activeIndex.value))
}

const next = (): void => {
  activeIndex.value = (activeIndex.value + 1) % largePhotos.value.length
  nextTick(() => scrollThumbnailIntoView(activeIndex.value))
}

const scrollThumbnailIntoView = (index: number): void => {
  if (!thumbnailStripEl.value) {
    return
  }

  const thumbButton: HTMLElement | null = thumbnailStripEl.value.querySelector(
    `[data-thumb-index="${index}"]`
  )

  if (thumbButton) {
    thumbButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }
}

const onLightboxKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
  if (e.key === 'ArrowRight') { e.preventDefault(); next() }
  if (e.key === 'Escape') { e.preventDefault(); closeLightbox() }
}

let isScrollLocked: boolean = false
let prevBodyOverflow: string = ''
let prevBodyPaddingRight: string = ''

const lockScroll = (): void => {
  if (isScrollLocked) {
    return
  }

  const scrollbarWidth: number = window.innerWidth - document.documentElement.clientWidth
  prevBodyOverflow = document.body.style.overflow
  prevBodyPaddingRight = document.body.style.paddingRight
  document.body.style.overflow = 'hidden'

  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`
  }

  isScrollLocked = true
}

const unlockScroll = (): void => {
  if (!isScrollLocked) {
    return
  }

  document.body.style.overflow = prevBodyOverflow
  document.body.style.paddingRight = prevBodyPaddingRight
  isScrollLocked = false
}

watch(lightboxOpen, (isOpen: boolean): void => {
  if (isOpen) {
    lockScroll()
  } else {
    unlockScroll()
  }
})

onBeforeUnmount(unlockScroll)

const handleImageError = (photoId: string): void => {
  loadErrors.value = new Set([...loadErrors.value, photoId])
}
</script>

<template>
  <div v-if="largePhotos.length > 0" class="photo-gallery">

    <button
      v-if="mainPhoto"
      class="photo-main"
      type="button"
      aria-label="Просмотр главного фото"
      @click.stop="openLightbox(0)"
    >
      <div v-if="loadErrors.has(mainPhoto.id)" class="photo-error">
        <ImageOff class="size-6 text-muted-foreground" />
      </div>
      <template v-else>
        <img
          :src="mainPhoto.url"
          :alt="`Фото ${mainPhoto.displayOrder}`"
          class="photo-img"
          loading="eager"
          @error="handleImageError(mainPhoto.id)"
        />
        <div class="photo-overlay" aria-hidden="true">
          <ZoomIn class="size-5" />
        </div>
      </template>
    </button>

    <div v-if="visibleRestPhotos.length > 0 || remainingCount > 0" class="photo-grid">
      <button
        v-for="(photo, idx) in visibleRestPhotos"
        :key="photo.id"
        class="photo-tile"
        type="button"
        :aria-label="`Просмотр фото ${photo.displayOrder}`"
        @click.stop="openLightbox(idx + 1)"
      >
        <div v-if="loadErrors.has(photo.id)" class="photo-error">
          <ImageOff class="size-4 text-muted-foreground" />
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
            <ZoomIn class="size-3" />
          </div>
        </template>
      </button>

      <button
        v-if="remainingCount > 0"
        class="photo-tile photo-tile--more"
        type="button"
        :aria-label="`Показать все фото (ещё ${remainingCount})`"
        @click.stop="openLightbox(maxVisibleTiles + 1)"
      >
        <div class="photo-more-overlay">
          <Images class="size-5 mb-1" />
          <span class="text-lg font-semibold">+{{ remainingCount }}</span>
        </div>
      </button>
    </div>

    <Teleport to="body">
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

        <div class="lightbox-content">
          <div class="lightbox-img-wrap" @click.stop>
            <img
              :src="largePhotos[activeIndex]?.url"
              :alt="`Фото ${largePhotos[activeIndex]?.displayOrder}`"
              class="lightbox-img"
            />
          </div>

          <div v-if="largePhotos.length > 1" class="lightbox-thumbnails" ref="thumbnailStripEl">
            <button
              v-for="(photo, idx) in largePhotos"
              :key="photo.id"
              :data-thumb-index="idx"
              class="lightbox-thumb"
              :class="{ 'lightbox-thumb--active': idx === activeIndex }"
              type="button"
              :aria-label="`Перейти к фото ${photo.displayOrder}`"
              :aria-current="idx === activeIndex ? 'true' : undefined"
              @click.stop="openLightbox(idx)"
            >
              <img
                :src="photo.url"
                :alt="`Миниатюра ${photo.displayOrder}`"
                class="lightbox-thumb-img"
              />
            </button>
          </div>
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
    </Teleport>
  </div>

  <div v-else class="photo-empty">
    <ImageOff class="size-5 text-muted-foreground" />
    <span class="text-sm text-muted-foreground">Фотографии не загружены</span>
  </div>
</template>

<style scoped>
.photo-gallery {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.photo-main {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 120ms ease;
}

.photo-main:hover {
  border-color: hsl(var(--primary));
}

.photo-main:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

.photo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.photo-tile {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: calc(var(--radius) * 0.75);
  overflow: hidden;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--muted));
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 120ms ease, transform 120ms ease;
}

.photo-tile:hover {
  border-color: hsl(var(--primary));
  transform: scale(1.03);
}

.photo-tile:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

.photo-tile:active {
  transform: scale(0.97);
}

.photo-tile--more {
  background: hsl(var(--muted) / 0.6);
  backdrop-filter: blur(8px);
}

.photo-more-overlay {
  position: absolute;
  inset: 0;
  background: hsl(var(--foreground) / 0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: hsl(var(--background));
  user-select: none;
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
  background: hsl(var(--foreground) / 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity 120ms ease;
}

.photo-main:hover .photo-overlay,
.photo-tile:hover .photo-overlay {
  opacity: 1;
}

.photo-error {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.photo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 16px;
  border: 1px dashed hsl(var(--border));
  border-radius: var(--radius);
  background: hsl(var(--muted) / 0.4);
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: hsl(0 0% 0% / 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  overscroll-behavior: contain;
}

.lightbox-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: calc(100vw - 128px);
  max-height: calc(100vh - 96px);
}

.lightbox-img-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.lightbox-img {
  max-width: 100%;
  max-height: calc(100vh - 200px);
  object-fit: contain;
  border-radius: var(--radius);
  user-select: none;
}

.lightbox-thumbnails {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: hsl(0 0% 0% / 0.5);
  border-radius: var(--radius);
  overflow-x: auto;
  max-width: 100%;
  scrollbar-width: thin;
  scrollbar-color: hsl(0 0% 40%) transparent;
}

.lightbox-thumbnails::-webkit-scrollbar {
  height: 6px;
}

.lightbox-thumbnails::-webkit-scrollbar-track {
  background: transparent;
}

.lightbox-thumbnails::-webkit-scrollbar-thumb {
  background: hsl(0 0% 40%);
  border-radius: 3px;
}

.lightbox-thumb {
  position: relative;
  width: 64px;
  height: 80px;
  flex-shrink: 0;
  border-radius: calc(var(--radius) * 0.5);
  overflow: hidden;
  border: 2px solid transparent;
  background: hsl(0 0% 20%);
  cursor: pointer;
  padding: 0;
  transition: border-color 120ms ease, transform 120ms ease;
}

.lightbox-thumb:hover {
  border-color: hsl(0 0% 60%);
  transform: scale(1.05);
}

.lightbox-thumb--active {
  border-color: hsl(var(--primary));
}

.lightbox-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  width: 40px;
  height: 40px;
  border-radius: calc(var(--radius) * 0.75);
  background: hsl(0 0% 0% / 0.6);
  border: 1px solid hsl(0 0% 100% / 0.2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 120ms ease;
  padding: 0;
}

.lightbox-close:hover {
  background: hsl(0 0% 0% / 0.8);
}

.lightbox-close:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: hsl(0 0% 0% / 0.6);
  border: 1px solid hsl(0 0% 100% / 0.2);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 120ms ease;
  padding: 0;
}

.lightbox-nav:hover {
  background: hsl(0 0% 0% / 0.8);
}

.lightbox-nav:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

.lightbox-nav--prev {
  left: 16px;
}

.lightbox-nav--next {
  right: 16px;
}

.lightbox-counter {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: hsl(0 0% 0% / 0.6);
  border: 1px solid hsl(0 0% 100% / 0.2);
  border-radius: calc(var(--radius) * 1.5);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  user-select: none;
}

@media (max-width: 768px) {
  .lightbox-content {
    max-width: calc(100vw - 24px);
    max-height: calc(100vh - 48px);
  }

  .lightbox-img {
    max-height: calc(100vh - 160px);
  }

  .lightbox-nav {
    width: 40px;
    height: 40px;
  }

  .lightbox-nav--prev {
    left: 8px;
  }

  .lightbox-nav--next {
    right: 8px;
  }

  .lightbox-close {
    top: 8px;
    right: 8px;
  }

  .lightbox-counter {
    bottom: 8px;
  }

  .lightbox-thumb {
    width: 56px;
    height: 70px;
  }
}
</style>
