<script setup lang="ts">
import { computed } from 'vue'
import { Package } from 'lucide-vue-next'
import { CopyButton } from '@/components/ui/copy-button'
import ProductChannelBadges from '@/components/products/ProductChannelBadges.vue'
import type { GetProductResponse, ProductChannelLink } from '@/types/products'

const props = defineProps<{
  product: GetProductResponse | null
}>()

const channelLinks = computed<ProductChannelLink[]>(() => props.product?.channelLinks ?? [])

const channelCount = computed<number>(() => channelLinks.value.length)
</script>

<template>
  <div class="flex items-start gap-3">
    <div class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
      <Package class="size-6 text-primary" />
    </div>
    <div class="min-w-0 flex-1">
      <h1 class="truncate text-2xl font-bold">
        {{ product?.name || 'Редактирование товара' }}
      </h1>
      <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span class="inline-flex items-center gap-2">
          <span class="font-mono text-sm text-muted-foreground">
            Код: {{ product?.code || '—' }}
          </span>
          <CopyButton
            v-if="product?.code"
            :value="product.code"
            size="icon-sm"
            tooltip-text="Копировать код"
          />
        </span>
        <span
          v-if="product?.sku"
          class="text-sm text-muted-foreground"
        >
          SKU: <span class="font-mono">{{ product.sku }}</span>
        </span>
        <span class="text-sm text-muted-foreground">Каналов: {{ channelCount }}</span>
        <ProductChannelBadges
          v-if="channelCount > 0"
          :links="channelLinks"
        />
      </div>
    </div>
  </div>
</template>
