<script setup lang="ts">
import { computed, ref } from 'vue'
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
import { channelParametersApi } from '@/services/api'
import { toast } from 'vue-sonner'

/**
 * Диалог создания новой версии параметров канала.
 */
const props = defineProps<{
  modelValue: boolean
  channelId: string
  channelName: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'created': []
}>()

const validFrom = ref<string>('')
const isSubmitting = ref<boolean>(false)

const todayIso = (): string => {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

const resetState = (): void => {
  validFrom.value = todayIso()
  isSubmitting.value = false
}

const handleOpenChange = (open: boolean): void => {
  emit('update:modelValue', open)
  if (open) {
    resetState()
  }
}

const isFormValid = computed<boolean>(() => {
  return validFrom.value.length > 0
})

const handleSubmit = async (): Promise<void> => {
  if (!isFormValid.value) {
    toast.error('Проверьте корректность введённых данных')
    return
  }

  isSubmitting.value = true

  try {
    await channelParametersApi.create(props.channelId, {
      validFrom: validFrom.value,
    })

    toast.success('Параметры канала сохранены')
    emit('created')
    handleOpenChange(false)
  } catch {
    toast.error('Не удалось сохранить параметры, попробуйте позже')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <DialogRoot :open="props.modelValue" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-black/80" />
      <DialogContent
        class="data-[state=open]:animate-contentShow bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-lg border p-6 shadow-lg focus:outline-none z-[100]"
      >
        <DialogTitle class="text-foreground m-0 text-lg font-semibold">
          Параметры канала
        </DialogTitle>
        <DialogDescription class="text-muted-foreground mt-2 mb-4 text-sm leading-normal">
          Новая версия параметров для «{{ props.channelName }}».
        </DialogDescription>

        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="parameter-valid-from">Действует с</Label>
              <Input
                id="parameter-valid-from"
                v-model="validFrom"
                type="date"
                :disabled="isSubmitting"
                required
              />
              <p class="text-xs text-muted-foreground">
                Укажите будущую дату, чтобы запланировать изменение параметров заранее.
              </p>
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <DialogClose as-child>
                <Button type="button" variant="outline" :disabled="isSubmitting">
                  Отмена
                </Button>
              </DialogClose>
              <Button type="submit" :disabled="isSubmitting || !isFormValid">
                <Spinner v-if="isSubmitting" size="sm" class="mr-2" />
                {{ isSubmitting ? 'Сохраняем...' : 'Сохранить параметры' }}
              </Button>
            </div>
          </div>
        </form>

        <DialogClose
          class="text-muted-foreground hover:text-foreground hover:bg-secondary absolute top-4 right-4 inline-flex h-6 w-6 appearance-none items-center justify-center rounded-xs transition-colors focus:ring-ring focus:ring-2 focus:outline-none"
          aria-label="Закрыть"
        >
          <X class="size-4" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
