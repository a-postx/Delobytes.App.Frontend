<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Trash2, Gauge, Info } from 'lucide-vue-next'
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
import { productWorkRatesApi, catalogProductsApi, workRatesApi } from '@/services/api'
import type { ProductWorkRateItem, CreateProductWorkRateRequest, WorkRateItem } from '@/services/api'
import type { ProductItem } from '@/types/products'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useTenantMoney } from '@/composables/useTenantMoney'
import { X } from 'lucide-vue-next'

const { canWrite } = useCurrentUser()
const { formatMoney } = useTenantMoney()

const items = ref<ProductWorkRateItem[]>([])
const products = ref<ProductItem[]>([])
const workRates = ref<WorkRateItem[]>([])
const isLoading = ref<boolean>(true)

const createDialogOpen = ref<boolean>(false)
const deleteDialogOpen = ref<boolean>(false)
const deleteTarget = ref<ProductWorkRateItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)

const form = ref({ productId: '', workRateId: '', assemblyRatePerDay: 0, validFrom: '' })

const formatDate = (d: string): string =>
  new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

const productName = (id: string): string => products.value.find(p => p.id === id)?.name ?? id.slice(0, 8) + '...'

const activeWorkRates = (): WorkRateItem[] => workRates.value.filter(r => r.isActive)

const workRateLabel = (id: string): string => {
  const rate = workRates.value.find(r => r.id === id)
  if (!rate) return id.slice(0, 8) + '...'
  return `${rate.name} (${formatMoney(rate.dailyWage)}/день)`
}

const loadData = async (): Promise<void> => {
  isLoading.value = true
  try {
    const [ratesResp, productsResp, workRatesResp] = await Promise.all([
      productWorkRatesApi.getAll(),
      catalogProductsApi.getAll(),
      workRatesApi.getAll(),
    ])
    items.value = ratesResp.items
    products.value = productsResp.items
    workRates.value = workRatesResp.items
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
    workRateId: activeWorkRates()[0]?.id ?? '',
    assemblyRatePerDay: 0,
    validFrom: new Date().toISOString().slice(0, 10),
  }
  createDialogOpen.value = true
}

const openDelete = (item: ProductWorkRateItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const handleCreate = async (): Promise<void> => {
  if (!form.value.productId) { toast.error('Выберите товар'); return }
  if (!form.value.workRateId) { toast.error('Выберите ставку работы'); return }
  if (form.value.assemblyRatePerDay <= 0) { toast.error('Укажите количество единиц в день'); return }
  if (!form.value.validFrom) { toast.error('Укажите дату начала действия'); return }
  isSaving.value = true
  try {
    const payload: CreateProductWorkRateRequest = {
      productId: form.value.productId,
      workRateId: form.value.workRateId,
      assemblyRatePerDay: Number(form.value.assemblyRatePerDay),
      validFrom: form.value.validFrom,
    }
    await productWorkRatesApi.create(payload)
    toast.success('Норма выработки добавлена')
    createDialogOpen.value = false
    await loadData()
  } catch {
    toast.error('Не удалось создать запись нормы выработки')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await productWorkRatesApi.delete(deleteTarget.value.id)
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
          <Gauge class="size-5 text-primary" />
          Нормы выработки
        </h1>
        <p class="text-sm text-muted-foreground">Количество единиц товара в день на одного сотрудника по товару</p>
      </div>
      <Button v-if="canWrite" @click="openCreate" :disabled="products.length === 0" class="gap-2">
        <Plus class="size-4" />
        Добавить запись
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
      <Gauge class="size-10 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">Нормы выработки не добавлены</p>
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
            <TableHead>Ставка работы</TableHead>
            <TableHead class="text-right">Норма / день (шт.)</TableHead>
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
            <TableCell class="text-muted-foreground">{{ workRateLabel(item.workRateId) }}</TableCell>
            <TableCell class="text-right tabular-nums font-medium">{{ item.assemblyRatePerDay }}</TableCell>
            <TableCell class="tabular-nums text-muted-foreground">{{ item.validFrom }}</TableCell>
            <TableCell class="tabular-nums text-muted-foreground text-sm">{{ formatDate(item.createdAt) }}</TableCell>
            <TableCell v-if="canWrite" class="text-right">
              <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="openDelete(item)">
                <Trash2 class="size-4" />
              </Button>
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
          <div class="flex items-center justify-between mb-4">
            <DialogTitle class="text-lg font-semibold">Добавить норму выработки</DialogTitle>
            <DialogClose as-child>
              <Button variant="ghost" size="icon" class="size-8"><X class="size-4" /></Button>
            </DialogClose>
          </div>
          <DialogDescription class="text-sm text-muted-foreground mb-4">
            Укажите товар, количество единиц в день и дату начала действия нормы.
          </DialogDescription>

          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label>Товар</Label>
              <select
                v-model="form.productId"
                class="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>

            <div :class="fieldClass">
              <Label>Ставка работы *</Label>
              <select
                v-model="form.workRateId"
                class="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option v-if="activeWorkRates().length === 0" value="">Нет активных ставок</option>
                <option v-for="r in activeWorkRates()" :key="r.id" :value="r.id">
                  {{ r.name }} ({{ formatMoney(r.dailyWage) }}/день)
                </option>
              </select>
              <p v-if="activeWorkRates().length === 0" class="text-xs text-destructive">
                Сначала добавьте ставку работы в справочнике «Нормы выработки».
              </p>
            </div>

            <div :class="fieldClass">
              <Label>Норма в день (шт.)</Label>
              <Input :class="inputClass" v-model.number="form.assemblyRatePerDay" type="number" min="1" placeholder="100" />
            </div>

            <div :class="fieldClass">
              <Label>Действует с</Label>
              <Input :class="inputClass" v-model="form.validFrom" type="date" />
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <DialogClose as-child>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button @click="handleCreate" :disabled="isSaving || !form.workRateId" class="gap-2">
              <Spinner v-if="isSaving" class="size-4" />
              Добавить
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Delete Dialog -->
    <AlertDialogRoot v-model:open="deleteDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 bg-black/50 z-[99]" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-w-[420px] w-[90vw] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 z-[100]">
          <AlertDialogTitle class="text-lg font-semibold mb-2">Удалить запись?</AlertDialogTitle>
          <AlertDialogDescription class="text-sm text-muted-foreground mb-4">
            Запись будет помечена как неактивная.
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
