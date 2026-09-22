<script setup lang="ts">
import {
  ChevronRight,
  BookOpen,
  Settings,
  Layers,
  LayoutDashboard,
  PackageOpen,
  Hammer,
  Truck,
  Gauge,
  Tag,
  DollarSign,
} from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'

const referenceItems = [
  { to: '/catalogs/suppliers', label: 'Контрагенты', icon: Truck },
  { to: '/catalogs/components', label: 'Компоненты', icon: PackageOpen },
  { to: '/catalogs/work-rates', label: 'Ставки работ', icon: Hammer },
  { to: '/catalogs/product-work-rates', label: 'Нормы выработки', icon: Gauge },
  { to: '/catalogs/cost-types', label: 'Типы расходов', icon: Tag },
  { to: '/catalogs/product-channel-costs', label: 'Расходы по каналам', icon: DollarSign },
]
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>Панели</SidebarGroupLabel>
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          as-child
          tooltip="Главная"
        >
          <RouterLink to="/">
            <LayoutDashboard />
            <span>Главная</span>
          </RouterLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>

  <SidebarGroup>
    <SidebarGroupLabel>Платформа</SidebarGroupLabel>
    <SidebarMenu>
      <!-- Товары -->
      <Collapsible
        as-child
        :default-open="true"
        class="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger as-child>
            <SidebarMenuButton :tooltip="'Товары'">
              <Layers />
              <span>Товары</span>
              <ChevronRight class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton as-child>
                  <RouterLink to="/catalogs/products">
                    <span>Каталог</span>
                  </RouterLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>

      <!-- Справочники -->
      <Collapsible
        as-child
        :default-open="true"
        class="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger as-child>
            <SidebarMenuButton :tooltip="'Справочники'">
              <BookOpen />
              <span>Справочники</span>
              <ChevronRight class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              <SidebarMenuSubItem
                v-for="item in referenceItems"
                :key="item.to"
              >
                <SidebarMenuSubButton as-child>
                  <RouterLink
                    :to="item.to"
                    class="flex items-center gap-2"
                  >
                    <component
                      :is="item.icon"
                      class="size-3.5 shrink-0"
                    />
                    <span>{{ item.label }}</span>
                  </RouterLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  </SidebarGroup>

  <SidebarGroup>
    <SidebarGroupLabel>Система</SidebarGroupLabel>
    <SidebarMenu>
      <Collapsible
        as-child
        :default-open="false"
        class="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger as-child>
            <SidebarMenuButton :tooltip="'Настройки'">
              <Settings />
              <span>Настройки</span>
              <ChevronRight class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              <SidebarMenuSubItem>
                <SidebarMenuSubButton as-child>
                  <RouterLink to="/integrations">
                    <span>Интеграции</span>
                  </RouterLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  </SidebarGroup>
</template>