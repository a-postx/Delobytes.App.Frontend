<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Pencil, Trash2, Truck } from 'lucide-vue-next'
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

const editTarget = ref<SupplierItem | null>(null)
const deleteTarget = ref<SupplierItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)

const form = ref({ name: '', contactInfo: '' })
const editActive = ref<boolean>(true)

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

const resetForm = (): void => {
  form.value = { name: '', contactInfo: '' }
  editActive.value = true
}

const openCreate = (): void => {
  resetForm()
  createDialogOpen.value = true
}

const openEdit = (item: SupplierItem): void => {
  editTarget.value = item
  form.value = {
    name: item.name,
    contactInfo: item.contactInfo ?? '',
  }
  editActive.value = item.isActive
  editDialogOpen.value = true
}

const openDelete = (item: SupplierItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const handleCreate = async (): Promise<void> => {
  if (!form.value.name.trim()) { toast.error('Введите название'); return }
  isSaving.value = true
  try {
    const payload: CreateSupplierRequest = {
      name: form.value.name.trim(),
      contactInfo: form.value.contactInfo.trim() || undefined,
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
  if (!editTarget.value || !form.value.name.trim()) { toast.error('Введите название'); return }
  isSaving.value = true
  try {
    const payload: UpdateSupplierRequest = {
      name: form.value.name.trim(),
      contactInfo: form.value.contactInfo.trim() || undefined,
      isActive: editActive.value,
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
    toast.success('Поставщик удалён')
    deleteDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось удалить поставщика')
  } finally {
    isDeleting.value = false
  }
}

const dialogContentClass = 'bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[520px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100] overflow-y-auto'
const inputClass = 'mt-1'
const fieldClass = 'flex flex-col gap-1'
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

    <div v-if="isLoading" class="rounded-xl border border-border bg-card overflow-hidden">
      <div class="p-4 flex flex-col gap-3">
        <Skeleton v-for="n in 5" :key="n" class="h-10 w-full rounded-lg" />
      </div>
    </div>

    <div
      v-else-if="items.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center"
    >
      <Truck class="size-10 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">Поставщики не добавлены</p>
      <Button v-if="canWrite" variant="outline" size="sm" @click="openCreate" class="gap-2">
        <Plus class="size-4" /> Добавить первого
      </Button>
    </div>

    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="border-b border-border">
            <TableHead>Название</TableHead>
            <TableHead>Контактная информация</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Добавлен</TableHead>
            <TableHead v-if="canWrite" class="w-24 text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="item in items"
            :key="item.id"
            class="hover:bg-muted/40 transition-colors"
          >
            <TableCell class="font-medium">{{ item.name }}</TableCell>
            <TableCell class="text-muted-foreground text-sm">{{ item.contactInfo || '—' }}</TableCell>
            <TableCell>
              <Badge :variant="item.isActive ? 'default' : 'secondary'">
                {{ item.isActive ? 'Активен' : 'Неактивен' }}
              </Badge>
            </TableCell>
            <TableCell class="text-muted-foreground text-sm">{{ formatDate(item.createdAt) }}</TableCell>
            <TableCell v-if="canWrite" class="text-right">
              <div class="flex justify-end gap-1">
                <Button variant="ghost" size="icon" class="size-8" @click="openEdit(item)">
                  <Pencil class="size-4" />
                </Button>
                <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="openDelete(item)">
                  <Trash2 class="size-4" />
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
        <DialogOverlay class="fixed inset-0 bg-black/50 z-[90]" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-center justify-between mb-4">
            <DialogTitle class="text-lg font-semibold">Новый поставщик</DialogTitle>
            <DialogClose as-child>
              <Button variant="ghost" size="icon" class="size-8"><X class="size-4" /></Button>
            </DialogClose>
          </div>
          <DialogDescription class="sr-only">Форма добавления поставщика</DialogDescription>
          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label for="create-name">Название <span class="text-destructive">*</span></Label>
              <Input id="create-name" v-model="form.name" placeholder="ООО Поставщик" :class="inputClass" />
            </div>
            <div :class="fieldClass">
              <Label for="create-contact">Контактная информация</Label>
              <Input id="create-contact" v-model="form.contactInfo" placeholder="Телефон, email, сайт" :class="inputClass" />
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
        <DialogOverlay class="fixed inset-0 bg-black/50 z-[90]" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-center justify-between mb-4">
            <DialogTitle class="text-lg font-semibold">Редактировать поставщика</DialogTitle>
            <DialogClose as-child>
              <Button variant="ghost" size="icon" class="size-8"><X class="size-4" /></Button>
            </DialogClose>
          </div>
          <DialogDescription class="sr-only">Форма редактирования поставщика</DialogDescription>
          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label for="edit-name">Название <span class="text-destructive">*</span></Label>
              <Input id="edit-name" v-model="form.name" :class="inputClass" />
            </div>
            <div :class="fieldClass">
              <Label for="edit-contact">Контактная информация</Label>
              <Input id="edit-contact" v-model="form.contactInfo" :class="inputClass" />
            </div>
            <div class="flex items-center gap-2">
              <input
                id="edit-active"
                type="checkbox"
                v-model="editActive"
                class="size-4 rounded border-border accent-primary"
              />
              <Label for="edit-active" class="cursor-pointer">Активен</Label>
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
        <AlertDialogOverlay class="fixed inset-0 bg-black/50 z-[90]" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] w-[90vw] max-w-[420px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 z-[100]">
          <AlertDialogTitle class="text-lg font-semibold mb-2">Удалить поставщика?</AlertDialogTitle>
          <AlertDialogDescription class="text-sm text-muted-foreground mb-4">
            «{{ deleteTarget?.name }}» будет деактивирован. Существующие компоненты упаковки сохранят связь с ним.
          </AlertDialogDescription>
          <div class="flex justify-end gap-2">
            <AlertDialogCancel as-child>
              <Button variant="outline">Отмена</Button>
            </AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button variant="destructive" @click="handleDelete" :disabled="isDeleting" class="gap-2">
                <Spinner v-if="isDeleting" class="size-4" />
                Удалить
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </div>
</template>
