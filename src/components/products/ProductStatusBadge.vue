<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { ProductStatus } from '@/types/products'

const props = defineProps<{
  status: ProductStatus
}>()

const config = computed(() => {
  const configs: Record<ProductStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' }> = {
    [ProductStatus.Active]: { label: 'Активен', variant: 'success' },
    [ProductStatus.Archived]: { label: 'Архив', variant: 'secondary' },
    [ProductStatus.DeletionPending]: { label: 'Удаление...', variant: 'warning' },
    [ProductStatus.Deleted]: { label: 'Удалён', variant: 'destructive' },
    [ProductStatus.DeletionFailed]: { label: 'Ошибка удаления', variant: 'destructive' },
  }
  return configs[props.status]
})
</script>

<template>
  <Badge :variant="config.variant">
    {{ config.label }}
  </Badge>
</template>
