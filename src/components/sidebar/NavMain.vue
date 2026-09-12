<script setup lang="ts">
import { ChevronRight, BookOpen, Settings, PackageOpen, Grid3x3, Hammer, FlaskConical, Layers, Truck, Gauge } from 'lucide-vue-next'
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

const catalogItems = [
  { to: '/catalogs/suppliers', label: 'Контрагенты', icon: Truck },
  { to: '/catalogs/packaging-components', label: 'Компоненты упаковки', icon: PackageOpen },
  { to: '/catalogs/work-rates', label: 'Ставки работ', icon: Hammer },
  { to: '/catalogs/tariff-grids', label: 'Тарифные сетки', icon: Grid3x3 },
  { to: '/catalogs/product-work-rates', label: 'Нормы выработки', icon: Gauge },
  { to: '/catalogs/raw-material-rates', label: 'Стоимость сырья', icon: FlaskConical },
]
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>Платформа</SidebarGroupLabel>
    <SidebarMenu>
      <!-- Products -->
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
                  <RouterLink to="/">
                    <span>Список товаров</span>
                  </RouterLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>

      <!-- Catalogs -->
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
              <SidebarMenuSubItem v-for="item in catalogItems" :key="item.to">
                <SidebarMenuSubButton as-child>
                  <RouterLink :to="item.to" class="flex items-center gap-2">
                    <component :is="item.icon" class="size-3.5 shrink-0" />
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
              <SidebarMenuSubItem>
                <SidebarMenuSubButton as-child>
                  <RouterLink to="/tenant-settings">
                    <span>Настройки пространства</span>
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
