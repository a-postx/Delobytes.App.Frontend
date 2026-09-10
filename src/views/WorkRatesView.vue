<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Pencil, Trash2, Hammer } from 'lucide-vue-next'
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
import { workRatesApi } from '@/services/api'
import type { WorkRateItem, CreateWorkRateRequest, UpdateWorkRateRequest } from '@/services/api'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { X } from 'lucide-vue-next'

const { canWrite } = useCurrentUser()

const items = ref<WorkRateItem[]>([])
const isLoading = ref<boolean>(true)

const createDialogOpen = ref<boolean>(false)
const editDialogOpen = ref<boolean>(false)
const deleteDialogOpen = ref<boolean>(false)

const editTarget = ref<WorkRateItem | null>(null)
const deleteTarget = ref<WorkRateItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)

const form = ref({ name: '', dailyWage: 0, assemblyRatePerDay: 0, validFrom: '' })
const editForm = ref({ name: '', dailyWage: 0, assemblyRatePerDay: 0, isActive: true })

const formatDate = (d: string): string =>
  new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

const formatCurrency = (v: number): string =>
  v.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })

const loadItems = async (): Promise<void> => {
  isLoading.value = true
  try {
    const resp = await workRatesApi.getAll()
    items.value = resp.items
  } catch {
    toast.error('Не удалось загрузить ставки работ')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadItems)

const openCreate = (): void => {
  form.value = { name: '', dailyWage: 0, assemblyRatePerDay: 0, validFrom: new Date().toISOString().slice(0, 10) }
  createDialogOpen.value = true
}

const openEdit = (item: WorkRateItem): void => {
  editTarget.value = item
  editForm.value = { name: item.name, dailyWage: item.dailyWage, assemblyRatePerDay: item.assemblyRatePerDay, isActive: item.isActive }
  editDialogOpen.value = true
}

const openDelete = (item: WorkRateItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const handleCreate = async (): Promise<void> => {
  if (!form.value.name.trim()) { toast.error('Введите название'); return }
  if (!form.value.validFrom) { toast.error('Укажите дату начала действия'); return }
  isSaving.value = true
  try {
    const payload: CreateWorkRateRequest = {
      name: form.value.name.trim(),
      dailyWage: Number(form.value.dailyWage),
      assemblyRatePerDay: Number(form.value.assemblyRatePerDay),
      validFrom: form.value.validFrom,
    }
    await workRatesApi.create(payload)
    toast.success('Ставка работ добавлена')
    createDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось создать ставку работ')
  } finally {
    isSaving.value = false
  }
}

const handleEdit = async (): Promise<void> => {
  if (!editTarget.value || !editForm.value.name.trim()) { toast.error('Введите название'); return }
  isSaving.value = true
  try {
    const payload: UpdateWorkRateRequest = {
      name: editForm.value.name.trim(),
      dailyWage: Number(editForm.value.dailyWage),
      assemblyRatePerDay: Number(editForm.value.assemblyRatePerDay),
      isActive: editForm.value.isActive,
    }
    await workRatesApi.update(editTarget.value.id, payload)
    toast.success('Ставка работ обновлена')
    editDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось обновить ставку работ')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await workRatesApi.delete(deleteTarget.value.id)
    toast.success('Ставка работ удалена')
    deleteDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось удалить ставку работ')
  } finally {
    isDeleting.value = false
  }
}

const dialogContentClass = 'bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[520px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100] overflow-y-auto'
const fieldClass = 'flex flex-col gap-1'
const inputClass = 'mt-1'
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-bold flex items-center gap-2">
          <Hammer class="size-5 text-primary" />
          Ставки работ
        </h1>
        <p class="text-sm text-muted-foreground">Ставки оплаты труда за сборку и упаковку</p>
      </div>
      <Button v-if="canWrite" @click="openCreate" class="gap-2">
        <Plus class="size-4" />
        Добавить
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="rounded-xl border border-border bg-card overflow-hidden">
      <div class="p-4 flex flex-col gap-3">
        <Skeleton v-for="n in 4" :key="n" class="h-10 w-full rounded-lg" />
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="items.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center"
    >
      <Hammer class="size-10 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">Ставки работ не добавлены</p>
      <Button v-if="canWrite" variant="outline" size="sm" @click="openCreate" class="gap-2">
        <Plus class="size-4" /> Добавить первую
      </Button>
    </div>

    <!-- Table -->
    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="border-b border-border">
            <TableHead>Название</TableHead>
            <TableHead class="text-right">Дневная ставка</TableHead>
            <TableHead class="text-right">Норма/день</TableHead>
            <TableHead>Действует с</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Добавлена</TableHead>
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
            <TableCell class="text-right tabular-nums">{{ formatCurrency(item.dailyWage) }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ item.assemblyRatePerDay }} шт.</TableCell>
            <TableCell class="tabular-nums text-muted-foreground">{{ item.validFrom }}</TableCell>
            <TableCell>
              <Badge :variant="item.isActive ? 'success' : 'warning'">
                {{ item.isActive ? 'Активна' : 'Неактивна' }}
              </Badge>
            </TableCell>
            <TableCell class="text-muted-foreground text-sm">{{ formatDate(item.createdAt) }}</TableCell>
            <TableCell v-if="canWrite" class="text-right">
              <div class="flex items-center justify-end gap-1">
                <button
                  @click="openEdit(item)"
                  class="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Редактировать"
                ><Pencil class="size-3.5" /></button>
                <button
                  @click="openDelete(item)"
                  class="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                  title="Удалить"
                ><Trash2 class="size-3.5" /></button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Create dialog -->
    <DialogRoot v-model:open="createDialogOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-30 bg-black/60" />
        <DialogContent :class="dialogContentClass">
          <DialogTitle class="text-lg font-semibold mb-4">Добавить ставку работ</DialogTitle>
          <DialogDescription class="sr-only">Форма добавления ставки работ</DialogDescription>
          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label for="wr-name">Название <span class="text-destructive">*</span></Label>
              <Input id="wr-name" v-model="form.name" placeholder="Ставка сборки май 2025" :class="inputClass" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div :class="fieldClass">
                <Label for="wr-wage">Дневная ставка (₽)</Label>
                <Input id="wr-wage" v-model="form.dailyWage" type="number" min="0" step="0.01" :class="inputClass" />
              </div>
              <div :class="fieldClass">
                <Label for="wr-rate">Норма сборки / день (шт.)</Label>
                <Input id="wr-rate" v-model="form.assemblyRatePerDay" type="number" min="0" :class="inputClass" />
              </div>
            </div>
            <div :class="fieldClass">
              <Label for="wr-from">Действует с <span class="text-destructive">*</span></Label>
              <Input id="wr-from" v-model="form.validFrom" type="date" :class="inputClass" />
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <DialogClose as-child><Button variant="outline">Отмена</Button></DialogClose>
            <Button @click="handleCreate" :disabled="isSaving" class="gap-2">
              <Spinner v-if="isSaving" size="sm" />
              Добавить
            </Button>
          </div>
          <DialogClose class="absolute top-4 right-4 rounded-xs p-1 text-muted-foreground hover:text-foreground transition-colors" aria-label="Закрыть">
            <X class="size-4" />
          </DialogClose>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Edit dialog -->
    <DialogRoot v-model:open="editDialogOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-30 bg-black/60" />
        <DialogContent :class="dialogContentClass">
          <DialogTitle class="text-lg font-semibold mb-4">Редактировать ставку работ</DialogTitle>
          <DialogDescription class="sr-only">Форма редактирования ставки работ</DialogDescription>
          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label for="wre-name">Название <span class="text-destructive">*</span></Label>
              <Input id="wre-name" v-model="editForm.name" :class="inputClass" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div :class="fieldClass">
                <Label for="wre-wage">Дневная ставка (₽)</Label>
                <Input id="wre-wage" v-model="editForm.dailyWage" type="number" min="0" step="0.01" :class="inputClass" />
              </div>
              <div :class="fieldClass">
                <Label for="wre-rate">Норма сборки / день (шт.)</Label>
                <Input id="wre-rate" v-model="editForm.assemblyRatePerDay" type="number" min="0" :class="inputClass" />
              </div>
            </div>
            <div class="flex items-center gap-2">
              <input id="wre-active" type="checkbox" v-model="editForm.isActive" class="h-4 w-4 rounded border-input accent-primary" />
              <Label for="wre-active">Активна</Label>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <DialogClose as-child><Button variant="outline">Отмена</Button></DialogClose>
            <Button @click="handleEdit" :disabled="isSaving" class="gap-2">
              <Spinner v-if="isSaving" size="sm" />
              Сохранить
            </Button>
          </div>
          <DialogClose class="absolute top-4 right-4 rounded-xs p-1 text-muted-foreground hover:text-foreground transition-colors" aria-label="Закрыть">
            <X class="size-4" />
          </DialogClose>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Delete confirm -->
    <AlertDialogRoot v-model:open="deleteDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-30 bg-black/60" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 z-[100]">
          <AlertDialogTitle class="text-base font-semibold">Удалить ставку работ?</AlertDialogTitle>
          <AlertDialogDescription class="mt-2 text-sm text-muted-foreground">
            Ставка «{{ deleteTarget?.name }}» будет удалена.
          </AlertDialogDescription>
          <div class="mt-5 flex justify-end gap-3">
            <AlertDialogCancel as-child><Button variant="outline">Отмена</Button></AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button variant="destructive" @click="handleDelete" :disabled="isDeleting" class="gap-2">
                <Spinner v-if="isDeleting" size="sm" />
                Удалить
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </div>
</template>
