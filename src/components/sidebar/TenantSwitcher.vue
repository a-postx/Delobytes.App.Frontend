<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Component } from 'vue'
import { ChevronsUpDown } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

const props = defineProps<{
  tenants: {
    name: string
    logo: Component
  }[]
}>()

watch(
  () => props.tenants[0],
  (tenant) => {
    if (tenant) {
      activeTenant.value = tenant
    }
  }
)

const { isMobile } = useSidebar()
const activeTenant = ref(props.tenants[0]!)
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <component :is="activeTenant.logo" class="size-4" />
            </div>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-medium">
                {{ activeTenant.name }}
              </span>
            </div>
            <ChevronsUpDown class="ml-auto" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-[var(--reka-dropdown-menu-trigger-width)] min-w-56 rounded-lg"
          align="start"
          :side="isMobile ? 'bottom' : 'right'"
          :side-offset="4"
        >
          <DropdownMenuLabel class="text-xs text-muted-foreground">
            Пространства
          </DropdownMenuLabel>
          <DropdownMenuItem
            v-for="(tenant) in tenants"
            :key="tenant.name"
            class="gap-2 p-2"
            @click="activeTenant = tenant"
          >
            <div class="flex size-6 items-center justify-center rounded-sm border">
              <component :is="tenant.logo" class="size-3.5 shrink-0" />
            </div>
            {{ tenant.name }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
