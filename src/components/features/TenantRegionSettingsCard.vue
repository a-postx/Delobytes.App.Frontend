<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import TimeZoneSelect from '@/components/features/TimeZoneSelect.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { usePermissions } from '@/composables/usePermissions'
import { tenantSettingsApi } from '@/services/api'
import { formatUtcOffset, formatZonedDateTime } from '@/utils/timeZone'
import { toast } from 'vue-sonner'

const { currentUser } = useCurrentUser()
const { canEditTenantSettings } = usePermissions()

const timeZone: Ref<string> = ref<string>('')
const savedTimeZone: Ref<string> = ref<string>('')
const isSaving: Ref<boolean> = ref<boolean>(false)
const now: Ref<Date> = ref<Date>(new Date())

// Часы тикают раз в 30 секунд: этого достаточно, чтобы дата и время в поясе тенанта
// были свежими, и при этом компонент не перерисовывался на каждом тике таймера.
const clockTimer: ReturnType<typeof setInterval> = setInterval((): void => {
  now.value = new Date()
}, 30000)

onBeforeUnmount((): void => {
  clearInterval(clockTimer)
})

watch(
  () => currentUser.value?.timeZone,
  (value: string | undefined) => {
    const storedTimeZone: string = value ?? ''
    savedTimeZone.value = storedTimeZone
    timeZone.value = storedTimeZone
  },
  { immediate: true }
)

const isDirty: ComputedRef<boolean> = computed<boolean>(
  () => timeZone.value !== '' && timeZone.value !== savedTimeZone.value
)

const currentDateTime: ComputedRef<string> = computed<string>(() =>
  timeZone.value === '' ? '' : formatZonedDateTime(timeZone.value, now.value)
)

const currentOffset: ComputedRef<string> = computed<string>(() =>
  timeZone.value === '' ? '' : formatUtcOffset(timeZone.value, now.value)
)

const handleSave = async (): Promise<void> => {
  if (!canEditTenantSettings.value || !isDirty.value) {
    return
  }

  isSaving.value = true

  try {
    const response = await tenantSettingsApi.update(timeZone.value)
    savedTimeZone.value = response.timeZone
    timeZone.value = response.timeZone

    // Виджеты дашборда читают пояс из currentUser: без обновления они останутся
    // в старом поясе до перезагрузки страницы.
    if (currentUser.value) {
      currentUser.value.timeZone = response.timeZone
    }

    toast.success('Часовой пояс сохранён')
  } catch (error: unknown) {
    const apiError = error as { response?: { data?: { message?: string } } }
    const message: string = apiError.response?.data?.message ?? 'Не удалось сохранить часовой пояс'
    toast.error(message)
    timeZone.value = savedTimeZone.value
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">Часовой пояс</CardTitle>
      <CardDescription>
        В этом поясе считаются календарные даты: «сегодня» в отчётах, даты вступления в силу
        цен, тарифов и состава изделий, расписания фоновых заданий.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="space-y-2">
        <Label for="tenant-time-zone">Пояс пространства</Label>
        <TimeZoneSelect
          id="tenant-time-zone"
          v-model="timeZone"
          :disabled="!canEditTenantSettings || isSaving"
        />
        <p v-if="!canEditTenantSettings" class="text-xs text-muted-foreground">
          Только администраторы могут изменять часовой пояс
        </p>
      </div>

      <div class="space-y-1 rounded-md border bg-muted/40 px-3 py-2">
        <p class="text-xs text-muted-foreground">Текущая дата и время</p>
        <p class="text-sm font-medium">
          {{ currentDateTime }}
          <span v-if="currentOffset" class="text-muted-foreground">{{ currentOffset }}</span>
        </p>
      </div>
    </CardContent>
    <CardFooter v-if="canEditTenantSettings" class="flex justify-end">
      <Button :disabled="isSaving || !isDirty" @click="handleSave">
        <Spinner v-if="isSaving" size="sm" class="mr-2" />
        Сохранить
      </Button>
    </CardFooter>
  </Card>
</template>
