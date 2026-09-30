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
import { toast } from 'vue-sonner'
import { catalogProductsApi } from '@/services/api'
import type { UpdateProductRequest, ProductBarcode, PackingUnit, ProductPhoto } from '@/types/products'
import { useCurrentUser } from '@/composables/useCurrentUser'

const route = useRoute()
const router = useRouter()
const { canWrite } = useCurrentUser()

const productId = computed<string>(() => route.query.productId as string)

const isLoading = ref<boolean>(true)
const isSaving = ref<boolean>(false)
const notFound = ref<boolean>(false)
const photos = ref<ProductPhoto[]>([])

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

const getBarcodePrefix = (type?: string): string => {
  const prefixMap: Record<string, string> = {
    wildberries: 'ВБ',
    ozon: 'ОЗ',
    yandex: 'ЯМ',
  }
  return prefixMap[type?.toLowerCase() ?? ''] ?? ''
}

const getBarcodeVariant = (
  type?: string,
): 'default' | 'marketplace-wb' | 'marketplace-oz' | 'marketplace-ym' => {
  const variantMap: Record<string, 'marketplace-wb' | 'marketplace-oz' | 'marketplace-ym'> = {
    wildberries: 'marketplace-wb',
    ozon: 'marketplace-oz',
    yandex: 'marketplace-ym',
  }
  return variantMap[type?.toLowerCase() ?? ''] ?? 'default'
}

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
    const product = await catalogProductsApi.getById(productId.value)

    if (!product.found) {
      notFound.value = true
      return
    }

    form.value = {
      sku: product.sku,
      name: product.name,
      description: product.description ?? '',
      barcodes: product.barcodes ? product.barcodes.map(b => ({ ...b })) : [],
      packingUnit: product.packingUnit
        ? {
            lengthCm: product.packingUnit.lengthCm.toString(),
            widthCm: product.packingUnit.widthCm.toString(),
            heightCm: product.packingUnit.heightCm.toString(),
            weightKg: product.packingUnit.weightKg?.toString() ?? '',
          }
        : { lengthCm: '', widthCm: '', heightCm: '', weightKg: '' },
    }
    photos.value = product.photos ?? []
  } catch {
    toast.error('Не удалось загрузить данные товара')
    notFound.value = true
  } finally {
    isLoading.value = false
  }
}

const handleSave = async (): Promise<void> => {
  if (!form.value.name.trim()) {
    toast.error('Введите название')
    return
  }

  isSaving.value = true
  try {
    const payload: UpdateProductRequest = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
    }

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

    await catalogProductsApi.update(productId.value, payload)
    toast.success('Товар обновлён')
    router.push('/catalogs/products')
  } catch {
    toast.error('Не удалось обновить товар')
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
        <p class="text-sm text-muted-foreground">
          {{ isLoading ? '' : form.sku }}
        </p>
      </div>
    </div>

    <!-- Скелетон загрузки -->
    <div v-if="isLoading" class="product-layout">
      <div class="flex flex-col gap-3">
        <Skeleton class="w-full aspect-square rounded-lg" />
        <div class="grid grid-cols-2 gap-3">
          <Skeleton v-for="n in 4" :key="n" class="aspect-square rounded-md" />
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
    <div v-else class="product-layout">

      <!-- Левая колонка: фотогалерея -->
      <div class="product-photos">
        <ProductPhotoGallery :photos="photos" />
      </div>

      <!-- Правая колонка: форма -->
      <div class="flex flex-col gap-4">

        <div class="flex flex-col gap-1">
          <Label for="sku">SKU</Label>
          <Input id="sku" v-model="form.sku" disabled class="mt-1" />
          <p class="text-xs text-muted-foreground">SKU нельзя изменить</p>
        </div>

        <div class="flex flex-col gap-1">
          <Label for="name">Название *</Label>
          <Input
            id="name"
            v-model="form.name"
            placeholder="Название товара"
            class="mt-1"
            :disabled="!canWrite"
          />
        </div>

        <div class="flex flex-col gap-1">
          <Label for="description">Описание</Label>
          <Textarea
            id="description"
            v-model="form.description"
            placeholder="Краткое описание"
            :rows="4"
            class="mt-1"
            :disabled="!canWrite"
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
                  v-if="canWrite"
                  variant="ghost"
                  size="icon"
                  class="size-6 ml-auto"
                  @click="removeBarcode(idx)"
                >
                  <XIcon class="size-3" />
                </Button>
              </div>
            </div>
            <div v-if="canWrite" class="flex gap-2">
              <Input
                v-model="newBarcode.value"
                placeholder="Значение баркода"
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
          <div class="flex gap-2 mt-2">
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
