<script setup lang="ts">
import { mergeProps } from 'vue'
import type { TabsRootProps } from 'reka-ui'
import { TabsRoot } from 'reka-ui'

// reka-ui объявляет пропсы, но не emits, поэтому v-model-слушатель (onUpdate:modelValue)
// приходит в $attrs. Передаём в корень и пропсы, и атрибуты: иначе управляемая модель
// (model-value) и её обновления до корня не доходят — вкладки не переключаются.
const props = defineProps<TabsRootProps>()

defineOptions({ inheritAttrs: false })
</script>

<template>
  <TabsRoot v-bind="mergeProps(props, $attrs)">
    <slot />
  </TabsRoot>
</template>
