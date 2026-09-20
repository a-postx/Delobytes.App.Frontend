<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Pencil, Trash2, Tag } from 'lucide-vue-next'
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
import { costTypesApi } from '@/services/api'
import type { CostTypeItem, CreateCostTypeRequest, UpdateCostTypeRequest } from '@/services/api'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useApiCall } from '@/composables/useApiCall'
import { X } from 'lucide-vue-next'

const { canWrite } = useCurrentUser()

const items = ref<CostTypeItem[]>([])

const createDialogOpen = ref<boolean>(false)
const editDialogOpen = ref<boolean>(false)
const deleteDialogOpen = ref<boolean>(false)

const editTarget = ref<CostTypeItem | null>(null)
const deleteTarget = ref<CostTypeItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)

const form = ref({ name: '', description: '' })
const editForm = ref({ name: '', description: '', isActive: true })

const { loading: isLoading, execute: fetchCostTypes } = useApiCall<{ items: CostTypeItem[] }>({
  fallbackMessage: 'Не удалось загрузить типы расходов',
})

const { execute: createCostType } = useApiCall({
  fallbackMessage: 'Не удалось создать тип расхода',
})

const { execute: updateCostType } = useApiCall({
  fallbackMessage: 'Не удалось обновить тип расхода',
})

const { execute: deleteCostType } = useApiCall({
  fallbackMessage: 'Не удалось удалить тип расхода',
})

const loadItems = async (): Promise<void> => {
  const result = await fetchCostTypes(() => costTypesApi.getAll())
  if (result) {
    items.value = result.items
  }
}

onMounted(loadItems)

const openCreate = (): void => {
  form.value = { name: '', description: '' }
  createDialogOpen.value = true
}

const openEdit = (item: CostTypeItem): void => {
  editTarget.value = item
  editForm.value = { name: item.name, description: item.description ?? '', isActive: item.isActive }
  editDialogOpen.value = true
}

const openDelete = (item: CostTypeItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const handleCreate = async (): Promise<void> => {
  if (!form.value.name.trim()) { toast.error('Введите название'); return }
  isSaving.value = true
  try {
    const payload: CreateCostTypeRequest = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
    }
    await createCostType(() => costTypesApi.create(payload))
    toast.success('Тип расхода добавлен')
    createDialogOpen.value = false
    await loadItems()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isSaving.value = false
  }
}

const handleEdit = async (): Promise<void> => {
  if (!editTarget.value || !editForm.value.name.trim()) { toast.error('Введите название'); return }
  isSaving.value = true
  try {
    const payload: UpdateCostTypeRequest = {
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim() || undefined,
      isActive: editForm.value.isActive,
    }
    await updateCostType(() => costTypesApi.update(editTarget.value!.id, payload))
    toast.success('Тип расхода обновлён')
    editDialogOpen.value = false
    await loadItems()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await deleteCostType(() => costTypesApi.delete(deleteTarget.value!.id))
    toast.success('Тип расхода удалён')
    deleteDialogOpen.value = false
    await loadItems()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isDeleting.value = false
  }
}

const dialogContentClass = 'bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[480px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100] overflow-y-auto'
const fieldClass = 'flex flex-col gap-1'
const inputClass = 'mt-1'
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-bold flex items-center gap-2">
          <Tag class="size-5 text-primary" />
          Типы расходов
        </h1>
        <p class="text-sm text-muted-foreground">Справочник категорий расходов по каналам продаж</p>
      </div>
      <Button v-if="canWrite" @click="openCreate" class="gap-2">
        <Plus class="size-4" />
        Добавить
      </Button>
    </div>

    <div v-if="isLoading" class="rounded-xl border border-border bg-card overflow-hidden">
      <div class="p-4 flex flex-col gap-3">
        <Skeleton v-for="n in 4" :key="n" class="h-10 w-full rounded-lg" />
      </div>
    </div>

    <div
      v-else-if="items.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center"
    >
      <Tag class="size-10 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">Типы расходов не добавлены</p>
      <Button v-if="canWrite" variant="outline" size="sm" @click="openCreate" class="gap-2">
        <Plus class="size-4" /> Добавить первый
      </Button>
    </div>

    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="border-b border-border">
            <TableHead>Название</TableHead>
            <TableHead>Описание</TableHead>
            <TableHead>Статус</TableHead>
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
            <TableCell class="text-muted-foreground text-sm">{{ item.description || '—' }}</TableCell>
            <TableCell>
              <Badge :variant="item.isActive ? 'success' : 'secondary'">
                {{ item.isActive ? 'Активен' : 'Неактивен' }}
              </Badge>
            </TableCell>
            <TableCell v-if="canWrite" class="text-right">
              <div class="flex items-center justify-end gap-2">
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

    <!-- Create dialog -->
    <DialogRoot v-model:open="createDialogOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-[99] bg-black/50" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-center justify-between mb-4">
            <DialogTitle class="text-lg font-semibold">Новый тип расхода</DialogTitle>
            <DialogClose as-child>
              <Button variant="ghost" size="icon" class="size-8"><X class="size-4" /></Button>
            </DialogClose>
          </div>
          <DialogDescription class="sr-only">Форма создания нового типа расхода</DialogDescription>
          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label>Название</Label>
              <Input :class="inputClass" v-model="form.name" placeholder="Логистика до покупателя" />
            </div>
            <div :class="fieldClass">
              <Label>Описание <span class="text-muted-foreground text-xs">(необязательно)</span></Label>
              <Input :class="inputClass" v-model="form.description" placeholder="Краткое описание" />
            </div>
            <div class="flex justify-end gap-2 mt-2">
              <DialogClose as-child>
                <Button variant="outline">Отмена</Button>
              </DialogClose>
              <Button @click="handleCreate" :disabled="isSaving">
                <Spinner v-if="isSaving" class="mr-2 size-4" />
                Создать
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Edit dialog -->
    <DialogRoot v-model:open="editDialogOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-[99] bg-black/50" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-center justify-between mb-4">
            <DialogTitle class="text-lg font-semibold">Редактировать тип расхода</DialogTitle>
            <DialogClose as-child>
              <Button variant="ghost" size="icon" class="size-8"><X class="size-4" /></Button>
            </DialogClose>
          </div>
          <DialogDescription class="sr-only">Форма редактирования типа расхода</DialogDescription>
          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label>Название</Label>
              <Input :class="inputClass" v-model="editForm.name" />
            </div>
            <div :class="fieldClass">
              <Label>Описание</Label>
              <Input :class="inputClass" v-model="editForm.description" />
            </div>
            <div class="flex items-center gap-2">
              <input type="checkbox" id="edit-active" v-model="editForm.isActive" class="size-4 rounded" />
              <Label for="edit-active">Активен</Label>
            </div>
            <div class="flex justify-end gap-2 mt-2">
              <DialogClose as-child>
                <Button variant="outline">Отмена</Button>
              </DialogClose>
              <Button @click="handleEdit" :disabled="isSaving">
                <Spinner v-if="isSaving" class="mr-2 size-4" />
                Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Delete dialog -->
    <AlertDialogRoot v-model:open="deleteDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-[99] bg-black/50" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] w-[90vw] max-w-[420px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 z-[100]">
          <AlertDialogTitle class="text-lg font-semibold">Удалить тип расхода?</AlertDialogTitle>
          <AlertDialogDescription class="mt-2 text-sm text-muted-foreground">
            «{{ deleteTarget?.name }}» будет деактивирован. Связанные записи расходов сохранятся.
          </AlertDialogDescription>
          <div class="flex justify-end gap-2 mt-6">
            <AlertDialogCancel as-child>
              <Button variant="outline">Отмена</Button>
            </AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button variant="destructive" @click="handleDelete" :disabled="isDeleting">
                <Spinner v-if="isDeleting" class="mr-2 size-4" />
                Удалить
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </div>
</template>
