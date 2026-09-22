<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { resolveNavGroupLabel } from '@/router/navGroups'

const route = useRoute()

/**
 * Хлебные крошки = раздел меню + название страницы. Страницы, которых нет
 * в меню, показывают только своё название, а не выдуманный раздел.
 */
const sectionLabel = computed<string | null>(() => resolveNavGroupLabel(route))

const pageLabel = computed<string>(() => (route.meta.title as string) ?? '')
</script>

<template>
  <header class="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
    <div class="flex items-center gap-2 px-4">
      <SidebarTrigger class="-ml-1" />
      <Separator
        orientation="vertical"
        class="mr-2 h-4"
      />
      <Breadcrumb>
        <BreadcrumbList>
          <template v-if="sectionLabel">
            <BreadcrumbItem class="hidden md:block">
              <BreadcrumbPage
                data-crumb="section"
                class="text-muted-foreground"
              >
                {{ sectionLabel }}
              </BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator class="hidden md:block" />
          </template>
          <BreadcrumbItem>
            <BreadcrumbPage data-crumb="page">
              {{ pageLabel }}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  </header>
</template>