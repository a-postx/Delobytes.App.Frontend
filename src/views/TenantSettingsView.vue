<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { CopyButton } from '@/components/ui/copy-button'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { tenantApi } from '@/services/api'
import { toast } from 'vue-sonner'

const { currentUser, fetchCurrentUser } = useCurrentUser()

onMounted(async () => {
  if (!currentUser.value) {
    await fetchCurrentUser()
  }
})

const tenantId = computed(() => currentUser.value?.tenantId ?? '')

const localTenantName = ref<string>('')
const isUpdating = ref<boolean>(false)
const initialName = ref<string>('')

// Sync localTenantName with currentUser
const syncTenantName = (): void => {
  const name: string = currentUser.value?.tenantName ?? ''
  localTenantName.value = name
  initialName.value = name
}

onMounted(() => {
  syncTenantName()
})

// Watch currentUser to sync tenant name when it changes
watch(
  () => currentUser.value?.tenantName,
  (newName: string | undefined) => {
    if (newName !== undefined && newName !== localTenantName.value) {
      localTenantName.value = newName
      initialName.value = newName
    }
  },
  { immediate: true }
)

const handleBlur = async (): Promise<void> => {
  const trimmedName: string = localTenantName.value.trim()

  if (trimmedName === initialName.value) {
    return
  }

  if (trimmedName.length === 0) {
    localTenantName.value = initialName.value
    return
  }

  isUpdating.value = true

  try {
    await tenantApi.updateTenantName(trimmedName)
    initialName.value = trimmedName
    
    if (currentUser.value) {
      currentUser.value.tenantName = trimmedName
    }

    toast.success('Имя пространства успешно изменено')
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } } }
    const message: string = apiError.response?.data?.message ?? 'Не удалось изменить имя пространства'
    toast.error(message)
    localTenantName.value = initialName.value
  } finally {
    isUpdating.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <div class="flex flex-col gap-2">
      <h1 class="text-2xl font-bold">Настройки пространства</h1>
      <p class="text-muted-foreground">
        Дайте вашему пространству понятное имя, чтобы ваша команда могла удобно переключаться между ними.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Информация о пространстве</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label for="tenant-name">Имя</Label>
          <div class="relative">
            <Input
              id="tenant-name"
              v-model="localTenantName"
              placeholder="Имя пространства"
              @blur="handleBlur"
            />
            <div v-if="isUpdating" class="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner size="sm" />
            </div>
          </div>
        </div>
        <div class="space-y-2">
          <Label for="tenant-id">Идентификатор пространства</Label>
          <div class="relative">
            <Input
              id="tenant-id"
              :model-value="tenantId"
              placeholder="ID пространства"
              readonly
              class="pr-10 select-text cursor-text"
            />
            <div class="absolute right-1 top-1/2 -translate-y-1/2">
              <CopyButton tooltip-text="Копировать ID" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
