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
import InviteUserDialog from '@/components/features/InviteUserDialog.vue'
import TenantMembersTable from '@/components/features/TenantMembersTable.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { usePermissions } from '@/composables/usePermissions'
import { tenantApi } from '@/services/api'
import { toast } from 'vue-sonner'

const { currentUser, fetchCurrentUser } = useCurrentUser()
const {
  canEditTenantSettings,
  canManageMembers,
  canCreateTenant,
} = usePermissions()

const membersTableRef = ref<InstanceType<typeof TenantMembersTable> | null>(null)

onMounted(async () => {
  if (!currentUser.value) {
    await fetchCurrentUser()
  }
})

const tenantId = computed(() => currentUser.value?.tenantId ?? '')

const localTenantName = ref<string>('')
const isUpdating = ref<boolean>(false)
const initialName = ref<string>('')

watch(
  () => currentUser.value,
  (user: any) => {
    if (user?.tenantName) {
      localTenantName.value = user.tenantName
      initialName.value = user.tenantName
    }
  },
  { immediate: true }
)

const handleBlur = async (): Promise<void> => {
  if (!canEditTenantSettings.value) {
    return
  }

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

const handleInvitationCreated = (): void => {
  membersTableRef.value?.refresh()
}

const handleMembersRefresh = (): void => {
  membersTableRef.value?.refresh()
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
        <CardTitle class="text-lg">Главное</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label for="tenant-name">Имя</Label>
          <div class="relative">
            <Input
              id="tenant-name"
              v-model="localTenantName"
              placeholder="Имя пространства"
              :disabled="!canEditTenantSettings"
              :readonly="!canEditTenantSettings"
              :class="{ 'cursor-not-allowed opacity-60': !canEditTenantSettings }"
              @blur="handleBlur"
            />
            <div v-if="isUpdating" class="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner size="sm" />
            </div>
          </div>
          <p v-if="!canEditTenantSettings" class="text-xs text-muted-foreground">
            Только администраторы могут изменять имя пространства
          </p>
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

    <Card v-if="canManageMembers">
      <CardHeader>
        <CardTitle class="text-lg">Доступы</CardTitle>
        <CardDescription>
          Управляйте пользователями и их ролями в этом пространстве
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex justify-end">
          <InviteUserDialog @invitation-created="handleInvitationCreated">
            <template #trigger>
              <button class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                Пригласить пользователя
              </button>
            </template>
          </InviteUserDialog>
        </div>
        <TenantMembersTable ref="membersTableRef" @refresh="handleMembersRefresh" />
      </CardContent>
    </Card>

    <Card v-if="canCreateTenant">
      <CardHeader>
        <CardTitle class="text-lg">Новое</CardTitle>
        <CardDescription>
          Вы можете создать дополнительное рабочее пространство.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CreateTenantDialog />
      </CardContent>
    </Card>
  </div>
</template>
