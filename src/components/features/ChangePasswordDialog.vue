<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
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
import { authApi } from '@/services/api'
import { toast } from 'vue-sonner'

const router = useRouter()

const isOpen = ref<boolean>(false)
const currentPassword = ref<string>('')
const newPassword = ref<string>('')
const confirmPassword = ref<string>('')
const isSaving = ref<boolean>(false)

const resetForm = (): void => {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
}

/**
 * Смена пароля завершает текущую сессию: сервер больше не принимает старый токен,
 * поэтому локальные данные входа удаляются и пользователь уходит на страницу входа.
 */
const handleSubmit = async (): Promise<void> => {
  if (newPassword.value !== confirmPassword.value) {
    toast.error('Пароли не совпадают')
    return
  }

  isSaving.value = true

  try {
    await authApi.changePassword(currentPassword.value, newPassword.value)

    localStorage.removeItem('accessToken')
    localStorage.removeItem('userId')
    localStorage.removeItem('tenantId')

    toast.success('Пароль изменён. Войдите заново.')
    isOpen.value = false
    resetForm()

    await router.replace('/login')
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } } }
    const message: string = apiError.response?.data?.message ?? 'Не удалось изменить пароль'
    toast.error(message)
  } finally {
    isSaving.value = false
  }
}

const handleOpenChange = (open: boolean): void => {
  isOpen.value = open
  if (!open) {
    resetForm()
  }
}
</script>

<template>
  <DialogRoot
    :open="isOpen"
    @update:open="handleOpenChange"
  >
    <DialogTrigger as-child>
      <slot name="trigger">
        <Button>Сменить пароль</Button>
      </slot>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-black/80" />
      <DialogContent
        class="data-[state=open]:animate-contentShow bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]"
      >
        <DialogTitle class="text-foreground m-0 text-lg font-semibold">
          Сменить пароль
        </DialogTitle>
        <DialogDescription class="text-muted-foreground mt-2 mb-4 text-sm leading-normal">
          После смены пароля все текущие сессии завершатся, и потребуется войти заново.
        </DialogDescription>

        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="current-password">Текущий пароль</Label>
              <Input
                id="current-password"
                v-model="currentPassword"
                type="password"
                autocomplete="current-password"
                :disabled="isSaving"
                required
              />
            </div>

            <div class="space-y-2">
              <Label for="new-password">Новый пароль</Label>
              <Input
                id="new-password"
                v-model="newPassword"
                type="password"
                autocomplete="new-password"
                :disabled="isSaving"
                required
              />
            </div>

            <div class="space-y-2">
              <Label for="confirm-password">Повторите новый пароль</Label>
              <Input
                id="confirm-password"
                v-model="confirmPassword"
                type="password"
                autocomplete="new-password"
                :disabled="isSaving"
                required
              />
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <DialogClose as-child>
                <Button
                  type="button"
                  variant="outline"
                  :disabled="isSaving"
                >
                  Отмена
                </Button>
              </DialogClose>
              <Button
                type="submit"
                :disabled="isSaving || !currentPassword || !newPassword || !confirmPassword"
              >
                {{ isSaving ? 'Сохранение...' : 'Сохранить' }}
              </Button>
            </div>
          </div>
        </form>

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
