<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  Boxes,
  Plus,
  Trash2,
  Calculator,
  History,
  AlertTriangle,
  RefreshCw,
  Eye,
  AlertCircle,
} from 'lucide-vue-next'
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
import { componentsApi, bomApi, productCostApi, Unit } from '@/services/api'
import type { ComponentItem } from '@/services/api'
import type { BomLineItem, ProductCostResponse, ComponentCategory } from '@/types/bom'
import { COMPONENT_CATEGORY_LABELS } from '@/types/bom'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useTenantMoney } from '@/composables/useTenantMoney'
import { useBomChanges } from '@/composables/useBomChanges'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import ProductCostHistoryDialog from './ProductCostHistoryDialog.vue'
import ProductBomPreviewDialog from './ProductBomPreviewDialog.vue'

const props = defineProps<{ productId: string }>()

const { canWrite } = useCurrentUser()
const { formatMoney } = useTenantMoney()

// ---------- BOM state ----------

/**
 * Строка редактора. Количество — строка, потому что так его отдаёт v-model на input[type=number];
 * к числу оно приводится при отправке и при сравнении с серверным составом.
 */
interface EditableBomRow {
  key: string
  componentId: string
  quantity: number | string
}

const serverLines = ref<BomLineItem[]>([])
const rows = ref<EditableBomRow[]>([])
const allComponents = ref<ComponentItem[]>([])
const isLoadingBom = ref<boolean>(true)
const isSavingBom = ref<boolean>(false)

const unitLabels: Record<Unit, string> = {
  [Unit.Piece]: 'шт.',
  [Unit.Kg]: 'кг',
  [Unit.Meter]: 'м',
  [Unit.Liter]: 'л',
  [Unit.Ml]: 'мл',
  [Unit.Gram]: 'г',
}

const categoryBadgeVariant: Record<ComponentCategory, 'secondary' | 'warning' | 'success'> = {
  Material: 'secondary',
  Logistics: 'warning',
  Packaging: 'success',
}

const activeComponents = computed<ComponentItem[]>(() => allComponents.value.filter(c => c.isActive))

/**
 * Карточка компонента для строки BOM. Справочник отдаёт актуальную категорию, поэтому сначала
 * ищем там; серверная строка состава нужна как fallback для компонентов, деактивированных
 * и выпавших из справочника.
 */
const componentDisplay = (componentId: string): { name: string; unit: Unit; category: ComponentCategory | null } | null => {
  const fromCatalog = allComponents.value.find(c => c.id === componentId)
  if (fromCatalog) {
    return { name: fromCatalog.name, unit: fromCatalog.unit, category: fromCatalog.category }
  }
  const fromServer = serverLines.value.find(l => l.componentId === componentId)?.component
  if (fromServer) {
    return { name: fromServer.name, unit: fromServer.unit, category: fromServer.category }
  }
  return null
}

/** Компоненты, уже выбранные в других строках — исключаются из выбора, чтобы не было дублей. */
const availableComponentsFor = (row: EditableBomRow): ComponentItem[] => {
  const usedElsewhere = new Set(rows.value.filter(r => r.key !== row.key).map(r => r.componentId))
  return activeComponents.value.filter(c => !usedElsewhere.has(c.id) || c.id === row.componentId)
}

const loadBom = async (): Promise<void> => {
  const resp = await bomApi.getByProduct(props.productId)
  serverLines.value = resp.items
  rows.value = resp.items.map(line => ({
    key: line.id,
    componentId: line.componentId,
    quantity: line.quantity,
  }))
}

const loadComponents = async (): Promise<void> => {
  const resp = await componentsApi.getAll()
  allComponents.value = resp.items
}

const addRow = (): void => {
  const used = new Set(rows.value.map(r => r.componentId))
  const firstFree = activeComponents.value.find(c => !used.has(c.id))
  rows.value.push({
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    componentId: firstFree?.id ?? '',
    quantity: 1,
  })
}

const removeRow = (key: string): void => {
  rows.value = rows.value.filter(r => r.key !== key)
}

// ---------- Отслеживание несохранённых изменений ----------

const serverLinesComparable = computed(() =>
  serverLines.value.map(line => ({ componentId: line.componentId, quantity: line.quantity })),
)

const rowsComparable = computed(() =>
  rows.value.map(row => ({ componentId: row.componentId, quantity: row.quantity })),
)

const { hasUnsavedChanges } = useBomChanges(serverLinesComparable, rowsComparable)

// Правки состава — такая же потеря данных, как и правки формы товара, поэтому предупреждение
// при уходе общее на страницу, а не отдельное в этом компоненте.
useUnsavedChangesGuard(
  'product-bom',
  hasUnsavedChanges,
  'Есть несохранённые изменения в составе товара. Покинуть страницу без сохранения?',
)

// ---------- Превью изменений ----------

const previewDialogOpen = ref<boolean>(false)

const draftLines = computed(() =>
  rows.value.map(row => ({ componentId: row.componentId, quantity: Number(row.quantity) })),
)

/**
 * Проверяет черновик теми же правилами, что и сохранение.
 * Иначе предпросмотр показал бы сумму для состава, который бэкенд потом не примет.
 */
const validateDraft = (): boolean => {
  for (const row of rows.value) {
    if (!row.componentId) {
      toast.error('Выберите компонент во всех строках состава')
      return false
    }
    if (!row.quantity || Number(row.quantity) <= 0) {
      toast.error('Количество должно быть больше нуля во всех строках')
      return false
    }
  }

  const ids = rows.value.map(r => r.componentId)
  if (new Set(ids).size !== ids.length) {
    toast.error('Один компонент нельзя указать в составе дважды')
    return false
  }

  return true
}

const openPreview = (): void => {
  if (!validateDraft()) {
    return
  }

  previewDialogOpen.value = true
}

// ---------- Сохранение ----------

const handleSaveBom = async (): Promise<void> => {
  if (!validateDraft()) {
    return
  }

  isSavingBom.value = true
  try {
    await bomApi.upsert(props.productId, { lines: draftLines.value })
    toast.success('Состав товара сохранён')
    await loadBom()
    await loadCost()
  } catch {
    toast.error('Не удалось сохранить состав товара')
  } finally {
    isSavingBom.value = false
  }
}

// ---------- Cost calculation state ----------

const today = (): string => new Date().toISOString().slice(0, 10)

const cost = ref<ProductCostResponse | null>(null)
const isLoadingCost = ref<boolean>(true)
const asOfDate = ref<string>(today())
const historyDialogOpen = ref<boolean>(false)

const loadCost = async (): Promise<void> => {
  isLoadingCost.value = true
  try {
    cost.value = await productCostApi.getCost(props.productId, asOfDate.value || undefined)
  } catch {
    toast.error('Не удалось рассчитать себестоимость')
    cost.value = null
  } finally {
    isLoadingCost.value = false
  }
}

watch(asOfDate, () => {
  loadCost()
})

onMounted(async () => {
  isLoadingBom.value = true
  try {
    await Promise.all([loadBom(), loadComponents()])
  } catch {
    toast.error('Не удалось загрузить состав товара')
  } finally {
    isLoadingBom.value = false
  }
  await loadCost()
})

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <div class="flex flex-col gap-6 rounded-xl border border-border bg-card p-6">
    <!-- Заголовок секции -->
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h2 class="text-lg font-bold flex items-center gap-2">
          <Boxes class="size-5 text-primary" />
          Состав и себестоимость
        </h2>
        <p class="text-sm text-muted-foreground">
          Материалы, логистика и упаковка, из которых складывается единица товара
        </p>
      </div>
      <Button variant="outline" size="sm" class="gap-2" @click="historyDialogOpen = true">
        <History class="size-4" />
        История
      </Button>
    </div>

    <!-- Индикатор несохранённых изменений -->
    <div
      v-if="hasUnsavedChanges"
      class="flex flex-wrap items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3"
    >
      <AlertCircle class="size-5 text-warning shrink-0" />
      <span class="text-sm font-medium text-foreground flex-1 min-w-0">
        Есть несохранённые изменения в составе товара
      </span>
      <Button
        v-if="canWrite"
        variant="outline"
        size="sm"
        class="gap-2 shrink-0"
        @click="openPreview"
      >
        <Eye class="size-4" />
        Предпросмотр себестоимости
      </Button>
    </div>

    <div class="border-t border-border" />

    <!-- Таблица строк BOM -->
    <div class="flex flex-col gap-4">
      <div v-if="isLoadingBom" class="flex flex-col gap-3">
        <Skeleton v-for="n in 3" :key="n" class="h-12 w-full rounded-lg" />
      </div>

      <div
        v-else-if="rows.length === 0"
        class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-12 text-center"
      >
        <Boxes class="size-10 text-muted-foreground/40" />
        <div class="flex flex-col gap-1">
          <p class="text-sm font-medium text-foreground">Состав товара не задан</p>
          <p class="text-xs text-muted-foreground">Добавьте компоненты, чтобы описать единицу товара</p>
        </div>
        <Button
          v-if="canWrite"
          variant="outline"
          size="sm"
          class="gap-2 mt-2"
          :disabled="activeComponents.length === 0"
          @click="addRow"
        >
          <Plus class="size-4" />
          Добавить первый компонент
        </Button>
      </div>

      <div v-else class="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow class="border-b border-border">
              <TableHead class="w-12">#</TableHead>
              <TableHead>Компонент</TableHead>
              <TableHead class="w-32">Категория</TableHead>
              <TableHead class="w-36 text-right">Количество</TableHead>
              <TableHead class="w-20 text-right">Ед. изм.</TableHead>
              <TableHead v-if="canWrite" class="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(row, idx) in rows" :key="row.key" class="hover:bg-muted/40 transition-colors">
              <TableCell class="text-muted-foreground tabular-nums">{{ idx + 1 }}</TableCell>
              <TableCell>
                <select v-if="canWrite" v-model="row.componentId" :class="selectClass">
                  <option value="" disabled>Выберите компонент</option>
                  <option v-for="comp in availableComponentsFor(row)" :key="comp.id" :value="comp.id">
                    {{ comp.name }}
                  </option>
                </select>
                <span v-else class="text-sm">{{ componentDisplay(row.componentId)?.name ?? 'Компонент недоступен' }}</span>
              </TableCell>
              <TableCell>
                <Badge
                  v-if="componentDisplay(row.componentId)?.category"
                  :variant="categoryBadgeVariant[componentDisplay(row.componentId)!.category!]"
                >
                  {{ COMPONENT_CATEGORY_LABELS[componentDisplay(row.componentId)!.category!] }}
                </Badge>
                <span v-else class="text-xs text-muted-foreground">—</span>
              </TableCell>
              <TableCell class="text-right">
                <Input
                  v-if="canWrite"
                  v-model="row.quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  class="text-right tabular-nums"
                />
                <span v-else class="text-sm tabular-nums">{{ row.quantity }}</span>
              </TableCell>
              <TableCell class="text-right text-sm text-muted-foreground">
                {{ componentDisplay(row.componentId)?.unit ? unitLabels[componentDisplay(row.componentId)!.unit] : '—' }}
              </TableCell>
              <TableCell v-if="canWrite" class="text-right">
                <Button variant="ghost" size="icon" class="size-8" @click="removeRow(row.key)" aria-label="Удалить строку">
                  <Trash2 class="size-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div v-if="canWrite" class="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          class="gap-2"
          :disabled="activeComponents.length === 0"
          @click="addRow"
        >
          <Plus class="size-4" />
          Добавить компонент
        </Button>
        <Button size="sm" class="gap-2" :disabled="isSavingBom || !hasUnsavedChanges" @click="handleSaveBom">
          <Spinner v-if="isSavingBom" class="size-4" />
          Сохранить состав
        </Button>
      </div>
      <p v-if="canWrite && activeComponents.length === 0" class="text-xs text-muted-foreground">
        Сначала добавьте компоненты в справочник «Компоненты»
      </p>
    </div>

    <div class="border-t border-border" />

    <!-- Себестоимость -->
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-base font-semibold flex items-center gap-2">
          <Calculator class="size-4 text-primary" />
          Себестоимость на дату
        </h3>
        <div class="flex items-center gap-2">
          <Label for="cost-as-of" class="text-sm text-muted-foreground">Дата расчёта</Label>
          <Input id="cost-as-of" v-model="asOfDate" type="date" class="w-40" />
          <Button variant="ghost" size="icon" class="size-9" :disabled="isLoadingCost" @click="loadCost" aria-label="Обновить">
            <RefreshCw class="size-4" :class="{ 'animate-spin': isLoadingCost }" />
          </Button>
        </div>
      </div>

      <div v-if="isLoadingCost" class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Skeleton v-for="n in 5" :key="n" class="h-20 w-full rounded-lg" />
      </div>

      <template v-else-if="cost">
        <!-- Предупреждение о неполном расчёте -->
        <div
          v-if="!cost.isComplete"
          class="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm"
        >
          <AlertTriangle class="size-4 mt-0.5 shrink-0 text-warning" />
          <div class="flex flex-col gap-1">
            <p class="font-medium text-foreground">
              Расчёт себестоимости неполный — показана сумма по доступным данным
            </p>
            <ul class="list-disc pl-4 text-muted-foreground">
              <li v-for="(warning, idx) in cost.warnings" :key="idx">{{ warning.message }}</li>
            </ul>
          </div>
        </div>

        <!-- Карточки по статьям затрат -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div class="rounded-lg border border-border bg-background p-3 flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Материалы</span>
            <span class="text-base font-semibold tabular-nums">{{ formatMoney(cost.materialCost) }}</span>
          </div>
          <div class="rounded-lg border border-border bg-background p-3 flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Логистика</span>
            <span class="text-base font-semibold tabular-nums">{{ formatMoney(cost.logisticsCost) }}</span>
          </div>
          <div class="rounded-lg border border-border bg-background p-3 flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Упаковка</span>
            <span class="text-base font-semibold tabular-nums">{{ formatMoney(cost.packagingCost) }}</span>
          </div>
          <div class="rounded-lg border border-border bg-background p-3 flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Работа</span>
            <span class="text-base font-semibold tabular-nums">{{ formatMoney(cost.laborCost) }}</span>
          </div>
          <div class="rounded-lg border border-primary/40 bg-primary/5 p-3 flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Итого</span>
            <span class="text-base font-bold tabular-nums text-primary">{{ formatMoney(cost.totalCost) }}</span>
          </div>
        </div>

        <!-- Детализация по строкам состава -->
        <div v-if="cost.lines.length > 0" class="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow class="border-b border-border">
                <TableHead>Компонент</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead class="text-right">Количество</TableHead>
                <TableHead class="text-right">Цена</TableHead>
                <TableHead class="text-right">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="line in cost.lines" :key="line.componentId" class="hover:bg-muted/40 transition-colors">
                <TableCell class="font-medium">{{ line.componentName }}</TableCell>
                <TableCell>
                  <Badge :variant="categoryBadgeVariant[line.category]">
                    {{ COMPONENT_CATEGORY_LABELS[line.category] }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right tabular-nums">{{ line.quantity }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ formatMoney(line.pricePerUnit) }}</TableCell>
                <TableCell class="text-right tabular-nums font-medium">{{ formatMoney(line.lineTotal) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </template>
    </div>

    <ProductCostHistoryDialog v-model:open="historyDialogOpen" :product-id="productId" />
    <ProductBomPreviewDialog
      v-model:open="previewDialogOpen"
      :product-id="productId"
      :draft-lines="draftLines"
      :as-of-date="asOfDate"
    />
  </div>
</template>
