<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { Check, Package, Search, X } from 'lucide-vue-next'
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxViewport,
} from 'reka-ui'
import { Button } from '@/components/ui/button'
import { catalogProductsApi, productWorkRatesApi } from '@/services/api'
import type { ProductItem } from '@/types/products'
import { ProductStatus } from '@/types/products'
import { formatIsoDate } from '@/utils/productWorkRates'

interface Props {
  /** id выбранного товара или пустая строка, пока товар не выбран. */
  modelValue: string
  /** Товар, который нельзя предлагать: диалог правки уже привязан к нему. */
  excludeProductId?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  excludeProductId: undefined,
  disabled: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'select', product: ProductItem): void
}>()

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300
/** Порог в пикселях от низа списка, после которого подтягивается следующая страница. */
const SCROLL_THRESHOLD_PX = 48

const results = ref<ProductItem[]>([])
const searchTerm = ref<string>('')
const selectedProduct = ref<ProductItem | null>(null)
const open = ref<boolean>(false)
const isLoading = ref<boolean>(false)
const isLoadingMore = ref<boolean>(false)
const hasMore = ref<boolean>(false)
const hasLoadedOnce = ref<boolean>(false)
const loadFailed = ref<boolean>(false)
const activeWriteRateFrom = ref<string>('')

let page = 1
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
/**
 * Идентификатор последнего отправленного запроса: ответ на устаревший запрос нельзя дописывать
 * в список, иначе результаты поиска перемешаются с предыдущей выдачей.
 */
let latestRequestId = 0
let rateCheckId = 0
/**
 * Сброс строки поиска после выбора меняет `searchTerm`, но пользовательского ввода в этом нет:
 * без флага debounce тут же отправил бы лишний запрос первой страницы без фильтра.
 */
let ignoreNextSearchChange = false

/**
 * Список приходит с сервера, поэтому собственный фильтр reka-ui нужно отключить:
 * он обрезал бы выданную страницу по локальной подстроке, не зная о пагинации.
 */
const visibleResults = computed<ProductItem[]>(() => {
  if (!selectedProduct.value) {
    return results.value
  }
  return results.value.some(product => product.id === selectedProduct.value!.id)
    ? results.value
    : [selectedProduct.value, ...results.value]
})

const emptyCatalog = computed<boolean>(() => hasLoadedOnce.value && results.value.length === 0 && !searchTerm.value)

const loadPage = async (targetPage: number, term: string, append: boolean): Promise<void> => {
  const requestId = ++latestRequestId
  if (append) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
  }
  loadFailed.value = false

  try {
    const response = await catalogProductsApi.getAll(ProductStatus.Active, {
      page: targetPage,
      pageSize: PAGE_SIZE,
      sortBy: 'name',
      sortDir: 'asc',
      includeWorkRateCoverage: true,
      search: term.trim() || undefined,
    })
    if (requestId !== latestRequestId) {
      return
    }
    const incoming: ProductItem[] = response.items.filter(
      product => product.id !== props.excludeProductId,
    )
    results.value = append ? [...results.value, ...incoming] : incoming
    page = targetPage
    const total = response.totalCount ?? response.items.length
    hasMore.value = page * PAGE_SIZE < total
    hasLoadedOnce.value = true
  } catch {
    if (requestId === latestRequestId) {
      loadFailed.value = true
    }
  } finally {
    if (requestId === latestRequestId) {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }
}

const checkExistingRate = async (productId: string): Promise<void> => {
  const checkId = ++rateCheckId
  try {
    const response = await productWorkRatesApi.getByProduct(productId)
    if (checkId !== rateCheckId) {
      return
    }
    const active = response.items.find(item => item.isActive)
    activeWriteRateFrom.value = active ? active.validFrom : ''
  } catch {
    // Подсказка не обязана быть точной: её отсутствие не мешает создать норму.
    if (checkId === rateCheckId) {
      activeWriteRateFrom.value = ''
    }
  }
}

const handleOpenChange = (value: boolean): void => {
  open.value = value
  if (value && results.value.length === 0 && !isLoading.value) {
    void loadPage(1, searchTerm.value, false)
  }
  if (!value) {
    resetSearchTerm()
  }
}

const handleInputUpdate = (value: string): void => {
  searchTerm.value = value
}

const handleSelect = (product: ProductItem): void => {
  selectedProduct.value = product
  emit('update:modelValue', product.id)
  emit('select', product)
  resetSearchTerm()
  void checkExistingRate(product.id)
}

const clearSelection = (): void => {
  selectedProduct.value = null
  // `select` не эмитится: выбор снят, и вызывающей стороне нечего передавать.
  emit('update:modelValue', '')
  activeWriteRateFrom.value = ''
  rateCheckId++
}

const handleScroll = (event: Event): void => {
  if (!hasMore.value || isLoading.value || isLoadingMore.value) {
    return
  }
  const viewport = event.target as HTMLElement
  const distanceToBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
  if (distanceToBottom <= SCROLL_THRESHOLD_PX) {
    void loadPage(page + 1, searchTerm.value, true)
  }
}

const retry = (): void => {
  void loadPage(1, searchTerm.value, false)
}

/** Сбрасывает строку поиска, не запуская debounce-запрос по этому изменению. */
const resetSearchTerm = (): void => {
  ignoreNextSearchChange = true
  searchTerm.value = ''
}

watch(searchTerm, (value: string) => {
  if (ignoreNextSearchChange) {
    ignoreNextSearchChange = false
    return
  }
  if (searchDebounceTimer !== null) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    void loadPage(1, value, false)
  }, SEARCH_DEBOUNCE_MS)
})

watch(() => props.modelValue, (value: string) => {
  if (!value && selectedProduct.value) {
    clearSelection()
  }
})

onUnmounted(() => {
  if (searchDebounceTimer !== null) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
})

const optionClass = 'flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer select-none outline-none data-[highlighted]:bg-muted data-[state=checked]:bg-muted'
const optionTitleClass = 'truncate font-medium'
const optionSkuClass = 'text-xs text-muted-foreground font-mono truncate'
</script>

<template>
  <div class="flex flex-col gap-2">
    <ComboboxRoot
      :model-value="modelValue"
      :open="open"
      :ignore-filter="true"
      :open-on-focus="true"
      :reset-search-term-on-select="true"
      :disabled="disabled"
      @update:open="handleOpenChange"
      @update:model-value="(value: unknown) => emit('update:modelValue', String(value ?? ''))"
    >
      <ComboboxAnchor
        class="relative mt-1 flex h-9 w-full items-center rounded-md border border-input bg-transparent shadow-sm focus-within:ring-1 focus-within:ring-ring"
        :class="disabled ? 'opacity-60' : ''"
      >
        <Search class="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
        <ComboboxInput
          :model-value="searchTerm"
          :disabled="disabled"
          placeholder="Поиск по названию или SKU"
          class="h-9 w-full bg-transparent pl-9 pr-9 text-sm outline-none placeholder:opacity-50 disabled:cursor-not-allowed"
          @update:model-value="handleInputUpdate"
        />
        <button
          v-if="selectedProduct && !disabled"
          type="button"
          class="absolute right-2 grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Очистить выбор"
          aria-label="Очистить выбор"
          @click="clearSelection"
        >
          <X class="size-3.5" />
        </button>
      </ComboboxAnchor>

      <ComboboxPortal>
        <ComboboxContent
          position="popper"
          side="bottom"
          :side-offset="4"
          class="z-[120] w-[var(--reka-combobox-trigger-width)] rounded-md border border-border bg-popover p-1 shadow-lg"
        >
          <ComboboxViewport class="max-h-[280px]" @scroll="handleScroll">
            <div v-if="isLoading" class="flex flex-col gap-2 p-2">
              <div v-for="n in 3" :key="n" class="h-12 w-full animate-pulse rounded-md bg-muted" />
            </div>

            <div v-else-if="loadFailed" class="flex flex-col items-start gap-2 p-3">
              <p class="text-xs text-destructive">Не удалось загрузить товары</p>
              <Button variant="outline" size="sm" @click="retry">Повторить</Button>
            </div>

            <template v-else>
              <ComboboxItem
                v-for="product in visibleResults"
                :key="product.id"
                :value="product.id"
                :text-value="`${product.name} ${product.sku}`"
                :class="optionClass"
                @select="handleSelect(product)"
              >
                <div class="w-10 aspect-[3/4] rounded-md overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
                  <img
                    v-if="product.photos && product.photos.length > 0"
                    :src="product.photos[0].url"
                    :alt="product.name"
                    class="size-full object-contain"
                    loading="lazy"
                  />
                  <Package v-else class="size-4 text-muted-foreground/40" />
                </div>

                <div class="flex min-w-0 flex-1 flex-col">
                  <span :class="optionTitleClass">{{ product.name }}</span>
                  <span :class="optionSkuClass">{{ product.sku }}</span>
                </div>

                <span
                  class="size-2 rounded-full shrink-0"
                  :class="product.hasActiveWorkRate ? 'bg-green-500 dark:bg-green-400' : 'bg-muted-foreground/40'"
                  :title="product.hasActiveWorkRate ? 'Норма заведена' : 'Норма не заведена'"
                />
                <span class="sr-only">
                  {{ product.hasActiveWorkRate ? 'Норма заведена' : 'Норма не заведена' }}
                </span>

                <Check v-if="product.id === modelValue" class="size-4 shrink-0 text-primary" />
              </ComboboxItem>

              <ComboboxEmpty v-if="!emptyCatalog" class="px-3 py-4 text-center text-sm text-muted-foreground">
                Ничего не найдено
              </ComboboxEmpty>

              <p v-if="emptyCatalog" class="px-3 py-4 text-center text-xs text-muted-foreground">
                В каталоге нет активных товаров.
                <RouterLink to="/catalogs/products" class="text-primary hover:underline">Перейти в товары</RouterLink>
              </p>
              <p v-else-if="isLoadingMore" class="px-3 py-2 text-center text-xs text-muted-foreground">
                Загрузка…
              </p>
            </template>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>

    <div
      v-if="selectedProduct"
      class="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
    >
      <div class="w-10 aspect-[3/4] rounded-md overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
        <img
          v-if="selectedProduct.photos && selectedProduct.photos.length > 0"
          :src="selectedProduct.photos[0].url"
          :alt="selectedProduct.name"
          class="size-full object-contain"
          loading="lazy"
        />
        <Package v-else class="size-4 text-muted-foreground/40" />
      </div>
      <div class="flex min-w-0 flex-col">
        <span class="truncate text-sm font-medium">{{ selectedProduct.name }}</span>
        <span class="truncate font-mono text-xs text-muted-foreground">{{ selectedProduct.sku }}</span>
      </div>
    </div>

    <p v-if="selectedProduct && activeWriteRateFrom" class="text-xs text-amber-600 dark:text-amber-500">
      У товара уже есть активная норма с {{ formatIsoDate(activeWriteRateFrom) }}.
      Она будет деактивирована, но новая запись станет действующей.
    </p>
  </div>
</template>
