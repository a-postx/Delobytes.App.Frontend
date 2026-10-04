<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Package, X as XIcon, ArrowLeft } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import ProductPhotoGallery from '@/components/products/ProductPhotoGallery.vue'
import ProductChannelBadges from '@/components/products/ProductChannelBadges.vue'
import ProductBomEditor from '@/components/products/ProductBomEditor.vue'
import { toast } from 'vue-sonner'
import { catalogProductsApi } from '@/services/api'
import { extractErrorMessage } from '@/composables/useApi'
import { channelDisplay, normalizeChannel } from '@/utils/channelBadges'
import type { GetProductResponse, UpdateProductRequest, ProductBarcode, PackingUnit, ProductPhoto } from '@/types/products'
import { useCurrentUser } from '@/composables/useCurrentUser'

const route = useRoute()
const router = useRouter()
const { canWrite } = useCurrentUser()

const productId = computed<string>(() => route.query.productId as string)

const isLoading = ref<boolean>(true)
const isSaving = ref<boolean>(false)
const notFound = ref<boolean>(false)
const photos = ref<ProductPhoto[]>([])
const product = ref<GetProductResponse | null>(null)

// Временная мера до появления отправки данных в маркетплейсы (см. ТЗ п.2.1):
// у связанного товара импорт перезаписывает Name/Description/Barcodes/PackingUnit, поэтому
// эти поля остаются только для чтения. SKU — исключение: импорт его не трогает после создания
// (см. ImportProductBatchConsumer.FindProductByBarcodeAsync — сопоставление идёт по nmID и
// штрихкоду, но не по Product.Sku), поэтому SKU открыт для правки и у связанных товаров.
// Когда появится write-back, отключение снять со всех полей.
const isLinked = computed<boolean>(() => (product.value?.channelLinks?.length ?? 0) > 0)
const linkedChannelMessage = computed<string>(() => {
  const links = product.value?.channelLinks ?? []
  return links.length === 1 ? links[0].channelName : 'маркетплейсов'
})

// Поля формы — числовые значения хранятся как строка до отправки
type PackingUnitForm = {
  [K in keyof Required<PackingUnit>]: string
}

interface FormData {
  sku: string
  name: string
  description: string
  barcodes: ProductBarcode[]
  packingUnit: PackingUnitForm
}

const form = ref<FormData>({
  sku: '',
  name: '',
  description: '',
  barcodes: [],
  packingUnit: { lengthCm: '', widthCm: '', heightCm: '', weightKg: '' },
})

const newBarcode = ref({ value: '', type: '', isDefault: false })

const getBarcodePrefix = (type?: string): string => channelDisplay(normalizeChannel(type)).prefix

const getBarcodeVariant = (
  type?: string,
): 'default' | 'marketplace-wb' | 'marketplace-oz' | 'marketplace-ym' => channelDisplay(normalizeChannel(type)).variant

const addBarcode = (): void => {
  if (!newBarcode.value.value.trim()) {
    toast.error('Введите значение баркода')
    return
  }
  form.value.barcodes.push({ ...newBarcode.value })
  newBarcode.value = { value: '', type: '', isDefault: false }
}

const removeBarcode = (index: number): void => {
  form.value.barcodes.splice(index, 1)
}

const loadProduct = async (): Promise<void> => {
  if (!productId.value) {
    notFound.value = true
    isLoading.value = false
    return
  }

  isLoading.value = true
  try {
    const response = await catalogProductsApi.getById(productId.value)

    if (!response.found) {
      notFound.value = true
      return
    }

    product.value = response
    form.value = {
      sku: response.sku,
      name: response.name,
      description: response.description ?? '',
      barcodes: response.barcodes ? response.barcodes.map(b => ({ ...b })) : [],
      packingUnit: response.packingUnit
        ? {
            lengthCm: response.packingUnit.lengthCm.toString(),
            widthCm: response.packingUnit.widthCm.toString(),
            heightCm: response.packingUnit.heightCm.toString(),
            weightKg: response.packingUnit.weightKg?.toString() ?? '',
          }
        : { lengthCm: '', widthCm: '', heightCm: '', weightKg: '' },
    }
    photos.value = response.photos ?? []
  } catch {
    toast.error('Не удалось загрузить данные товара')
    notFound.value = true
  } finally {
    isLoading.value = false
  }
}

const handleSave = async (): Promise<void> => {
  const sku: string = form.value.sku.trim()

  // Checked locally as well as by the backend: the field is the point of this form, and a
  // round-trip that can only answer "не пусто" is wasted motion.
  if (!sku) {
    toast.error('Введите SKU')
    return
  }

  // Для связанного товара остальные поля не редактируются, но подставляются в форму из
  // ответа API — отправлять их нельзя, иначе локальная копия перезапишет данные импорта.
  if (!isLinked.value && !form.value.name.trim()) {
    toast.error('Введите название')
    return
  }

  isSaving.value = true
  try {
    const payload: UpdateProductRequest = {}

    // Отправляем SKU только когда он изменился: у связанного товара бэкенд по изменению
    // выставит UpdatedAt, и лишняя запись без правок исказила бы историю изменений.
    if (sku !== (product.value?.sku ?? '')) {
      payload.sku = sku
    }

    if (!isLinked.value) {
      payload.name = form.value.name.trim()
      payload.description = form.value.description.trim() || undefined

      if (form.value.barcodes.length > 0) {
        payload.barcodes = form.value.barcodes.map(b => {
          const barcode: ProductBarcode = {
            value: b.value.trim(),
            type: b.type?.trim() || undefined,
            isDefault: b.isDefault,
          }
          if (b.id) {
            barcode.id = b.id
          }
          return barcode
        })
      }

      if (
        form.value.packingUnit.lengthCm &&
        form.value.packingUnit.widthCm &&
        form.value.packingUnit.heightCm
      ) {
        payload.packingUnit = {
          lengthCm: parseFloat(form.value.packingUnit.lengthCm),
          widthCm: parseFloat(form.value.packingUnit.widthCm),
          heightCm: parseFloat(form.value.packingUnit.heightCm),
          weightKg: form.value.packingUnit.weightKg
            ? parseFloat(form.value.packingUnit.weightKg)
            : undefined,
        }
      }
    }

    await catalogProductsApi.update(productId.value, payload)
    toast.success('Товар обновлён')
    router.push('/catalogs/products')
  } catch (error: unknown) {
    // Серверное сообщение содержит причину: занятый SKU приходит как 409
    // catalog.product.sku_conflict, пустой — как 422 common.validation_failed.
    toast.error(extractErrorMessage(error, 'Не удалось обновить товар'))
  } finally {
    isSaving.value = false
  }
}

const handleCancel = (): void => {
  router.push('/catalogs/products')
}

onMounted(() => {
  loadProduct()
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6 max-w-5xl mx-auto">

    <!-- Шапка -->
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" class="size-9" @click="handleCancel" aria-label="Назад">
        <ArrowLeft class="size-4" />
      </Button>
      <div class="flex flex-col gap-0.5">
        <h1 class="text-xl font-bold flex items-center gap-2">
          <Package class="size-5 text-primary" />
          Редактирование товара
        </h1>
      </div>
    </div>

    <!-- Скелетон загрузки -->
    <div v-if="isLoading" class="product-layout">
      <div class="flex flex-col gap-3">
        <Skeleton class="w-full aspect-[3/4] rounded-lg" />
        <div class="grid grid-cols-2 gap-3">
          <Skeleton v-for="n in 4" :key="n" class="aspect-[3/4] rounded-md" />
        </div>
      </div>
      <div class="flex flex-col gap-4">
        <Skeleton v-for="n in 5" :key="n" class="h-10 w-full rounded-md" />
      </div>
    </div>

    <!-- Не найден -->
    <div v-else-if="notFound" class="rounded-xl border border-border bg-card p-12">
      <div class="flex flex-col items-center justify-center gap-3 text-center">
        <div class="size-12 rounded-full bg-muted flex items-center justify-center">
          <Package class="size-6 text-muted-foreground" />
        </div>
        <div>
          <h3 class="font-semibold">Товар не найден</h3>
          <p class="text-sm text-muted-foreground mt-1">
            Проверьте ссылку или вернитесь к списку товаров
          </p>
        </div>
        <Button variant="outline" class="mt-2" @click="handleCancel">
          К списку товаров
        </Button>
      </div>
    </div>

    <!-- Основной контент -->
    <template v-else>
    <div class="product-layout">

      <!-- Левая колонка: фотогалерея -->
      <div class="product-photos">
        <ProductPhotoGallery :photos="photos" />
      </div>

      <!-- Правая колонка: форма -->
      <div class="flex flex-col gap-4">
        <ProductChannelBadges v-if="product?.channelLinks?.length" :links="product.channelLinks" />
        <p v-if="isLinked" class="text-sm text-muted-foreground">
          Данные получены из {{ linkedChannelMessage }}, редактировать можно только SKU.
        </p>

        <div class="flex flex-col gap-1">
          <Label for="sku">SKU *</Label>
          <Input
            id="sku"
            v-model="form.sku"
            class="mt-1"
            :disabled="!canWrite"
          />
          <p class="text-xs text-muted-foreground">
            Внутренний артикул. Правка не влияет на сопоставление товара с карточкой маркетплейса.
          </p>
        </div>

        <div class="flex flex-col gap-1">
          <Label for="name">Название *</Label>
          <Input
            id="name"
            v-model="form.name"
            placeholder=""
            class="mt-1"
            :disabled="!canWrite || isLinked"
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label for="description">Описание</Label>
          <Textarea
            id="description"
            v-model="form.description"
            placeholder=""
            :rows="4"
            class="mt-1"
            :disabled="!canWrite || isLinked"
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label>Баркоды товара</Label>
          <div class="flex flex-col gap-2 mt-1">
            <div v-if="form.barcodes.length > 0" class="flex flex-col gap-2 mb-2">
              <div
                v-for="(barcode, idx) in form.barcodes"
                :key="idx"
                class="flex items-center gap-2 p-2 bg-muted rounded-md"
              >
                <Badge :variant="getBarcodeVariant(barcode.type)" class="flex-shrink-0">
                  <span v-if="getBarcodePrefix(barcode.type)" class="font-semibold mr-1">
                    {{ getBarcodePrefix(barcode.type) }}
                  </span>{{ barcode.value }}
                </Badge>
                <span v-if="barcode.type" class="text-xs text-muted-foreground">
                  {{ barcode.type }}
                </span>
                <Button
                  v-if="canWrite && !isLinked"
                  variant="ghost"
                  size="icon"
                  class="size-6 ml-auto"
                  @click="removeBarcode(idx)"
                >
                  <XIcon class="size-3" />
                </Button>
              </div>
            </div>
            <div v-if="canWrite && !isLinked" class="flex gap-2">
              <Input
                v-model="newBarcode.value"
                placeholder=""
                class="flex-1"
              />
              <Input
                v-model="newBarcode.type"
                placeholder="Тип (опц.)"
                class="w-32"
              />
              <Button variant="outline" size="sm" @click="addBarcode">
                <Plus class="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <Label>Габариты упаковки (см, кг)</Label>
          <div class="flex gap-2 mt-1">
            <Input
              v-model="form.packingUnit.lengthCm"
              placeholder="Длина"
              type="number"
              step="0.01"
              :disabled="!canWrite || isLinked"
            />
            <Input
              v-model="form.packingUnit.widthCm"
              placeholder="Ширина"
              type="number"
              step="0.01"
              :disabled="!canWrite || isLinked"
            />
            <Input
              v-model="form.packingUnit.heightCm"
              placeholder="Высота"
              type="number"
              step="0.01"
              :disabled="!canWrite || isLinked"
            />
          </div>
          <div class="flex gap-2 mt-2">
            <Input
              v-model="form.packingUnit.weightKg"
              placeholder="Вес"
              type="number"
              step="0.01"
              class="w-full"
              :disabled="!canWrite || isLinked"
            />
          </div>
        </div>

        <!-- Кнопки действий -->
        <div v-if="canWrite" class="flex gap-3 pt-2">
          <Button @click="handleSave" :disabled="isSaving" class="flex-1">
            <Spinner v-if="isSaving" class="mr-2" />
            {{ isSaving ? 'Сохранение...' : 'Сохранить' }}
          </Button>
          <Button variant="outline" :disabled="isSaving" @click="handleCancel">
            Отмена
          </Button>
        </div>

        <div v-else class="pt-2">
          <Button variant="outline" @click="handleCancel">
            Назад к списку
          </Button>
        </div>

      </div>
    </div>

    <ProductBomEditor :product-id="productId" />
    </template>
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
