<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Trash2, Hammer, Undo2 } from 'lucide-vue-next'
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
import { workRatesApi } from '@/services/api'
import type { WorkRateItem, CreateWorkRateRequest, UpdateWorkRateRequest } from '@/services/api'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { X } from 'lucide-vue-next'

const { canWrite } = useCurrentUser()

const items = ref<WorkRateItem[]>([])
const isLoading = ref<boolean>(true)

const createDialogOpen = ref<boolean>(false)
const deleteDialogOpen = ref<boolean>(false)
const restoreDialogOpen = ref<boolean>(false)

const deleteTarget = ref<WorkRateItem | null>(null)
const restoreTarget = ref<WorkRateItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)

const statusFilter = ref<'all' | 'active' | 'inactive'>('active')

const form = ref({ name: '', dailyWage: 0, validFrom: '' })

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
  form.value = { name: '', dailyWage: 0, validFrom: new Date().toISOString().slice(0, 10) }
  createDialogOpen.value = true
}

const openDelete = (item: WorkRateItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const openRestore = (item: WorkRateItem): void => {
  restoreTarget.value = item
  restoreDialogOpen.value = true
}

const handleCreate = async (): Promise<void> => {
  if (!form.value.name.trim()) { toast.error('Введите название'); return }
  if (!form.value.validFrom) { toast.error('Укажите дату начала действия'); return }
  isSaving.value = true
  try {
    const payload: CreateWorkRateRequest = {
      name: form.value.name.trim(),
      dailyWage: Number(form.value.dailyWage),
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

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await workRatesApi.delete(deleteTarget.value.id)
    toast.success('Ставка работ деактивирована')
    deleteDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось деактивировать ставку работ')
  } finally {
    isDeleting.value = false
  }
}

const handleRestore = async (): Promise<void> => {
  if (!restoreTarget.value) return
  isSaving.value = true
  try {
    const payload: UpdateWorkRateRequest = {
      isActive: true,
    }
    await workRatesApi.update(restoreTarget.value.id, payload)
    toast.success('Ставка работ восстановлена')
    restoreDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось восстановить ставку работ')
  } finally {
    isSaving.value = false
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

    <!-- Status Filter -->
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
      <Hammer class="size-10 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">
        {{ statusFilter === 'active' ? 'Активные ставки работ не найдены' : statusFilter === 'inactive' ? 'Неактивные ставки работ не найдены' : 'Ставки работ не добавлены' }}
      </p>
      <Button v-if="canWrite && statusFilter === 'active' && items.length === 0" variant="outline" size="sm" @click="openCreate" class="gap-2">
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
            <TableHead>Действует с</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Добавлена</TableHead>
            <TableHead v-if="canWrite" class="w-24 text-right">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="item in filteredItems"
            :key="item.id"
            class="hover:bg-muted/40 transition-colors"
          >
            <TableCell class="font-medium">{{ item.name }}</TableCell>
            <TableCell class="text-right tabular-nums">{{ formatCurrency(item.dailyWage) }}</TableCell>
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
                  v-if="item.isActive"
                  @click="openDelete(item)"
                  class="p-2 hover:bg-muted rounded-md transition-colors"
                  title="Деактивировать"
                >
                  <Trash2 class="size-4 text-muted-foreground hover:text-destructive" />
                </button>
                <button
                  v-else
                  @click="openRestore(item)"
                  class="p-2 hover:bg-muted rounded-md transition-colors"
                  title="Восстановить"
                >
                  <Undo2 class="size-4 text-muted-foreground hover:text-primary" />
                </button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Create Dialog -->
    <DialogRoot v-model:open="createDialogOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 bg-black/60 z-[99]" />
        <DialogContent :class="dialogContentClass">
          <div class="flex items-center justify-between mb-4">
            <DialogTitle class="text-lg font-semibold">Добавить ставку работ</DialogTitle>
            <DialogClose as-child>
              <button class="p-1 hover:bg-muted rounded-md transition-colors">
                <X class="size-4" />
              </button>
            </DialogClose>
          </div>

          <DialogDescription class="text-sm text-muted-foreground mb-4">
            Создайте новую версию ставки оплаты труда. После создания запись редактировать нельзя.
          </DialogDescription>

          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label for="create-name">Название</Label>
              <Input id="create-name" v-model="form.name" placeholder="Например: Базовая ставка Q1 2026" :class="inputClass" />
            </div>

            <div :class="fieldClass">
              <Label for="create-wage">Дневная ставка (руб.)</Label>
              <Input id="create-wage" v-model.number="form.dailyWage" type="number" step="0.01" min="0" :class="inputClass" />
            </div>

            <div :class="fieldClass">
              <Label for="create-validFrom">Действует с</Label>
              <Input id="create-validFrom" v-model="form.validFrom" type="date" :class="inputClass" />
            </div>

            <div class="flex gap-2 mt-2">
              <Button @click="handleCreate" :disabled="isSaving" class="flex-1">
                <Spinner v-if="isSaving" class="size-4 mr-2" />
                {{ isSaving ? 'Создание...' : 'Создать' }}
              </Button>
              <DialogClose as-child>
                <Button variant="outline" :disabled="isSaving">Отмена</Button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Delete Dialog -->
    <AlertDialogRoot v-model:open="deleteDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 bg-black/60 z-[99]" />
        <AlertDialogContent :class="dialogContentClass">
          <AlertDialogTitle class="text-lg font-semibold mb-2">Деактивировать ставку работ</AlertDialogTitle>
          <AlertDialogDescription class="text-sm text-muted-foreground mb-4">
            Вы уверены, что хотите деактивировать ставку «{{ deleteTarget?.name }}»?
            Запись останется в системе для исторических расчётов, но будет помечена как неактивная.
          </AlertDialogDescription>
          <div class="flex gap-2">
            <AlertDialogAction as-child>
              <Button @click="handleDelete" variant="destructive" :disabled="isDeleting" class="flex-1">
                <Spinner v-if="isDeleting" class="size-4 mr-2" />
                {{ isDeleting ? 'Деактивация...' : 'Деактивировать' }}
              </Button>
            </AlertDialogAction>
            <AlertDialogCancel as-child>
              <Button variant="outline" :disabled="isDeleting">Отмена</Button>
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>

    <!-- Restore Dialog -->
    <AlertDialogRoot v-model:open="restoreDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 bg-black/60 z-[99]" />
        <AlertDialogContent :class="dialogContentClass">
          <AlertDialogTitle class="text-lg font-semibold mb-2">Восстановить ставку работ</AlertDialogTitle>
          <AlertDialogDescription class="text-sm text-muted-foreground mb-4">
            Вы уверены, что хотите восстановить ставку «{{ restoreTarget?.name }}»?
            Запись станет активной.
          </AlertDialogDescription>
          <div class="flex gap-2">
            <AlertDialogAction as-child>
              <Button @click="handleRestore" :disabled="isSaving" class="flex-1">
                <Spinner v-if="isSaving" class="size-4 mr-2" />
                {{ isSaving ? 'Восстановление...' : 'Восстановить' }}
              </Button>
            </AlertDialogAction>
            <AlertDialogCancel as-child>
              <Button variant="outline" :disabled="isSaving">Отмена</Button>
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </div>
</template>
