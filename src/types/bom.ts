import type { Unit } from '@/services/api'

/**
 * Категория компонента BOM. Влияет на то, в какую статью себестоимости
 * (материалы / логистика / упаковка) попадает строка состава.
 * Соответствует backend-enum ComponentCategory.
 */
export type ComponentCategory = 'Material' | 'Logistics' | 'Packaging'

/** Отображаемые подписи категорий компонента для UI (badge, подсказки). */
export const COMPONENT_CATEGORY_LABELS: Record<ComponentCategory, string> = {
  Material: 'Материал',
  Logistics: 'Логистика',
  Packaging: 'Упаковка',
}

/**
 * Компонент, вложенный в строку BOM бэкендом (BomComponentDto).
 * ActivePricePerUnit может быть null, если у компонента нет действующей цены
 * на сегодняшнюю дату — это валидное состояние, а не ошибка.
 */
export interface BomComponentDto {
  id: string
  name: string
  unit: Unit
  category: ComponentCategory
  activePricePerUnit: number | null
}

/**
 * Строка состава товара (BomLineDto с бэкенда). Версионируется через
 * validFrom/isActive по тому же паттерну, что ComponentPrice и ProductWorkRate.
 */
export interface BomLineItem {
  id: string
  productId: string
  componentId: string
  quantity: number
  validFrom: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
  component?: BomComponentDto
}

export interface GetProductBomResponse {
  items: BomLineItem[]
}

export interface GetProductBomHistoryResponse {
  items: BomLineItem[]
}

/** Одна строка состава для полной перезаписи через PUT .../bom. */
export interface UpsertProductBomLine {
  componentId: string
  quantity: number
}

export interface UpsertProductBomRequest {
  lines: UpsertProductBomLine[]
}

/** Бэкенд возвращает только количество сохранённых строк — актуальный состав запрашивается отдельно GET-ом. */
export interface UpsertProductBomResponse {
  count: number
}

export interface CreateBomLineRequest {
  componentId: string
  quantity: number
  validFrom: string
}

export interface CreateBomLineResponse {
  id: string
}

// ---------- Cost calculation ----------

/** Причина неполноты расчёта себестоимости. Соответствует backend-enum CostWarningType. */
export type CostWarningType = 'MissingComponentPrice' | 'MissingWorkRate' | 'MissingBom' | 'InvalidQuantity'

export interface CostLineDto {
  componentId: string
  componentName: string
  category: ComponentCategory
  quantity: number
  pricePerUnit: number
  lineTotal: number
}

export interface CostWarningDto {
  type: CostWarningType | string
  message: string
  componentId?: string
}

/** Детальный расчёт себестоимости товара (GetProductCostResponse). */
export interface ProductCostResponse {
  found: boolean
  productId: string
  asOfDate: string
  materialCost: number
  logisticsCost: number
  packagingCost: number
  laborCost: number
  totalCost: number
  isComplete: boolean
  lines: CostLineDto[]
  warnings: CostWarningDto[]
}

export interface ProductCostSnapshotDto {
  id: string
  productId: string
  asOfDate: string
  materialCost: number
  logisticsCost: number
  packagingCost: number
  laborCost: number
  totalCost: number
  isComplete: boolean
  linesSnapshotJson: string
  triggerReason: string
  calculatedAt: string
}

export interface GetProductCostHistoryResponse {
  found: boolean
  totalCount: number
  items: ProductCostSnapshotDto[]
}

// ---------- Draft cost preview ----------

/**
 * Черновик состава для расчёта себестоимости без сохранения.
 * Отправляется в POST .../preview, бэкенд считает ту же самую себестоимость,
 * что получилась бы после сохранения, но ничего не записывает в БД.
 */
export interface PreviewProductBomCostLine {
  componentId: string
  quantity: number
}

export interface PreviewProductBomCostRequest {
  lines: PreviewProductBomCostLine[]
  asOf?: string
}

/**
 * Свёрнутая сводка по сохранённому составу на ту же дату, что и черновик.
 * Намеренно не ProductCostResponse: база сравнения нужна только для сопоставления
 * с черновиком, а не для построчного отображения, поэтому строки состава в неё не попадают.
 */
export interface PreviewProductBomCostBaseline {
  materialCost: number
  logisticsCost: number
  packagingCost: number
  laborCost: number
  totalCost: number
  isComplete: boolean
}

/** Разница между черновиком и сохранённым составом на одну и ту же дату. */
export interface PreviewProductBomCostDelta {
  materialDelta: number
  logisticsDelta: number
  packagingDelta: number
  laborDelta: number
  totalDelta: number
}

/** Ответ предпросмотра: расчёт черновика плюс база сравнения и дельта, посчитанные одним запросом. */
export interface PreviewProductBomCostResponse {
  found: boolean
  preview: ProductCostResponse | null
  baseline: PreviewProductBomCostBaseline | null
  delta: PreviewProductBomCostDelta | null
}
