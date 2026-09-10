<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Pencil, Trash2, Grid3x3, ChevronDown, ChevronUp, PlusCircle, Minus } from 'lucide-vue-next'
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
import { tariffGridsApi, TariffType } from '@/services/api'
import type { TariffGridItem, TariffGridEntry, CreateTariffGridRequest, UpdateTariffGridRequest } from '@/services/api'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { X } from 'lucide-vue-next'

const { canWrite } = useCurrentUser()

const items = ref<TariffGridItem[]>([])
const isLoading = ref<boolean>(true)
const filterType = ref<TariffType | ''>('')

const createDialogOpen = ref<boolean>(false)
const editDialogOpen = ref<boolean>(false)
const deleteDialogOpen = ref<boolean>(false)

const editTarget = ref<TariffGridItem | null>(null)
const deleteTarget = ref<TariffGridItem | null>(null)
const isSaving = ref<boolean>(false)
const isDeleting = ref<boolean>(false)

interface EntryForm { regionOrCity: string; volumeThresholdLiters: string; rate: string }

const form = ref({
  name: '',
  tariffType: TariffType.WbLogistics as TariffType,
  validFrom: '',
  entries: [] as EntryForm[],
})
const editForm = ref({ name: '', isActive: true })

const tariffTypeOptions = [
  { value: TariffType.WbLogistics, label: 'Тарифы WB (по регионам)' },
  { value: TariffType.FulfillmentCenter, label: 'Тарифы фулфилмент-центра (по городам)' },
]

const tariffTypeLabel = (t: TariffType): string =>
  tariffTypeOptions.find(o => o.value === t)?.label ?? String(t)

const tariffTypeBadge = (t: TariffType): 'default' | 'success' =>
  t === TariffType.WbLogistics ? 'default' : 'success'

const formatDate = (d: string): string =>
  new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })

const filteredItems = computed<TariffGridItem[]>(() => {
  if (filterType.value === '') return items.value
  return items.value.filter(i => i.tariffType === Number(filterType.value))
})

const addEntry = (): void => {
  form.value.entries.push({ regionOrCity: '', volumeThresholdLiters: '', rate: '' })
}

const removeEntry = (idx: number): void => {
  form.value.entries.splice(idx, 1)
}

const loadItems = async (): Promise<void> => {
  isLoading.value = true
  try {
    const resp = await tariffGridsApi.getAll()
    items.value = resp.items
  } catch {
    toast.error('Не удалось загрузить тарифные сетки')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadItems)

const resetForm = (): void => {
  form.value = {
    name: '',
    tariffType: TariffType.WbLogistics,
    validFrom: new Date().toISOString().slice(0, 10),
    entries: [{ regionOrCity: '', volumeThresholdLiters: '', rate: '' }],
  }
}

const openCreate = (): void => {
  resetForm()
  createDialogOpen.value = true
}

const openEdit = (item: TariffGridItem): void => {
  editTarget.value = item
  editForm.value = { name: item.name, isActive: item.isActive }
  editDialogOpen.value = true
}

const openDelete = (item: TariffGridItem): void => {
  deleteTarget.value = item
  deleteDialogOpen.value = true
}

const handleCreate = async (): Promise<void> => {
  if (!form.value.name.trim()) { toast.error('Введите название'); return }
  if (!form.value.validFrom) { toast.error('Укажите дату вступления в силу'); return }
  if (form.value.entries.length === 0) { toast.error('Добавьте хотя бы одну строку тарифа'); return }

  const validEntries = form.value.entries.filter(e => e.regionOrCity.trim() && e.rate)
  if (validEntries.length === 0) { toast.error('Заполните строки тарифа'); return }

  isSaving.value = true
  try {
    const payload: CreateTariffGridRequest = {
      name: form.value.name.trim(),
      tariffType: form.value.tariffType,
      validFrom: form.value.validFrom,
      entries: validEntries.map(e => ({
        regionOrCity: e.regionOrCity.trim(),
        volumeThresholdLiters: e.volumeThresholdLiters ? Number(e.volumeThresholdLiters) : undefined,
        rate: Number(e.rate),
      })),
    }
    await tariffGridsApi.create(payload)
    toast.success('Тарифная сетка добавлена')
    createDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось создать тарифную сетку')
  } finally {
    isSaving.value = false
  }
}

const handleEdit = async (): Promise<void> => {
  if (!editTarget.value || !editForm.value.name.trim()) { toast.error('Введите название'); return }
  isSaving.value = true
  try {
    const payload: UpdateTariffGridRequest = {
      name: editForm.value.name.trim(),
      isActive: editForm.value.isActive,
    }
    await tariffGridsApi.update(editTarget.value.id, payload)
    toast.success('Тарифная сетка обновлена')
    editDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось обновить тарифную сетку')
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await tariffGridsApi.delete(deleteTarget.value.id)
    toast.success('Тарифная сетка удалена')
    deleteDialogOpen.value = false
    await loadItems()
  } catch {
    toast.error('Не удалось удалить тарифную сетку')
  } finally {
    isDeleting.value = false
  }
}

const dialogContentClass = 'bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100] overflow-y-auto'
const fieldClass = 'flex flex-col gap-1'
const inputClass = 'mt-1'
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-bold flex items-center gap-2">
          <Grid3x3 class="size-5 text-primary" />
          Тарифные сетки
        </h1>
        <p class="text-sm text-muted-foreground">Справочники тарифов WB и фулфилмент-центра</p>
      </div>
      <div class="flex items-center gap-3">
        <select
          v-model="filterType"
          class="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3"
        >
          <option value="">Все типы</option>
          <option v-for="o in tariffTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <Button v-if="canWrite" @click="openCreate" class="gap-2">
          <Plus class="size-4" />
          Добавить
        </Button>
      </div>
    </div>

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
      <Grid3x3 class="size-10 text-muted-foreground/40" />
      <p class="text-sm text-muted-foreground">Тарифные сетки не добавлены</p>
      <Button v-if="canWrite" variant="outline" size="sm" @click="openCreate" class="gap-2">
        <Plus class="size-4" /> Добавить первую
      </Button>
    </div>

    <!-- Table -->
    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="border-b border-border">
            <TableHead>Название</TableHead>
            <TableHead>Тип</TableHead>
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
            <TableCell>
              <Badge :variant="tariffTypeBadge(item.tariffType)" class="whitespace-nowrap">
                {{ item.tariffType === TariffType.WbLogistics ? 'WB' : 'Фулфилмент' }}
              </Badge>
            </TableCell>
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
          <DialogTitle class="text-lg font-semibold mb-4">Добавить тарифную сетку</DialogTitle>
          <DialogDescription class="sr-only">Форма создания тарифной сетки</DialogDescription>
          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label for="tg-name">Название <span class="text-destructive">*</span></Label>
              <Input id="tg-name" v-model="form.name" placeholder="WB Логистика май 2025" :class="inputClass" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div :class="fieldClass">
                <Label for="tg-type">Тип тарифа</Label>
                <select
                  id="tg-type"
                  v-model="form.tariffType"
                  class="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3"
                >
                  <option v-for="o in tariffTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
              <div :class="fieldClass">
                <Label for="tg-date">Действует с <span class="text-destructive">*</span></Label>
                <Input id="tg-date" v-model="form.validFrom" type="date" :class="inputClass" />
              </div>
            </div>

            <!-- Entries -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <Label>Строки тарифа</Label>
                <button
                  type="button"
                  @click="addEntry"
                  class="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <PlusCircle class="size-3.5" /> Добавить строку
                </button>
              </div>
              <div class="rounded-md border border-border overflow-hidden">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="bg-muted/50 border-b border-border">
                      <th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Регион/Город</th>
                      <th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        {{ form.tariffType === TariffType.FulfillmentCenter ? 'Объём (л)' : '—' }}
                      </th>
                      <th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Ставка (₽)</th>
                      <th class="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(entry, idx) in form.entries"
                      :key="idx"
                      class="border-b border-border last:border-0"
                    >
                      <td class="px-2 py-1.5">
                        <Input v-model="entry.regionOrCity" placeholder="Москва" class="h-7 text-xs" />
                      </td>
                      <td class="px-2 py-1.5">
                        <Input
                          v-if="form.tariffType === TariffType.FulfillmentCenter"
                          v-model="entry.volumeThresholdLiters"
                          type="number"
                          min="0"
                          placeholder="0"
                          class="h-7 text-xs"
                        />
                        <span v-else class="text-muted-foreground text-xs px-2">—</span>
                      </td>
                      <td class="px-2 py-1.5">
                        <Input v-model="entry.rate" type="number" min="0" step="0.01" placeholder="0.00" class="h-7 text-xs" />
                      </td>
                      <td class="px-1 py-1.5">
                        <button
                          type="button"
                          @click="removeEntry(idx)"
                          class="inline-flex items-center justify-center p-1 text-muted-foreground hover:text-destructive transition-colors"
                        ><Minus class="size-3" /></button>
                      </td>
                    </tr>
                    <tr v-if="form.entries.length === 0">
                      <td colspan="4" class="px-3 py-4 text-center text-xs text-muted-foreground">
                        Нет строк. Нажмите «Добавить строку».
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <DialogClose as-child>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
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
        <DialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] w-[90vw] max-w-[440px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]">
          <DialogTitle class="text-lg font-semibold mb-4">Редактировать тарифную сетку</DialogTitle>
          <DialogDescription class="sr-only">Редактирование названия и статуса тарифной сетки</DialogDescription>
          <div class="flex flex-col gap-4">
            <div :class="fieldClass">
              <Label for="te-name">Название <span class="text-destructive">*</span></Label>
              <Input id="te-name" v-model="editForm.name" :class="inputClass" />
            </div>
            <p class="text-xs text-muted-foreground rounded-md bg-muted px-3 py-2">
              Строки тарифа неизменны после создания. Для новых ставок добавьте новую сетку с актуальной датой.
            </p>
            <div class="flex items-center gap-2">
              <input id="te-active" type="checkbox" v-model="editForm.isActive" class="h-4 w-4 rounded border-input accent-primary" />
              <Label for="te-active">Активна</Label>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <DialogClose as-child>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
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
          <AlertDialogTitle class="text-base font-semibold">Удалить тарифную сетку?</AlertDialogTitle>
          <AlertDialogDescription class="mt-2 text-sm text-muted-foreground">
            Сетка «{{ deleteTarget?.name }}» будет деактивирована. Исторические расчёты не пострадают.
          </AlertDialogDescription>
          <div class="mt-5 flex justify-end gap-3">
            <AlertDialogCancel as-child>
              <Button variant="outline">Отмена</Button>
            </AlertDialogCancel>
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
