<script setup lang="ts">
import ProductBomEditor from '@/components/products/ProductBomEditor.vue'

defineProps<{
  productId: string
}>()
</script>

<template>
  <ProductBomEditor :product-id="productId" />
</template>
