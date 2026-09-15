<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { usePermissions } from '@/composables/usePermissions'
import { tenantLegalEntityApi } from '@/services/api/endpoints/tenantLegalEntity'
import { TaxType, VatType } from '@/types'
import { toast } from 'vue-sonner'

const { canEditTenantSettings } = usePermissions()

const isLoading = ref<boolean>(true)
const isSaving = ref<boolean>(false)

const legalName = ref<string>('')
const inn = ref<string>('')
// Явно без значения по умолчанию: пока пользователь не укажет ставку/режим,
// поле остаётся незаполненным — система не должна подставлять их сама.
const taxType = ref<string>('')
const taxRatePercent = ref<string>('')
const vatType = ref<string>('')

onMounted(async () => {
  try {
    const data = await tenantLegalEntityApi.get()
    legalName.value = data.legalName ?? ''
    inn.value = data.inn ?? ''
    taxType.value = String(data.taxType)
    taxRatePercent.value = data.taxRatePercent > 0 ? String(data.taxRatePercent) : ''
    vatType.value = String(data.vatType)
  } catch {
    // данные не загружены — оставляем пустые значения
  } finally {
    isLoading.value = false
  }
})

const handleSave = async (): Promise<void> => {
  if (!canEditTenantSettings.value) {
    return
  }

  const parsedTaxType: number = parseInt(taxType.value, 10)
  const parsedVatType: number = parseInt(vatType.value, 10)
  const parsedRate: number = parseFloat(taxRatePercent.value)

  if (isNaN(parsedTaxType) || isNaN(parsedVatType)) {
    toast.error('Выберите систему налогообложения и режим НДС')
    return
  }

  if (isNaN(parsedRate) || taxRatePercent.value.trim() === '') {
    toast.error('Укажите ставку налога')
    return
  }

  isSaving.value = true

  try {
    await tenantLegalEntityApi.update({
      legalName: legalName.value.trim() || null,
      inn: inn.value.trim() || null,
      taxType: parsedTaxType as typeof TaxType[keyof typeof TaxType],
      taxRatePercent: parsedRate,
      vatType: parsedVatType as typeof VatType[keyof typeof VatType],
    })
    toast.success('Настройки юридического лица сохранены')
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } } }
    const message: string = apiError.response?.data?.message ?? 'Не удалось сохранить настройки'
    toast.error(message)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">Юридические данные</CardTitle>
      <CardDescription>
        Реквизиты и налоговые ставки.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div v-if="isLoading" class="flex justify-center py-6">
        <Spinner size="md" />
      </div>

      <div v-else class="space-y-5">
        <!-- Юридическое наименование -->
        <div class="space-y-2">
          <Label for="legal-name">Юридическое наименование</Label>
          <Input
            id="legal-name"
            v-model="legalName"
            placeholder=""
            :disabled="!canEditTenantSettings"
            :readonly="!canEditTenantSettings"
            :class="{ 'cursor-not-allowed opacity-60': !canEditTenantSettings }"
          />
        </div>

        <!-- ИНН -->
        <div class="space-y-2">
          <Label for="inn">ИНН</Label>
          <Input
            id="inn"
            v-model="inn"
            placeholder=""
            :disabled="!canEditTenantSettings"
            :readonly="!canEditTenantSettings"
            :class="{ 'cursor-not-allowed opacity-60': !canEditTenantSettings }"
          />
        </div>

        <!-- Система налогообложения -->
        <div class="space-y-2">
          <Label>Система налогообложения</Label>
          <RadioGroup
            v-model="taxType"
            :disabled="!canEditTenantSettings"
            class="flex flex-row flex-wrap gap-4"
          >
            <div class="flex items-center gap-2">
              <RadioGroupItem
                id="tax-usn"
                :value="String(TaxType.Usn)"
                :disabled="!canEditTenantSettings"
              />
              <Label for="tax-usn" :class="{ 'cursor-not-allowed opacity-60': !canEditTenantSettings }">УСН</Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroupItem
                id="tax-osno"
                :value="String(TaxType.Osno)"
                :disabled="!canEditTenantSettings"
              />
              <Label for="tax-osno" :class="{ 'cursor-not-allowed opacity-60': !canEditTenantSettings }">ОСНО</Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroupItem
                id="tax-npd"
                :value="String(TaxType.Npd)"
                :disabled="!canEditTenantSettings"
              />
              <Label for="tax-npd" :class="{ 'cursor-not-allowed opacity-60': !canEditTenantSettings }">НПД</Label>
            </div>
          </RadioGroup>
        </div>

        <!-- Ставка налога -->
        <div class="space-y-2">
          <Label for="tax-rate">Ставка налога, %</Label>
          <Input
            id="tax-rate"
            v-model="taxRatePercent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder=""
            :disabled="!canEditTenantSettings"
            :readonly="!canEditTenantSettings"
            :class="{ 'cursor-not-allowed opacity-60': !canEditTenantSettings }"
          />
          <p class="text-xs text-muted-foreground">
            Обязательно для расчёта показателей по каналам продаж
          </p>
        </div>

        <!-- Режим НДС -->
        <div class="space-y-2">
          <Label>Режим НДС</Label>
          <RadioGroup
            v-model="vatType"
            :disabled="!canEditTenantSettings"
            class="flex flex-row flex-wrap gap-4"
          >
            <div class="flex items-center gap-2">
              <RadioGroupItem
                id="vat-none"
                :value="String(VatType.None)"
                :disabled="!canEditTenantSettings"
              />
              <Label for="vat-none" :class="{ 'cursor-not-allowed opacity-60': !canEditTenantSettings }">Без НДС</Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroupItem
                id="vat-five"
                :value="String(VatType.Five)"
                :disabled="!canEditTenantSettings"
              />
              <Label for="vat-five" :class="{ 'cursor-not-allowed opacity-60': !canEditTenantSettings }">5%</Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroupItem
                id="vat-seven"
                :value="String(VatType.Seven)"
                :disabled="!canEditTenantSettings"
              />
              <Label for="vat-seven" :class="{ 'cursor-not-allowed opacity-60': !canEditTenantSettings }">7%</Label>
            </div>
            <div class="flex items-center gap-2">
              <RadioGroupItem
                id="vat-twenty-two"
                :value="String(VatType.TwentyTwo)"
                :disabled="!canEditTenantSettings"
              />
              <Label for="vat-twenty-two" :class="{ 'cursor-not-allowed opacity-60': !canEditTenantSettings }">22%</Label>
            </div>
          </RadioGroup>
        </div>

        <!-- Подсказка для не-администраторов -->
        <p v-if="!canEditTenantSettings" class="text-xs text-muted-foreground">
          Только администраторы могут изменять настройки юридического лица
        </p>

        <!-- Кнопка сохранения -->
        <div v-if="canEditTenantSettings" class="flex justify-end pt-1">
          <Button
            :disabled="isSaving"
            @click="handleSave"
          >
            <Spinner v-if="isSaving" size="sm" class="mr-2" />
            Сохранить
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
