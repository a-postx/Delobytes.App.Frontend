<script setup lang=\"ts\">
import { useRouter } from 'vue-router'
import { BadgeCheck, ChevronsUpDown, LogOut } from 'lucide-vue-next'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

const router = useRouter()

defineProps<{
  user: {
    name: string
    email: string
    avatar: string
  }
}>()

const emit = defineEmits<{
  logout: []
  tenantSettings: []
  userSettings: []
}>()

const { isMobile } = useSidebar()
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size=\"lg\"
            class=\"data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground\"
          >
            <Avatar class=\"h-8 w-8 rounded-lg\">
              <AvatarImage :src=\"user.avatar\" :alt=\"user.name\" />
              <AvatarFallback class=\"rounded-lg\">
                {{ user.name.substring(0, 2).toUpperCase() }}
              </AvatarFallback>
            </Avatar>
            <div class=\"grid flex-1 text-left text-sm leading-tight\">
              <span class=\"truncate font-medium\">{{ user.email }}</span>
              <span class=\"truncate text-xs text-primary underline\">\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438</span>
            </div>
            <ChevronsUpDown class=\"ml-auto size-4\" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class=\"w-[var(--reka-dropdown-menu-trigger-width)] min-w-56 rounded-lg\"
          :side=\"isMobile ? 'bottom' : 'right'\"
          align=\"end\"
          :side-offset=\"4\"
        >
          <DropdownMenuLabel class=\"p-0 font-normal\">
            <div class=\"flex items-center gap-2 px-1 py-1.5 text-left text-sm cursor-pointer hover:bg-accent rounded\" @click=\"emit('userSettings')\">
              <Avatar class=\"h-8 w-8 rounded-lg\">
                <AvatarImage :src=\"user.avatar\" :alt=\"user.name\" />
                <AvatarFallback class=\"rounded-lg\">
                  {{ user.name.substring(0, 2).toUpperCase() }}
                </AvatarFallback>
              </Avatar>
              <div class=\"grid flex-1 text-left text-sm leading-tight\">
                <span class=\"truncate font-semibold\">{{ user.email }}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem @click=\"emit('tenantSettings')\">
              <BadgeCheck />
              \u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u043f\u0440\u043e\u0441\u0442\u0440\u0430\u043d\u0441\u0442\u0432\u0430
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click=\"emit('logout')\">
            <LogOut />
            \u0412\u044b\u0445\u043e\u0434 \u0438\u0437 \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u044f
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
