<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Pencil, Trash2, Truck, Undo2 } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialogRoot,
  AlertDialogPortal,
} from 'reka-ui'
import {
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusFilter } from '@/components/ui/status-filter'
import { toast } from 'vue-sonner'
import { suppliersApi } from '@/services/api'
import type { SupplierItem, CreateSupplierRequest, UpdateSupplierRequest } from '@/services/api'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { X } from 'lucide-vue-next'

const { canWrite } = useCurrentUser()

const items = ref<SupplierItem[]>([])
const isLoading = ref<boolean>(true)

const createDialogOpen = ref<boolean>(false)
const editDialogOpen = ref<boolean>(false)
const deleteDialogOpen = ref<boolean>(false)
const restoreDialogOpen = ref<boolean>(false)

const editTarget = ref<SupplierItem | null>(null)
const deleteTarget = ref<SupplierItem | null>(null)
const restoreTarget = ref<SupplierItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)

const statusFilter = ref<'all' | 'active' | 'inactive'>('active')

const emptyForm = () => ({ inn: '', name: '', description: '', phone: '', email: '' })
const form = ref(emptyForm())

const activeCount = computed(() => items.value.filter(i => i.isActive).length)
const inactiveCount = computed(() => items.value.filter(i => !i.isActive).length)
const totalCount = computed(() => items.value.length)

const filterOptions = computed(() => [
  { value: 'active', label: 'Активные', count: activeCount.value },
  { value: 'all', label: 'Все', count: totalCount.value },
  { value: 'inactive', label: 'Неактивные', count: inactiveCount.value },
])

const filteredItems = computed(() => {
  if (statusFilter.value === 'all') return items.value
  if (statusFilter.value === 'active') return items.value.filter(i => i.isActive)
  return items.value.filter(i => !i.isActive)
})

const validateInn = (inn: string): string | null => {
  if (!/^\d{10}$|^\d{12}$/.test(inn)) {
    return 'ИНН должен содержать 10 или 12 цифр'
  }
  return null
}

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

const loadItems = async (): Promise<void> => {
  isLoading.value = true
  try {
    const resp = await suppliersApi.getAll()
    items.value = resp.items
  } catch {
    toast.error('Не удалось загрузить поставщиков')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadItems)

const openCreate = (): void => {
  form.value = emptyForm()
  createDialogOpen.value = true
}

const openEdit = (item: SupplierItem): void => {
  editTarget.value = item
  form.value = {
    inn: item.inn,
    name: item.name,
    description: item.description ?? '',
    phone: item.phone ?? '',
    email: item.email ?? '',
  }
  editDialogOpen.value = true
}

const openDelete = (item: SupplierItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const openRestore = (item: SupplierItem): void => {
  restoreTarget.value = item
  restoreDialogOpen.value = true
}

const handleCreate = async (): Promise<void> => {
  const innError = validateInn(form.value.inn.trim())
  if (innError) { toast.error(innError); return }
  if (!form.value.name.trim()) { toast.error('Введите название'); return }

  isSaving.value = true
  try {
    const payload: CreateSupplierRequest = {
      inn: form.value.inn.trim(),
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      phone: form.value.phone.trim() || undefined,
      email: form.value.email.trim() || undefined,
    }
    await suppliersApi.create(payload)
    toast.success('Поставщик добавлен')
    createDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось создать поставщика')
  } finally {
    isSaving.value = false
  }
}

const handleEdit = async (): Promise<void> => {
  if (!editTarget.value) return
  const innError = validateInn(form.value.inn.trim())
  if (innError) { toast.error(innError); return }
  if (!form.value.name.trim()) { toast.error('Введите название'); return }

  isSaving.value = true
  try {
    const payload: UpdateSupplierRequest = {
      inn: form.value.inn.trim(),
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      phone: form.value.phone.trim() || undefined,
      email: form.value.email.trim() || undefined,
      isActive: editTarget.value.isActive,
    }
    await suppliersApi.update(editTarget.value.id, payload)
    toast.success('Поставщик обновлён')
    editDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось обновить поставщика')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await suppliersApi.delete(deleteTarget.value.id)
    toast.success('Поставщик деактивирован')
    deleteDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось деактивировать поставщика')
  } finally {
    isDeleting.value = false
  }
}

const handleRestore = async (): Promise<void> => {
  if (!restoreTarget.value) return
  isSaving.value = true
  try {
    const payload: UpdateSupplierRequest = {
      inn: restoreTarget.value.inn,
      name: restoreTarget.value.name,
      description: restoreTarget.value.description || undefined,
      phone: restoreTarget.value.phone || undefined,
      email: restoreTarget.value.email || undefined,
      isActive: true,
    }
    await suppliersApi.update(restoreTarget.value.id, payload)
    toast.success('Поставщик восстановлен')
    restoreDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось восстановить поставщика')
  } finally {
    isSaving.value = false
  }
}

const dialogContentClass = 'bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[560px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100] overflow-y-auto'
const fieldClass = 'flex flex-col gap-1'
const inputClass = 'mt-1'
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-bold flex items-center gap-2">
          <Truck class="size-5 text-primary" />
          Поставщики
        </h1>
        <p class="text-sm text-muted-foreground">Справочник поставщиков упаковочных материалов</p>
      </div>
      <Button v-if="canWrite" @click="openCreate" class="gap-2">
        <Plus class="size-4" />
        Добавить
      </Button>
    </div>

    <StatusFilter v-model="statusFilter" :options="filterOptions" />

    <div v-if="isLoading" class="rounded-xl border border-border bg-card overflow-hidden">
      <div class="p-4 flex flex-col gap-3">
        <Skeleton v-for="n in 5" :key="n" class="h-10 w-full rounded-lg" />
      </div>
    </div>

    <div
      v-else-if="filteredItems.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center"
    >
      <Truck class="size-10 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">
        {{ statusFilter === 'inactive' ? 'Нет неактивных поставщиков' : 'Поставщики не добавлены' }}
      </p>
      <Button v-if="canWrite && statusFilter !== 'inactive'" variant="outline" size="sm" @click="openCreate" class="gap-2">
        <Plus class="size-4" /> Добавить первого
      </Button>
    </div>

    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="border-b border-border">
            <TableHead>ИНН</TableHead>
            <TableHead>Название</TableHead>
            <TableHead>Телефон</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Добавлен</TableHead>
            <TableHead v-if="canWrite" class="w-24 text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="item in filteredItems"
            :key="item.id"
            class="hover:bg-muted/40 transition-colors"
          >
            <TableCell class="tabular-nums text-sm text-muted-foreground">{{ item.inn }}</TableCell>
            <TableCell class="font-medium">
              {{ item.name }}
              <p v-if="item.description" class="text-xs text-muted-foreground mt-0.5 font-normal">{{ item.description }}</p>
            </TableCell>
            <TableCell class="text-sm">{{ item.phone || '—' }}</TableCell>
            <TableCell class="text-sm">{{ item.email || '—' }}</TableCell>
            <TableCell>
              <Badge :variant="item.isActive ? 'success' : 'secondary'">
                {{ item.isActive ? 'Активен' : 'Неактивен' }}
              </Badge>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground tabular-nums">{{ formatDate(item.createdAt) }}</TableCell>
            <TableCell v-if="canWrite" class="text-right">
              <div class="flex items-center justify-end gap-1">
                <Button variant="ghost" size="icon-sm" @click="openEdit(item)">
                  <Pencil class="size-4" />
                </Button>
                <Button v-if="item.isActive" variant="ghost" size="icon-sm" @click="openDelete(item)">
                  <Trash2 class="size-4 text-destructive" />
                </Button>
                <Button v-else variant="ghost" size="icon-sm" @click="openRestore(item)" title="Восстановить">
                  <Undo2 class="size-4 text-green-600" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Create Dialog -->
    <DialogRoot v-model:open="createDialogOpen">
      <DialogPortal>
        <DialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-start justify-between mb-4">
            <div>
              <DialogTitle class="text-lg font-semibold">Добавить поставщика</DialogTitle>
              <DialogDescription class="text-sm text-muted-foreground mt-1">
                Укажите ИНН и название поставщика
              </DialogDescription>
            </div>
            <DialogClose as-child>
              <Button variant="ghost" size="icon-sm">
                <X class="size-4" />
              </Button>
            </DialogClose>
          </div>

          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label for="create-inn">ИНН *</Label>
              <Input
                id="create-inn"
                v-model="form.inn"
                placeholder="10 или 12 цифр"
                maxlength="12"
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="create-name">Название *</Label>
              <Input
                id="create-name"
                v-model="form.name"
                placeholder="Название организации"
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="create-description">Описание</Label>
              <Input
                id="create-description"
                v-model="form.description"
                placeholder="Дополнительная информация"
                :class="inputClass"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div :class="fieldClass">
                <Label for="create-phone">Телефон</Label>
                <Input
                  id="create-phone"
                  v-model="form.phone"
                  placeholder="+7 (999) 123-45-67"
                  :class="inputClass"
                />
              </div>

              <div :class="fieldClass">
                <Label for="create-email">Email</Label>
                <Input
                  id="create-email"
                  v-model="form.email"
                  type="email"
                  placeholder="email@example.com"
                  :class="inputClass"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <DialogClose as-child>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button @click="handleCreate" :disabled="isSaving" class="gap-2">
              <Spinner v-if="isSaving" class="size-4" />
              Создать
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Edit Dialog -->
    <DialogRoot v-model:open="editDialogOpen">
      <DialogPortal>
        <DialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-start justify-between mb-4">
            <div>
              <DialogTitle class="text-lg font-semibold">Редактировать поставщика</DialogTitle>
              <DialogDescription class="text-sm text-muted-foreground mt-1">
                Измените данные поставщика
              </DialogDescription>
            </div>
            <DialogClose as-child>
              <Button variant="ghost" size="icon-sm">
                <X class="size-4" />
              </Button>
            </DialogClose>
          </div>

          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label for="edit-inn">ИНН *</Label>
              <Input
                id="edit-inn"
                v-model="form.inn"
                placeholder="10 или 12 цифр"
                maxlength="12"
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="edit-name">Название *</Label>
              <Input
                id="edit-name"
                v-model="form.name"
                placeholder="Название организации"
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="edit-description">Описание</Label>
              <Input
                id="edit-description"
                v-model="form.description"
                placeholder="Дополнительная информация"
                :class="inputClass"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div :class="fieldClass">
                <Label for="edit-phone">Телефон</Label>
                <Input
                  id="edit-phone"
                  v-model="form.phone"
                  placeholder="+7 (999) 123-45-67"
                  :class="inputClass"
                />
              </div>

              <div :class="fieldClass">
                <Label for="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  v-model="form.email"
                  type="email"
                  placeholder="email@example.com"
                  :class="inputClass"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <DialogClose as-child>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button @click="handleEdit" :disabled="isSaving" class="gap-2">
              <Spinner v-if="isSaving" class="size-4" />
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Delete Confirm -->
    <AlertDialogRoot v-model:open="deleteDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[420px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]">
          <AlertDialogTitle class="text-lg font-semibold">Деактивировать поставщика?</AlertDialogTitle>
          <AlertDialogDescription class="text-sm text-muted-foreground mt-2">
            Поставщик "{{ deleteTarget?.name }}" будет деактивирован и скрыт из основного списка. Вы сможете восстановить его позже.
          </AlertDialogDescription>
          <div class="flex justify-end gap-2 mt-6">
            <AlertDialogCancel as-child>
              <Button variant="outline">Отмена</Button>
            </AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button @click="handleDelete" :disabled="isDeleting" variant="destructive" class="gap-2">
                <Spinner v-if="isDeleting" class="size-4" />
                Деактивировать
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>

    <!-- Restore Confirm -->
    <AlertDialogRoot v-model:open="restoreDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[420px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]">
          <AlertDialogTitle class="text-lg font-semibold">Восстановить поставщика?</AlertDialogTitle>
          <AlertDialogDescription class="text-sm text-muted-foreground mt-2">
            Поставщик "{{ restoreTarget?.name }}" будет активирован и появится в основном списке.
          </AlertDialogDescription>
          <div class="flex justify-end gap-2 mt-6">
            <AlertDialogCancel as-child>
              <Button variant="outline">Отмена</Button>
            </AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button @click="handleRestore" :disabled="isSaving" class="gap-2 bg-green-600 hover:bg-green-700">
                <Spinner v-if="isSaving" class="size-4" />
                Восстановить
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </div>
</template>
