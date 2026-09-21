<script setup lang="ts">
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'
import { Plus, Pencil, Trash2, Archive, Undo2, Package, AlertTriangle, Loader2 } from 'lucide-vue-next'
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
import type { ProductItem, CreateProductRequest, UpdateProductRequest } from '@/types/products'
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

const emptyForm = () => ({ sku: '', name: '', description: '' })
const form = ref(emptyForm())

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
    // Всегда загружаем ВСЕ продукты без фильтра, фильтрация — на фронтенде
    const resp = await catalogProductsApi.getAll()
    items.value = resp.items
  } catch {
    toast.error('Не удалось загрузить продукты')
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
        toast.success(`Продукт "${product.name}" успешно удалён`)
      } else if (status.status === ProductStatus.DeletionFailed) {
        const index = items.value.findIndex(p => p.id === product.id)
        if (index !== -1) {
          items.value[index] = { ...items.value[index], status: ProductStatus.DeletionFailed }
        }
        deletingProductIds.value.delete(product.id)
        toast.error(`Невозможно удалить продукт "${product.name}": есть история продаж`)
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
  createDialogOpen.value = true
}

const openEdit = (item: ProductItem): void => {
  editTarget.value = item
  form.value = {
    sku: item.sku,
    name: item.name,
    description: item.description ?? '',
  }
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
    await catalogProductsApi.create(payload)
    toast.success('Продукт добавлен')
    createDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось создать продукт')
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
    await catalogProductsApi.update(editTarget.value.id, payload)
    toast.success('Продукт обновлён')
    editDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось обновить продукт')
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
    toast.error('Не удалось удалить продукт')
  } finally {
    isDeleting.value = false
  }
}

const handleArchive = async (): Promise<void> => {
  if (!archiveTarget.value) return
  isSaving.value = true
  try {
    await catalogProductsApi.archive(archiveTarget.value.id)
    toast.success('Продукт перемещён в архив')
    archiveDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось архивировать продукт')
  } finally {
    isSaving.value = false
  }
}

const handleRestore = async (): Promise<void> => {
  if (!restoreTarget.value) return
  isSaving.value = true
  try {
    await catalogProductsApi.restore(restoreTarget.value.id)
    toast.success('Продукт восстановлен')
    restoreDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось восстановить продукт')
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
          Продукты
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
          <h3 class="font-semibold">Нет продуктов</h3>
          <p class="text-sm text-muted-foreground">
            {{ statusFilter === 'active' ? 'Добавьте первый продукт' : 'В этом разделе пока ничего нет' }}
          </p>
        </div>
        <Button v-if="canWrite && statusFilter === 'active'" @click="openCreate" variant="outline" class="gap-2 mt-2">
          <Plus class="size-4" />
          Добавить продукт
        </Button>
      </div>
    </div>

    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Название</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Создан</TableHead>
            <TableHead class="text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="item in filteredItems" :key="item.id">
            <TableCell class="font-mono text-xs">{{ item.sku }}</TableCell>
            <TableCell class="font-medium">
              {{ item.name }}
              <div v-if="item.description" class="text-xs text-muted-foreground mt-0.5">
                {{ item.description }}
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <ProductStatusBadge :status="item.status" />
                <Loader2 v-if="item.status === ProductStatus.DeletionPending" class="size-4 animate-spin text-muted-foreground" />
              </div>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ formatDate(item.createdAt) }}
            </TableCell>
            <TableCell class="text-right">
              <div class="flex items-center justify-end gap-2">
                <template v-if="item.status === ProductStatus.Active">
                  <Button v-if="canWrite" @click="openEdit(item)" variant="ghost" size="sm" class="gap-1.5">
                    <Pencil class="size-3.5" />
                    Изменить
                  </Button>
                  <Button v-if="canWrite" @click="openArchive(item)" variant="ghost" size="sm" class="gap-1.5">
                    <Archive class="size-3.5" />
                    Архив
                  </Button>
                  <Button 
                    v-if="canWrite" 
                    @click="openDelete(item)" 
                    variant="ghost" 
                    size="sm" 
                    class="gap-1.5 text-destructive hover:text-destructive"
                    :disabled="deletingProductIds.has(item.id)"
                  >
                    <Trash2 class="size-3.5" />
                    {{ deletingProductIds.has(item.id) ? 'Удаление...' : 'Удалить' }}
                  </Button>
                </template>

                <template v-else-if="item.status === ProductStatus.Archived">
                  <Button v-if="canWrite" @click="openRestore(item)" variant="ghost" size="sm" class="gap-1.5">
                    <Undo2 class="size-3.5" />
                    Восстановить
                  </Button>
                </template>

                <template v-else-if="item.status === ProductStatus.DeletionPending">
                  <span class="text-xs text-muted-foreground">Проверяем историю продаж...</span>
                </template>

                <template v-else-if="item.status === ProductStatus.DeletionFailed">
                  <div class="flex items-center gap-2">
                    <AlertTriangle class="size-4 text-destructive" />
                    <span class="text-xs text-muted-foreground">Есть история продаж</span>
                    <Button v-if="canWrite" @click="openRestore(item)" variant="ghost" size="sm" class="gap-1.5">
                      <Undo2 class="size-3.5" />
                      Восстановить
                    </Button>
                    <Button v-if="canWrite" @click="openArchive(item)" variant="ghost" size="sm" class="gap-1.5">
                      <Archive class="size-3.5" />
                      Архив
                    </Button>
                  </div>
                </template>
              </div>
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
              <DialogTitle class="text-lg font-semibold">Добавить продукт</DialogTitle>
              <DialogDescription class="text-sm text-muted-foreground mt-1">
                Создайте новый продукт в каталоге
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
                placeholder="Название продукта" 
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="create-description">Описание</Label>
              <Input 
                id="create-description" 
                v-model="form.description" 
                placeholder="Краткое описание" 
                :class="inputClass"
              />
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
              <DialogTitle class="text-lg font-semibold">Изменить продукт</DialogTitle>
              <DialogDescription class="text-sm text-muted-foreground mt-1">
                Обновите информацию о продукте
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
                placeholder="Название продукта" 
                :class="inputClass"
              />
            </div>

            <div :class="fieldClass">
              <Label for="edit-description">Описание</Label>
              <Input 
                id="edit-description" 
                v-model="form.description" 
                placeholder="Краткое описание" 
                :class="inputClass"
              />
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

    <!-- Delete Confirmation -->
    <AlertDialogRoot v-model:open="deleteDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/50" />
        <AlertDialogContent class="fixed top-[50%] left-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]">
          <AlertDialogTitle>Удалить продукт?</AlertDialogTitle>
          <AlertDialogDescription>
            Будет выполнена проверка наличия заказов с этим продуктом. Если заказы существуют, удаление будет отменено.
            Это действие может занять несколько секунд.
          </AlertDialogDescription>
          <div class="flex justify-end gap-3 mt-6">
            <AlertDialogCancel as-child>
              <Button variant="outline" :disabled="isDeleting">Отмена</Button>
            </AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button @click="handleDelete" variant="destructive" :disabled="isDeleting">
                <Spinner v-if="isDeleting" class="mr-2" />
                {{ isDeleting ? 'Удаление...' : 'Удалить' }}
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>

    <!-- Archive Confirmation -->
    <AlertDialogRoot v-model:open="archiveDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/50" />
        <AlertDialogContent class="fixed top-[50%] left-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]">
          <AlertDialogTitle>Переместить в архив?</AlertDialogTitle>
          <AlertDialogDescription>
            Продукт будет скрыт из активного списка, но все данные и история продаж сохранятся.
            Вы сможете восстановить его в любое время.
          </AlertDialogDescription>
          <div class="flex justify-end gap-3 mt-6">
            <AlertDialogCancel as-child>
              <Button variant="outline" :disabled="isSaving">Отмена</Button>
            </AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button @click="handleArchive" :disabled="isSaving">
                <Spinner v-if="isSaving" class="mr-2" />
                {{ isSaving ? 'Архивация...' : 'В архив' }}
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>

    <!-- Restore Confirmation -->
    <AlertDialogRoot v-model:open="restoreDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/50" />
        <AlertDialogContent class="fixed top-[50%] left-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]">
          <AlertDialogTitle>Восстановить продукт?</AlertDialogTitle>
          <AlertDialogDescription>
            Продукт станет активным и снова появится в основном списке.
          </AlertDialogDescription>
          <div class="flex justify-end gap-3 mt-6">
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
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </div>
</template>
