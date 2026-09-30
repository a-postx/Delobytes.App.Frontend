<script setup lang="ts">
import { ref, computed, nextTick, watch, onBeforeUnmount } from 'vue'
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

// Первое фото — главное, остальные — вспомогательные
const mainPhoto = computed<ProductPhoto | null>(() => largePhotos.value[0] ?? null)
const restPhotos = computed<ProductPhoto[]>(() => largePhotos.value.slice(1))

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

// Прокручивается окно браузера, поэтому на время просмотра блокируем прокрутку body.
// Ширину скроллбара компенсируем отступом, чтобы страница под оверлеем не сдвигалась.
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

// Уход со страницы при открытом лайтбоксе не должен оставить body заблокированным
onBeforeUnmount(unlockScroll)

const handleImageError = (photoId: string): void => {
  loadErrors.value = new Set([...loadErrors.value, photoId])
}
</script>

<template>
  <div v-if="largePhotos.length > 0" class="photo-gallery">

    <!-- Главное фото — на всю ширину -->
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

    <!-- Остальные фото — по два в строку -->
    <div v-if="restPhotos.length > 0" class="photo-grid">
      <button
        v-for="(photo, idx) in restPhotos"
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
    </div>

    <!-- Лайтбокс вынесен в body: внутри страницы sticky-колонка создаёт свой контекст
         наложения, и оверлей оказывался под сайдбаром и шапкой. -->
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

/* Главное фото */
.photo-main {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
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

/* Сетка вспомогательных фото: 2 колонки */
.photo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

/* Общие стили для всех тайлов */
.photo-tile {
  position: relative;
  aspect-ratio: 1;
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

/* Empty state */
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

/* Lightbox: на весь экран поверх сайдбара (z-10) и шапки (z-10) */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: hsl(0 0% 0% / 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  overscroll-behavior: contain;
}

.lightbox-img-wrap {
  max-width: calc(100vw - 128px);
  max-height: calc(100vh - 96px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-img {
  max-width: 100%;
  max-height: calc(100vh - 96px);
  object-fit: contain;
  border-radius: var(--radius);
  user-select: none;
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

.lightbox-nav--prev { left: 12px; }
.lightbox-nav--next { right: 12px; }

@media (max-width: 640px) {
  .lightbox-img-wrap {
    max-width: calc(100vw - 24px);
  }

  .lightbox-nav {
    top: auto;
    bottom: 12px;
    transform: none;
  }

  .lightbox-nav--prev { left: 16px; }
  .lightbox-nav--next { right: 16px; }
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
  .photo-main,
  .photo-tile,
  .photo-overlay,
  .lightbox-close,
  .lightbox-nav {
    transition: none;
  }
}
</style>
