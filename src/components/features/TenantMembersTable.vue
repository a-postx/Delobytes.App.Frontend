<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { EllipsisVertical } from 'lucide-vue-next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { tenantApi, type TenantMemberInfo, type PendingInvitationInfo } from '@/services/api/endpoints/tenant'
import { toast } from 'vue-sonner'

const emit = defineEmits<{
  refresh: []
}>()

const members = ref<TenantMemberInfo[]>([])
const pendingInvitations = ref<PendingInvitationInfo[]>([])
const isLoading = ref<boolean>(false)

const changeRoleDialog = ref<boolean>(false)
const selectedMember = ref<TenantMemberInfo | null>(null)
const newRole = ref<string>('')
const isUpdatingRole = ref<boolean>(false)

const removeDialog = ref<boolean>(false)
const memberToRemove = ref<TenantMemberInfo | null>(null)
const isRemoving = ref<boolean>(false)

const revokeDialog = ref<boolean>(false)
const invitationToRevoke = ref<PendingInvitationInfo | null>(null)
const isRevoking = ref<boolean>(false)

const allRows = computed(() => {
  const memberRows = members.value.map(m => ({
    type: 'member' as const,
    email: m.email,
    displayName: m.displayName,
    role: m.role,
    data: m,
  }))
  
  const invitationRows = pendingInvitations.value.map(i => ({
    type: 'invitation' as const,
    email: i.email,
    displayName: undefined,
    role: i.role,
    data: i,
  }))
  
  return [...memberRows, ...invitationRows]
})

const loadMembers = async (): Promise<void> => {
  isLoading.value = true
  
  try {
    const response = await tenantApi.getTenantMembers()
    members.value = response.members
    pendingInvitations.value = response.pendingInvitations
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } } }
    const message: string = apiError.response?.data?.message ?? 'Не удалось загрузить список пользователей'
    toast.error(message)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadMembers()
})

defineExpose({
  refresh: loadMembers,
})

const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'Administrator':
      return 'Администратор'
    case 'Manager':
      return 'Менеджер'
    case 'ReadOnly':
      return 'Только чтение'
    default:
      return role
  }
}

const openChangeRoleDialog = (member: TenantMemberInfo): void => {
  selectedMember.value = member
  newRole.value = member.role
  changeRoleDialog.value = true
}

const handleChangeRole = async (): Promise<void> => {
  if (!selectedMember.value || !newRole.value) {
    return
  }
  
  isUpdatingRole.value = true
  
  try {
    await tenantApi.updateMemberRole(selectedMember.value.userId, newRole.value)
    toast.success('Роль пользователя изменена')
    await loadMembers()
    changeRoleDialog.value = false
    emit('refresh')
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } } }
    const message: string = apiError.response?.data?.message ?? 'Не удалось изменить роль пользователя'
    toast.error(message)
  } finally {
    isUpdatingRole.value = false
  }
}

const openRemoveDialog = (member: TenantMemberInfo): void => {
  memberToRemove.value = member
  removeDialog.value = true
}

const handleRemoveMember = async (): Promise<void> => {
  if (!memberToRemove.value) {
    return
  }
  
  isRemoving.value = true
  
  try {
    await tenantApi.removeMember(memberToRemove.value.userId)
    toast.success('Пользователь удалён из пространства')
    await loadMembers()
    removeDialog.value = false
    emit('refresh')
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } } }
    const message: string = apiError.response?.data?.message ?? 'Не удалось удалить пользователя'
    toast.error(message)
  } finally {
    isRemoving.value = false
  }
}

const handleCopyInvitationLink = async (invitation: PendingInvitationInfo): Promise<void> => {
  const link = `${window.location.origin}/invite/${invitation.token}`
  
  try {
    await navigator.clipboard.writeText(link)
    toast.success('Ссылка скопирована в буфер обмена')
  } catch (err) {
    toast.error('Не удалось скопировать ссылку')
  }
}

const openRevokeDialog = (invitation: PendingInvitationInfo): void => {
  invitationToRevoke.value = invitation
  revokeDialog.value = true
}

const handleRevokeInvitation = async (): Promise<void> => {
  if (!invitationToRevoke.value) {
    return
  }
  
  isRevoking.value = true
  
  try {
    await tenantApi.revokeInvitation(invitationToRevoke.value.invitationId)
    toast.success('Приглашение отозвано')
    await loadMembers()
    revokeDialog.value = false
    emit('refresh')
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } } }
    const message: string = apiError.response?.data?.message ?? 'Не удалось отозвать приглашение'
    toast.error(message)
  } finally {
    isRevoking.value = false
  }
}
</script>

<template>
  <div class="rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Пользователи</TableHead>
          <TableHead>Роли</TableHead>
          <TableHead class="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="isLoading">
          <TableCell colspan="3" class="text-center text-muted-foreground">
            Загрузка...
          </TableCell>
        </TableRow>
        <TableRow v-else-if="allRows.length === 0">
          <TableCell colspan="3" class="text-center text-muted-foreground">
            Нет пользователей
          </TableCell>
        </TableRow>
        <TableRow
          v-else
          v-for="row in allRows"
          :key="row.type === 'member' ? row.data.membershipId : row.data.invitationId"
          :class="{ 'opacity-50': row.type === 'invitation' }"
        >
          <TableCell>
            <div class="flex flex-col">
              <span>{{ row.email }}</span>
              <span v-if="row.displayName" class="text-xs text-muted-foreground">
                {{ row.displayName }}
              </span>
              <span v-if="row.type === 'invitation'" class="text-xs text-muted-foreground italic">
                Приглашение отправлено
              </span>
            </div>
          </TableCell>
          <TableCell>
            {{ getRoleLabel(row.role) }}
          </TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon" class="h-8 w-8">
                  <EllipsisVertical class="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <template v-if="row.type === 'member'">
                  <DropdownMenuItem @click="openChangeRoleDialog(row.data)">
                    Изменить роль
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="openRemoveDialog(row.data)" class="text-destructive">
                    Удалить пользователя
                  </DropdownMenuItem>
                </template>
                <template v-else>
                  <DropdownMenuItem @click="handleCopyInvitationLink(row.data)">
                    Скопировать ссылку-приглашение
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="openRevokeDialog(row.data)" class="text-destructive">
                    Отозвать приглашение
                  </DropdownMenuItem>
                </template>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>

  <AlertDialog :open="changeRoleDialog" @update:open="changeRoleDialog = $event">
    <AlertDialogContent>
      <AlertDialogTitle>Изменить роль</AlertDialogTitle>
      <AlertDialogDescription>
          Выберите роль пользователя {{ selectedMember?.email }}
      </AlertDialogDescription>
      <div class="py-4">
        <RadioGroup v-model="newRole" :disabled="isUpdatingRole">
          <div class="flex items-center space-x-2">
            <RadioGroupItem value="Administrator" id="change-role-admin" />
            <Label for="change-role-admin" class="font-normal cursor-pointer">
              Администратор
            </Label>
          </div>
          <div class="flex items-center space-x-2">
            <RadioGroupItem value="Manager" id="change-role-manager" />
            <Label for="change-role-manager" class="font-normal cursor-pointer">
              Менеджер
            </Label>
          </div>
          <div class="flex items-center space-x-2">
            <RadioGroupItem value="ReadOnly" id="change-role-readonly" />
            <Label for="change-role-readonly" class="font-normal cursor-pointer">
              Только чтение
            </Label>
          </div>
        </RadioGroup>
      </div>
      <AlertDialogCancel :disabled="isUpdatingRole">Отмена</AlertDialogCancel>
      <AlertDialogAction @click="handleChangeRole" :disabled="isUpdatingRole || !newRole">
        {{ isUpdatingRole ? 'Изменение...' : 'Изменить' }}
      </AlertDialogAction>
    </AlertDialogContent>
  </AlertDialog>

  <AlertDialog :open="removeDialog" @update:open="removeDialog = $event">
    <AlertDialogContent>
      <AlertDialogTitle>Удалить пользователя</AlertDialogTitle>
      <AlertDialogDescription>
        Вы уверены, что хотите удалить пользователя {{ memberToRemove?.email }} из пространства?
        Это действие нельзя отменить.
      </AlertDialogDescription>
      <AlertDialogCancel :disabled="isRemoving">Отмена</AlertDialogCancel>
      <AlertDialogAction @click="handleRemoveMember" :disabled="isRemoving" class="bg-destructive hover:bg-destructive/90">
        {{ isRemoving ? 'Удаление...' : 'Удалить' }}
      </AlertDialogAction>
    </AlertDialogContent>
  </AlertDialog>

  <AlertDialog :open="revokeDialog" @update:open="revokeDialog = $event">
    <AlertDialogContent>
      <AlertDialogTitle>Отозвать приглашение</AlertDialogTitle>
      <AlertDialogDescription>
        Вы уверены, что хотите отозвать приглашение для {{ invitationToRevoke?.email }}?
        Ссылка-приглашение перестанет работать.
      </AlertDialogDescription>
      <AlertDialogCancel :disabled="isRevoking">Отмена</AlertDialogCancel>
      <AlertDialogAction @click="handleRevokeInvitation" :disabled="isRevoking" class="bg-destructive hover:bg-destructive/90">
        {{ isRevoking ? 'Отзыв...' : 'Отозвать' }}
      </AlertDialogAction>
    </AlertDialogContent>
  </AlertDialog>
</template>
