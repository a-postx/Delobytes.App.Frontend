<script setup lang="ts">
import StatsStrip from '@/components/ui/stats-strip/StatsStrip.vue'
import type { StatsStripItem } from '@/components/ui/stats-strip'

interface Props {
  items: StatsStripItem[]
}

const props = defineProps<Props>()
</script>

<template>
  <StatsStrip
    :items="props.items"
    :columns="5"
    class="max-md:!grid-cols-2"
  />
</template>
