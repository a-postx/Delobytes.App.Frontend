<script setup lang="ts">
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { integrationsApi } from '@/services/api'
import type { AvailableChannel } from '@/types'
import { toast } from 'vue-sonner'

const props = defineProps<{
  channel: AvailableChannel
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'deleted': []
}>()

const isDeleting = ref<boolean>(false)

const handleOpenChange = (open: boolean): void => {
  if (!isDeleting.value) {
    emit('update:modelValue', open)
  }
}

const handleDelete = async (): Promise<void> => {
  if (!props.channel.connectionId) {
    return
  }

  isDeleting.value = true

  try {
    await integrationsApi.deleteConnection(props.channel.connectionId)
    toast.success('Подключение удалено')
    emit('deleted')
    emit('update:modelValue', false)
  } catch {
    toast.error('Не удалось удалить подключение, попробуйте позже')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <DialogRoot :open="props.modelValue" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-black/80" />
      <DialogContent
        class="data-[state=open]:animate-contentShow bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]"
      >
        <DialogTitle class="text-foreground m-0 text-lg font-semibold">
          Управление {{ props.channel.displayName }}
        </DialogTitle>
        <DialogDescription class="text-muted-foreground mt-2 mb-4 text-sm leading-normal">
          Просмотр данных подключения и управление им.
        </DialogDescription>

        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="manage-api-key">API-ключ</Label>
            <Input
              id="manage-api-key"
              :model-value="props.channel.maskedApiKey ?? ''"
              type="text"
              readonly
              disabled
              class="font-mono"
            />
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <DialogClose as-child>
              <Button
                type="button"
                variant="outline"
                :disabled="isDeleting"
              >
                Закрыть
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              :disabled="isDeleting"
              @click="handleDelete"
            >
              <Spinner v-if="isDeleting" size="sm" class="mr-2" />
              {{ isDeleting ? 'Удаление...' : 'Удалить' }}
            </Button>
          </div>
        </div>

        <DialogClose
          class="text-muted-foreground hover:text-foreground hover:bg-secondary absolute top-4 right-4 inline-flex h-6 w-6 appearance-none items-center justify-center rounded-xs focus:ring-ring focus:ring-2 focus:outline-none transition-colors"
          aria-label="Закрыть"
          :disabled="isDeleting"
        >
          <X class="size-4" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
