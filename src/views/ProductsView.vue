<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { Plus, Pencil, Trash2, Archive, Undo2, Package, AlertTriangle, MoreHorizontal, X as XIcon } from 'lucide-vue-next'
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import ProductStatusBadge from '@/components/products/ProductStatusBadge.vue'
import { toast } from 'vue-sonner'
import { catalogProductsApi } from '@/services/api'
import type { ProductItem, CreateProductRequest, UpdateProductRequest, ProductBarcode, PackingUnit } from '@/types/products'
import { ProductStatus } from '@/types/products'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { X } from 'lucide-vue-next'

const { canWrite } = useCurrentUser()

const items = ref<ProductItem[]>([])
const isLoading = ref<boolean>(true)

const createDialogOpen = ref<boolean>(false)
const editDialogOpen = ref<boolean>(false)
const deleteDialogOpen = ref<boolean>(false)
const archiveDialogOpen = ref<boolean>(false)
const restoreDialogOpen = ref<boolean>(false)

const editTarget = ref<ProductItem | null>(null)
const deleteTarget = ref<ProductItem | null>(null)
const archiveTarget = ref<ProductItem | null>(null)
const restoreTarget = ref<ProductItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)
const deletingProductIds = ref<Set<string>>(new Set())

const statusFilter = ref<'all' | 'active' | 'archived'>('active')

// Поля ввода всегда дают строку, поэтому габариты в форме — это PackingUnit
// с текстовыми значениями; числами они становятся на отправке.
type PackingUnitForm = {
  [K in keyof Required<PackingUnit>]: string
}

interface FormData {
  sku: string
  name: string
  description: string
  barcodes: ProductBarcode[]
  packingUnit: PackingUnitForm
}

const emptyForm = (): FormData => ({
  sku: '',
  name: '',
  description: '',
  barcodes: [],
  packingUnit: {
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    weightKg: ''
  }
})

const form = ref<FormData>(emptyForm())

const newBarcode = ref({ value: '', type: '', isDefault: false })

let pollingInterval: number | null = null

const activeCount = computed(() => items.value.filter(i => i.status === ProductStatus.Active).length)
const archivedCount = computed(() => items.value.filter(i => i.status === ProductStatus.Archived).length)
const totalCount = computed(() => items.value.length)

const filterOptions = computed(() => [
  { value: 'active', label: 'Активные', count: activeCount.value },
  { value: 'all', label: 'Все', count: totalCount.value },
  { value: 'archived', label: 'Архив', count: archivedCount.value },
])

const filteredItems = computed(() => {
  if (statusFilter.value === 'all') return items.value
  if (statusFilter.value === 'active') return items.value.filter(i => i.status === ProductStatus.Active)
  return items.value.filter(i => i.status === ProductStatus.Archived)
})

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

const loadItems = async (): Promise<void> => {
  isLoading.value = true
  try {
    const resp = await catalogProductsApi.getAll()
    items.value = resp.items
  } catch {
    toast.error('Не удалось загрузить товары')
  } finally {
    isLoading.value = false
  }
}

const checkDeletionStatus = async (): Promise<void> => {
  const pendingProducts = items.value.filter(p => p.status === ProductStatus.DeletionPending)
  
  if (pendingProducts.length === 0) {
    return
  }

  for (const product of pendingProducts) {
    try {
      const status = await catalogProductsApi.getDeletionStatus(product.id)
      
      if (status.status === ProductStatus.Deleted) {
        items.value = items.value.filter(p => p.id !== product.id)
        deletingProductIds.value.delete(product.id)
        toast.success(`Товар "${product.name}" успешно удалён`)
      } else if (status.status === ProductStatus.DeletionFailed) {
        const index = items.value.findIndex(p => p.id === product.id)
        if (index !== -1) {
          items.value[index] = { ...items.value[index], status: ProductStatus.DeletionFailed }
        }
        deletingProductIds.value.delete(product.id)
        toast.error(`Невозможно удалить товар "${product.name}": есть история продаж`)
      }
    } catch (error) {
      console.error('Error checking deletion status:', error)
    }
  }
}

const startPolling = (): void => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
  }
  pollingInterval = window.setInterval(checkDeletionStatus, 2000)
}

const stopPolling = (): void => {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

watch(() => items.value, (newItems) => {
  const hasPending = newItems.some(p => p.status === ProductStatus.DeletionPending)
  if (hasPending) {
    startPolling()
  } else {
    stopPolling()
  }
}, { deep: true })

onMounted(() => {
  loadItems()
})

onUnmounted(() => {
  stopPolling()
})

const openCreate = (): void => {
  form.value = emptyForm()
  newBarcode.value = { value: '', type: '', isDefault: false }
  createDialogOpen.value = true
}

const openEdit = (item: ProductItem): void => {
  editTarget.value = item
  form.value = {
    sku: item.sku,
    name: item.name,
    description: item.description ?? '',
    barcodes: item.barcodes ? item.barcodes.map(b => ({ ...b })) : [],
    packingUnit: item.packingUnit ? {
      lengthCm: item.packingUnit.lengthCm.toString(),
      widthCm: item.packingUnit.widthCm.toString(),
      heightCm: item.packingUnit.heightCm.toString(),
      weightKg: item.packingUnit.weightKg?.toString() ?? ''
    } : {
      lengthCm: '',
      widthCm: '',
      heightCm: '',
      weightKg: ''
    }
  }
  newBarcode.value = { value: '', type: '', isDefault: false }
  editDialogOpen.value = true
}

const openDelete = (item: ProductItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const openArchive = (item: ProductItem): void => {
  archiveTarget.value = item
  archiveDialogOpen.value = true
}

const openRestore = (item: ProductItem): void => {
  restoreTarget.value = item
  restoreDialogOpen.value = true
}

const addBarcode = (): void => {
  if (!newBarcode.value.value.trim()) {
    toast.error('Введите значение баркода')
    return
  }
  form.value.barcodes.push({ ...newBarcode.value })
  newBarcode.value = { value: '', type: '', isDefault: false }
}

const removeBarcode = (index: number): void => {
  form.value.barcodes.splice(index, 1)
}

const handleCreate = async (): Promise<void> => {
  if (!form.value.sku.trim()) { toast.error('Введите SKU'); return }
  if (!form.value.name.trim()) { toast.error('Введите название'); return }

  isSaving.value = true
  try {
    const payload: CreateProductRequest = {
      sku: form.value.sku.trim(),
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
    }

    if (form.value.barcodes.length > 0) {
      payload.barcodes = form.value.barcodes.map(b => ({
        value: b.value.trim(),
        type: b.type?.trim() || undefined,
        isDefault: b.isDefault
      }))
    }

    if (form.value.packingUnit.lengthCm && form.value.packingUnit.widthCm && form.value.packingUnit.heightCm) {
      payload.packingUnit = {
        lengthCm: parseFloat(form.value.packingUnit.lengthCm),
        widthCm: parseFloat(form.value.packingUnit.widthCm),
        heightCm: parseFloat(form.value.packingUnit.heightCm),
        weightKg: form.value.packingUnit.weightKg ? parseFloat(form.value.packingUnit.weightKg) : undefined
      }
    }

    await catalogProductsApi.create(payload)
    toast.success('Товар добавлен')
    createDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось создать товар')
  } finally {
    isSaving.value = false
  }
}

const handleEdit = async (): Promise<void> => {
  if (!editTarget.value) return
  if (!form.value.name.trim()) { toast.error('Введите название'); return }

  isSaving.value = true
  try {
    const payload: UpdateProductRequest = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
    }

    if (form.value.barcodes.length > 0) {
      payload.barcodes = form.value.barcodes.map(b => ({
        value: b.value.trim(),
        type: b.type?.trim() || undefined,
        isDefault: b.isDefault
      }))
    }

    if (form.value.packingUnit.lengthCm && form.value.packingUnit.widthCm && form.value.packingUnit.heightCm) {
      payload.packingUnit = {
        lengthCm: parseFloat(form.value.packingUnit.lengthCm),
        widthCm: parseFloat(form.value.packingUnit.widthCm),
        heightCm: parseFloat(form.value.packingUnit.heightCm),
        weightKg: form.value.packingUnit.weightKg ? parseFloat(form.value.packingUnit.weightKg) : undefined
      }
    }

    await catalogProductsApi.update(editTarget.value.id, payload)
    toast.success('Товар обновлён')
    editDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось обновить товар')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await catalogProductsApi.requestDeletion(deleteTarget.value.id)
    
    const index = items.value.findIndex(p => p.id === deleteTarget.value!.id)
    if (index !== -1) {
      items.value[index] = {
        ...items.value[index],
        status: ProductStatus.DeletionPending,
        deletionRequestedAt: new Date().toISOString()
      }
    }
    deletingProductIds.value.add(deleteTarget.value.id)
    
    toast.info('Запрос на удаление отправлен, проверяем историю продаж...')
    deleteDialogOpen.value = false
  } catch {
    toast.error('Не удалось удалить товар')
  } finally {
    isDeleting.value = false
  }
}

const handleArchive = async (): Promise<void> => {
  if (!archiveTarget.value) return
  isSaving.value = true
  try {
    await catalogProductsApi.archive(archiveTarget.value.id)
    toast.success('Товар перемещён в архив')
    archiveDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось архивировать товар')
  } finally {
    isSaving.value = false
  }
}

const handleRestore = async (): Promise<void> => {
  if (!restoreTarget.value) return
  isSaving.value = true
  try {
    await catalogProductsApi.restore(restoreTarget.value.id)
    toast.success('Товар восстановлен')
    restoreDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось восстановить товар')
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
          <Package class="size-5 text-primary" />
          Товары
        </h1>
        <p class="text-sm text-muted-foreground">Справочник товаров и SKU</p>
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

    <div v-else-if="filteredItems.length === 0" class="rounded-xl border border-border bg-card p-12">
      <div class="flex flex-col items-center justify-center gap-3 text-center">
        <div class="size-12 rounded-full bg-muted flex items-center justify-center">
          <Package class="size-6 text-muted-foreground" />
        </div>
        <div>
          <h3 class="font-semibold">Нет товаров</h3>
          <p class="text-sm text-muted-foreground">
            {{ statusFilter === 'active' ? 'Добавьте первый товар' : 'В этом разделе пока ничего нет' }}
          </p>
        </div>
        <Button v-if="canWrite && statusFilter === 'active'" @click="openCreate" variant="outline" class="gap-2 mt-2">
          <Plus class="size-4" />
          Добавить товар
        </Button>
      </div>
    </div>

    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Название</TableHead>
            <TableHead>Баркоды</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Создан</TableHead>
            <TableHead v-if="canWrite"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="item in filteredItems"
            :key="item.id"
            class="hover:bg-muted/40 transition-colors"
          >
            <TableCell class="font-mono text-sm">{{ item.sku }}</TableCell>
            <TableCell class="font-medium">{{ item.name }}</TableCell>
            <TableCell>
              <div v-if="item.barcodes && item.barcodes.length > 0" class="flex flex-wrap gap-1">
                <Badge
                  v-for="(barcode, idx) in item.barcodes"
                  :key="idx"
                  variant="secondary"
                  class="text-xs"
                >
                  {{ barcode.value }}
                </Badge>
              </div>
              <span v-else class="text-muted-foreground text-sm">—</span>
            </TableCell>
            <TableCell>
              <ProductStatusBadge :status="item.status" />
            </TableCell>
            <TableCell class="text-muted-foreground text-sm">{{ formatDate(item.createdAt) }}</TableCell>
            <TableCell v-if="canWrite" class="text-right">
              <template v-if="item.status === ProductStatus.Active">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="size-8">
                      <MoreHorizontal class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem @click="openEdit(item)">
                      <Pencil class="size-4 mr-2" />
                      Изменить
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="openArchive(item)">
                      <Archive class="size-4 mr-2" />
                      Архивировать
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="openDelete(item)" class="text-destructive">
                      <Trash2 class="size-4 mr-2" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </template>

              <template v-else-if="item.status === ProductStatus.Archived">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="size-8">
                      <MoreHorizontal class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem @click="openRestore(item)">
                      <Undo2 class="size-4 mr-2" />
                      Восстановить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </template>

              <template v-else-if="item.status === ProductStatus.DeletionPending">
                <span class="text-xs text-muted-foreground">Проверяем историю продаж...</span>
              </template>

              <template v-else-if="item.status === ProductStatus.DeletionFailed">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="size-8">
                      <MoreHorizontal class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem @click="openRestore(item)">
                      <Undo2 class="size-4 mr-2" />
                      Восстановить
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="openArchive(item)">
                      <Archive class="size-4 mr-2" />
                      Архив
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </template>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Create Dialog -->
    <DialogRoot v-model:open="createDialogOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-50 bg-black/50" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-start justify-between mb-4">
            <div>
              <DialogTitle class="text-lg font-semibold">Добавить товар</DialogTitle>
              <DialogDescription class="text-sm text-muted-foreground mt-1">
                Создайте новый товар в каталоге
              </DialogDescription>
            </div>
            <DialogClose as-child>
              <Button variant="ghost" size="sm" class="size-8 p-0">
                <X class="size-4" />
              </Button>
            </DialogClose>
          </div>

          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label for="create-sku">SKU *</Label>
              <Input 
                id="create-sku" 
                v-model="form.sku" 
                placeholder="PROD-001" 
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="create-name">Название *</Label>
              <Input 
                id="create-name" 
                v-model="form.name" 
                placeholder="Название товара" 
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="create-description">Описание</Label>
              <Textarea 
                id="create-description" 
                v-model="form.description" 
                placeholder="Краткое описание" 
                :rows="3"
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label>Баркоды товара</Label>
              <div class="flex flex-col gap-2 mt-1">
                <div v-if="form.barcodes.length > 0" class="flex flex-col gap-2 mb-2">
                  <div 
                    v-for="(barcode, idx) in form.barcodes" 
                    :key="idx"
                    class="flex items-center gap-2 p-2 bg-muted rounded-md"
                  >
                    <Badge variant="secondary" class="flex-shrink-0">{{ barcode.value }}</Badge>
                    <span v-if="barcode.type" class="text-xs text-muted-foreground">{{ barcode.type }}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      class="size-6 ml-auto" 
                      @click="removeBarcode(idx)"
                    >
                      <XIcon class="size-3" />
                    </Button>
                  </div>
                </div>
                <div class="flex gap-2">
                  <Input 
                    v-model="newBarcode.value" 
                    placeholder="Значение баркода" 
                    class="flex-1"
                  />
                  <Input 
                    v-model="newBarcode.type" 
                    placeholder="Тип (опц.)" 
                    class="w-32"
                  />
                  <Button variant="outline" size="sm" @click="addBarcode">
                    <Plus class="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div :class="fieldClass">
              <Label>Габариты упаковки (см, кг)</Label>
              <div class="flex gap-2 mt-1">
                <Input 
                  v-model="form.packingUnit.lengthCm" 
                  placeholder="Длина" 
                  type="number" 
                  step="0.01"
                />
                <Input 
                  v-model="form.packingUnit.widthCm" 
                  placeholder="Ширина" 
                  type="number" 
                  step="0.01"
                />
                <Input 
                  v-model="form.packingUnit.heightCm" 
                  placeholder="Высота" 
                  type="number" 
                  step="0.01"
                />
              </div>
              <div class="flex gap-2 mt-2">
                <Input 
                  v-model="form.packingUnit.weightKg" 
                  placeholder="Вес" 
                  type="number" 
                  step="0.01"
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <Button @click="handleCreate" :disabled="isSaving" class="flex-1">
              <Spinner v-if="isSaving" class="mr-2" />
              {{ isSaving ? 'Создание...' : 'Создать' }}
            </Button>
            <DialogClose as-child>
              <Button variant="outline" :disabled="isSaving">Отмена</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Edit Dialog -->
    <DialogRoot v-model:open="editDialogOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-50 bg-black/50" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-start justify-between mb-4">
            <div>
              <DialogTitle class="text-lg font-semibold">Изменить товар</DialogTitle>
              <DialogDescription class="text-sm text-muted-foreground mt-1">
                Обновите информацию о товаре
              </DialogDescription>
            </div>
            <DialogClose as-child>
              <Button variant="ghost" size="sm" class="size-8 p-0">
                <X class="size-4" />
              </Button>
            </DialogClose>
          </div>

          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label for="edit-sku">SKU</Label>
              <Input 
                id="edit-sku" 
                v-model="form.sku" 
                disabled
                :class="inputClass"
              />
              <p class="text-xs text-muted-foreground">SKU нельзя изменить</p>
            </div>

            <div :class="fieldClass">
              <Label for="edit-name">Название *</Label>
              <Input 
                id="edit-name" 
                v-model="form.name" 
                placeholder="Название товара" 
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="edit-description">Описание</Label>
              <Textarea 
                id="edit-description" 
                v-model="form.description" 
                placeholder="Краткое описание" 
                :rows="3"
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label>Баркоды товара</Label>
              <div class="flex flex-col gap-2 mt-1">
                <div v-if="form.barcodes.length > 0" class="flex flex-col gap-2 mb-2">
                  <div 
                    v-for="(barcode, idx) in form.barcodes" 
                    :key="idx"
                    class="flex items-center gap-2 p-2 bg-muted rounded-md"
                  >
                    <Badge variant="secondary" class="flex-shrink-0">{{ barcode.value }}</Badge>
                    <span v-if="barcode.type" class="text-xs text-muted-foreground">{{ barcode.type }}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      class="size-6 ml-auto" 
                      @click="removeBarcode(idx)"
                    >
                      <XIcon class="size-3" />
                    </Button>
                  </div>
                </div>
                <div class="flex gap-2">
                  <Input 
                    v-model="newBarcode.value" 
                    placeholder="Значение баркода" 
                    class="flex-1"
                  />
                  <Input 
                    v-model="newBarcode.type" 
                    placeholder="Тип (опц.)" 
                    class="w-32"
                  />
                  <Button variant="outline" size="sm" @click="addBarcode">
                    <Plus class="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div :class="fieldClass">
              <Label>Габариты упаковки (см, кг)</Label>
              <div class="flex gap-2 mt-1">
                <Input 
                  v-model="form.packingUnit.lengthCm" 
                  placeholder="Длина" 
                  type="number" 
                  step="0.01"
                />
                <Input 
                  v-model="form.packingUnit.widthCm" 
                  placeholder="Ширина" 
                  type="number" 
                  step="0.01"
                />
                <Input 
                  v-model="form.packingUnit.heightCm" 
                  placeholder="Высота" 
                  type="number" 
                  step="0.01"
                />
              </div>
              <div class="flex gap-2 mt-2">
                <Input 
                  v-model="form.packingUnit.weightKg" 
                  placeholder="Вес" 
                  type="number" 
                  step="0.01"
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <Button @click="handleEdit" :disabled="isSaving" class="flex-1">
              <Spinner v-if="isSaving" class="mr-2" />
              {{ isSaving ? 'Сохранение...' : 'Сохранить' }}
            </Button>
            <DialogClose as-child>
              <Button variant="outline" :disabled="isSaving">Отмена</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Delete Dialog -->
    <AlertDialogRoot v-model:open="deleteDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/50" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[480px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]">
          <div class="flex flex-col gap-4">
            <div class="flex items-start gap-3">
              <div class="mt-1">
                <AlertTriangle class="size-5 text-destructive" />
              </div>
              <div class="flex-1">
                <AlertDialogTitle class="text-lg font-semibold">Удалить товар?</AlertDialogTitle>
                <AlertDialogDescription class="text-sm text-muted-foreground mt-2">
                  Вы действительно хотите удалить товар <strong>{{ deleteTarget?.name }}</strong>?
                  <br />
                  Система проверит историю продаж. Если товар продавался, удаление будет отклонено.
                </AlertDialogDescription>
              </div>
            </div>
            <div class="flex justify-end gap-3 mt-2">
              <AlertDialogCancel as-child>
                <Button variant="outline" :disabled="isDeleting">Отмена</Button>
              </AlertDialogCancel>
              <AlertDialogAction as-child>
                <Button variant="destructive" @click="handleDelete" :disabled="isDeleting">
                  <Spinner v-if="isDeleting" class="mr-2" />
                  {{ isDeleting ? 'Удаление...' : 'Удалить' }}
                </Button>
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>

    <!-- Archive Dialog -->
    <AlertDialogRoot v-model:open="archiveDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/50" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[480px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]">
          <div class="flex flex-col gap-4">
            <div>
              <AlertDialogTitle class="text-lg font-semibold">Архивировать товар?</AlertDialogTitle>
              <AlertDialogDescription class="text-sm text-muted-foreground mt-2">
                Товар <strong>{{ archiveTarget?.name }}</strong> будет перемещён в архив.
              </AlertDialogDescription>
            </div>
            <div class="flex justify-end gap-3">
              <AlertDialogCancel as-child>
                <Button variant="outline" :disabled="isSaving">Отмена</Button>
              </AlertDialogCancel>
              <AlertDialogAction as-child>
                <Button @click="handleArchive" :disabled="isSaving">
                  <Spinner v-if="isSaving" class="mr-2" />
                  {{ isSaving ? 'Архивирование...' : 'Архивировать' }}
                </Button>
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>

    <!-- Restore Dialog -->
    <AlertDialogRoot v-model:open="restoreDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/50" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[480px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]">
          <div class="flex flex-col gap-4">
            <div>
              <AlertDialogTitle class="text-lg font-semibold">Восстановить товар?</AlertDialogTitle>
              <AlertDialogDescription class="text-sm text-muted-foreground mt-2">
                Товар <strong>{{ restoreTarget?.name }}</strong> будет восстановлен и станет активным.
              </AlertDialogDescription>
            </div>
            <div class="flex justify-end gap-3">
              <AlertDialogCancel as-child>
                <Button variant="outline" :disabled="isSaving">Отмена</Button>
              </AlertDialogCancel>
              <AlertDialogAction as-child>
                <Button @click="handleRestore" :disabled="isSaving">
                  <Spinner v-if="isSaving" class="mr-2" />
                  {{ isSaving ? 'Восстановление...' : 'Восстановить' }}
                </Button>
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </div>
</template>