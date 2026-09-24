<script setup lang="ts">
import { computed, ref } from 'vue'
import { X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import SwitchThumb from '@/components/ui/switch/SwitchThumb.vue'
import { channelParametersApi } from '@/services/api'
import { toast } from 'vue-sonner'

/**
 * Диалог создания новой версии параметров канала.
 * Ввод в процентах (15.5), на бэкенд уходит доля (0.155) — так значение
 * в форме совпадает с тем, что оператор видит на маркетплейсе.
 */
const props = defineProps<{
  modelValue: boolean
  channelId: string
  channelName: string
  /** Значения текущей активной версии, чтобы оператор правил их, а не вводил заново. */
  defaults?: {
    commissionPercent: number
    acquiringPercent: number
    sppPercent: number
    sppEnabled: boolean
  } | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'created': []
}>()

const commissionInput = ref<string>('')
const acquiringInput = ref<string>('')
const sppInput = ref<string>('')
const sppEnabled = ref<boolean>(false)
const validFrom = ref<string>('')
const isSubmitting = ref<boolean>(false)

const toPercentInput = (fraction: number): string => {
  return fraction === 0 ? '0' : String(Number((fraction * 100).toFixed(4)))
}

const todayIso = (): string => {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

const resetState = (): void => {
  commissionInput.value = props.defaults ? toPercentInput(props.defaults.commissionPercent) : ''
  acquiringInput.value = props.defaults ? toPercentInput(props.defaults.acquiringPercent) : ''
  sppInput.value = props.defaults ? toPercentInput(props.defaults.sppPercent) : ''
  sppEnabled.value = props.defaults?.sppEnabled ?? false
  validFrom.value = todayIso()
  isSubmitting.value = false
}

const handleOpenChange = (open: boolean): void => {
  emit('update:modelValue', open)
  if (open) {
    resetState()
  }
}

const parsePercent = (raw: string): number | null => {
  if (raw.trim().length === 0) {
    return null
  }
  const value = Number(raw)
  if (Number.isNaN(value) || value < 0 || value > 100) {
    return null
  }
  return value
}

const commissionValue = computed(() => parsePercent(commissionInput.value))
const acquiringValue = computed(() => parsePercent(acquiringInput.value))
const sppValue = computed(() => parsePercent(sppInput.value))

const isFormValid = computed<boolean>(() => {
  return commissionValue.value !== null
    && acquiringValue.value !== null
    && sppValue.value !== null
    && validFrom.value.length > 0
})

/** Комиссия + эквайринг + включённая СПП — суммарное удержание с цены продажи. */
const totalDeduction = computed<number | null>(() => {
  if (commissionValue.value === null || acquiringValue.value === null || sppValue.value === null) {
    return null
  }
  const spp = sppEnabled.value ? sppValue.value : 0
  return commissionValue.value + acquiringValue.value + spp
})

const handleSubmit = async (): Promise<void> => {
  if (!isFormValid.value) {
    toast.error('Проверьте корректность введённых данных')
    return
  }

  isSubmitting.value = true

  try {
    await channelParametersApi.create(props.channelId, {
      commissionPercent: (commissionValue.value as number) / 100,
      acquiringPercent: (acquiringValue.value as number) / 100,
      sppPercent: (sppValue.value as number) / 100,
      sppEnabled: sppEnabled.value,
      validFrom: validFrom.value,
    })

    toast.success('Параметры канала сохранены')
    emit('created')
    handleOpenChange(false)
  } catch {
    toast.error('Не удалось сохранить параметры, попробуйте позже')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <DialogRoot :open="props.modelValue" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-black/80" />
      <DialogContent
        class="data-[state=open]:animate-contentShow bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-lg border p-6 shadow-lg focus:outline-none z-[100]"
      >
        <DialogTitle class="text-foreground m-0 text-lg font-semibold">
          Параметры канала
        </DialogTitle>
        <DialogDescription class="text-muted-foreground mt-2 mb-4 text-sm leading-normal">
          Новая версия параметров для «{{ props.channelName }}». Прошлые версии сохранятся в истории и продолжат
          действовать до указанной даты.
        </DialogDescription>

        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="parameter-commission">Комиссия маркетплейса, %</Label>
              <Input
                id="parameter-commission"
                v-model="commissionInput"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="15"
                :disabled="isSubmitting"
                required
              />
              <p class="text-xs text-muted-foreground">
                Удержание площадки за размещение товара. Обычно 5–17%.
              </p>
            </div>

            <div class="space-y-2">
              <Label for="parameter-acquiring">Эквайринг, %</Label>
              <Input
                id="parameter-acquiring"
                v-model="acquiringInput"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="2"
                :disabled="isSubmitting"
                required
              />
              <p class="text-xs text-muted-foreground">
                Платёжный сбор за приём денег от покупателя. Обычно 1,5–2,5%.
              </p>
            </div>

            <div class="space-y-2">
              <Label for="parameter-spp">СПП, %</Label>
              <Input
                id="parameter-spp"
                v-model="sppInput"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="5"
                :disabled="isSubmitting"
                required
              />
              <p class="text-xs text-muted-foreground">
                Скидка программы продвижения — уменьшает цену для покупателя за счёт продавца.
              </p>
            </div>

            <div class="flex items-center justify-between gap-4 rounded-md border p-3">
              <div class="flex flex-col gap-0.5">
                <Label for="parameter-spp-enabled">Учитывать СПП в расчётах</Label>
                <span class="text-xs text-muted-foreground">
                  Выключите, если канал не участвует в программе продвижения.
                </span>
              </div>
              <Switch
                id="parameter-spp-enabled"
                v-model="sppEnabled"
                :disabled="isSubmitting"
              >
                <SwitchThumb />
              </Switch>
            </div>

            <div class="space-y-2">
              <Label for="parameter-valid-from">Действует с</Label>
              <Input
                id="parameter-valid-from"
                v-model="validFrom"
                type="date"
                :disabled="isSubmitting"
                required
              />
              <p class="text-xs text-muted-foreground">
                Укажите будущую дату, чтобы запланировать изменение параметров заранее.
              </p>
            </div>

            <div
              v-if="totalDeduction !== null"
              class="rounded-md bg-muted p-3 text-xs text-muted-foreground"
            >
              Суммарное удержание с цены продажи:
              <span class="font-semibold text-foreground">{{ totalDeduction.toFixed(2) }}%</span>.
              При цене 1000 ₽ на счёт придёт около
              <span class="font-semibold text-foreground">{{ (1000 * (1 - totalDeduction / 100)).toFixed(2) }} ₽</span>
              (без учёта себестоимости).
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <DialogClose as-child>
                <Button type="button" variant="outline" :disabled="isSubmitting">
                  Отмена
                </Button>
              </DialogClose>
              <Button type="submit" :disabled="isSubmitting || !isFormValid">
                <Spinner v-if="isSubmitting" size="sm" class="mr-2" />
                {{ isSubmitting ? 'Сохраняем...' : 'Сохранить параметры' }}
              </Button>
            </div>
          </div>
        </form>

        <DialogClose
          class="text-muted-foreground hover:text-foreground hover:bg-secondary absolute top-4 right-4 inline-flex h-6 w-6 appearance-none items-center justify-center rounded-xs transition-colors focus:ring-ring focus:ring-2 focus:outline-none"
          aria-label="Закрыть"
        >
          <X class="size-4" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
