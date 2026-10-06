import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, effectScope, nextTick } from 'vue'
import type { Ref, EffectScope } from 'vue'
import { productCostApi } from '@/services/api'
import { useBomCostPreview } from '@/composables/useBomCostPreview'
import type { UseBomCostPreviewResult } from '@/composables/useBomCostPreview'
import type {
  PreviewProductBomCostLine,
  PreviewProductBomCostResponse,
  ProductCostResponse,
} from '@/types/bom'

vi.mock('@/services/api', () => ({
  productCostApi: {
    previewCost: vi.fn(),
  },
}))

const DEBOUNCE_MS: number = 500

const buildCost = (totalCost: number): ProductCostResponse => ({
  found: true,
  productId: 'p1',
  asOfDate: '2024-06-01',
  materialCost: totalCost,
  logisticsCost: 0,
  packagingCost: 0,
  laborCost: 0,
  totalCost,
  isComplete: true,
  lines: [],
  warnings: [],
})

const buildResponse = (draftTotal: number, savedTotal: number): PreviewProductBomCostResponse => ({
  found: true,
  preview: buildCost(draftTotal),
  baseline: {
    materialCost: savedTotal,
    logisticsCost: 0,
    packagingCost: 0,
    laborCost: 0,
    totalCost: savedTotal,
    isComplete: true,
  },
  delta: {
    materialDelta: draftTotal - savedTotal,
    logisticsDelta: 0,
    packagingDelta: 0,
    laborDelta: 0,
    totalDelta: draftTotal - savedTotal,
  },
})

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

const createDeferred = <T>(): Deferred<T> => {
  let resolve: (value: T) => void = () => {}
  const promise: Promise<T> = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

/** Прокачивает промисы без setTimeout: fake timers не должны мешать ожиданию микрозадач. */
const settle = async (): Promise<void> => {
  for (let i: number = 0; i < 10; i++) {
    await Promise.resolve()
  }
}

let scope: EffectScope
let productId: Ref<string>
let asOfDate: Ref<string>
let draftLines: Ref<PreviewProductBomCostLine[] | null>
let result: UseBomCostPreviewResult

const setup = (): void => {
  productId = ref<string>('p1')
  asOfDate = ref<string>('2024-06-01')
  draftLines = ref<PreviewProductBomCostLine[] | null>(null)
  scope = effectScope()
  result = scope.run(() => useBomCostPreview(productId, asOfDate, draftLines)) as UseBomCostPreviewResult
}

const previewMock = vi.mocked(productCostApi.previewCost)

/** Меняет черновик и доходит до срабатывания debounce. */
const editDraft = async (lines: PreviewProductBomCostLine[] | null, waitMs: number = DEBOUNCE_MS): Promise<void> => {
  draftLines.value = lines
  await nextTick()
  vi.advanceTimersByTime(waitMs)
  await settle()
}

describe('useBomCostPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    previewMock.mockReset()
    setup()
  })

  afterEach(() => {
    scope.stop()
    vi.useRealTimers()
  })

  it('does not send a request while there are no unsaved changes (draft is null)', async () => {
    previewMock.mockResolvedValue(buildResponse(120, 100))

    await editDraft(null, 2 * DEBOUNCE_MS)

    expect(previewMock).not.toHaveBeenCalled()
    expect(result.hasPreview.value).toBe(false)
  })

  it('exposes draft, baseline and delta from a single request', async () => {
    previewMock.mockResolvedValue(buildResponse(120, 100))

    await editDraft([{ componentId: 'c1', quantity: 2 }])

    expect(previewMock).toHaveBeenCalledTimes(1)
    expect(previewMock).toHaveBeenCalledWith(
      'p1',
      { lines: [{ componentId: 'c1', quantity: 2 }], asOf: '2024-06-01' },
      expect.any(AbortSignal),
    )
    expect(result.hasPreview.value).toBe(true)
    expect(result.preview.value?.totalCost).toBe(120)
    expect(result.baseline.value?.totalCost).toBe(100)
    expect(result.delta.value?.totalDelta).toBe(20)
    expect(result.isPreviewLoading.value).toBe(false)
  })

  it('collapses rapid edits into a single request with the latest draft', async () => {
    previewMock.mockResolvedValue(buildResponse(130, 100))

    draftLines.value = [{ componentId: 'c1', quantity: 1 }]
    await nextTick()
    vi.advanceTimersByTime(300)

    draftLines.value = [{ componentId: 'c1', quantity: 2 }]
    await nextTick()
    vi.advanceTimersByTime(300)

    draftLines.value = [{ componentId: 'c1', quantity: 3 }]
    await nextTick()
    vi.advanceTimersByTime(DEBOUNCE_MS - 1)
    await settle()
    expect(previewMock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    await settle()

    expect(previewMock).toHaveBeenCalledTimes(1)
    expect(previewMock.mock.calls[0][1].lines).toEqual([{ componentId: 'c1', quantity: 3 }])
  })

  it('keeps the loading flag on until the in-flight request settles', async () => {
    const pending: Deferred<PreviewProductBomCostResponse> = createDeferred<PreviewProductBomCostResponse>()
    previewMock.mockReturnValue(pending.promise)

    draftLines.value = [{ componentId: 'c1', quantity: 1 }]
    await nextTick()
    vi.advanceTimersByTime(DEBOUNCE_MS)
    await settle()

    expect(result.isPreviewLoading.value).toBe(true)
    expect(result.hasPreview.value).toBe(false)

    pending.resolve(buildResponse(50, 40))
    await settle()

    expect(result.isPreviewLoading.value).toBe(false)
    expect(result.hasPreview.value).toBe(true)
  })

  it('does not send a request when a row has no component and clears the previous result', async () => {
    previewMock.mockResolvedValue(buildResponse(120, 100))
    await editDraft([{ componentId: 'c1', quantity: 2 }])
    expect(result.hasPreview.value).toBe(true)

    await editDraft([{ componentId: '', quantity: 2 }])

    expect(previewMock).toHaveBeenCalledTimes(1)
    expect(result.preview.value).toBeNull()
    expect(result.delta.value).toBeNull()
    expect(result.hasPreview.value).toBe(false)
  })

  it('does not send a request when a quantity is not positive', async () => {
    previewMock.mockResolvedValue(buildResponse(120, 100))

    await editDraft([{ componentId: 'c1', quantity: 0 }])
    await editDraft([{ componentId: 'c1', quantity: -3 }])

    expect(previewMock).not.toHaveBeenCalled()
    expect(result.hasPreview.value).toBe(false)
  })

  it('aborts the previous request and ignores its late response', async () => {
    const first: Deferred<PreviewProductBomCostResponse> = createDeferred<PreviewProductBomCostResponse>()
    const second: Deferred<PreviewProductBomCostResponse> = createDeferred<PreviewProductBomCostResponse>()
    previewMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)

    await editDraft([{ componentId: 'c1', quantity: 1 }])
    const firstSignal: AbortSignal = previewMock.mock.calls[0][2] as AbortSignal

    await editDraft([{ componentId: 'c1', quantity: 2 }])
    const secondSignal: AbortSignal = previewMock.mock.calls[1][2] as AbortSignal

    expect(firstSignal.aborted).toBe(true)
    expect(secondSignal.aborted).toBe(false)

    second.resolve(buildResponse(200, 100))
    await settle()
    // Ответ первого запроса приходит уже после второго: состояние не должно перезаписаться им
    first.resolve(buildResponse(999, 100))
    await settle()

    expect(result.preview.value?.totalCost).toBe(200)
    expect(result.delta.value?.totalDelta).toBe(100)
  })

  it('reset cancels the pending debounce and clears the state', async () => {
    previewMock.mockResolvedValue(buildResponse(120, 100))
    await editDraft([{ componentId: 'c1', quantity: 2 }])
    expect(result.hasPreview.value).toBe(true)

    draftLines.value = [{ componentId: 'c1', quantity: 5 }]
    await nextTick()
    result.reset()
    vi.advanceTimersByTime(2 * DEBOUNCE_MS)
    await settle()

    expect(previewMock).toHaveBeenCalledTimes(1)
    expect(result.baseline.value).toBeNull()
    expect(result.preview.value).toBeNull()
    expect(result.delta.value).toBeNull()
    expect(result.hasPreview.value).toBe(false)
  })

  it('clears the result immediately when the draft becomes null (changes were saved)', async () => {
    previewMock.mockResolvedValue(buildResponse(120, 100))
    await editDraft([{ componentId: 'c1', quantity: 2 }])
    expect(result.hasPreview.value).toBe(true)

    draftLines.value = null
    await nextTick()

    expect(result.hasPreview.value).toBe(false)
    expect(result.baseline.value).toBeNull()
    expect(previewMock).toHaveBeenCalledTimes(1)
  })

  it('recalculates immediately on a date change and drops the previous result', async () => {
    previewMock.mockResolvedValueOnce(buildResponse(120, 100))
    await editDraft([{ componentId: 'c1', quantity: 2 }])
    expect(result.hasPreview.value).toBe(true)

    const pending: Deferred<PreviewProductBomCostResponse> = createDeferred<PreviewProductBomCostResponse>()
    previewMock.mockReturnValueOnce(pending.promise)

    asOfDate.value = '2024-07-01'
    await nextTick()

    expect(previewMock).toHaveBeenCalledTimes(2)
    expect(previewMock.mock.calls[1][1].asOf).toBe('2024-07-01')
    expect(result.hasPreview.value).toBe(false)
    expect(result.isPreviewLoading.value).toBe(true)

    pending.resolve(buildResponse(80, 70))
    await settle()

    expect(result.delta.value?.totalDelta).toBe(10)
  })

  it('treats a failed request as an unavailable preview without throwing', async () => {
    previewMock.mockRejectedValue(new Error('network'))

    await editDraft([{ componentId: 'c1', quantity: 2 }])

    expect(result.hasPreview.value).toBe(false)
    expect(result.isPreviewLoading.value).toBe(false)
  })
})
