<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Trash2, PackageOpen, Undo2, Tag } from 'lucide-vue-next'
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
import { componentsApi, suppliersApi, Unit } from '@/services/api'
import type {
  ComponentItem,
  CreateComponentRequest,
  CreateComponentPriceRequest,
  SupplierItem,
} from '@/services/api'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { X } from 'lucide-vue-next'

const { canWrite } = useCurrentUser()

const items = ref<ComponentItem[]>([])
const suppliers = ref<SupplierItem[]>([])
const isLoading = ref<boolean>(true)

const createDialogOpen = ref<boolean>(false)
const priceDialogOpen = ref<boolean>(false)
const deleteDialogOpen = ref<boolean>(false)
const restoreDialogOpen = ref<boolean>(false)

const priceTarget = ref<ComponentItem | null>(null)
const deleteTarget = ref<ComponentItem | null>(null)
const restoreTarget = ref<ComponentItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)

const statusFilter = ref<'all' | 'active' | 'inactive'>('active')

const today = (): string => new Date().toISOString().slice(0, 10)

const form = ref({
  name: '',
  description: '',
  unit: Unit.Piece,
  pricePerUnit: 0,
  supplierId: '' as string,
  validFrom: today(),
})

const priceForm = ref({
  pricePerUnit: 0,
  supplierId: '' as string,
  validFrom: today(),
})

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

const unitOptions = [
  { value: Unit.Piece, label: 'шт.' },
  { value: Unit.Kg, label: 'кг' },
  { value: Unit.Meter, label: 'м' },
  { value: Unit.Liter, label: 'л' },
  { value: Unit.Ml, label: 'мл' },
  { value: Unit.Gram, label: 'г' },
]

const unitLabel = (u: Unit): string => unitOptions.find(o => o.value === u)?.label ?? 'шт.'

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

const formatPrice = (v: number): string =>
  v.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })

const activeSuppliers = (): SupplierItem[] => suppliers.value.filter(s => s.isActive)

const isPriceDateInPast = computed<boolean>(() => {
  if (!priceForm.value.validFrom) return false
  return priceForm.value.validFrom < today()
})

const loadData = async (): Promise<void> => {
  isLoading.value = true
  try {
    const [componentsResp, suppliersResp] = await Promise.all([
      componentsApi.getAll(),
      suppliersApi.getAll(),
    ])
    items.value = componentsResp.items
    suppliers.value = suppliersResp.items
  } catch {
    toast.error('Не удалось загрузить данные')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)

const resetForm = (): void => {
  form.value = { name: '', description: '', unit: Unit.Piece, pricePerUnit: 0, supplierId: '', validFrom: today() }
}

const openCreate = (): void => {
  resetForm()
  createDialogOpen.value = true
}

const openNewPrice = (item: ComponentItem): void => {
  priceTarget.value = item
  priceForm.value = {
    pricePerUnit: item.activePrice?.pricePerUnit ?? 0,
    supplierId: item.activePrice?.supplierId ?? '',
    validFrom: today(),
  }
  priceDialogOpen.value = true
}

const openDelete = (item: ComponentItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const openRestore = (item: ComponentItem): void => {
  restoreTarget.value = item
  restoreDialogOpen.value = true
}

const handleCreate = async (): Promise<void> => {
  if (!form.value.name.trim()) { toast.error('Введите название'); return }
  if (Number(form.value.pricePerUnit) <= 0) { toast.error('Укажите цену больше нуля'); return }
  if (!form.value.validFrom) { toast.error('Укажите дату начала действия цены'); return }
  isSaving.value = true
  try {
    const payload: CreateComponentRequest = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      unit: form.value.unit,
      pricePerUnit: Number(form.value.pricePerUnit),
      supplierId: form.value.supplierId || undefined,
      validFrom: form.value.validFrom,
    }
    await componentsApi.create(payload)
    toast.success('Компонент добавлен')
    createDialogOpen.value = false
    await loadData()
  } catch {
    toast.error('Не удалось создать компонент')
  } finally {
    isSaving.value = false
  }
}

const handleCreatePrice = async (): Promise<void> => {
  if (!priceTarget.value) return
  if (Number(priceForm.value.pricePerUnit) <= 0) {
    toast.error('Укажите цену больше нуля')
    return
  }
  if (!priceForm.value.validFrom) {
    toast.error('Укажите дату начала действия')
    return
  }
  isSaving.value = true
  try {
    const payload: CreateComponentPriceRequest = {
      pricePerUnit: Number(priceForm.value.pricePerUnit),
      supplierId: priceForm.value.supplierId || undefined,
      validFrom: priceForm.value.validFrom,
    }
    await componentsApi.createPrice(priceTarget.value.id, payload)
    toast.success('Новая цена добавлена')
    priceDialogOpen.value = false
    await loadData()
  } catch {
    toast.error('Не удалось добавить цену')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await componentsApi.delete(deleteTarget.value.id)
    toast.success('Компонент деактивирован')
    deleteDialogOpen.value = false
    await loadData()
  } catch {
    toast.error('Не удалось деактивировать компонент')
  } finally {
    isDeleting.value = false
  }
}

const handleRestore = async (): Promise<void> => {
  if (!restoreTarget.value) return
  isSaving.value = true
  try {
    await componentsApi.restore(restoreTarget.value.id)
    toast.success('Компонент восстановлен')
    restoreDialogOpen.value = false
    await loadData()
  } catch {
    toast.error('Не удалось восстановить компонент')
  } finally {
    isSaving.value = false
  }
}

const dialogContentClass = 'bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[520px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100] overflow-y-auto'
const inputClass = 'mt-1'
const fieldClass = 'flex flex-col gap-1'
const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1'
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-bold flex items-center gap-2">
          <PackageOpen class="size-5 text-primary" />
          Компоненты
        </h1>
        <p class="text-sm text-muted-foreground">Справочник материалов и компонентов</p>
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
      <PackageOpen class="size-10 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">
        {{ statusFilter === 'inactive' ? 'Нет неактивных компонентов' : 'Компоненты не добавлены' }}
      </p>
      <Button v-if="canWrite && statusFilter !== 'inactive'" variant="outline" size="sm" @click="openCreate" class="gap-2">
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
            <TableHead>Действует с</TableHead>
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
            <TableCell class="font-medium">
              {{ item.name }}
              <p v-if="item.description" class="text-xs text-muted-foreground mt-0.5 font-normal">{{ item.description }}</p>
            </TableCell>
            <TableCell class="text-sm">{{ unitLabel(item.unit) }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ item.activePrice ? formatPrice(item.activePrice.pricePerUnit) : '—' }}</TableCell>
            <TableCell class="text-sm">
              {{ item.activePrice?.supplierName || '—' }}
            </TableCell>
            <TableCell class="text-sm text-muted-foreground tabular-nums">
              {{ item.activePrice ? formatDate(item.activePrice.validFrom) : '—' }}
            </TableCell>
            <TableCell>
              <Badge :variant="item.isActive ? 'success' : 'secondary'">
                {{ item.isActive ? 'Активен' : 'Неактивен' }}
              </Badge>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground tabular-nums">{{ formatDate(item.createdAt) }}</TableCell>
            <TableCell v-if="canWrite" class="text-right">
              <div class="flex items-center justify-end gap-1">
                <Button v-if="item.isActive" variant="ghost" size="icon-sm" @click="openNewPrice(item)" title="Новая цена">
                  <Tag class="size-4" />
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
              <DialogTitle class="text-lg font-semibold">Добавить компонент</DialogTitle>
              <DialogDescription class="text-sm text-muted-foreground mt-1">
                Укажите название и параметры компонента и его первую цену
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
              <Label for="create-name">Название *</Label>
              <Input
                id="create-name"
                v-model="form.name"
                placeholder=""
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="create-description">Описание</Label>
              <Input
                id="create-description"
                v-model="form.description"
                placeholder=""
                :class="inputClass"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div :class="fieldClass">
                <Label for="create-unit">Единица измерения *</Label>
                <select
                  id="create-unit"
                  v-model.number="form.unit"
                  :class="selectClass"
                >
                  <option v-for="opt in unitOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>

              <div :class="fieldClass">
                <Label for="create-price">Цена за единицу *</Label>
                <Input
                  id="create-price"
                  v-model.number="form.pricePerUnit"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  :class="inputClass"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div :class="fieldClass">
                <Label for="create-supplier">Поставщик</Label>
                <select
                  id="create-supplier"
                  v-model="form.supplierId"
                  :class="selectClass"
                >
                  <option value="">Не выбран</option>
                  <option v-for="s in activeSuppliers()" :key="s.id" :value="s.id">
                    {{ s.name }}
                  </option>
                </select>
              </div>

              <div :class="fieldClass">
                <Label for="create-valid-from">Цена действует с *</Label>
                <Input
                  id="create-valid-from"
                  v-model="form.validFrom"
                  type="date"
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

    <!-- New Price Dialog -->
    <DialogRoot v-model:open="priceDialogOpen">
      <DialogPortal>
        <DialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-start justify-between mb-4">
            <div>
              <DialogTitle class="text-lg font-semibold">Новая цена</DialogTitle>
              <DialogDescription class="text-sm text-muted-foreground mt-1">
                Компонент «{{ priceTarget?.name }}»: текущая активная цена будет закрыта, создастся новая версия
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
              <Label for="price-value">Цена за единицу *</Label>
              <Input
                id="price-value"
                v-model.number="priceForm.pricePerUnit"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="price-supplier">Поставщик</Label>
              <select
                id="price-supplier"
                v-model="priceForm.supplierId"
                :class="selectClass"
              >
                <option value="">Не выбран</option>
                <option v-for="s in activeSuppliers()" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select>
            </div>

            <div :class="fieldClass">
              <Label for="price-valid-from">Действует с *</Label>
              <Input
                id="price-valid-from"
                v-model="priceForm.validFrom"
                type="date"
                :class="inputClass"
              />
              <p v-if="isPriceDateInPast" class="text-xs text-amber-600 mt-1">
                Дата в прошлом изменит стоимость компонента в прошлых расчётах
              </p>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <DialogClose as-child>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button @click="handleCreatePrice" :disabled="isSaving" class="gap-2">
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
          <AlertDialogTitle class="text-lg font-semibold">Деактивировать компонент?</AlertDialogTitle>
          <AlertDialogDescription class="text-sm text-muted-foreground mt-2">
            Компонент "{{ deleteTarget?.name }}" будет деактивирован и скрыт из основного списка. Вы сможете восстановить его позже.
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
          <AlertDialogTitle class="text-lg font-semibold">Восстановить компонент?</AlertDialogTitle>
          <AlertDialogDescription class="text-sm text-muted-foreground mt-2">
            Компонент "{{ restoreTarget?.name }}" снова станет активным вместе с его последней ценой.
          </AlertDialogDescription>
          <div class="flex justify-end gap-2 mt-6">
            <AlertDialogCancel as-child>
              <Button variant="outline">Отмена</Button>
            </AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button @click="handleRestore" :disabled="isSaving" class="gap-2">
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