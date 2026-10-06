import { ref, computed, watch, onUnmounted } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { productCostApi } from '@/services/api'
import type {
  PreviewProductBomCostLine,
  PreviewProductBomCostBaseline,
  PreviewProductBomCostDelta,
  ProductCostResponse,
} from '@/types/bom'

/** Задержка перед отправкой запроса после очередного изменения черновика. */
const PREVIEW_DEBOUNCE_MS = 500

export interface UseBomCostPreviewResult {
  /** Сводка по сохранённому составу на дату расчёта (без строк) — база сравнения. */
  baseline: Ref<PreviewProductBomCostBaseline | null>
  /** Расчёт по черновику (та же структура, что у сохранённого состава, включая lines/warnings). */
  preview: Ref<ProductCostResponse | null>
  /** Разница «черновик минус сохранённый состав» по статьям и итогу. */
  delta: Ref<PreviewProductBomCostDelta | null>
  /** true, пока выполняется запрос расчёта по черновику. */
  isPreviewLoading: Ref<boolean>
  /** Есть ли актуальный (не устаревший) расчёт черновика для текущих входных данных. */
  hasPreview: ComputedRef<boolean>
  /**
   * Сбрасывает предпросмотр в исходное состояние: отменяет запрос в работе,
   * снимает отложенный запуск и очищает baseline/preview/delta.
   * Вызывается после успешного сохранения состава — следующий расчёт
   * запросит актуальную базу сравнения заново.
   */
  reset: () => void
}

/**
 * Строка черновика валидна для отправки на бэкенд, если у неё выбран компонент
 * и указано положительное количество. Это защита от гарантированного 422,
 * а не замена валидации в UI перед сохранением (та показывает toast).
 */
function isDraftValid(lines: PreviewProductBomCostLine[]): boolean {
  return lines.every(
    (line) => !!line.componentId && typeof line.quantity === 'number' && line.quantity > 0,
  )
}

/**
 * Живой предпросмотр себестоимости по несохранённому черновику состава.
 *
 * Делает один запрос (productCostApi.previewCost) с debounce 500 мс и отменой
 * устаревших ответов через AbortController. getCost для начальной загрузки
 * секции и для смены даты расчёта вызывается снаружи, этот composable его не трогает.
 */
export function useBomCostPreview(
  productId: Readonly<Ref<string>>,
  asOfDate: Readonly<Ref<string>>,
  draftLines: Readonly<Ref<PreviewProductBomCostLine[] | null>>,
): UseBomCostPreviewResult {
  const baseline: Ref<PreviewProductBomCostBaseline | null> = ref<PreviewProductBomCostBaseline | null>(null)
  const preview: Ref<ProductCostResponse | null> = ref<ProductCostResponse | null>(null)
  const delta: Ref<PreviewProductBomCostDelta | null> = ref<PreviewProductBomCostDelta | null>(null)
  const isPreviewLoading: Ref<boolean> = ref<boolean>(false)

  const hasPreview: ComputedRef<boolean> = computed<boolean>(
    () => preview.value !== null && delta.value !== null,
  )

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let abortController: AbortController | null = null
  // Счётчик запросов — доп. защита на случай, если отмена сигналом не сработает
  // (например, запрос уже дошёл до сервера) и устаревший ответ всё равно придёт.
  let requestSeq = 0

  const clearState = (): void => {
    baseline.value = null
    preview.value = null
    delta.value = null
  }

  const cancelPending = (): void => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    abortController?.abort()
    abortController = null
  }

  const runPreview = async (): Promise<void> => {
    const lines = draftLines.value

    // null — несохранённых изменений нет, сравнивать не с чем: запрос не нужен
    if (lines === null) {
      cancelPending()
      clearState()
      isPreviewLoading.value = false
      return
    }

    if (!isDraftValid(lines)) {
      // Невалидный черновик не отправляем — очищаем предыдущий результат,
      // чтобы карточки не показывали устаревшую дельту.
      abortController?.abort()
      abortController = null
      clearState()
      isPreviewLoading.value = false
      return
    }

    abortController?.abort()
    const controller = new AbortController()
    abortController = controller
    const seq = ++requestSeq

    isPreviewLoading.value = true
    // Старый расчёт черновика уже не соответствует вводу — UI покажет индикатор вместо него
    preview.value = null
    delta.value = null
    try {
      const response = await productCostApi.previewCost(
        productId.value,
        { lines, asOf: asOfDate.value || undefined },
        controller.signal,
      )

      // Ответ устарел — либо отменён, либо его обогнал более новый запрос.
      if (seq !== requestSeq) {
        return
      }

      preview.value = response.preview
      baseline.value = response.baseline
      delta.value = response.delta
    } catch {
      if (seq !== requestSeq) {
        return
      }
      clearState()
    } finally {
      if (seq === requestSeq) {
        isPreviewLoading.value = false
      }
    }
  }

  const scheduleDebouncedPreview = (): void => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      void runPreview()
    }, PREVIEW_DEBOUNCE_MS)
  }

  const reset = (): void => {
    cancelPending()
    requestSeq += 1 // отбрасываем ответ любого запроса, который всё же был в полёте
    clearState()
    isPreviewLoading.value = false
  }

  // Изменение строк черновика — обычный путь, живой ввод, нужен debounce.
  // Переход в null (состав совпал с сохранённым) очищаем сразу, без ожидания задержки.
  watch(
    draftLines,
    (lines) => {
      if (lines === null) {
        reset()
        return
      }
      scheduleDebouncedPreview()
    },
    { deep: true },
  )

  // Смена даты расчёта — осознанное действие пользователя, а не серия нажатий клавиш,
  // поэтому черновик сбрасывается и пересчитывается без ожидания debounce.
  watch(asOfDate, () => {
    cancelPending()
    clearState()
    void runPreview()
  })

  onUnmounted(() => {
    cancelPending()
  })

  return {
    baseline,
    preview,
    delta,
    isPreviewLoading,
    hasPreview,
    reset,
  }
}
