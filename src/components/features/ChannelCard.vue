<script setup lang="ts">
import { ref } from 'vue'
import { Ellipsis, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import type { AvailableChannel } from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogTitle,
  AlertDialogPortal,
  AlertDialogRoot,
} from '@/components/ui/alert-dialog'
import { integrationsApi } from '@/services/api'

const props = defineProps<{
  channel: AvailableChannel
}>()

const emit = defineEmits<{
  connect: []
  deleted: []
}>()

const isDeleting = ref<boolean>(false)
const isDeleteDialogOpen = ref<boolean>(false)

const hasAccountInfo = (channel: AvailableChannel): boolean => {
  return !!(channel.customerName || channel.legalName || channel.inn)
}

const handleDelete = async (): Promise<void> => {
  if (!props.channel.connectionId) {
    return
  }

  isDeleting.value = true

  try {
    await integrationsApi.deleteConnection(props.channel.connectionId)
    toast.success('Подключение удалено')
    isDeleteDialogOpen.value = false
    emit('deleted')
  } catch {
    toast.error('Не удалось удалить подключение, попробуйте позже')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <Card class="relative" :class="props.channel.isConnected ? 'opacity-75 bg-muted' : ''">
    <CardHeader class="relative">
      <CardTitle class="text-xl">{{ props.channel.displayName }}</CardTitle>
      <CardDescription>{{ props.channel.description ?? '' }}</CardDescription>
      <Badge
        v-if="props.channel.isConnected"
        variant="success"
        class="absolute top-3 right-3"
      >
        Активно
      </Badge>
    </CardHeader>
    <CardContent>
      <span class="text-xs text-muted-foreground">API {{ props.channel.apiVersion }}</span>
    </CardContent>
    <CardFooter v-if="!props.channel.isConnected">
      <Button @click="emit('connect')">
        Подключить
      </Button>
    </CardFooter>

    <!-- Информация о кабинете (левый нижний угол) для подключённых каналов -->
    <div
      v-if="props.channel.isConnected && hasAccountInfo(props.channel)"
      class="absolute bottom-3 left-4 flex flex-col gap-0.5"
    >
      <span
        v-if="props.channel.customerName"
        class="text-xs font-medium text-foreground leading-tight"
      >{{ props.channel.customerName }}</span>
      <span
        v-if="props.channel.legalName"
        class="text-xs text-muted-foreground leading-tight"
      >{{ props.channel.legalName }}</span>
      <span
        v-if="props.channel.inn"
        class="text-xs text-muted-foreground leading-tight"
      >ИНН: {{ props.channel.inn }}</span>
    </div>

    <!-- Dropdown в правом нижнем углу карточки для подключённых каналов -->
    <DropdownMenu v-if="props.channel.isConnected">
      <DropdownMenuTrigger as-child>
        <Button
          variant="ghost"
          size="icon-sm"
          class="absolute bottom-3 right-3"
          :disabled="isDeleting"
          aria-label="Действия с подключением"
        >
          <Spinner v-if="isDeleting" size="sm" />
          <Ellipsis v-else />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          @click="isDeleteDialogOpen = true"
        >
          <Trash2 />
          Удалить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </Card>

  <!-- Диалог подтверждения удаления -->
  <AlertDialogRoot :open="isDeleteDialogOpen" @update:open="isDeleteDialogOpen = $event">
    <AlertDialogPortal>
      <AlertDialogOverlay class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-black/80" />
      <AlertDialogContent>
        <AlertDialogTitle class="text-foreground text-lg font-semibold">
          Удалить подключение
        </AlertDialogTitle>
        <AlertDialogDescription class="text-muted-foreground mt-2 mb-6 text-sm leading-normal">
          Вы уверены, что хотите удалить это подключение?
        </AlertDialogDescription>

        <div class="flex justify-end gap-3">
          <AlertDialogCancel :disabled="isDeleting">
            Отмена
          </AlertDialogCancel>
          <!-- Используем Button напрямую, чтобы диалог закрывался только при успешном удалении -->
          <Button
            variant="destructive"
            :disabled="isDeleting"
            @click="handleDelete"
          >
            <span>Да</span>
            <Spinner v-if="isDeleting" size="sm" class="ml-2" />
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
