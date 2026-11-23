<script setup lang="ts">
interface Props {
  productId: string
  sku: string | null
}

const props = defineProps<Props>()
</script>

<template>
  <button
    type="button"
    :data-product-row="props.productId"
    class="rounded-sm text-left font-mono text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-1"
  >
    {{ props.sku ?? 'Без SKU' }}
  </button>
</template>
