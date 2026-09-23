<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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
import { channelsApi } from '@/services/api'
import type { AvailableChannel } from '@/types'
import { toast } from 'vue-sonner'

const props = defineProps<{
  modelValue: boolean
  templates: AvailableChannel[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  // channelId — id только что созданного Catalog.Channel, templateCode — код шаблона (null для кастомного канала)
  'created': [channelId: string, templateCode: string | null]
}>()

const CUSTOM_VALUE = '__custom__'

const selectedTemplateValue = ref<string>('')
const name = ref<string>('')
const customApiUrl = ref<string>('')
const isSubmitting = ref<boolean>(false)

const selectedTemplate = computed<AvailableChannel | null>(() =>
  props.templates.find(t => t.id === selectedTemplateValue.value) ?? null,
)

const isCustom = computed<boolean>(() => selectedTemplateValue.value === CUSTOM_VALUE)

// При выборе шаблона имя канала по умолчанию — его отображаемое название.
watch(selectedTemplateValue, (value) => {
  if (value === CUSTOM_VALUE) {
    name.value = ''
    return
  }
  const template = props.templates.find(t => t.id === value)
  name.value = template?.displayName ?? ''
})

const resetState = (): void => {
  selectedTemplateValue.value = props.templates[0]?.id ?? CUSTOM_VALUE
  name.value = props.templates[0]?.displayName ?? ''
  customApiUrl.value = ''
  isSubmitting.value = false
}

const handleOpenChange = (open: boolean): void => {
  emit('update:modelValue', open)
  if (open) {
    resetState()
  }
}

const handleSubmit = async (): Promise<void> => {
  if (name.value.trim().length === 0) {
    toast.error('Укажите название канала')
    return
  }

  isSubmitting.value = true

  try {
    const result = await channelsApi.create({
      name: name.value.trim(),
      systemChannelTemplateId: isCustom.value ? undefined : selectedTemplate.value?.id,
      customApiUrl: isCustom.value && customApiUrl.value.trim() ? customApiUrl.value.trim() : undefined,
    })

    toast.success('Канал продаж создан')
    emit('created', result.id, isCustom.value ? null : (selectedTemplate.value?.code ?? null))
    handleOpenChange(false)
  } catch {
    toast.error('Не удалось создать канал, попробуйте позже')
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
          Новый канал продаж
        </DialogTitle>
        <DialogDescription class="text-muted-foreground mt-2 mb-4 text-sm leading-normal">
          Канал — это самостоятельная сущность: расходы и аналитика по нему сохраняются
          независимо от того, подключён ли сейчас API маркетплейса.
        </DialogDescription>

        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="channel-template">Тип канала</Label>
              <select
                id="channel-template"
                v-model="selectedTemplateValue"
                :disabled="isSubmitting"
                class="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3"
              >
                <option v-for="t in props.templates" :key="t.id" :value="t.id">{{ t.displayName }}</option>
                <option :value="CUSTOM_VALUE">Другой / собственный канал</option>
              </select>
            </div>

            <div class="space-y-2">
              <Label for="channel-name">Название канала</Label>
              <Input
                id="channel-name"
                v-model="name"
                type="text"
                placeholder="Например, Мой магазин на Wildberries"
                :disabled="isSubmitting"
                required
              />
            </div>

            <div v-if="isCustom" class="space-y-2">
              <Label for="channel-api-url">
                URL API <span class="text-muted-foreground">(необязательно)</span>
              </Label>
              <Input
                id="channel-api-url"
                v-model="customApiUrl"
                type="text"
                placeholder="https://..."
                :disabled="isSubmitting"
              />
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <DialogClose as-child>
                <Button type="button" variant="outline" :disabled="isSubmitting">
                  Отмена
                </Button>
              </DialogClose>
              <Button type="submit" :disabled="isSubmitting">
                <Spinner v-if="isSubmitting" size="sm" class="mr-2" />
                {{ isSubmitting ? 'Создаём...' : 'Создать канал' }}
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
