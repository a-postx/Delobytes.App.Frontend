<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Pencil, Trash2, DollarSign } from 'lucide-vue-next'
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
import { toast } from 'vue-sonner'
import { productChannelCostsApi, costTypesApi } from '@/services/api'
import type {
  ProductChannelCostItem,
  CreateProductChannelCostRequest,
  CostTypeItem,
} from '@/services/api'
import { productsApi } from '@/services/api'
import type { Product } from '@/types'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { X } from 'lucide-vue-next'

const { canWrite } = useCurrentUser()

const items = ref<ProductChannelCostItem[]>([])
const products = ref<Product[]>([])
const costTypes = ref<CostTypeItem[]>([])
const isLoading = ref<boolean>(true)

const createDialogOpen = ref<boolean>(false)
const editDialogOpen = ref<boolean>(false)
const deleteDialogOpen = ref<boolean>(false)

const editTarget = ref<ProductChannelCostItem | null>(null)
const deleteTarget = ref<ProductChannelCostItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)

const filterProductId = ref<string>('')

const form = ref({ productId: '', channelId: '', costTypeId: '', amount: '' })
const editForm = ref({ amount: '' })

const activeCostTypes = computed(() => costTypes.value.filter(ct => ct.isActive))

const productName = (id: string): string =>
  products.value.find(p => p.id === id)?.name ?? id.slice(0, 8) + '...'

const formatAmount = (amount: number): string =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 2 }).format(amount)

const filteredItems = computed<ProductChannelCostItem[]>(() => {
  if (!filterProductId.value) return items.value
  return items.value.filter(i => i.productId === filterProductId.value)
})

const loadData = async (): Promise<void> => {
  isLoading.value = true
  try {
    const [productsData, costTypesResp] = await Promise.all([
      productsApi.getAll(),
      costTypesApi.getAll(),
    ])
    products.value = productsData
    costTypes.value = costTypesResp.items

    if (filterProductId.value) {
      const resp = await productChannelCostsApi.getByProduct(filterProductId.value)
      items.value = resp.items
    } else if (products.value.length > 0) {
      const allResults = await Promise.all(
        products.value.map(p => productChannelCostsApi.getByProduct(p.id))
      )
      items.value = allResults.flatMap(r => r.items)
    }
  } catch {
    toast.error('Не удалось загрузить данные')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)

const openCreate = (): void => {
  form.value = {
    productId: products.value[0]?.id ?? '',
    channelId: '',
    costTypeId: activeCostTypes.value[0]?.id ?? '',
    amount: '',
  }
  createDialogOpen.value = true
}

const openEdit = (item: ProductChannelCostItem): void => {
  editTarget.value = item
  editForm.value = { amount: String(item.amount) }
  editDialogOpen.value = true
}

const openDelete = (item: ProductChannelCostItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const handleCreate = async (): Promise<void> => {
  if (!form.value.productId) { toast.error('Выберите товар'); return }
  if (!form.value.channelId.trim()) { toast.error('Укажите ID канала'); return }
  if (!form.value.costTypeId) { toast.error('Выберите тип расхода'); return }
  const amount = Number(form.value.amount)
  if (isNaN(amount) || amount < 0) { toast.error('Укажите корректную сумму'); return }

  isSaving.value = true
  try {
    const payload: CreateProductChannelCostRequest = {
      productId: form.value.productId,
      channelId: form.value.channelId.trim(),
      costTypeId: form.value.costTypeId,
      amount,
    }
    await productChannelCostsApi.create(payload)
    toast.success('Расход добавлен')
    createDialogOpen.value = false
    await loadData()
  } catch {
    toast.error('Не удалось создать запись')
  } finally {
    isSaving.value = false
  }
}

const handleEdit = async (): Promise<void> => {
  if (!editTarget.value) return
  const amount = Number(editForm.value.amount)
  if (isNaN(amount) || amount < 0) { toast.error('Укажите корректную сумму'); return }
  isSaving.value = true
  try {
    await productChannelCostsApi.update(editTarget.value.id, { amount })
    toast.success('Сумма обновлена')
    editDialogOpen.value = false
    await loadData()
  } catch {
    toast.error('Не удалось обновить запись')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await productChannelCostsApi.delete(deleteTarget.value.id)
    toast.success('Запись удалена')
    deleteDialogOpen.value = false
    await loadData()
  } catch {
    toast.error('Не удалось удалить запись')
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
          <DollarSign class="size-5 text-primary" />
          Расходы по каналам
        </h1>
        <p class="text-sm text-muted-foreground">Расходы продукта в разрезе каналов продаж</p>
      </div>
      <div class="flex items-center gap-3">
        <select
          v-model="filterProductId"
          @change="loadData"
          class="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3"
        >
          <option value="">Все товары</option>
          <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <Button v-if="canWrite" @click="openCreate" :disabled="products.length === 0 || activeCostTypes.length === 0" class="gap-2">
          <Plus class="size-4" />
          Добавить
        </Button>
      </div>
    </div>

    <div v-if="activeCostTypes.length === 0 && !isLoading" class="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted-foreground">
      <p>Нет активных типов расходов. Сначала добавьте типы в справочнике «Типы расходов».</p>
    </div>

    <div v-if="isLoading" class="rounded-xl border border-border bg-card overflow-hidden">
      <div class="p-4 flex flex-col gap-3">
        <Skeleton v-for="n in 4" :key="n" class="h-10 w-full rounded-lg" />
      </div>
    </div>

    <div
      v-else-if="filteredItems.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center"
    >
      <DollarSign class="size-10 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">Расходы не добавлены</p>
      <Button v-if="canWrite && products.length > 0 && activeCostTypes.length > 0" variant="outline" size="sm" @click="openCreate" class="gap-2">
        <Plus class="size-4" /> Добавить первую запись
      </Button>
    </div>

    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="border-b border-border">
            <TableHead>Товар</TableHead>
            <TableHead>Канал (ID)</TableHead>
            <TableHead>Тип расхода</TableHead>
            <TableHead class="text-right">Сумма</TableHead>
            <TableHead v-if="canWrite" class="w-24 text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="item in filteredItems"
            :key="item.id"
            class="hover:bg-muted/40 transition-colors"
          >
            <TableCell class="font-medium">{{ productName(item.productId) }}</TableCell>
            <TableCell class="text-muted-foreground font-mono text-xs">{{ item.channelId.slice(0, 8) }}…</TableCell>
            <TableCell>{{ item.costTypeName }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ formatAmount(item.amount) }}</TableCell>
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
            <DialogTitle class="text-lg font-semibold">Новый расход</DialogTitle>
            <DialogClose as-child>
              <Button variant="ghost" size="icon" class="size-8"><X class="size-4" /></Button>
            </DialogClose>
          </div>
          <DialogDescription class="sr-only">Форма добавления расхода по каналу</DialogDescription>
          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label>Товар</Label>
              <select v-model="form.productId" class="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3">
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div :class="fieldClass">
              <Label>ID канала</Label>
              <Input :class="inputClass" v-model="form.channelId" placeholder="UUID канала продаж" />
            </div>
            <div :class="fieldClass">
              <Label>Тип расхода</Label>
              <select v-model="form.costTypeId" class="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3">
                <option v-for="ct in activeCostTypes" :key="ct.id" :value="ct.id">{{ ct.name }}</option>
              </select>
            </div>
            <div :class="fieldClass">
              <Label>Сумма, ₽</Label>
              <Input :class="inputClass" v-model="form.amount" type="number" min="0" step="0.01" placeholder="0.00" />
            </div>
            <div class="flex justify-end gap-2 mt-2">
              <DialogClose as-child>
                <Button variant="outline">Отмена</Button>
              </DialogClose>
              <Button @click="handleCreate" :disabled="isSaving">
                <Spinner v-if="isSaving" class="mr-2 size-4" />
                Добавить
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
            <DialogTitle class="text-lg font-semibold">Изменить сумму</DialogTitle>
            <DialogClose as-child>
              <Button variant="ghost" size="icon" class="size-8"><X class="size-4" /></Button>
            </DialogClose>
          </div>
          <DialogDescription class="sr-only">Редактирование суммы расхода</DialogDescription>
          <div class="flex flex-col gap-4">
            <p class="text-sm text-muted-foreground">
              {{ productName(editTarget?.productId ?? '') }} — {{ editTarget?.costTypeName }}
            </p>
            <div :class="fieldClass">
              <Label>Сумма, ₽</Label>
              <Input :class="inputClass" v-model="editForm.amount" type="number" min="0" step="0.01" />
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
          <AlertDialogTitle class="text-lg font-semibold">Удалить запись?</AlertDialogTitle>
          <AlertDialogDescription class="mt-2 text-sm text-muted-foreground">
            Расход «{{ deleteTarget?.costTypeName }}» — {{ formatAmount(deleteTarget?.amount ?? 0) }} будет удалён без возможности восстановления.
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
