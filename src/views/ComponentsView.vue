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
const selectClass = 'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        Компоненты
      </h1>
      <Button
        v-if="canWrite"
        @click="openCreate"
      >
        <Plus class="mr-2 h-4 w-4" />
        Добавить
      </Button>
    </div>

    <StatusFilter
      v-model="statusFilter"
      :options="filterOptions"
    />

    <div v-if="isLoading" class="flex flex-col gap-2">
      <Skeleton class="h-12 w-full" />
      <Skeleton class="h-12 w-full" />
      <Skeleton class="h-12 w-full" />
    </div>

    <div v-else-if="filteredItems.length === 0" class="flex flex-col items-center justify-center gap-2 py-12">
      <PackageOpen class="h-12 w-12 text-muted-foreground" />
      <p class="text-sm text-muted-foreground">
        Компоненты не найдены
      </p>
    </div>

    <div v-else class="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Описание</TableHead>
            <TableHead>Ед. изм.</TableHead>
            <TableHead>Цена</TableHead>
            <TableHead>Поставщик</TableHead>
            <TableHead>Действует с</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead v-if="canWrite" class="w-[100px]">
              Действия
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="item in filteredItems" :key="item.id">
            <TableCell class="font-medium">
              {{ item.name }}
            </TableCell>
            <TableCell>
              {{ item.description || '—' }}
            </TableCell>
            <TableCell>
              {{ unitLabel(item.unit) }}
            </TableCell>
            <TableCell>
              {{ item.activePrice ? formatPrice(item.activePrice.pricePerUnit) : '—' }}
            </TableCell>
            <TableCell>
              {{ item.activePrice?.supplierName || '—' }}
            </TableCell>
            <TableCell>
              {{ item.activePrice ? formatDate(item.activePrice.validFrom) : '—' }}
            </TableCell>
            <TableCell>
              <Badge :variant="item.isActive ? 'default' : 'secondary'">
                {{ item.isActive ? 'Активен' : 'Неактивен' }}
              </Badge>
            </TableCell>
            <TableCell v-if="canWrite">
              <div class="flex items-center gap-1">
                <Button
                  v-if="item.isActive"
                  variant="ghost"
                  size="icon"
                  @click="openNewPrice(item)"
                  title="Добавить цену"
                >
                  <Tag class="h-4 w-4" />
                </Button>
                <Button
                  v-if="item.isActive"
                  variant="ghost"
                  size="icon"
                  @click="openDelete(item)"
                  title="Деактивировать"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
                <Button
                  v-else
                  variant="ghost"
                  size="icon"
                  @click="openRestore(item)"
                  title="Восстановить"
                >
                  <Undo2 class="h-4 w-4" />
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
        <DialogOverlay class="fixed inset-0 z-50 bg-black/80" />
        <DialogContent :class="dialogContentClass">
          <DialogTitle>Новый компонент</DialogTitle>
          <DialogDescription>
            Добавление нового компонента
          </DialogDescription>

          <div class="flex flex-col gap-4 py-4">
            <div :class="fieldClass">
              <Label for="name">Название</Label>
              <Input
                id="name"
                v-model="form.name"
                :class="inputClass"
                placeholder=""
              />
            </div>

            <div :class="fieldClass">
              <Label for="description">Описание</Label>
              <Input
                id="description"
                v-model="form.description"
                :class="inputClass"
                placeholder=""
              />
            </div>

            <div :class="fieldClass">
              <Label for="unit">Единица измерения</Label>
              <select
                id="unit"
                v-model="form.unit"
                :class="selectClass"
              >
                <option v-for="opt in unitOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div :class="fieldClass">
              <Label for="pricePerUnit">Цена за единицу *</Label>
              <Input
                id="pricePerUnit"
                v-model.number="form.pricePerUnit"
                type="number"
                step="0.01"
                :class="inputClass"
                placeholder="0.00"
              />
            </div>

            <div :class="fieldClass">
              <Label for="supplier">Поставщик</Label>
              <select
                id="supplier"
                v-model="form.supplierId"
                :class="selectClass"
              >
                <option value="">
                  Не выбран
                </option>
                <option v-for="s in activeSuppliers()" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select>
            </div>

            <div :class="fieldClass">
              <Label for="validFrom">Цена действует с *</Label>
              <Input
                id="validFrom"
                v-model="form.validFrom"
                type="date"
                :class="inputClass"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <DialogClose as-child>
              <Button variant="outline" :disabled="isSaving">
                Отмена
              </Button>
            </DialogClose>
            <Button @click="handleCreate" :disabled="isSaving">
              <Spinner v-if="isSaving" class="mr-2 h-4 w-4" />
              Создать
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Price Dialog -->
    <DialogRoot v-model:open="priceDialogOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-50 bg-black/80" />
        <DialogContent :class="dialogContentClass">
          <DialogTitle>Новая цена</DialogTitle>
          <DialogDescription>
            Добавление новой цены для: {{ priceTarget?.name }}
          </DialogDescription>

          <div class="flex flex-col gap-4 py-4">
            <div :class="fieldClass">
              <Label for="newPricePerUnit">Цена за единицу *</Label>
              <Input
                id="newPricePerUnit"
                v-model.number="priceForm.pricePerUnit"
                type="number"
                step="0.01"
                :class="inputClass"
                placeholder="0.00"
              />
            </div>

            <div :class="fieldClass">
              <Label for="newSupplier">Поставщик</Label>
              <select
                id="newSupplier"
                v-model="priceForm.supplierId"
                :class="selectClass"
              >
                <option value="">
                  Не выбран
                </option>
                <option v-for="s in activeSuppliers()" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select>
            </div>

            <div :class="fieldClass">
              <Label for="newValidFrom">Действует с *</Label>
              <Input
                id="newValidFrom"
                v-model="priceForm.validFrom"
                type="date"
                :class="inputClass"
              />
              <p v-if="isPriceDateInPast" class="text-xs text-yellow-600">
                Дата в прошлом — цена вступит в силу немедленно
              </p>
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <DialogClose as-child>
              <Button variant="outline" :disabled="isSaving">
                Отмена
              </Button>
            </DialogClose>
            <Button @click="handleCreatePrice" :disabled="isSaving">
              <Spinner v-if="isSaving" class="mr-2 h-4 w-4" />
              Добавить
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Delete Confirmation -->
    <AlertDialogRoot v-model:open="deleteDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/80" />
        <AlertDialogContent :class="dialogContentClass">
          <AlertDialogTitle>Деактивировать компонент?</AlertDialogTitle>
          <AlertDialogDescription>
            Компонент "{{ deleteTarget?.name }}" будет деактивирован. Его можно будет восстановить позже.
          </AlertDialogDescription>
          <div class="flex justify-end gap-2 pt-4">
            <AlertDialogCancel as-child>
              <Button variant="outline" :disabled="isDeleting">
                Отмена
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button variant="destructive" @click="handleDelete" :disabled="isDeleting">
                <Spinner v-if="isDeleting" class="mr-2 h-4 w-4" />
                Деактивировать
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>

    <!-- Restore Confirmation -->
    <AlertDialogRoot v-model:open="restoreDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/80" />
        <AlertDialogContent :class="dialogContentClass">
          <AlertDialogTitle>Восстановить компонент?</AlertDialogTitle>
          <AlertDialogDescription>
            Компонент "{{ restoreTarget?.name }}" будет активирован снова.
          </AlertDialogDescription>
          <div class="flex justify-end gap-2 pt-4">
            <AlertDialogCancel as-child>
              <Button variant="outline" :disabled="isSaving">
                Отмена
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button @click="handleRestore" :disabled="isSaving">
                <Spinner v-if="isSaving" class="mr-2 h-4 w-4" />
                Восстановить
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </div>
</template>
