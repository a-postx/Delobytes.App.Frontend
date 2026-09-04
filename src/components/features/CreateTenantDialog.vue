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
import { tenantApi } from '@/services/api'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { toast } from 'vue-sonner'

const { fetchCurrentUser } = useCurrentUser()

const isOpen = ref<boolean>(false)
const tenantName = ref<string>('')
const isCreating = ref<boolean>(false)

const handleSubmit = async (): Promise<void> => {
  const trimmedName: string = tenantName.value.trim()

  if (trimmedName.length === 0) {
    toast.error('Введите название пространства')
    return
  }

  isCreating.value = true

  try {
    await tenantApi.createTenantForUser(trimmedName)
    
    await fetchCurrentUser()
    
    toast.success('Пространство успешно создано')
    
    isOpen.value = false
    tenantName.value = ''
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } } }
    const message: string = apiError.response?.data?.message ?? 'Не удалось создать пространство'
    toast.error(message)
  } finally {
    isCreating.value = false
  }
}

const handleOpenChange = (open: boolean): void => {
  isOpen.value = open
  if (!open) {
    tenantName.value = ''
  }
}
</script>

<template>
  <DialogRoot :open="isOpen" @update:open="handleOpenChange">
    <DialogTrigger as-child>
      <slot name="trigger">
        <Button>Создать пространство</Button>
      </slot>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-black/80" />
      <DialogContent
        class="data-[state=open]:animate-contentShow bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]"
      >
        <DialogTitle class="text-foreground m-0 text-lg font-semibold">
          Создать новое пространство
        </DialogTitle>
        <DialogDescription class="text-muted-foreground mt-2 mb-4 text-sm leading-normal">
          Создайте новое рабочее пространство для организации или проекта. Вы автоматически станете администратором.
        </DialogDescription>
        
        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="new-tenant-name">Название пространства</Label>
              <Input
                id="new-tenant-name"
                v-model="tenantName"
                type="text"
                placeholder="Например: Моя компания"
                maxlength="200"
                :disabled="isCreating"
                required
              />
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
                :disabled="isCreating || !tenantName.trim()"
              >
                {{ isCreating ? 'Создание...' : 'Создать' }}
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
