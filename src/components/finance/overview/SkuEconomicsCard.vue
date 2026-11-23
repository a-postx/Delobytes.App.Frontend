<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
import DashboardWidget from '@/components/dashboard/DashboardWidget.vue'
import RankList from '@/components/ui/rank-list/RankList.vue'
import type { RankListItem } from '@/components/ui/rank-list'
import type { SkuRankings } from './overviewModel'

interface Props {
  rankings: SkuRankings
  productCount: number | null
  loading: boolean
  error: string | null
  /** Period and channel of the overview, carried into the product table links. */
  productsQuery: Record<string, string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (event: 'retry'): void
  (event: 'select', item: RankListItem): void
}>()
</script>

<template>
  <DashboardWidget
    title-class="text-lg"
    title="Экономика SKU"
    :loading="props.loading"
    :error="props.error"
    @retry="emit('retry')"
  >
    <template #actions>
      <RouterLink
        :to="{ name: 'finance-products', query: props.productsQuery }"
        class="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline hover:underline-offset-4"
      >
        <template v-if="props.productCount !== null">
          Все {{ props.productCount }} товаров
        </template>
        <template v-else>
          Все товары
        </template>
        <ArrowRight class="size-3.5" />
      </RouterLink>
    </template>

    <p
      v-if="props.rankings.empty"
      class="py-6 text-center text-sm text-muted-foreground"
    >
      Нет товаров с полностью известной себестоимостью
    </p>

    <div
      v-else
      class="grid gap-6 lg:grid-cols-2 lg:gap-0"
    >
      <section class="min-w-0 lg:pr-5">
        <h3 class="px-1.5 pb-2 text-xs font-medium text-muted-foreground">
          Лидеры по маржинальной прибыли
        </h3>
        <RankList
          :items="props.rankings.leaders"
          clickable
          @select="(item) => emit('select', item)"
        />
      </section>

      <section
        v-if="!props.rankings.leadersOnly && props.rankings.losers.length > 0"
        class="min-w-0 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"
      >
        <h3 class="px-1.5 pb-2 text-xs font-medium text-muted-foreground">
          Теряют маржу
        </h3>
        <RankList
          :items="props.rankings.losers"
          clickable
          @select="(item) => emit('select', item)"
        />
      </section>
    </div>
  </DashboardWidget>
</template>
