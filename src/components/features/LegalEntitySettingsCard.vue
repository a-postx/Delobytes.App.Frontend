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
import { usePermissions } from '@/composables/usePermissions'
import { useTenantMoney } from '@/composables/useTenantMoney'
import { tenantLegalEntityApi } from '@/services/api/endpoints/tenantLegalEntity'
import { describeFailure } from '@/composables/useApiFailureCopy'
import type { ApiError } from '@/types/errors'
import ErrorState from '@/components/feedback/ErrorState.vue'
import { toast } from 'vue-sonner'

const { canEditTenantSettings } = usePermissions()
const { currency, currencySymbol } = useTenantMoney()

const isLoading = ref<boolean>(true)
const isSaving = ref<boolean>(false)

/**
 * Ошибка загрузки реквизитов. Отдельное состояние, а не тихий catch: пустые поля ИНН
 * и наименования выглядят как «реквизиты не заполнены», и пользователь может затереть
 * реальные данные, сохранив пустую форму поверх недоступного ответа.
 */
const loadError = ref<string>('')

const legalName = ref<string>('')
const inn = ref<string>('')

/**
 * Приводит необязательное текстовое поле к виду, пригодному для отправки:
 * пустая или пробельная строка становится null, иначе — обрезанное значение.
 */
const normalizeOptionalText = (value: string): string | null => {
  const normalized: string = value.trim()

  return normalized === '' ? null : normalized
}

const loadLegalEntity = async (): Promise<void> => {
  isLoading.value = true
  loadError.value = ''

  try {
    const data = await tenantLegalEntityApi.get()
    legalName.value = data.legalName ?? ''
    inn.value = data.inn ?? ''
  } catch (error: unknown) {
    const apiError = error as { response?: { status?: number; data?: { message?: string } } }
    const failure: ApiError = {
      code: 'common.unexpected_error',
      message: apiError.response?.data?.message ?? 'Не удалось загрузить реквизиты организации',
      status: apiError.response?.status ?? 0,
    }
    loadError.value = describeFailure(failure, 'Не удалось загрузить реквизиты организации').title
  } finally {
    isLoading.value = false
  }
}

onMounted(loadLegalEntity)

const handleSave = async (): Promise<void> => {
  if (!canEditTenantSettings.value) {
    return
  }

  isSaving.value = true

  try {
    await tenantLegalEntityApi.update({
      legalName: normalizeOptionalText(legalName.value),
      inn: normalizeOptionalText(inn.value),
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
      <CardTitle class="text-lg">Юрлицо</CardTitle>
      <CardDescription>Реквизиты организации.</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div v-if="isLoading" class="flex justify-center py-6">
        <Spinner size="md" />
      </div>

      <ErrorState
        v-else-if="loadError"
        variant="compact"
        :title="loadError"
        description="Реквизиты не загружены — проверьте подключение и повторите попытку."
        retry-label="Повторить"
        @retry="loadLegalEntity"
      />

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

          <!-- Валюта задаётся на уровне тенанта и здесь только отображается -->
          <div class="space-y-1.5">
            <Label for="currency">Валюта учёта:</Label>
            <p id="currency" class="text-sm text-muted-foreground">
              {{ currency }} ({{ currencySymbol }})
            </p>
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
