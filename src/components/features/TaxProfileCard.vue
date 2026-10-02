<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
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
import { Badge } from '@/components/ui/badge'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialogRoot,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePermissions } from '@/composables/usePermissions'
import { useApiCall } from '@/composables/useApiCall'
import {
  TAX_REGIME_OPTIONS,
  TaxRegime,
  tenantTaxProfilesApi,
} from '@/services/api/endpoints/tenantTaxProfiles'
import type {
  CreateTenantTaxProfileRequest,
  TenantTaxProfileItem,
} from '@/services/api/endpoints/tenantTaxProfiles'
import { VatType } from '@/types'
import { toast } from 'vue-sonner'

const { canEditTenantSettings } = usePermissions()

const VAT_TYPE_OPTIONS: { value: VatType; label: string }[] = [
  { value: VatType.None, label: 'Без НДС' },
  { value: VatType.Five, label: '5%' },
  { value: VatType.Seven, label: '7%' },
  { value: VatType.TwentyTwo, label: '22%' },
]

const items: Ref<TenantTaxProfileItem[]> = ref([])
const isLoading: Ref<boolean> = ref(true)
const isSaving: Ref<boolean> = ref(false)
const isDeleting: Ref<boolean> = ref(false)

const createDialogOpen: Ref<boolean> = ref(false)
const deleteDialogOpen: Ref<boolean> = ref(false)

const deleteTarget: Ref<TenantTaxProfileItem | null> = ref(null)

const form = ref<{
  regime: TaxRegime
  ratePercent: string | number
  vat: VatType
  validFrom: string
}>({
  regime: TaxRegime.UsnIncome,
  ratePercent: '',
  vat: VatType.None,
  validFrom: today(),
})

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Бэкенд отдаёт версии по убыванию даты, но порядок ответа — не контракт. */
const sortedItems: ComputedRef<TenantTaxProfileItem[]> = computed(() =>
  [...items.value].sort((left, right) => right.validFrom.localeCompare(left.validFrom))
)

const latestProfile: ComputedRef<TenantTaxProfileItem | null> = computed(
  () => sortedItems.value[0] ?? null
)

/**
 * Бэкенд не отдаёт activeProfileId: «текущая» версия выводится из списка —
 * это версия с максимальным ValidFrom, то есть последняя назначенная ставка.
 */
const activeProfileId: ComputedRef<string | null> = computed(
  () => latestProfile.value?.id ?? null
)

/** Сегодня в ISO-формате (YYYY-MM-DD) — для сравнения с ValidFrom как со строками. */
const todayIso: ComputedRef<string> = computed(() => today())

/**
 * Удалять можно только последнюю версию, которая ещё не вступила в силу: как только
 * наступил её ValidFrom, она могла попасть в уже посчитанные отчёты, и удаление задним
 * числом эти отчёты обесценит. Бэкенд проверяет то же самое по дате тенанта — здесь
 * сравнение приблизительное (по часовому поясу браузера), окончательное решение
 * всегда у бэкенда.
 */
const isDeletable = (item: TenantTaxProfileItem): boolean =>
  item.id === activeProfileId.value && item.validFrom > todayIso.value

const deleteDisabledReason = (item: TenantTaxProfileItem): string => {
  if (item.id !== activeProfileId.value) {
    return 'Удалить можно только последнюю версию'
  }

  if (item.validFrom <= todayIso.value) {
    return 'Ставка уже вступила в силу и может быть использована в отчётах — удалить её больше нельзя'
  }

  return 'Удалить ставку'
}

const vatLabel = (vat: VatType): string =>
  VAT_TYPE_OPTIONS.find((option) => option.value === vat)?.label ?? '—'

const regimeLabel = (regime: TaxRegime): string =>
  TAX_REGIME_OPTIONS.find((option) => option.value === regime)?.label ?? '—'

const parseIsoDate = (value: string): Date | null => {
  const [year, month, day] = value.split('-')

  if (!year || !month || !day) {
    return null
  }

  const date = new Date(Number(year), Number(month) - 1, Number(day))

  return Number.isNaN(date.getTime()) ? null : date
}

const formatValidFrom = (value: string): string => {
  const date: Date | null = parseIsoDate(value)

  return date ? date.toLocaleDateString('ru-RU') : value
}

/** Минимальная допустимая дата: строго позже последней версии. */
const minValidFrom: ComputedRef<string> = computed(() => {
  const latest: Date | null = latestProfile.value
    ? parseIsoDate(latestProfile.value.validFrom)
    : null

  if (!latest) {
    return ''
  }

  latest.setDate(latest.getDate() + 1)

  return latest.toISOString().slice(0, 10)
})

const dateBlocked: ComputedRef<boolean> = computed(() => {
  if (!latestProfile.value) {
    return false
  }

  return form.value.validFrom <= latestProfile.value.validFrom
})

const { execute: fetchProfiles } = useApiCall<{ items: TenantTaxProfileItem[] }>({
  fallbackMessage: 'Не удалось загрузить налоговые настройки',
})

const { execute: createProfile } = useApiCall({
  fallbackMessage: 'Не удалось добавить ставку',
})

const { execute: removeProfile } = useApiCall({
  fallbackMessage: 'Не удалось удалить ставку',
})

const loadItems = async (): Promise<void> => {
  const result = await fetchProfiles(() => tenantTaxProfilesApi.getAll())

  if (result) {
    items.value = result.items
  }
}

onMounted(async () => {
  try {
    await loadItems()
  } finally {
    isLoading.value = false
  }
})

const openCreate = (): void => {
  form.value = {
    regime: TaxRegime.UsnIncome,
    ratePercent: '',
    vat: VatType.None,
    validFrom: minValidFrom.value || today(),
  }
  createDialogOpen.value = true
}

const openDelete = (item: TenantTaxProfileItem): void => {
  if (!isDeletable(item)) {
    return
  }

  deleteTarget.value = item
  deleteDialogOpen.value = true
}

/**
 * Ставка вводится в процентах: 6 — это 6 %, а не доля 0,06.
 *
 * Поле объявлено как type="number", поэтому v-model отдаёт уже число, а не строку:
 * строковые методы к нему неприменимы. Обрабатываем оба варианта.
 */
const parseRate = (value: string | number): number | null => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return null
    }

    return value
  }

  const normalized: string = value.trim()

  if (normalized === '') {
    return null
  }

  const parsed: number = Number.parseFloat(normalized.replace(',', '.'))

  if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
    return null
  }

  return parsed
}

const handleCreate = async (): Promise<void> => {
  if (!canEditTenantSettings.value) {
    return
  }

  if (!form.value.validFrom) {
    toast.error('Укажите дату начала действия')
    return
  }

  if (dateBlocked.value) {
    toast.error('Дата начала должна быть позже последней существующей версии')
    return
  }

  const rate: number | null = parseRate(form.value.ratePercent)

  if (rate === null) {
    toast.error('Ставка вводится в процентах и должна быть от 0 до 100')
    return
  }

  const payload: CreateTenantTaxProfileRequest = {
    regime: form.value.regime,
    ratePercent: rate,
    vat: form.value.vat,
    validFrom: form.value.validFrom,
  }

  isSaving.value = true

  try {
    await createProfile(() => tenantTaxProfilesApi.create(payload))
    toast.success('Ставка добавлена')
    createDialogOpen.value = false
    await loadItems()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isSaving.value = false
  }
}

const handleDelete = async (): Promise<void> => {
  if (!deleteTarget.value || !canEditTenantSettings.value) {
    return
  }

  isDeleting.value = true

  try {
    await removeProfile(() => tenantTaxProfilesApi.remove(deleteTarget.value!.id))
    toast.success('Ставка удалена')
    deleteDialogOpen.value = false
    await loadItems()
  } catch {
    // Ошибка уже обработана в useApiCall
  } finally {
    isDeleting.value = false
  }
}

const dialogContentClass = 'bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[90vh] w-[90vw] max-w-[480px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100] overflow-y-auto'
const fieldClass = 'flex flex-col gap-1'
const inputClass = 'mt-1'

/**
 * Список Select рендерится в портал, то есть вне узла диалога. У него z-50, а оверлей
 * и контент диалога — z-[99] и z-[100], поэтому список уходит под них. Вдобавок
 * модальный диалог задаёт body { pointer-events: none } и возвращает их только
 * контенту диалога — на портал это не распространяется, и пункты не кликаются.
 * Поднимаем список выше диалога и явно включаем ему pointer-events.
 */
const selectContentClass = 'z-[110] pointer-events-auto'
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">Налоговые настройки</CardTitle>
      <CardDescription>Ставки налога с датами начала действия.</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div v-if="isLoading" class="flex justify-center py-6">
        <Spinner size="md" />
      </div>

      <template v-else>
        <div v-if="!canEditTenantSettings" class="text-xs text-muted-foreground">
          Только администраторы могут изменять налоговые настройки.
        </div>

        <div v-if="sortedItems.length === 0" class="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center">
          <p class="text-sm text-muted-foreground">
            Налоговые ставки не заданы — без них налог в расчётах не учитывается.
          </p>
        </div>

        <ul v-else class="flex flex-col gap-2">
          <li
            v-for="item in sortedItems"
            :key="item.id"
            class="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3"
          >
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">{{ regimeLabel(item.regime) }}</span>
                <Badge v-if="item.id === activeProfileId" variant="secondary">Текущий</Badge>
              </div>
              <span class="text-sm text-muted-foreground">Ставка {{ item.ratePercent }} %</span>
              <span class="text-xs text-muted-foreground">НДС: {{ vatLabel(item.vat) }}</span>
              <span class="text-xs text-muted-foreground">действует с {{ formatValidFrom(item.validFrom) }}</span>
            </div>

            <Button
              v-if="canEditTenantSettings"
              variant="ghost"
              size="sm"
              :disabled="!isDeletable(item)"
              :title="deleteDisabledReason(item)"
              @click="openDelete(item)"
            >
              <Trash2 class="size-4" />
            </Button>
          </li>
        </ul>

        <div v-if="canEditTenantSettings" class="flex justify-end">
          <Button class="gap-2" @click="openCreate">
            <Plus class="size-4" />
            Добавить ставку
          </Button>
        </div>
      </template>
    </CardContent>

    <!-- Создание версии -->
    <DialogRoot v-model:open="createDialogOpen">
      <DialogPortal>
        <DialogOverlay class="fixed inset-0 z-[99] bg-black/50" />
        <DialogContent :class="dialogContentClass">
          <DialogTitle class="text-lg font-semibold">Новые ставки налогов</DialogTitle>
          <DialogDescription class="mt-1 text-sm text-muted-foreground">
            Введите налоговый режим и применяемые ставки.
          </DialogDescription>

          <div class="mt-4 flex flex-col gap-3">
            <div :class="fieldClass">
              <Label>Режим</Label>
              <Select v-model="form.regime">
                <SelectTrigger class="mt-1 w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent :class="selectContentClass">
                  <SelectItem
                    v-for="option in TAX_REGIME_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div :class="fieldClass">
              <Label>Ставка, %</Label>
              <Input
                :class="inputClass"
                v-model="form.ratePercent"
                type="number"
                inputmode="decimal"
                min="0"
                max="100"
                step="1"
                placeholder=""
              />
            </div>

            <div :class="fieldClass">
              <Label>НДС</Label>
              <Select v-model="form.vat">
                <SelectTrigger class="mt-1 w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent :class="selectContentClass">
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

            <div :class="fieldClass">
              <Label>Дата начала действия</Label>
              <Input :class="inputClass" v-model="form.validFrom" type="date" :min="minValidFrom" />
              <p v-if="minValidFrom" class="text-xs text-muted-foreground">
                Доступны даты начиная с {{ formatValidFrom(minValidFrom) }}: более ранняя дата изменила бы уже закрытые периоды.
              </p>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-2">
            <DialogClose as-child>
              <Button variant="outline">Отмена</Button>
            </DialogClose>
            <Button :disabled="isSaving" @click="handleCreate">
              <Spinner v-if="isSaving" size="sm" class="mr-2" />
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Удаление последней версии -->
    <AlertDialogRoot v-model:open="deleteDialogOpen">
      <AlertDialogPortal>
        <AlertDialogOverlay class="fixed inset-0 z-[99] bg-black/50" />
        <AlertDialogContent class="bg-popover text-popover-foreground fixed top-[50%] left-[50%] w-[90vw] max-w-[420px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 z-[100]">
          <AlertDialogTitle class="text-lg font-semibold">Удалить ставку?</AlertDialogTitle>
          <AlertDialogDescription class="mt-2 text-sm text-muted-foreground">
            Ставка {{ deleteTarget?.ratePercent }} % — {{ vatLabel(deleteTarget?.vat ?? VatType.None) }} будет удалена без возможности восстановления.
          </AlertDialogDescription>
          <div class="flex justify-end gap-2 mt-6">
            <AlertDialogCancel as-child>
              <Button variant="outline">Отмена</Button>
            </AlertDialogCancel>
            <AlertDialogAction as-child>
              <Button variant="destructive" :disabled="isDeleting" @click="handleDelete">Удалить</Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialogPortal>
    </AlertDialogRoot>
  </Card>
</template>