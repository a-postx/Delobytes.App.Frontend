import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { meApi } from '@/services/api'
import type { CurrentUser } from '@/types'

// Singleton state — shared across all useCurrentUser() calls in the same app instance
const currentUser: Ref<CurrentUser | null> = ref(null)
const loading: Ref<boolean> = ref(false)
const error: Ref<string | null> = ref(null)

export function useCurrentUser() {
  const role: ComputedRef<string> = computed(() => currentUser.value?.role ?? '')

  const canWrite: ComputedRef<boolean> = computed(() => {
    const r = role.value
    return r === 'Administrator' || r === 'Manager'
  })

  const fetchCurrentUser = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const user = await meApi.getCurrentUser()
      currentUser.value = user
      localStorage.setItem('currentUser', JSON.stringify(user))
    } catch (e: unknown) {
      currentUser.value = null
      localStorage.removeItem('currentUser')
      const apiError = e as { response?: { data?: { message?: string } } }
      error.value = apiError?.response?.data?.message ?? 'Не удалось загрузить данные пользователя.'
    } finally {
      loading.value = false
    }
  }

  const clearCurrentUser = (): void => {
    currentUser.value = null
    error.value = null
    loading.value = false
    localStorage.removeItem('currentUser')
  }

  return { currentUser, loading, error, role, canWrite, fetchCurrentUser, clearCurrentUser }
}

src/views/PackagingComponentsView.vue
vue

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Pencil, Trash2, PackageOpen } from 'lucide-vue-next'
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
import { packagingComponentsApi, Unit } from '@/services/api'
import type { PackagingComponentItem, CreatePackagingComponentRequest, UpdatePackagingComponentRequest } from '@/services/api'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { X } from 'lucide-vue-next'

const { canWrite } = useCurrentUser()

const items = ref<PackagingComponentItem[]>([])
const isLoading = ref<boolean>(true)

const createDialogOpen = ref<boolean>(false)
const editDialogOpen = ref<boolean>(false)
const deleteDialogOpen = ref<boolean>(false)

const editTarget = ref<PackagingComponentItem | null>(null)
const deleteTarget = ref<PackagingComponentItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)

const form = ref({
  name: '',
  description: '',
  unit: Unit.Piece,
  pricePerUnit: 0,
  supplier: '',
})
const editActive = ref<boolean>(true)

const unitOptions = [
  { value: Unit.Piece, label: 'шт.' },
  { value: Unit.Kg, label: 'кг' },
  { value: Unit.Meter, label: 'м' },
  { value: Unit.Liter, label: 'л' },
  { value: Unit.Ml, label: 'мл' },
  { value: Unit.Gram, label: 'г' },
]

const unitLabel = (u: Unit): string => unitOptions.find(o => o.value === u)?.label ?? String(u)

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

const formatPrice = (v: number): string =>
  v.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })

const loadItems = async (): Promise<void> => {
  isLoading.value = true
  try {
    const resp = await packagingComponentsApi.getAll()
    items.value = resp.items
  } catch {
    toast.error('Не удалось загрузить компоненты упаковки')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadItems)

const resetForm = (): void => {
  form.value = { name: '', description: '', unit: Unit.Piece, pricePerUnit: 0, supplier: '' }
  editActive.value = true
}

const openCreate = (): void => {
  resetForm()
  createDialogOpen.value = true
}

const openEdit = (item: PackagingComponentItem): void => {
  editTarget.value = item
  form.value = {
    name: item.name,
    description: item.description ?? '',
    unit: item.unit,
    pricePerUnit: item.pricePerUnit,
    supplier: item.supplier ?? '',
  }
  editActive.value = item.isActive
  editDialogOpen.value = true
}

const openDelete = (item: PackagingComponentItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const handleCreate = async (): Promise<void> => {
  if (!form.value.name.trim()) { toast.error('Введите название'); return }
  isSaving.value = true
  try {
    const payload: CreatePackagingComponentRequest = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      unit: form.value.unit,
      pricePerUnit: Number(form.value.pricePerUnit),
      supplier: form.value.supplier.trim() || undefined,
    }
    await packagingComponentsApi.create(payload)
    toast.success('Компонент добавлен')
    createDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось создать компонент')
  } finally {
    isSaving.value = false
  }
}

const handleEdit = async (): Promise<void> => {
  if (!editTarget.value || !form.value.name.trim()) { toast.error('Введите название'); return }
  isSaving.value = true
  try {
    const payload: UpdatePackagingComponentRequest = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      unit: form.value.unit,
      pricePerUnit: Number(form.value.pricePerUnit),
      supplier: form.value.supplier.trim() || undefined,
      isActive: editActive.value,
    }
    await packagingComponentsApi.update(editTarget.value.id, payload)
    toast.success('Компонент обновлён')
    editDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось обновить компонент')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await packagingComponentsApi.delete(deleteTarget.value.id)
    toast.success('Компонент удалён')
    deleteDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось удалить компонент')
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
          <PackageOpen class="size-5 text-primary" />
          Компоненты упаковки
        </h1>
        <p class="text-sm text-muted-foreground">Справочник материалов и компонентов для упаковки товаров</p>
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
      <PackageOpen class="size-10 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">Компоненты упаковки не добавлены</p>
      <Button v-if="canWrite" variant="outline" size="sm" @click="openCreate" class="gap-2">
        <Plus class="size-4" /> Добавить первый
      </Button>
    </div>

    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="border-b border-border">
            <TableHead>Название</TableHead>
            <TableHead>Единица</TableHead>
            <TableHead class="text-right">Цена/ед.</TableHead>
            <TableHead>Поставщик</TableHead>
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
            <TableCell class="font-medium">
              <div>{{ item.name }}</div>
              <div v-if="item.description" class="text-xs text-muted-foreground mt-0.5">{{ item.description }}</div>
            </TableCell>
            <TableCell class="text-muted-foreground">{{ unitLabel(item.unit) }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ formatPrice(item.pricePerUnit) }}</TableCell>
            <TableCell class="text-muted-foreground">{{ item.supplier || '—' }}</TableCell>
            <TableCell>
              <Badge :variant="item.isActive ? 'success' : 'warning'">
                {{ item.isActive ? 'Активен' : 'Неактивен' }}
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
          <DialogTitle class="text-lg font-semibold mb-4">Добавить компонент упаковки</DialogTitle>
          <DialogDescription class="sr-only">Форма добавления нового компонента упаковки</DialogDescription>
          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label for="c-name">Название <span class="text-destructive">*</span></Label>
              <Input id="c-name" v-model="form.name" placeholder="Коробка 30×20×10 см" :class="inputClass" />
            </div>
            <div :class="fieldClass">
              <Label for="c-desc">Описание</Label>
              <Input id="c-desc" v-model="form.description" placeholder="Необязательное описание" :class="inputClass" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div :class="fieldClass">
                <Label for="c-unit">Единица измерения</Label>
                <select
                  id="c-unit"
                  v-model="form.unit"
                  class="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3"
                >
                  <option v-for="o in unitOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
              <div :class="fieldClass">
                <Label for="c-price">Цена за единицу (₽)</Label>
                <Input id="c-price" v-model="form.pricePerUnit" type="number" min="0" step="0.01" :class="inputClass" />
              </div>
            </div>
            <div :class="fieldClass">
              <Label for="c-supplier">Поставщик</Label>
              <Input id="c-supplier" v-model="form.supplier" placeholder="Название поставщика" :class="inputClass" />
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
          <DialogTitle class="text-lg font-semibold mb-4">Редактировать компонент</DialogTitle>
          <DialogDescription class="sr-only">Форма редактирования компонента упаковки</DialogDescription>
          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label for="e-name">Название <span class="text-destructive">*</span></Label>
              <Input id="e-name" v-model="form.name" :class="inputClass" />
            </div>
            <div :class="fieldClass">
              <Label for="e-desc">Описание</Label>
              <Input id="e-desc" v-model="form.description" :class="inputClass" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div :class="fieldClass">
                <Label for="e-unit">Единица измерения</Label>
                <select
                  id="e-unit"
                  v-model="form.unit"
                  class="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3"
                >
                  <option v-for="o in unitOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
              <div :class="fieldClass">
                <Label for="e-price">Цена за единицу (₽)</Label>
                <Input id="e-price" v-model="form.pricePerUnit" type="number" min="0" step="0.01" :class="inputClass" />
              </div>
            </div>
            <div :class="fieldClass">
              <Label for="e-supplier">Поставщик</Label>
              <Input id="e-supplier" v-model="form.supplier" :class="inputClass" />
            </div>
            <div class="flex items-center gap-2">
              <input id="e-active" type="checkbox" v-model="editActive" class="h-4 w-4 rounded border-input accent-primary" />
              <Label for="e-active">Активен</Label>
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
          <AlertDialogTitle class="text-base font-semibold">Удалить компонент?</AlertDialogTitle>
          <AlertDialogDescription class="mt-2 text-sm text-muted-foreground">
            Компонент «{{ deleteTarget?.name }}» будет деактивирован. Исторические расчёты не пострадают.
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

