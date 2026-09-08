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
import { integrationsApi } from '@/services/api'

const props = defineProps<{
  channel: AvailableChannel
}>()

const emit = defineEmits<{
  connect: []
  deleted: []
}>()

const isDeleting = ref<boolean>(false)

const handleDelete = async (): Promise<void> => {
  if (!props.channel.connectionId) {
    return
  }

  isDeleting.value = true

  try {
    await integrationsApi.deleteConnection(props.channel.connectionId)
    toast.success('Подключение удалено')
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
        Подключён
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
          :disabled="isDeleting"
          @click="handleDelete"
        >
          <Trash2 />
          Удалить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </Card>
</template>
