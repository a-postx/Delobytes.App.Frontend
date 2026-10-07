<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Trash2, Gauge, Pencil, History, X } from 'lucide-vue-next'
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
import { productWorkRatesApi, catalogProductsApi, workRatesApi } from '@/services/api'
import type {
  ProductWorkRateItem,
  CreateProductWorkRateRequest,
  UpdateProductWorkRateRequest,
  WorkRateItem,
} from '@/services/api'
import type { ProductItem } from '@/types/products'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useTenantMoney } from '@/composables/useTenantMoney'
import { useApiCall } from '@/composables/useApiCall'
import { ErrorCodes } from '@/types/errors'
import type { ApiError } from '@/types/errors'

const { canWrite } = useCurrentUser()
const { formatMoney } = useTenantMoney()

const items = ref<ProductWorkRateItem[]>([])
const products = ref<ProductItem[]>([])
const workRates = ref<WorkRateItem[]>([])

const createDialogOpen = ref<boolean>(false)
const editDialogOpen = ref<boolean>(false)
const deleteDialogOpen = ref<boolean>(false)

const editTarget = ref<ProductWorkRateItem | null>(null)
const deleteTarget = ref<ProductWorkRateItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)

const statusFilter = ref<'all' | 'active' | 'inactive'>('active')

const today = (): string => new Date().toISOString().slice(0, 10)

const form = ref({ productId: '', workRateId: '', assemblyRatePerDay: 0, validFrom: today() })
const editForm = ref({ workRateId: '', assemblyRatePerDay: 0, validFrom: '' })

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

const formatDate = (d: string): string =>
  new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

const productName = (id: string): string => products.value.find(p => p.id === id)?.name ?? id.slice(0, 8) + '...'

const activeWorkRates = (): WorkRateItem[] => workRates.value.filter(r => r.isActive)

const workRateLabel = (id: string): string => {
  const rate = workRates.value.find(r => r.id === id)
  if (!rate) return id.slice(0, 8) + '...'
  return `${rate.name} (${formatMoney(rate.dailyWage)}/день)`
}

/** Дата новой версии в прошлом меняет исторические расчёты — предупреждаем, как isPriceDateInPast в ComponentsView. */
const isNewRateDateInPast = computed<boolean>(() => {
  if (!form.value.validFrom) return false
  return form.value.validFrom < today()
})

/** Остальные версии того же товара (кроме редактируемой) — для проверки порядка дат без лишнего запроса. */
const otherVersionsOf = (productId: string, excludeId: string | null): ProductWorkRateItem[] =>
  items.value.filter(i => i.productId === productId && i.id !== excludeId)

const { loading: isLoading, execute: fetchData } = useApiCall({
  fallbackMessage: 'Не удалось загрузить данные',
})

const conflictMessage = 'Запись была изменена другим пользователем. Закройте диалог и попробуйте снова.'

const { execute: createRate } = useApiCall({
  fallbackMessage: 'Не удалось создать запись нормы выработки',
  errorHandlers: {
    [ErrorCodes.Catalog.ProductWorkRateValidFromConflict]: (error: ApiError) => {
      toast.error(error.message || 'Версия с такой датой начала уже существует')
    },
    [ErrorCodes.Common.Conflict]: () => {
      // Конкурентный POST по тому же товару: кто-то успел деактивировать предыдущую версию первым.
      toast.error(conflictMessage)
      createDialogOpen.value = false
      void loadData()
    },
  },
})

const { execute: updateRate } = useApiCall({
  fallbackMessage: 'Не удалось сохранить изменения',
  errorHandlers: {
    [ErrorCodes.Catalog.ProductWorkRateValidFromConflict]: (error: ApiError) => {
      toast.error(error.message || 'Версия с такой датой начала уже существует')
    },
    [ErrorCodes.Catalog.ProductWorkRateValidFromNotLatest]: (error: ApiError) => {
      toast.error(error.message || 'Дата начала действия должна быть позже даты предыдущей версии')
    },
    [ErrorCodes.Catalog.ProductWorkRateNotFound]: () => {
      toast.error('Запись больше не активна и не может быть отредактирована')
      editDialogOpen.value = false
      void loadData()
    },
    [ErrorCodes.Common.Conflict]: () => {
      // Оптимистическая блокировка (xmin) на сервере: запись успели изменить параллельно.
      toast.error(conflictMessage)
      editDialogOpen.value = false
      void loadData()
    },
  },
})

const { execute: deleteRate } = useApiCall({
  fallbackMessage: 'Не удалось удалить запись',
})

const loadData = async (): Promise<void> => {
  await fetchData(async () => {
    const [ratesResp, productsResp, workRatesResp] = await Promise.all([
      productWorkRatesApi.getAll(),
      catalogProductsApi.getAll(),
      workRatesApi.getAll(),
    ])
    items.value = ratesResp.items
    products.value = productsResp.items
    workRates.value = workRatesResp.items
    return { ratesResp, productsResp, workRatesResp }
  })
}

onMounted(loadData)

const resetCreateForm = (): void => {
  form.value = {
    productId: products.value[0]?.id ?? '',
    workRateId: activeWorkRates()[0]?.id ?? '',
    assemblyRatePerDay: 0,
    validFrom: today(),
  }
}

const openCreate = (): void => {
  resetCreateForm()
  createDialogOpen.value = true
}

/** Новая версия по строке: товар и текущая ставка работы подставляются, дата — сегодня. */
const openNewRate = (item: ProductWorkRateItem): void => {
  form.value = {
    productId: item.productId,
    workRateId: item.workRateId,
    assemblyRatePerDay: item.assemblyRatePerDay,
    validFrom: today(),
  }
  createDialogOpen.value = true
}

const openEdit = (item: ProductWorkRateItem): void => {
  editTarget.value = item
  editForm.value = {
    workRateId: item.workRateId,
    assemblyRatePerDay: item.assemblyRatePerDay,
    validFrom: item.validFrom,
  }
  editDialogOpen.value = true
}

const openDelete = (item: ProductWorkRateItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0

const handleCreate = async (): Promise<void> => {
  if (!form.value.productId) { toast.error('Выберите товар'); return }
  if (!form.value.workRateId) { toast.error('Выберите ставку работы'); return }
  if (!isPositiveInteger(Number(form.value.assemblyRatePerDay))) {
    toast.error('Укажите количество единиц в день целым числом больше нуля')
    return
  }
  if (!form.value.validFrom) { toast.error('Укажите дату начала действия'); return }
  isSaving.value = true
  try {
    const payload: CreateProductWorkRateRequest = {
      productId: form.value.productId,
      workRateId: form.value.workRateId,
      assemblyRatePerDay: Number(form.value.assemblyRatePerDay),
      validFrom: form.value.validFrom,
    }
    await createRate(() => productWorkRatesApi.create(payload))
    toast.success('Норма выработки добавлена')
    createDialogOpen.value = false
    await loadData()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isSaving.value = false
  }
}

const handleUpdate = async (): Promise<void> => {
  if (!editTarget.value) return
  if (!editForm.value.workRateId) { toast.error('Выберите ставку работы'); return }
  if (!isPositiveInteger(Number(editForm.value.assemblyRatePerDay))) {
    toast.error('Укажите количество единиц в день целым числом больше нуля')
    return
  }
  if (!editForm.value.validFrom) {
    toast.error('Укажите дату начала действия')
    return
  }
  const others = otherVersionsOf(editTarget.value.productId, editTarget.value.id)
  const isNotLatest = others.some(o => editForm.value.validFrom <= o.validFrom)
  if (isNotLatest) {
    toast.error('Дата начала действия должна быть позже даты всех остальных версий этого товара')
    return
  }
  isSaving.value = true
  try {
    const payload: UpdateProductWorkRateRequest = {
      workRateId: editForm.value.workRateId,
      assemblyRatePerDay: Number(editForm.value.assemblyRatePerDay),
      validFrom: editForm.value.validFrom,
    }
    await updateRate(() => productWorkRatesApi.update(editTarget.value!.id, payload))
    toast.success('Норма выработки обновлена')
    editDialogOpen.value = false
    await loadData()
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
    await deleteRate(() => productWorkRatesApi.delete(deleteTarget.value!.id))
    toast.success('Запись удалена')
    deleteDialogOpen.value = false
    await loadData()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isDeleting.value = false
  }
}

const dialogContentClass = 'bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[480px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100] overflow-y-auto'
const fieldClass = 'flex flex-col gap-1'
const inputClass = 'mt-1'
const selectClass = 'mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'
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

    <StatusFilter v-model="statusFilter" :options="filterOptions" />

    <!-- Loading -->
    <div v-if="isLoading" class="rounded-xl border border-border bg-card overflow-hidden">
      <div class="p-4 flex flex-col gap-3">
        <Skeleton v-for="n in 4" :key="n" class="h-10 w-full rounded-lg" />
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="filteredItems.length === 0"
      class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center"
    >
      <Gauge class="size-10 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">
        {{ statusFilter === 'inactive' ? 'Нет неактивных записей' : 'Нормы выработки не добавлены' }}
      </p>
      <Button
        v-if="canWrite && statusFilter !== 'inactive' && products.length > 0"
        variant="outline"
        size="sm"
        @click="openCreate"
        class="gap-2"
      >
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
            <TableHead>Статус</TableHead>
            <TableHead>Добавлена</TableHead>
            <TableHead v-if="canWrite" class="w-32 text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="item in filteredItems"
            :key="item.id"
            class="hover:bg-muted/40 transition-colors"
          >
            <TableCell class="font-medium">{{ productName(item.productId) }}</TableCell>
            <TableCell class="text-muted-foreground">{{ workRateLabel(item.workRateId) }}</TableCell>
            <TableCell class="text-right tabular-nums font-medium">{{ item.assemblyRatePerDay }}</TableCell>
            <TableCell class="tabular-nums text-muted-foreground">{{ item.validFrom }}</TableCell>
            <TableCell>
              <Badge :variant="item.isActive ? 'success' : 'secondary'">
                {{ item.isActive ? 'Активна' : 'Неактивна' }}
              </Badge>
            </TableCell>
            <TableCell class="tabular-nums text-muted-foreground text-sm">{{ formatDate(item.createdAt) }}</TableCell>
            <TableCell v-if="canWrite" class="text-right">
              <div v-if="item.isActive" class="flex items-center justify-end gap-1">
                <Button variant="ghost" size="icon-sm" @click="openEdit(item)" title="Изменить">
                  <Pencil class="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" @click="openNewRate(item)" title="Новая норма">
                  <History class="size-4" />
                </Button>
                <Button variant="ghost" size="icon-sm" @click="openDelete(item)" title="Удалить">
                  <Trash2 class="size-4 text-destructive" />
                </Button>
              </div>
              <span v-else class="text-xs text-muted-foreground">—</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Create / New Version Dialog -->
    <DialogRoot v-model:open="createDialogOpen">
      <DialogPortal>
        <DialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-center justify-between mb-4">
            <DialogTitle class="text-lg font-semibold">Новая норма</DialogTitle>
            <DialogClose as-child>
              <Button variant="ghost" size="icon" class="size-8"><X class="size-4" /></Button>
            </DialogClose>
          </div>
          <DialogDescription class="text-sm text-muted-foreground mb-4">
            Укажите товар, количество единиц в день и дату начала действия нормы. Запись добавляется
            как новая версия, предыдущая активная версия этого товара будет деактивирована.
          </DialogDescription>

          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label>Товар</Label>
              <select
                v-model="form.productId"
                :class="selectClass"
              >
                <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </div>

            <div :class="fieldClass">
              <Label>Ставка работы *</Label>
              <select
                v-model="form.workRateId"
                :class="selectClass"
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
              <Input :class="inputClass" v-model.number="form.assemblyRatePerDay" type="number" min="1" step="1" placeholder="100" />
            </div>

            <div :class="fieldClass">
              <Label>Действует с</Label>
              <Input :class="inputClass" v-model="form.validFrom" type="date" />
              <p v-if="isNewRateDateInPast" class="text-xs text-amber-600 mt-1">
                Дата в прошлом изменит расчёты себестоимости за прошлые периоды
              </p>
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

    <!-- Edit Dialog -->
    <DialogRoot v-model:open="editDialogOpen">
      <DialogPortal>
        <DialogOverlay class="bg-background/80 backdrop-blur-sm fixed inset-0 z-50" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-start justify-between mb-4">
            <div>
              <DialogTitle class="text-lg font-semibold">Изменить норму</DialogTitle>
              <DialogDescription class="text-sm text-muted-foreground mt-1">
                Исправление ставки, нормы или даты в текущей версии без создания новой записи истории
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
              <Label>Товар</Label>
              <p class="text-sm font-medium mt-1">{{ editTarget ? productName(editTarget.productId) : '' }}</p>
            </div>

            <div :class="fieldClass">
              <Label for="edit-work-rate">Ставка работы *</Label>
              <select id="edit-work-rate" v-model="editForm.workRateId" :class="selectClass">
                <option
                  v-if="editTarget && !activeWorkRates().some(r => r.id === editTarget!.workRateId)"
                  :value="editTarget.workRateId"
                >
                  {{ workRateLabel(editTarget.workRateId) }} (неактивна)
                </option>
                <option v-for="r in activeWorkRates()" :key="r.id" :value="r.id">
                  {{ r.name }} ({{ formatMoney(r.dailyWage) }}/день)
                </option>
              </select>
            </div>

            <div :class="fieldClass">
              <Label for="edit-rate">Норма в день (шт.) *</Label>
              <Input
                id="edit-rate"
                :class="inputClass"
                v-model.number="editForm.assemblyRatePerDay"
                type="number"
                min="1"
                step="1"
              />
            </div>

            <div :class="fieldClass">
              <Label for="edit-valid-from">Действует с *</Label>
              <Input id="edit-valid-from" :class="inputClass" v-model="editForm.validFrom" type="date" />
            </div>

            <p v-if="editTarget?.updatedAt" class="text-xs text-muted-foreground">
              Последнее изменение: {{ formatDate(editTarget.updatedAt) }}
            </p>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <DialogClose as-child>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button @click="handleUpdate" :disabled="isSaving" class="gap-2">
              <Spinner v-if="isSaving" class="size-4" />
              Сохранить
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
