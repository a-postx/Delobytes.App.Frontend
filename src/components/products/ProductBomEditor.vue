<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { Component, ComputedRef } from 'vue'
import {
  Boxes,
  Plus,
  Trash2,
  Calculator,
  History,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Minus,
  Pencil,
  TrendingDown,
  TrendingUp,
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
import type {
  BomLineItem,
  ProductCostResponse,
  ComponentCategory,
  CostWarningDto,
  PreviewProductBomCostDelta,
  PreviewProductBomCostLine,
} from '@/types/bom'
import { COMPONENT_CATEGORY_LABELS } from '@/types/bom'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useTenantMoney } from '@/composables/useTenantMoney'
import { useBomChanges } from '@/composables/useBomChanges'
import { markUnsavedChanges } from '@/composables/useUnsavedChangesGuard'
import { useBomCostPreview } from '@/composables/useBomCostPreview'
import ProductCostHistoryDialog from './ProductCostHistoryDialog.vue'

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

/** Строки API → строки редактора. Общий маппинг для загрузки состава и отмены правок. */
const toEditableRows = (lines: BomLineItem[]): EditableBomRow[] =>
  lines.map(line => ({
    key: line.id,
    componentId: line.componentId,
    quantity: line.quantity,
  }))

const loadBom = async (): Promise<void> => {
  const resp = await bomApi.getByProduct(props.productId)
  serverLines.value = resp.items
  rows.value = toEditableRows(resp.items)
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

/**
 * Снимок удалённой строки. Позицию берём до удаления: из таблицы строку уже не восстановить.
 * Отдельного состояния в компоненте нет — снимок живёт в замыкании toast, который его показывает.
 */
interface RemovedBomRow {
  row: EditableBomRow
  index: number
}

const removeRow = (key: string): void => {
  const index: number = rows.value.findIndex(r => r.key === key)
  if (index === -1) {
    return
  }

  // Копия строки, а не ссылка: исходный объект после удаления остаётся только здесь.
  const removed: RemovedBomRow = { row: { ...rows.value[index] }, index }
  const name: string | undefined = componentDisplay(removed.row.componentId)?.name

  rows.value = rows.value.filter(r => r.key !== key)

  toast(
    name ? `Компонент «${name}» удалён из состава` : 'Компонент удалён из состава',
    {
      // 8 секунд вместо стандартных 4: отмена удаления — осознанное действие,
      // за это время пользователь успевает заметить пропажу строки и вернуть её.
      duration: 8000,
      action: {
        label: 'Отменить',
        onClick: (): void => restoreRow(removed),
      },
    },
  )
}

/** Возврат удалённой строки на прежнее место с прежним количеством. */
const restoreRow = (removed: RemovedBomRow): void => {
  if (rows.value.some(r => r.key === removed.row.key)) {
    return
  }

  const restored: EditableBomRow[] = [...rows.value]
  restored.splice(removed.index, 0, { ...removed.row })
  rows.value = restored
}

// ---------- Отслеживание несохранённых изменений ----------

const serverLinesComparable = computed(() =>
  serverLines.value.map(line => ({ componentId: line.componentId, quantity: line.quantity })),
)

const rowsComparable = computed(() =>
  rows.value.map(row => ({ componentId: row.componentId, quantity: row.quantity })),
)

const { hasUnsavedChanges } = useBomChanges(serverLinesComparable, rowsComparable)

// Хук ухода регистрирует владелец страницы (ProductEditView), здесь только помечаем секцию:
// иначе оба компонента повесили бы свой onBeforeRouteLeave и пользователь получил бы
// два вопроса подряд на один уход.
markUnsavedChanges(
  'product-bom',
  hasUnsavedChanges,
  'Есть несохранённые изменения в составе товара. Покинуть страницу без сохранения?',
)

// ---------- Черновик состава ----------

const draftLines = computed<PreviewProductBomCostLine[]>(() =>
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

/**
 * Отмена правок: строки возвращаются к сохранённому составу.
 * Массив заменяется целиком, а не правится на месте — иначе useBomChanges не увидит
 * новое значение и секция останется помеченной как изменённая.
 */
const resetDraftChanges = (): void => {
  rows.value = toEditableRows(serverLines.value)
  resetPreview()
  toast.info('Правки отменены — состав возвращён к сохранённому')
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
    resetPreview()
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

// ---------- Живой предпросмотр ----------

/**
 * Передаём черновик только при реальных правках: иначе каждая загрузка состава с сервера
 * запускала бы лишний расчёт с тем же составом.
 */
const previewDraftLines = computed<PreviewProductBomCostLine[] | null>(() =>
  hasUnsavedChanges.value ? draftLines.value : null,
)

const {
  baseline: previewBaseline,
  preview,
  delta,
  isPreviewLoading,
  hasPreview,
  reset: resetPreview,
} = useBomCostPreview(
  computed<string>(() => props.productId),
  asOfDate,
  previewDraftLines,
)

type CostTotals = Pick<ProductCostResponse, 'materialCost' | 'logisticsCost' | 'packagingCost' | 'laborCost' | 'totalCost'>

interface IncompleteSource {
  isComplete: boolean
  warnings: CostWarningDto[]
}

const isDraftPreviewActive: ComputedRef<boolean> = computed<boolean>(
  () => hasUnsavedChanges.value && hasPreview.value,
)

const draftCost: ComputedRef<ProductCostResponse | null> = computed<ProductCostResponse | null>(
  () => (isDraftPreviewActive.value ? preview.value : null),
)

const draftDelta: ComputedRef<PreviewProductBomCostDelta | null> = computed<PreviewProductBomCostDelta | null>(
  () => (isDraftPreviewActive.value ? delta.value : null),
)

/**
 * «Было» при несохранённых правках берём из базы сравнения, посчитанной на сервере в том же
 * снимке, что и дельта. `cost` загружен при открытии и мог устареть, если состав меняли параллельно,
 * тогда разница «было → стало» не сходилась бы.
 */
const savedCost: ComputedRef<CostTotals | null> = computed<CostTotals | null>(
  () => (hasUnsavedChanges.value && previewBaseline.value ? previewBaseline.value : cost.value),
)

const incompleteSource: ComputedRef<IncompleteSource | null> = computed<IncompleteSource | null>(() => {
  if (isDraftPreviewActive.value && draftCost.value) {
    return { isComplete: draftCost.value.isComplete, warnings: draftCost.value.warnings }
  }
  if (cost.value) {
    return { isComplete: cost.value.isComplete, warnings: cost.value.warnings }
  }
  return null
})

/** Округление до копеек: без него погрешность float даст «+0,00 ₽» с жёлтым бейджем. */
const roundMoney = (value: number): number => Math.round(value * 100) / 100

interface DeltaPresentation {
  variant: 'success' | 'warning' | 'secondary'
  icon: Component
}

/** Рост себестоимости — предупреждение, снижение — успех, без изменений — нейтральный. */
const deltaPresentation = (value: number): DeltaPresentation => {
  const rounded: number = roundMoney(value)
  if (rounded < 0) {
    return { variant: 'success', icon: TrendingDown }
  }
  if (rounded > 0) {
    return { variant: 'warning', icon: TrendingUp }
  }
  return { variant: 'secondary', icon: Minus }
}

const deltaText = (value: number): string => {
  const rounded: number = roundMoney(value)
  return `${rounded > 0 ? '+' : ''}${formatMoney(rounded)}`
}

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

    <!-- Панель несохранённых изменений: единственная точка сохранения секции -->
    <div
      v-if="hasUnsavedChanges"
      class="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3"
    >
      <AlertCircle class="size-5 text-warning shrink-0" />
      <div class="flex flex-col gap-1 flex-1 min-w-0">
        <span class="text-sm font-medium text-foreground">
          Есть несохранённые изменения в составе товара
        </span>
        <!-- Что произойдёт после сохранения: ответ заранее, до нажатия кнопки -->
        <span v-if="isPreviewLoading" class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Spinner class="size-3" />
          Пересчёт итога…
        </span>
        <span v-else-if="savedCost && draftCost && draftDelta" class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          Итого: <span class="tabular-nums">{{ formatMoney(savedCost.totalCost) }}</span>
          <ArrowRight class="size-3 shrink-0" />
          <span class="font-medium tabular-nums text-foreground">{{ formatMoney(draftCost.totalCost) }}</span>
          <Badge :variant="deltaPresentation(draftDelta.totalDelta).variant">
            {{ deltaText(draftDelta.totalDelta) }}
          </Badge>
        </span>
      </div>
      <div v-if="canWrite" class="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" :disabled="isSavingBom" @click="resetDraftChanges">
          Отменить правки
        </Button>
        <Button size="sm" class="gap-2" :disabled="isSavingBom" @click="handleSaveBom">
          <Spinner v-if="isSavingBom" class="size-4" />
          Сохранить состав
        </Button>
      </div>
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

      <div v-if="canWrite" class="flex flex-wrap items-center gap-3">
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
        <!-- Предупреждение о неполном расчёте: при черновике берём его, иначе сохранённый состав -->
        <div
          v-if="incompleteSource && !incompleteSource.isComplete"
          class="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm"
        >
          <AlertTriangle class="size-4 mt-0.5 shrink-0 text-warning" />
          <div class="flex flex-col gap-1">
            <p class="font-medium text-foreground">
              Расчёт себестоимости неполный — показана сумма по доступным данным
            </p>
            <ul class="list-disc pl-4 text-muted-foreground">
              <li v-for="(warning, idx) in incompleteSource.warnings" :key="idx">{{ warning.message }}</li>
            </ul>
          </div>
        </div>

        <!-- Пояснение: без него значение «после» легко принять за уже сохранённое -->
        <div v-if="hasUnsavedChanges" class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" class="gap-1">
            <Pencil class="size-3" />
            Черновик
          </Badge>
          <span>Значения после «→» предварительные: они зафиксируются после сохранения состава</span>
        </div>

        <!-- Карточки по статьям затрат: «было» видно всегда, «стало» — только при несохранённом черновике -->
        <div v-if="savedCost" class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <!-- Материалы -->
          <div class="rounded-lg border border-border bg-background p-3 flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Материалы</span>
            <span class="text-base font-semibold tabular-nums">{{ formatMoney(savedCost.materialCost) }}</span>
            <div v-if="hasUnsavedChanges" class="mt-1 pt-2 border-t border-border/60">
              <span v-if="isPreviewLoading" class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Spinner class="size-3" />
                Пересчёт…
              </span>
              <div v-else-if="draftCost && draftDelta" class="flex flex-wrap items-center gap-1.5 text-xs">
                <ArrowRight class="size-3 text-muted-foreground" />
                <span class="font-medium tabular-nums">{{ formatMoney(draftCost.materialCost) }}</span>
                <Badge :variant="deltaPresentation(draftDelta.materialDelta).variant" class="gap-1">
                  <component :is="deltaPresentation(draftDelta.materialDelta).icon" class="size-3" />
                  {{ deltaText(draftDelta.materialDelta) }}
                </Badge>
              </div>
              <span v-else class="text-xs text-muted-foreground">Расчёт недоступен — проверьте строки состава</span>
            </div>
          </div>
          <!-- Логистика -->
          <div class="rounded-lg border border-border bg-background p-3 flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Логистика</span>
            <span class="text-base font-semibold tabular-nums">{{ formatMoney(savedCost.logisticsCost) }}</span>
            <div v-if="hasUnsavedChanges" class="mt-1 pt-2 border-t border-border/60">
              <span v-if="isPreviewLoading" class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Spinner class="size-3" />
                Пересчёт…
              </span>
              <div v-else-if="draftCost && draftDelta" class="flex flex-wrap items-center gap-1.5 text-xs">
                <ArrowRight class="size-3 text-muted-foreground" />
                <span class="font-medium tabular-nums">{{ formatMoney(draftCost.logisticsCost) }}</span>
                <Badge :variant="deltaPresentation(draftDelta.logisticsDelta).variant" class="gap-1">
                  <component :is="deltaPresentation(draftDelta.logisticsDelta).icon" class="size-3" />
                  {{ deltaText(draftDelta.logisticsDelta) }}
                </Badge>
              </div>
              <span v-else class="text-xs text-muted-foreground">Расчёт недоступен — проверьте строки состава</span>
            </div>
          </div>
          <!-- Упаковка -->
          <div class="rounded-lg border border-border bg-background p-3 flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Упаковка</span>
            <span class="text-base font-semibold tabular-nums">{{ formatMoney(savedCost.packagingCost) }}</span>
            <div v-if="hasUnsavedChanges" class="mt-1 pt-2 border-t border-border/60">
              <span v-if="isPreviewLoading" class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Spinner class="size-3" />
                Пересчёт…
              </span>
              <div v-else-if="draftCost && draftDelta" class="flex flex-wrap items-center gap-1.5 text-xs">
                <ArrowRight class="size-3 text-muted-foreground" />
                <span class="font-medium tabular-nums">{{ formatMoney(draftCost.packagingCost) }}</span>
                <Badge :variant="deltaPresentation(draftDelta.packagingDelta).variant" class="gap-1">
                  <component :is="deltaPresentation(draftDelta.packagingDelta).icon" class="size-3" />
                  {{ deltaText(draftDelta.packagingDelta) }}
                </Badge>
              </div>
              <span v-else class="text-xs text-muted-foreground">Расчёт недоступен — проверьте строки состава</span>
            </div>
          </div>
          <!-- Работа: дельта не показываем, состав на неё не влияет -->
          <div class="rounded-lg border border-border bg-background p-3 flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">Работа</span>
            <span class="text-base font-semibold tabular-nums">{{ formatMoney(savedCost.laborCost) }}</span>
            <div class="mt-1 pt-2 border-t border-border/60 flex flex-row items-center gap-1">
              <span class="text-xs text-muted-foreground">Из</span>
              <router-link
                to="/catalogs/product-work-rates"
                class="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              > нормы выработки
                <ArrowRight class="size-3" />
              </router-link>
            </div>
          </div>

          <!-- Итого -->
          <div
            class="rounded-lg border p-3 flex flex-col gap-1"
            :class="hasUnsavedChanges
              ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
              : 'border-primary/40 bg-primary/5'"
          >
            <span class="text-xs text-muted-foreground">Итого</span>
            <span class="text-base font-bold tabular-nums text-primary">{{ formatMoney(savedCost.totalCost) }}</span>
            <div v-if="hasUnsavedChanges" class="mt-1 pt-2 border-t border-primary/20">
              <span v-if="isPreviewLoading" class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Spinner class="size-3" />
                Пересчёт…
              </span>
              <div v-else-if="draftCost && draftDelta" class="flex flex-wrap items-center gap-1.5 text-xs">
                <ArrowRight class="size-3 text-muted-foreground" />
                <span class="font-semibold tabular-nums">{{ formatMoney(draftCost.totalCost) }}</span>
                <Badge :variant="deltaPresentation(draftDelta.totalDelta).variant" class="gap-1">
                  <component :is="deltaPresentation(draftDelta.totalDelta).icon" class="size-3" />
                  {{ deltaText(draftDelta.totalDelta) }}
                </Badge>
              </div>
              <span v-else class="text-xs text-muted-foreground">Расчёт недоступен — проверьте строки состава</span>
            </div>
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
  </div>
</template>