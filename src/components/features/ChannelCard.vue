<script setup lang="ts">
import { ref } from 'vue'
import { Ellipsis, Settings2, Trash2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
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
import { integrationsApi, channelsApi } from '@/services/api'
import type { Connection } from '@/types'
import EditableChannelTitle from './EditableChannelTitle.vue'
import ChannelDetailsSheet from './ChannelDetailsSheet.vue'

/**
 * Channel — самостоятельная бизнес-сущность (Catalog), Connection — техническое
 * подключение (Integrations), которое может отсутствовать/быть неактивным.
 * Карточка отображает канал ВСЕГДА, независимо от состояния подключения.
 */
export interface ChannelCardModel {
  id: string
  name: string
  templateDisplayName: string | null
  isCustom: boolean
  isActive: boolean
  connection: Connection | null
}

const props = defineProps<{
  channel: ChannelCardModel
}>()

const emit = defineEmits<{
  connect: []
  deleted: []
  renamed: []
}>()

const isDeleting = ref<boolean>(false)
const isDeleteDialogOpen = ref<boolean>(false)
const isRenaming = ref<boolean>(false)
const isDetailsSheetOpen = ref<boolean>(false)

const hasAccountInfo = (connection: Connection): boolean => {
  return !!(connection.customerName || connection.customerLegalName || connection.customerInn)
}

const handleDelete = async (): Promise<void> => {
  if (!props.channel.connection) {
    return
  }

  isDeleting.value = true

  try {
    await integrationsApi.deleteConnection(props.channel.connection.id)
    toast.success('Подключение удалено. Канал и накопленные данные остаются доступны.')
    isDeleteDialogOpen.value = false
    emit('deleted')
  } catch {
    toast.error('Не удалось удалить подключение, попробуйте позже')
  } finally {
    isDeleting.value = false
  }
}

const handleRename = async (newName: string): Promise<void> => {
  isRenaming.value = true

  try {
    await channelsApi.rename(props.channel.id, newName)
    toast.success('Название канала обновлено')
    emit('renamed')
  } catch {
    toast.error('Не удалось переименовать канал, попробуйте позже')
  } finally {
    isRenaming.value = false
  }
}
</script>

<template>
  <Card class="flex flex-col" :class="!props.channel.connection?.isActive ? '' : 'bg-muted/40'">
    <CardHeader class="relative">
      <EditableChannelTitle
        :title="props.channel.name"
        :disabled="isRenaming"
        @save="handleRename"
      />
      <CardDescription>
        {{ props.channel.templateDisplayName ?? 'Собственный канал' }}
      </CardDescription>
      <Badge
        v-if="props.channel.connection?.isActive"
        variant="success"
        class="absolute top-3 right-3"
      >
        Подключено
      </Badge>
      <Badge
        v-else
        variant="secondary"
        class="absolute top-3 right-3"
      >
        Не подключено
      </Badge>
    </CardHeader>
    <CardContent>
      <span v-if="!props.channel.isActive" class="text-xs text-warning">Канал архивирован</span>
    </CardContent>

    <!-- Подключённое состояние: информация об аккаунте слева, меню действий справа -->
    <CardFooter v-if="props.channel.connection?.isActive" class="mt-auto flex items-end justify-between">
      <div
        v-if="hasAccountInfo(props.channel.connection)"
        class="flex flex-col gap-0.5"
      >
        <span
          v-if="props.channel.connection.customerName"
          class="text-xs font-medium text-foreground leading-tight"
        >{{ props.channel.connection.customerName }}</span>
        <span
          v-if="props.channel.connection.customerLegalName"
          class="text-xs text-muted-foreground leading-tight"
        >{{ props.channel.connection.customerLegalName }}</span>
        <span
          v-if="props.channel.connection.customerInn"
          class="text-xs text-muted-foreground leading-tight"
        >ИНН: {{ props.channel.connection.customerInn }}</span>
      </div>
      <div v-else />

      <div class="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Параметры канала"
          @click="isDetailsSheetOpen = true"
        >
          <Settings2 />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button
              variant="ghost"
              size="icon-sm"
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
              Удалить подключение
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </CardFooter>

    <!-- Нет активного подключения: канал существует, но данные не собираются автоматически -->
    <CardFooter v-else class="flex items-center justify-between gap-2">
      <span v-if="props.channel.connection && !props.channel.connection.isActive" class="text-xs text-muted-foreground">
        Подключение отключено — старые данные сохранены
      </span>
      <span v-else />

      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          @click="isDetailsSheetOpen = true"
        >
          <Settings2 class="size-4 mr-1" />
          Параметры
        </Button>
        <Button @click="emit('connect')">
          Подключить
        </Button>
      </div>
    </CardFooter>
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
          Подключение к API будет остановлено. Канал «{{ props.channel.name }}» и все собранные
          по нему данные останутся доступны.
        </AlertDialogDescription>
        <div class="flex justify-end gap-3">
          <AlertDialogCancel as-child>
            <Button variant="outline" :disabled="isDeleting">
              Отмена
            </Button>
          </AlertDialogCancel>
          <Button
            variant="destructive"
            :disabled="isDeleting"
            @click="handleDelete"
          >
            <Spinner v-if="isDeleting" size="sm" class="mr-2" />
            {{ isDeleting ? 'Удаляем...' : 'Да' }}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>

  <!-- Панель параметров канала: комиссия, эквайринг, СПП и история версий -->
  <ChannelDetailsSheet
    v-model="isDetailsSheetOpen"
    :channel="props.channel"
  />
</template>
