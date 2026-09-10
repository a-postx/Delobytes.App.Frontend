<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Trash2, FlaskConical, Info } from 'lucide-vue-next'
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
import { rawMaterialRatesApi } from '@/services/api'
import { productsApi } from '@/services/api'
import type { RawMaterialRateItem, CreateRawMaterialRateRequest } from '@/services/api'
import type { Product } from '@/types'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { X } from 'lucide-vue-next'

const { canWrite } = useCurrentUser()

const items = ref<RawMaterialRateItem[]>([])
const products = ref<Product[]>([])
const isLoading = ref<boolean>(true)

const createDialogOpen = ref<boolean>(false)
const deleteDialogOpen = ref<boolean>(false)
const deleteTarget = ref<RawMaterialRateItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)

const form = ref({ productId: '', costPerUnit: 0, validFrom: '' })

const formatDate = (d: string): string =>
  new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

const formatCurrency = (v: number): string =>
  v.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 })

const productName = (id: string): string => products.value.find(p => p.id === id)?.name ?? id.slice(0, 8) + '...'

const loadData = async (): Promise<void> => {
  isLoading.value = true
  try {
    const [ratesResp, productsData] = await Promise.all([
      rawMaterialRatesApi.getAll(),
      productsApi.getAll(),
    ])
    items.value = ratesResp.items
    products.value = productsData
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
    costPerUnit: 0,
    validFrom: new Date().toISOString().slice(0, 10),
  }
  createDialogOpen.value = true
}

const openDelete = (item: RawMaterialRateItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const handleCreate = async (): Promise<void> => {
  if (!form.value.productId) { toast.error('Выберите товар'); return }
  if (!form.value.validFrom) { toast.error('Укажите дату начала действия'); return }
  isSaving.value = true
  try {
    const payload: CreateRawMaterialRateRequest = {
      productId: form.value.productId,
      costPerUnit: Number(form.value.costPerUnit),
      validFrom: form.value.validFrom,
    }
    await rawMaterialRatesApi.create(payload)
    toast.success('Стоимость сырья добавлена')
    createDialogOpen.value = false
    await loadData()
  } catch {
    toast.error('Не удалось создать запись стоимости сырья')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await rawMaterialRatesApi.delete(deleteTarget.value.id)
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
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-bold flex items-center gap-2">
          <FlaskConical class="size-5 text-primary" />
          Стоимость сырья
        </h1>
        <p class="text-sm text-muted-foreground">История закупочных цен сырья по каждому товару</p>
      </div>
      <Button v-if="canWrite" @click="openCreate" :disabled="products.length === 0" class="gap-2">
        <Plus class="size-4" />
        Добавить запись
      </Button>
    </div>

    <!-- Info note -->
    <div class="flex items-start gap-3 rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-sm text-muted-foreground">
      <Info class="size-4 mt-0.5 shrink-0 text-info" />
      <p>Каждая запись — отдельная версия стоимости. Новая запись не перезаписывает предыдущие, что сохраняет точность исторических расчётов себестоимости. Активная запись — с наибольшей датой ValidFrom ≤ даты расчёта.</p>
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
      <FlaskConical class="size-10 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">Записи стоимости сырья не добавлены</p>
      <Button v-if="canWrite && products.length > 0" variant="outline" size="sm" @click="openCreate" class="gap-2">
        <Plus class="size-4" /> Добавить первую
      </Button>
      <p v-if="products.length === 0" class="text-xs text-muted-foreground">Сначала добавьте товары в систему</p>
    </div>

    <!-- Table -->
    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="border-b border-border">
            <TableHead>Товар</TableHead>
            <TableHead class="text-right">Себестоимость / ед.</TableHead>
            <TableHead>Действует с</TableHead>
            <TableHead>Добавлена</TableHead>
            <TableHead v-if="canWrite" class="w-16 text-right">Удалить</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="item in items"
            :key="item.id"
            class="hover:bg-muted/40 transition-colors"
          >
            <TableCell class="font-medium">{{ productName(item.productId) }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ formatCurrency(item.costPerUnit) }}</TableCell>
            <TableCell class="tabular-nums text-muted-foreground">{{ item.validFrom }}</TableCell>
            <TableCell class="text-muted-foreground text-sm">{{ formatDate(item.createdAt) }}</TableCell>
            <TableCell v-if="canWrite" class="text-right">
              <button
                @click="openDelete(item)"
                class="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                title="Удалить запись"
              ><Trash2 class="size-3.5" /></button>
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
          <DialogTitle class="text-lg font-semibold mb-4">Добавить стоимость сырья</DialogTitle>
          <DialogDescription class="sr-only">Форма добавления версии стоимости сырья</DialogDescription>
          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label for="rm-product">Товар <span class="text-destructive">*</span></Label>
              <select
                id="rm-product"
                v-model="form.productId"
                class="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3"
              >
                <option value="" disabled>Выберите товар</option>
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>
            <div :class="fieldClass">
              <Label for="rm-cost">Себестоимость / ед. (₽)</Label>
              <Input id="rm-cost" v-model="form.costPerUnit" type="number" min="0" step="0.01" :class="inputClass" />
            </div>
            <div :class="fieldClass">
              <Label for="rm-from">Действует с <span class="text-destructive">*</span></Label>
              <Input id="rm-from" v-model="form.validFrom" type="date" :class="inputClass" />
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

    <!-- Delete confirm -->
    <AlertDialogRoot v-model:open="deleteDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-30 bg-black/60" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 z-[100]">
          <AlertDialogTitle class="text-base font-semibold">Удалить запись стоимости?</AlertDialogTitle>
          <AlertDialogDescription class="mt-2 text-sm text-muted-foreground">
            Запись с датой {{ deleteTarget?.validFrom }} для товара «{{ productName(deleteTarget?.productId ?? '') }}» будет удалена.
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
