<script setup lang="ts">
import type { TabsRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { TabsRoot, TabsList, TabsIndicator, TabsTrigger, TabsContent } from 'reka-ui'
import { cn } from '@/lib/utils'

interface TabItem {
  value: string | number
  label: string
  content: string
}

interface Props extends TabsRootProps {
  items?: TabItem[]
  listClass?: HTMLAttributes['class']
  contentClass?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
})
</script>

<template>
  <TabsRoot v-bind="props">
    <TabsList
      :class="cn(
        'inline-flex items-center justify-center gap-0 rounded-lg border border-border bg-muted p-1 text-muted-foreground dark:bg-muted/50 dark:border-border',
        props.listClass,
      )"
    >
      <TabsIndicator class="bg-primary rounded-md transition-all" />
      <slot name="triggers">
        <TabsTrigger
          v-for="item in items"
          :key="item.value"
          :value="item.value"
          class="inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:text-foreground dark:hover:text-foreground"
        >
          {{ item.label }}
        </TabsTrigger>
      </slot>
    </TabsList>

    <slot name="contents">
      <TabsContent
        v-for="item in items"
        :key="item.value"
        :value="item.value"
        :class="cn(
          'mt-3 rounded-lg border border-border bg-background p-4 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 animate-in fade-in-50 data-[state=inactive]:animate-out data-[state=inactive]:fade-out-50',
          props.contentClass,
        )"
      >
        {{ item.content }}
      </TabsContent>
    </slot>
  </TabsRoot>
</template>
