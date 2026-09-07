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
  'connected': []
}>()

const apiKey = ref<string>('')
const sellerId = ref<string>('')
const apiSecret = ref<string>('')
const apiKeyError = ref<string>('')
const isSubmitting = ref<boolean>(false)

const resetState = (): void => {
  apiKey.value = ''
  sellerId.value = ''
  apiSecret.value = ''
  apiKeyError.value = ''
  isSubmitting.value = false
}

const handleOpenChange = (open: boolean): void => {
  emit('update:modelValue', open)
  if (!open) {
    resetState()
  }
}

const handleSubmit = async (): Promise<void> => {
  apiKeyError.value = ''

  const trimmedApiKey = apiKey.value.trim()
  if (trimmedApiKey.length === 0 || trimmedApiKey.length < 10) {
    toast.error('API-ключ обязателен и должен содержать не менее 10 символов')
    return
  }

  if (props.channel.code === 'ozon' && sellerId.value.trim().length === 0) {
    toast.error('Поле Client ID обязательно для заполнения')
    return
  }

  isSubmitting.value = true

  try {
    const payload = {
      systemChannelTemplateCode: props.channel.code,
      apiKey: trimmedApiKey,
      ...(props.channel.code === 'ozon' && {
        apiSecret: apiSecret.value.trim() || undefined,
        settings: { sellerId: sellerId.value.trim() },
      }),
    }

    await integrationsApi.createConnection(payload)

    toast.success('Подключение создано')
    emit('connected')
    handleOpenChange(false)
  } catch (error: unknown) {
    const typedError = error as { message?: string; response?: { status?: number } }

    // 400 / 409 are thrown as { message } objects from the service layer
    if (typedError.message && !typedError.response) {
      apiKeyError.value = typedError.message
      return
    }

    const status = typedError.response?.status
    if (status === 404) {
      toast.error(typedError.message ?? 'Канал не найден')
    } else {
      toast.error('Сетевая ошибка, попробуйте позже')
    }
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
        class="data-[state=open]:animate-contentShow bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]"
      >
        <DialogTitle class="text-foreground m-0 text-lg font-semibold">
          Подключить {{ props.channel.displayName }}
        </DialogTitle>
        <DialogDescription class="text-muted-foreground mt-2 mb-4 text-sm leading-normal">
          Введите данные для подключения к каналу продаж.
        </DialogDescription>

        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <!-- Client ID (ozon only) -->
            <div v-if="props.channel.code === 'ozon'" class="space-y-2">
              <Label for="conn-seller-id">Client ID</Label>
              <Input
                id="conn-seller-id"
                v-model="sellerId"
                type="text"
                placeholder="12345678"
                :disabled="isSubmitting"
                required
              />
            </div>

            <!-- API Key -->
            <div class="space-y-2">
              <Label for="conn-api-key">API-ключ</Label>
              <Input
                id="conn-api-key"
                v-model="apiKey"
                type="password"
                placeholder="••••••••••••"
                minlength="10"
                :disabled="isSubmitting"
                required
              />
              <p v-if="apiKeyError" class="text-sm text-destructive mt-1">
                {{ apiKeyError }}
              </p>
            </div>

            <!-- API Secret (ozon only, optional) -->
            <div v-if="props.channel.code === 'ozon'" class="space-y-2">
              <Label for="conn-api-secret">API-секрет <span class="text-muted-foreground">(необязательно)</span></Label>
              <Input
                id="conn-api-secret"
                v-model="apiSecret"
                type="password"
                placeholder="••••••••••••"
                :disabled="isSubmitting"
              />
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <DialogClose as-child>
                <Button
                  type="button"
                  variant="outline"
                  :disabled="isSubmitting"
                >
                  Отмена
                </Button>
              </DialogClose>
              <Button
                type="submit"
                :disabled="isSubmitting"
              >
                <Spinner v-if="isSubmitting" size="sm" class="mr-2" />
                {{ isSubmitting ? 'Проверяем ключ...' : 'Подключить' }}
              </Button>
            </div>
          </div>
        </form>

        <DialogClose
          class="text-muted-foreground hover:text-foreground hover:bg-secondary absolute top-4 right-4 inline-flex h-6 w-6 appearance-none items-center justify-center rounded-xs focus:ring-ring focus:ring-2 focus:outline-none transition-colors"
          aria-label="Закрыть"
        >
          <X class="size-4" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
