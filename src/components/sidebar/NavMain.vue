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
  Store,
  ShoppingCart,
  Factory,
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

const salesItems = [
  { to: '/catalogs/sales-channels', label: 'Каналы продаж', icon: Store },
  { to: '/catalogs/cost-types', label: 'Типы расходов', icon: Tag },
  { to: '/catalogs/product-channel-costs', label: 'Расходы по каналам', icon: DollarSign },
]

const productionItems = [
  { to: '/catalogs/components', label: 'Компоненты', icon: PackageOpen },
  { to: '/catalogs/work-rates', label: 'Ставки работ', icon: Hammer },
  { to: '/catalogs/product-work-rates', label: 'Нормы выработки', icon: Gauge },
]

const referenceItems = [
  { to: '/catalogs/suppliers', label: 'Контрагенты', icon: Truck },
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

      <!-- Продажи -->
      <Collapsible
        as-child
        :default-open="true"
        class="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger as-child>
            <SidebarMenuButton :tooltip="'Продажи'">
              <ShoppingCart />
              <span>Продажи</span>
              <ChevronRight class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              <SidebarMenuSubItem
                v-for="item in salesItems"
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

      <!-- Производство -->
      <Collapsible
        as-child
        :default-open="true"
        class="group/collapsible"
      >
        <SidebarMenuItem>
          <CollapsibleTrigger as-child>
            <SidebarMenuButton :tooltip="'Производство'">
              <Factory />
              <span>Производство</span>
              <ChevronRight class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              <SidebarMenuSubItem
                v-for="item in productionItems"
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
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  </SidebarGroup>
</template>