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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { CopyButton } from '@/components/ui/copy-button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { tenantApi } from '@/services/api'
import { toast } from 'vue-sonner'

const emit = defineEmits<{
  invitationCreated: []
}>()

const isOpen = ref<boolean>(false)
const email = ref<string>('')
const role = ref<string>('ReadOnly')
const isCreating = ref<boolean>(false)
const invitationToken = ref<string>('')
const invitationLink = ref<string>('')
const step = ref<'form' | 'success'>('form')

const handleSubmit = async (): Promise<void> => {
  const trimmedEmail: string = email.value.trim()

  if (trimmedEmail.length === 0) {
    toast.error('Введите email адрес')
    return
  }

  if (!role.value) {
    toast.error('Выберите роль')
    return
  }

  isCreating.value = true

  try {
    const response = await tenantApi.createInvitation(trimmedEmail, role.value)
    
    invitationToken.value = response.token
    invitationLink.value = `${window.location.origin}/invite/${response.token}`
    step.value = 'success'
    
    emit('invitationCreated')
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } } }
    const message: string = apiError.response?.data?.message ?? 'Не удалось создать приглашение'
    toast.error(message)
  } finally {
    isCreating.value = false
  }
}

const handleCopyAndClose = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(invitationLink.value)
    toast.success('Ссылка скопирована в буфер обмена')
    isOpen.value = false
  } catch (err) {
    toast.error('Не удалось скопировать ссылку')
  }
}

const handleOpenChange = (open: boolean): void => {
  isOpen.value = open
  if (!open) {
    email.value = ''
    role.value = 'ReadOnly'
    step.value = 'form'
    invitationToken.value = ''
    invitationLink.value = ''
    isCreating.value = false
  }
}
</script>

<template>
  <DialogRoot :open="isOpen" @update:open="handleOpenChange">
    <DialogTrigger as-child>
      <slot name="trigger">
        <Button>Пригласить пользователя</Button>
      </slot>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-black/80" />
      <DialogContent
        class="data-[state=open]:animate-contentShow bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]"
      >
        <DialogTitle class="text-foreground m-0 text-lg font-semibold">
          {{ step === 'form' ? 'Пригласить пользователя' : 'Приглашение создано' }}
        </DialogTitle>
        <DialogDescription v-if="step === 'form'" class="text-muted-foreground mt-2 mb-4 text-sm leading-normal">
          Укажите email пользователя и роль, которая будет ему назначена в этом пространстве.
        </DialogDescription>
        <DialogDescription v-else class="text-muted-foreground mt-2 mb-4 text-sm leading-normal">
          Отправьте эту ссылку пользователю. Она действительна в течение 7 дней.
        </DialogDescription>
        
        <form v-if="step === 'form'" @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="invite-email">Email</Label>
              <div class="relative">
                <Input
                  id="invite-email"
                  v-model="email"
                  type="email"
                  placeholder="user@example.com"
                  maxlength="256"
                  :disabled="isCreating"
                  required
                />
                <div v-if="isCreating" class="absolute right-3 top-1/2 -translate-y-1/2">
                  <Spinner size="sm" />
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <Label>Роль</Label>
              <RadioGroup v-model="role" :disabled="isCreating">
                <div class="flex items-center space-x-2">
                  <RadioGroupItem value="Administrator" id="role-admin" />
                  <Label for="role-admin" class="font-normal cursor-pointer">
                    Администратор
                  </Label>
                </div>
                <div class="flex items-center space-x-2">
                  <RadioGroupItem value="Manager" id="role-manager" />
                  <Label for="role-manager" class="font-normal cursor-pointer">
                    Менеджер
                  </Label>
                </div>
                <div class="flex items-center space-x-2">
                  <RadioGroupItem value="ReadOnly" id="role-readonly" />
                  <Label for="role-readonly" class="font-normal cursor-pointer">
                    Только чтение
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <DialogClose as-child>
                <Button
                  type="button"
                  variant="outline"
                  :disabled="isCreating"
                >
                  Отмена
                </Button>
              </DialogClose>
              <Button
                type="submit"
                :disabled="isCreating || !email.trim() || !role"
              >
                {{ isCreating ? 'Создание...' : 'Создать приглашение' }}
              </Button>
            </div>
          </div>
        </form>

        <div v-else class="space-y-4">
          <div class="space-y-2">
            <Label for="invitation-link">Ссылка-приглашение</Label>
            <div class="relative">
              <Input
                id="invitation-link"
                :model-value="invitationLink"
                readonly
                class="pr-10 select-text cursor-text font-mono text-sm"
              />
              <div class="absolute right-1 top-1/2 -translate-y-1/2">
                <CopyButton :value="invitationLink" tooltip-text="Копировать ссылку" />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              @click="handleCopyAndClose"
            >
              Скопировать ссылку
            </Button>
          </div>
        </div>

        <DialogClose
          class="text-muted-foreground hover:text-foreground hover:bg-secondary absolute top-4 right-4 inline-flex h-6 w-6 appearance-none items-center justify-center rounded-xs focus:ring-ring focus:ring-2 focus:outline-none transition-colors"
          aria-label="Close"
        >
          <X class="size-4" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
