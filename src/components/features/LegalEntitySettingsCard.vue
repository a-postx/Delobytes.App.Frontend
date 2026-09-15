<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePermissions } from '@/composables/usePermissions'
import { tenantLegalEntityApi } from '@/services/api/endpoints/tenantLegalEntity'
import { TaxType, VatType } from '@/types'
import { toast } from 'vue-sonner'

const { canEditTenantSettings } = usePermissions()

/** Прочерк вместо пустого значения: показывает, что ставка ещё не задана пользователем. */
const EMPTY_VALUE_PLACEHOLDER = '—'

const TAX_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: String(TaxType.Usn), label: 'УСН' },
  { value: String(TaxType.Osno), label: 'ОСНО' },
  { value: String(TaxType.Npd), label: 'НПД' },
]

const VAT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: String(VatType.None), label: 'Без НДС' },
  { value: String(VatType.Five), label: '5%' },
  { value: String(VatType.Seven), label: '7%' },
  { value: String(VatType.TwentyTwo), label: '22%' },
]

const isLoading = ref<boolean>(true)
const isSaving = ref<boolean>(false)

const legalName = ref<string>('')
const inn = ref<string>('')
// Пустая строка означает «значение не задано». Система не подставляет ставки и режимы
// автоматически — до явного выбора пользователем расчёт показателей по каналам недоступен.
const taxType = ref<string>('')
// Поле ставки — <input type="number">, поэтому Vue приводит v-model к number,
// а у пустого поля значением остаётся ''. Тип честно допускает оба варианта.
const taxRatePercent = ref<string | number>('')
const vatType = ref<string>('')

const isKnownOption = (
  options: { value: string; label: string }[],
  value: string,
): boolean => options.some((option) => option.value === value)

/**
 * Приводит значение поля ставки к числу: null означает «значение не задано».
 */
const parseRatePercent = (value: string | number): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const normalized: string = value.trim()

  if (normalized === '') {
    return null
  }

  const parsed: number = Number.parseFloat(normalized)

  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Приводит необязательное текстовое поле к виду, пригодному для отправки:
 * пустая или пробельная строка становится null, иначе — обрезанное значение.
 */
const normalizeOptionalText = (value: string): string | null => {
  const normalized: string = value.trim()

  return normalized === '' ? null : normalized
}

onMounted(async () => {
  try {
    const data = await tenantLegalEntityApi.get()
    legalName.value = data.legalName ?? ''
    inn.value = data.inn ?? ''
    // Значение вне enum означает «пользователь ещё не выбирал режим» — показываем прочерк.
    taxType.value = isKnownOption(TAX_TYPE_OPTIONS, String(data.taxType))
      ? String(data.taxType)
      : ''
    taxRatePercent.value = data.taxRatePercent > 0 ? data.taxRatePercent : ''
    vatType.value = isKnownOption(VAT_TYPE_OPTIONS, String(data.vatType))
      ? String(data.vatType)
      : ''
  } catch {
    // данные не загружены — оставляем пустые значения, ничего не подставляем
  } finally {
    isLoading.value = false
  }
})

const handleSave = async (): Promise<void> => {
  if (!canEditTenantSettings.value) {
    return
  }

  const parsedTaxType: number = Number.parseInt(taxType.value, 10)
  const parsedVatType: number = Number.parseInt(vatType.value, 10)
  const parsedRate: number | null = parseRatePercent(taxRatePercent.value)

  if (Number.isNaN(parsedTaxType)) {
    toast.error('Выберите систему налогообложения')
    return
  }

  if (Number.isNaN(parsedVatType)) {
    toast.error('Выберите режим НДС')
    return
  }

  if (parsedRate === null) {
    toast.error('Укажите ставку налога')
    return
  }

  isSaving.value = true

  try {
    await tenantLegalEntityApi.update({
      legalName: normalizeOptionalText(legalName.value),
      inn: normalizeOptionalText(inn.value),
      taxType: parsedTaxType as (typeof TaxType)[keyof typeof TaxType],
      taxRatePercent: parsedRate,
      vatType: parsedVatType as (typeof VatType)[keyof typeof VatType],
    })
    toast.success('Настройки юридического лица сохранены')
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } } }
    const message: string =
      apiError.response?.data?.message ?? 'Не удалось сохранить настройки'
    toast.error(message)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">Настройки юридического лица</CardTitle>
      <CardDescription>Реквизиты и налоговые ставки.</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div v-if="isLoading" class="flex justify-center py-6">
        <Spinner size="md" />
      </div>

      <template v-else>
        <div class="space-y-3">
          <!-- Строка 1: ИНН (короткий), юридическое наименование (широкое) -->
          <div class="grid gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div class="space-y-1.5">
              <Label for="inn">ИНН</Label>
              <Input
                id="inn"
                v-model="inn"
                inputmode="numeric"
                maxlength="12"
                :disabled="!canEditTenantSettings"
                :readonly="!canEditTenantSettings"
                :class="{ 'cursor-not-allowed opacity-60': !canEditTenantSettings }"
              />
            </div>

            <div class="space-y-1.5">
              <Label for="legal-name">Юридическое наименование</Label>
              <Input
                id="legal-name"
                v-model="legalName"
                :disabled="!canEditTenantSettings"
                :readonly="!canEditTenantSettings"
                :class="{ 'cursor-not-allowed opacity-60': !canEditTenantSettings }"
              />
            </div>
          </div>

          <!-- Строка 2: система налогообложения, ставка налога, режим НДС -->
          <div class="grid gap-x-4 gap-y-3 sm:grid-cols-3">
            <div class="space-y-1.5">
              <Label for="tax-type">Система налогообложения</Label>
              <Select v-model="taxType" :disabled="!canEditTenantSettings">
                <SelectTrigger id="tax-type" class="w-full">
                  <SelectValue :placeholder="EMPTY_VALUE_PLACEHOLDER" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="option in TAX_TYPE_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-1.5">
              <Label for="tax-rate">Ставка налога, %</Label>
              <Input
                id="tax-rate"
                v-model="taxRatePercent"
                type="number"
                inputmode="decimal"
                min="0"
                max="100"
                step="0.01"
                :disabled="!canEditTenantSettings"
                :readonly="!canEditTenantSettings"
                :class="{ 'cursor-not-allowed opacity-60': !canEditTenantSettings }"
              />
            </div>

            <div class="space-y-1.5">
              <Label for="vat-type">Режим НДС</Label>
              <Select v-model="vatType" :disabled="!canEditTenantSettings">
                <SelectTrigger id="vat-type" class="w-full">
                  <SelectValue :placeholder="EMPTY_VALUE_PLACEHOLDER" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="option in VAT_TYPE_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <p v-if="!canEditTenantSettings" class="text-xs text-muted-foreground">
            Только администраторы могут изменять настройки юридического лица.
          </p>
        </div>
      </template>
    </CardContent>
    <CardFooter v-if="!isLoading && canEditTenantSettings" class="flex justify-end">
      <Button :disabled="isSaving" @click="handleSave">
        <Spinner v-if="isSaving" size="sm" class="mr-2" />
        Сохранить
      </Button>
    </CardFooter>
  </Card>
</template>
