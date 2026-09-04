<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { CopyButton } from '@/components/ui/copy-button'
import CreateTenantDialog from '@/components/features/CreateTenantDialog.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { tenantApi } from '@/services/api'
import { toast } from 'vue-sonner'

const { currentUser, fetchCurrentUser } = useCurrentUser()

onMounted(async () => {
  if (!currentUser.value) {
    await fetchCurrentUser()
  }
  
  // Отладка: выводим всю информацию о текущем пользователе
  console.log('TenantSettingsView - currentUser:', currentUser.value)
  console.log('TenantSettingsView - role:', currentUser.value?.role)
  console.log('TenantSettingsView - role type:', typeof currentUser.value?.role)
})

const tenantId = computed(() => currentUser.value?.tenantId ?? '')

const isAdministrator = computed(() => {
  const result = currentUser.value?.role === 'Administrator'
  console.log('TenantSettingsView - isAdministrator computed:', result)
  console.log('TenantSettingsView - comparing:', currentUser.value?.role, 'with', 'Administrator')
  return result
})

const localTenantName = ref<string>('')
const isUpdating = ref<boolean>(false)
const initialName = ref<string>('')

watch(
  () => currentUser.value,
  (user: any) => {
    console.log('TenantSettingsView - user changed:', user)
    if (user?.tenantName) {
      localTenantName.value = user.tenantName
      initialName.value = user.tenantName
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

    <!-- Debug info -->
    <Card class="border-yellow-500">
      <CardHeader>
        <CardTitle class="text-lg text-yellow-600">Отладочная информация</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2 text-sm font-mono">
        <div>currentUser: {{ currentUser ? 'loaded' : 'null' }}</div>
        <div>role: {{ currentUser?.role }}</div>
        <div>role type: {{ typeof currentUser?.role }}</div>
        <div>isAdministrator: {{ isAdministrator }}</div>
        <div>Full user object: {{ JSON.stringify(currentUser, null, 2) }}</div>
      </CardContent>
    </Card>

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
              <CopyButton :value="tenantId" tooltip-text="Копировать ID" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card v-if="isAdministrator">
      <CardHeader>
        <CardTitle class="text-lg">Создание нового пространства</CardTitle>
        <CardDescription>
          Как администратор текущего пространства, вы можете создать новое рабочее пространство. 
          Вы автоматически станете администратором нового пространства.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CreateTenantDialog />
      </CardContent>
    </Card>

    <Card v-else class="border-red-500">
      <CardHeader>
        <CardTitle class="text-lg text-red-600">Карточка создания скрыта</CardTitle>
      </CardHeader>
      <CardContent>
        <p>isAdministrator = {{ isAdministrator }}</p>
        <p>role = {{ currentUser?.role }}</p>
      </CardContent>
    </Card>
  </div>
</template>
