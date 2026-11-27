<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Plus, X as XIcon } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ProductPhotoGallery from '@/components/products/ProductPhotoGallery.vue'
import { toast } from 'vue-sonner'
import { catalogProductsApi } from '@/services/api'
import { extractErrorMessage } from '@/composables/useApi'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useDraftSection } from '@/composables/usePageDraft'
import type { GetProductResponse, UpdateProductRequest, ProductBarcode, PackingUnit } from '@/types/products'

const props = defineProps<{
  productId: string
  product: GetProductResponse
}>()

type SavedPatch = Pick<GetProductResponse, 'sku' | 'name' | 'description' | 'barcodes' | 'packingUnit'>

const emit = defineEmits<{
  saved: [patch: SavedPatch]
}>()

const { canWrite } = useCurrentUser()

type PackingUnitForm = {
  [K in keyof Required<PackingUnit>]: string | number
}

interface FormData {
  sku: string
  name: string
  description: string
  barcodes: ProductBarcode[]
  packingUnit: PackingUnitForm
}

const emptyPackingUnit = (): PackingUnitForm => ({
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  weightKg: '',
})

const form = ref<FormData>({
  sku: '',
  name: '',
  description: '',
  barcodes: [],
  packingUnit: emptyPackingUnit(),
})

const BARCODE_SYMBOLOGY_EAN13 = 'EAN13'

const newBarcode = ref({ value: '', type: BARCODE_SYMBOLOGY_EAN13, isDefault: false })

/**
 * Снимок загруженных с сервера значений. Любое расхождение с ним — несохранённая правка:
 * сравнение по снимку надёжнее флага «поле тронули», потому что отмена правки вручную
 * возвращает форму в исходное состояние и предупреждение при уходе исчезает.
 */
const formBaseline = ref<string>('')

const packingValue = (value: string | number | null | undefined): string =>
  value === null || value === undefined ? '' : String(value).trim()

const formSnapshot = (): string =>
  JSON.stringify({
    sku: form.value.sku.trim(),
    name: form.value.name.trim(),
    description: form.value.description.trim(),
    barcodes: form.value.barcodes.map(b => ({ value: b.value.trim(), type: b.type?.trim() ?? '', isDefault: b.isDefault })),
    packingUnit: {
      lengthCm: packingValue(form.value.packingUnit.lengthCm),
      widthCm: packingValue(form.value.packingUnit.widthCm),
      heightCm: packingValue(form.value.packingUnit.heightCm),
      weightKg: packingValue(form.value.packingUnit.weightKg),
    },
  })

const hasUnsavedChanges = computed<boolean>(() => {
  // До загрузки товара снимок пуст: считать незаполненную форму изменённой нельзя.
  if (!formBaseline.value) {
    return false
  }

  return formSnapshot() !== formBaseline.value
})

const initFormFromProduct = (product: GetProductResponse): void => {
  form.value = {
    sku: product.sku ?? '',
    name: product.name ?? '',
    description: product.description ?? '',
    barcodes: product.barcodes ?? [],
    packingUnit: {
      lengthCm: product.packingUnit?.lengthCm?.toString() ?? '',
      widthCm: product.packingUnit?.widthCm?.toString() ?? '',
      heightCm: product.packingUnit?.heightCm?.toString() ?? '',
      weightKg: product.packingUnit?.weightKg?.toString() ?? '',
    },
  }
  formBaseline.value = formSnapshot()
}

watch(() => props.product, (product: GetProductResponse) => {
  initFormFromProduct(product)
}, { immediate: true })

const addBarcode = (): void => {
  if (!newBarcode.value.value.trim()) {
    toast.error('Введите значение баркода')
    return
  }
  form.value.barcodes.push({ ...newBarcode.value })
  newBarcode.value = { value: '', type: BARCODE_SYMBOLOGY_EAN13, isDefault: false }
}

const removeBarcode = (index: number): void => {
  form.value.barcodes.splice(index, 1)
}

const buildPackingUnitPayload = (): PackingUnit | undefined => {
  const { lengthCm, widthCm, heightCm, weightKg } = form.value.packingUnit
  const dimensions = [lengthCm, widthCm, heightCm].map(packingValue)

  const dimensionsEmpty = dimensions.every(value => value === '')
  if (dimensionsEmpty) {
    return undefined
  }

  const unit: PackingUnit = {
    lengthCm: Number.parseFloat(dimensions[0]),
    widthCm: Number.parseFloat(dimensions[1]),
    heightCm: Number.parseFloat(dimensions[2]),
  }

  const weight = packingValue(weightKg)
  if (weight !== '') {
    unit.weightKg = Number.parseFloat(weight)
  }

  return unit
}

const handleSave = async (): Promise<boolean> => {
  if (!form.value.sku.trim()) {
    toast.error('SKU обязателен')
    return false
  }

  try {
    const payload: UpdateProductRequest = {
      name: form.value.name.trim(),
      description: form.value.description.trim(),
      barcodes: form.value.barcodes,
    }

    const packingUnit = buildPackingUnitPayload()
    if (packingUnit) {
      payload.packingUnit = packingUnit
    }

    const baselineSku = JSON.parse(formBaseline.value).sku
    if (form.value.sku.trim() !== baselineSku) {
      payload.sku = form.value.sku.trim()
    }

    await catalogProductsApi.update(props.productId, payload)
    toast.success('Товар обновлён')
    formBaseline.value = formSnapshot()
    emit('saved', {
      sku: form.value.sku.trim(),
      name: form.value.name.trim(),
      description: form.value.description.trim(),
      barcodes: form.value.barcodes,
      packingUnit,
    })
    return true
  } catch (error: unknown) {
    toast.error(extractErrorMessage(error, 'Не удалось сохранить товар'))
    return false
  }
}

const handleDiscard = (): void => {
  initFormFromProduct(props.product)
}

useDraftSection({
  id: 'product-form',
  label: 'Основные данные',
  isDirty: hasUnsavedChanges,
  save: handleSave,
  discard: handleDiscard,
})
</script>

<template>
  <div class="product-layout">
    <div class="product-photos">
      <ProductPhotoGallery
        :photos="product.photos ?? []"
        :product-id="productId"
      />
    </div>

    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
        <h2 class="text-lg font-bold">
          Основные данные
        </h2>

        <div class="flex flex-col gap-1">
          <Label for="code">Код</Label>
          <Input
            id="code"
            :model-value="product.code ?? ''"
            class="mt-1 font-mono"
            disabled
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label for="name">Название</Label>
          <Input
            id="name"
            v-model="form.name"
            placeholder=""
            class="mt-1"
            :disabled="!canWrite"
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label for="sku">SKU *</Label>
          <Input
            id="sku"
            v-model="form.sku"
            placeholder=""
            class="mt-1"
            :disabled="!canWrite"
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label for="description">Описание</Label>
          <Textarea
            id="description"
            v-model="form.description"
            placeholder=""
            :rows="3"
            class="mt-1"
            :disabled="!canWrite"
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label>Баркоды</Label>
          <div class="mt-1 flex flex-col gap-2">
            <div
              v-if="form.barcodes.length > 0"
              class="mb-2 flex flex-col gap-2"
            >
              <div
                v-for="(barcode, idx) in form.barcodes"
                :key="idx"
                class="flex items-center gap-2 rounded-md bg-muted p-2"
              >
                <Badge
                  variant="secondary"
                  class="flex-shrink-0"
                >
                  {{ barcode.value }}
                </Badge>
                <span
                  v-if="barcode.type && barcode.type !== BARCODE_SYMBOLOGY_EAN13"
                  class="text-xs text-muted-foreground"
                >
                  {{ barcode.type }}
                </span>
                <Button
                  v-if="canWrite"
                  variant="ghost"
                  size="icon"
                  class="ml-auto size-6"
                  @click="removeBarcode(idx)"
                >
                  <XIcon class="size-3" />
                </Button>
              </div>
            </div>
            <div
              v-if="canWrite"
              class="flex gap-2"
            >
              <Input
                v-model="newBarcode.value"
                placeholder=""
                class="flex-1"
                aria-label="Значение баркода"
              />
              <select
                v-model="newBarcode.type"
                class="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm"
                aria-label="Символика баркода"
              >
                <option value="EAN13">
                  EAN13
                </option>
              </select>
              <Button
                variant="outline"
                size="sm"
                @click="addBarcode"
              >
                <Plus class="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <Label>Габариты упаковки (см, кг)</Label>
          <div class="mt-1 flex gap-2">
            <Input
              v-model="form.packingUnit.lengthCm"
              placeholder="Длина"
              type="number"
              step="0.01"
              :disabled="!canWrite"
            />
            <Input
              v-model="form.packingUnit.widthCm"
              placeholder="Ширина"
              type="number"
              step="0.01"
              :disabled="!canWrite"
            />
            <Input
              v-model="form.packingUnit.heightCm"
              placeholder="Высота"
              type="number"
              step="0.01"
              :disabled="!canWrite"
            />
          </div>
          <div class="mt-2 flex gap-2">
            <Input
              v-model="form.packingUnit.weightKg"
              placeholder="Вес"
              type="number"
              step="0.01"
              class="w-full"
              :disabled="!canWrite"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 32px;
  align-items: start;
}

.product-photos {
  position: sticky;
  top: 16px;
}

@media (max-width: 768px) {
  .product-layout {
    grid-template-columns: 1fr;
  }

  .product-photos {
    position: static;
  }
}
</style>
