<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Package } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TabsRoot,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import ProductPageHeader from '@/components/products/ProductPageHeader.vue'
import ProductOverviewTab from '@/components/products/ProductOverviewTab.vue'
import ProductChannelsTab from '@/components/products/ProductChannelsTab.vue'
import ProductCostTab from '@/components/products/ProductCostTab.vue'
import PageDraftShell from '@/components/draft/PageDraftShell.vue'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { toast } from 'vue-sonner'
import { catalogProductsApi } from '@/services/api'
import { extractErrorCode, extractErrorMessage } from '@/composables/useApi'
import { describeFailure } from '@/composables/useApiFailureCopy'
import type { FailureCopy } from '@/composables/useApiFailureCopy'
import type { GetProductResponse } from '@/types/products'
import type { ApiError } from '@/types/errors'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { provideDraftRegistry } from '@/composables/usePageDraft'

type ProductTab = 'overview' | 'channels' | 'cost'

type SavedPatch = Pick<GetProductResponse, 'sku' | 'name' | 'description' | 'barcodes' | 'packingUnit'>

const PRODUCT_TABS: readonly ProductTab[] = ['overview', 'channels', 'cost']
const DEFAULT_TAB: ProductTab = 'overview'

const route = useRoute()
const router = useRouter()
const { canWrite } = useCurrentUser()

provideDraftRegistry()

const productId = computed<string>(() => route.params.id as string)

const FALLBACK_LOAD_MESSAGE = 'Не удалось загрузить товар'

const isLoading = ref<boolean>(true)
const notFound = ref<boolean>(false)
const loadError = ref<FailureCopy | null>(null)
const product = ref<GetProductResponse | null>(null)

const isProductTab = (value: unknown): value is ProductTab =>
  typeof value === 'string' && (PRODUCT_TABS as readonly string[]).includes(value)

const activeTab = ref<ProductTab>(DEFAULT_TAB)

/** Раз true — остаётся true: правки состава не должны теряться при переключении вкладок. */
const costTabVisited = ref<boolean>(false)

const channelCount = computed<number>(() => product.value?.channelLinks?.length ?? 0)

watch(activeTab, (tab: ProductTab) => {
  if (tab === 'cost') {
    costTabVisited.value = true
  }
}, { immediate: true })

const resetActiveTabFromQuery = (): void => {
  const requested = route.query.tab
  activeTab.value = isProductTab(requested) ? requested : DEFAULT_TAB
}

const loadProduct = async (): Promise<void> => {
  if (!productId.value) {
    notFound.value = true
    isLoading.value = false
    return
  }

  isLoading.value = true
  notFound.value = false
  loadError.value = null

  try {
    product.value = await catalogProductsApi.getById(productId.value)
  } catch (error: unknown) {
    const status: number = (error as { response?: { status?: number } })?.response?.status ?? 0

    // Бэкенд сообщает об отсутствии товара через 404: это состояние страницы, а не сбой загрузки.
    if (status === 404) {
      notFound.value = true
      return
    }

    const apiError: ApiError = {
      code: extractErrorCode(error) ?? 'common.unexpected_error',
      message: extractErrorMessage(error, FALLBACK_LOAD_MESSAGE),
      status,
    }
    loadError.value = describeFailure(apiError, FALLBACK_LOAD_MESSAGE)
    toast.error(apiError.message)
  } finally {
    isLoading.value = false
  }
}

const syncTabQuery = (tab: ProductTab): void => {
  if (route.query.tab === tab) {
    return
  }

  void router.replace({ query: { ...route.query, tab } })
}

/**
 * Смена вкладки — не разрушительное действие: панели остаются смонтированными,
 * черновики живут в реестре страницы. Поэтому вопроса здесь нет, есть только query.
 */
const applyTab = (value: string | number): void => {
  if (!isProductTab(value) || value === activeTab.value) {
    return
  }

  activeTab.value = value
  syncTabQuery(value)
}

const handleProductSaved = (patch: SavedPatch): void => {
  if (!product.value) {
    return
  }

  product.value = { ...product.value, ...patch }
}

const handleCancel = (): void => {
  void router.push({ name: 'products' })
}

watch(() => route.query.tab, (tab) => {
  if (isProductTab(tab) && tab !== activeTab.value) {
    activeTab.value = tab
  }
})

watch(() => route.params.id, () => {
  resetActiveTabFromQuery()
  costTabVisited.value = false
  void loadProduct()
})

onMounted(() => {
  resetActiveTabFromQuery()
  void loadProduct()
})
</script>

<template>
  <div class="container mx-auto max-w-7xl px-4 py-6">
    <div class="mb-4">
      <Button
        variant="ghost"
        size="sm"
        class="-ml-2 gap-2"
        @click="handleCancel"
      >
        <ArrowLeft class="size-4" />
        Назад к каталогу
      </Button>
    </div>

    <div
      v-if="isLoading"
      class="flex flex-col gap-6"
    >
      <div class="flex items-center gap-3">
        <Skeleton class="size-12 rounded-lg" />
        <div class="flex flex-1 flex-col gap-2">
          <Skeleton class="h-8 w-64 rounded-md" />
          <Skeleton class="h-5 w-48 rounded-md" />
        </div>
      </div>
      <Skeleton class="h-10 w-80 rounded-lg" />
      <Skeleton class="h-96 w-full rounded-xl" />
    </div>

    <!-- Ошибка загрузки: отличается от "товар не найден" текстом и не стирает форму молча -->
    <ErrorState
      v-else-if="loadError"
      variant="embedded"
      :title="loadError.title"
      :description="loadError.description"
      retry-label="Повторить"
      @retry="loadProduct"
    />

    <div
      v-else-if="notFound"
      class="flex flex-col items-center justify-center gap-4 py-12"
    >
      <Package class="size-16 text-muted-foreground/40" />
      <div class="text-center">
        <h2 class="mb-2 text-xl font-semibold">
          Товар не найден
        </h2>
        <p class="mb-4 text-sm text-muted-foreground">
          Товар с таким идентификатором не существует или был удалён.
        </p>
        <Button
          variant="outline"
          @click="handleCancel"
        >
          Вернуться к каталогу
        </Button>
      </div>
    </div>

    <div
      v-else-if="product"
      class="flex flex-col gap-6"
    >
      <ProductPageHeader :product="product" />

      <TabsRoot
        :model-value="activeTab"
        class="flex flex-col gap-4"
        @update:model-value="applyTab"
      >
        <TabsList
          class="w-full justify-start overflow-x-auto sm:w-auto sm:justify-center"
          aria-label="Разделы товара"
        >
          <TabsTrigger value="overview">
            Основные данные
          </TabsTrigger>
          <TabsTrigger value="channels">
            Каналы продаж
            <span
              v-if="channelCount > 0"
              class="rounded-full bg-muted-foreground/15 px-1.5 text-xs tabular-nums"
            >
              {{ channelCount }}
            </span>
          </TabsTrigger>
          <TabsTrigger value="cost">
            Себестоимость
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          class="mt-0 border-0 bg-transparent p-0"
        >
          <ProductOverviewTab
            :product-id="productId"
            :product="product"
            @saved="handleProductSaved"
          />
        </TabsContent>

        <TabsContent
          value="channels"
          class="mt-0 border-0 bg-transparent p-0"
        >
          <ProductChannelsTab :links="product.channelLinks ?? []" />
        </TabsContent>

        <TabsContent
          value="cost"
          class="mt-0 border-0 bg-transparent p-0"
        >
          <ProductCostTab
            v-if="costTabVisited"
            :product-id="productId"
          />
        </TabsContent>
      </TabsRoot>
    </div>

    <PageDraftShell v-if="canWrite" />
  </div>
</template>
