<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Store } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import ProductChannelSummaryRow from '@/components/products/ProductChannelSummaryRow.vue'
import type { ProductChannelLink } from '@/types/products'

const props = defineProps<{
  links: ProductChannelLink[]
}>()

const router = useRouter()

const hasLinks = computed<boolean>(() => props.links.length > 0)

const goToSalesChannels = (): void => {
  void router.push({ name: 'sales-channels' })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-if="!hasLinks"
      class="flex flex-col items-center justify-center gap-4 py-16 text-center"
    >
      <Store class="size-16 text-muted-foreground/40" />
      <div>
        <h2 class="mb-2 text-lg font-semibold">
          Товар не привязан ни к одному каналу
        </h2>
        <p class="mb-4 max-w-sm text-sm text-muted-foreground">
          Карточки на Wildberries, Ozon и других площадках появятся здесь после привязки товара к каналу продаж.
        </p>
        <Button
          variant="outline"
          @click="goToSalesChannels"
        >
          Перейти к каналам продаж
        </Button>
      </div>
    </div>

    <div
      v-else
      class="flex flex-col gap-2"
    >
      <ProductChannelSummaryRow
        v-for="link in links"
        :key="link.channelId"
        :link="link"
      />
    </div>
  </div>
</template>
