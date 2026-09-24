<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeft, ChevronRight, CreditCard, Plus, Tag, TrendingUp } from 'lucide-vue-next'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { channelParametersApi } from '@/services/api'
import type { ChannelParameterSetItem } from '@/services/api'
import type { ChannelCardModel } from './ChannelCard.vue'
import { toast } from 'vue-sonner'
import CreateChannelParametersDialog from './CreateChannelParametersDialog.vue'

/**
 * Детали канала: текущие параметры и история версий.
 * Данные грузятся только когда панель открыта — канал, который не открывали,
 * не порождает ни одного запроса.
 */
const props = defineProps<{
  modelValue: boolean
  channel: ChannelCardModel
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const activeParameters = ref<ChannelParameterSetItem | null>(null)
const history = ref<ChannelParameterSetItem[]>([])
const isLoading = ref<boolean>(true)
const isCreateDialogOpen = ref<boolean>(false)
const showHistory = ref<boolean>(false)

const formatPercent = (fraction: number): string => {
  return `${(fraction * 100).toFixed(2).replace('.', ',')}%`
}

const formatDate = (isoDate: string): string => {
  if (isoDate.length === 0) {
    return '—'
  }
  const parts = isoDate.slice(0, 10).split('-')
  if (parts.length !== 3) {
    return isoDate
  }
  return `${parts[2]}.${parts[1]}.${parts[0]}`
}

const todayIso = (): string => {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

const isScheduled = (item: ChannelParameterSetItem): boolean => item.validFrom.slice(0, 10) > todayIso()

const scheduledCount = computed<number>(() => history.value.filter(isScheduled).length)

const parameterDefaults = computed(() => {
  if (!activeParameters.value) {
    return null
  }
  return {
    commissionPercent: activeParameters.value.commissionPercent,
    acquiringPercent: activeParameters.value.acquiringPercent,
    sppPercent: activeParameters.value.sppPercent,
    sppEnabled: activeParameters.value.sppEnabled,
  }
})

const loadData = async (): Promise<void> => {
  isLoading.value = true

  try {
    const [active, all] = await Promise.all([
      channelParametersApi.getActive(props.channel.id),
      channelParametersApi.getAll(props.channel.id),
    ])
    activeParameters.value = active.found ? active : null
    history.value = all.items
  } catch {
    activeParameters.value = null
    history.value = []
    toast.error('Не удалось загрузить параметры канала')
  } finally {
    isLoading.value = false
  }
}

// Панель переиспользуется между каналами, поэтому сбрасываем состояние
// на каждое открытие: иначе при переключении канала мелькнут чужие цифры.
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      showHistory.value = false
      loadData()
    }
  },
  { immediate: true },
)

const handleOpenChange = (open: boolean): void => {
  emit('update:modelValue', open)
}

const handleCreated = async (): Promise<void> => {
  await loadData()
}
</script>

<template>
  <!-- SheetContent уже рендерит собственные DialogPortal и SheetOverlay,
       поэтому вложенные обёртки не нужны — иначе будет два затемнения. -->
  <Sheet :open="props.modelValue" @update:open="handleOpenChange">
    <SheetContent
      side="right"
      class="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
    >
      <SheetHeader class="border-b p-6 pr-12">
        <SheetTitle class="text-xl font-bold">{{ props.channel.name }}</SheetTitle>
        <SheetDescription>
          {{ props.channel.templateDisplayName ?? 'Собственный канал' }}
        </SheetDescription>
      </SheetHeader>

      <div class="flex flex-col gap-6 p-6">
        <div v-if="isLoading" class="flex flex-col gap-4">
          <Skeleton class="h-5 w-40" />
          <Skeleton class="h-20 w-full" />
          <Skeleton class="h-20 w-full" />
          <Skeleton class="h-20 w-full" />
        </div>

        <template v-else-if="!showHistory">
          <section v-if="activeParameters" class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold">Текущие параметры</h2>
              <Badge
                v-if="scheduledCount > 0"
                variant="warning"
              >
                Запланировано: {{ scheduledCount }}
              </Badge>
            </div>

            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between rounded-lg border bg-card p-4">
                <div class="flex items-center gap-3">
                  <TrendingUp class="size-4 text-muted-foreground" />
                  <div class="flex flex-col">
                    <span class="text-xs uppercase tracking-wide text-muted-foreground">Комиссия</span>
                    <span class="text-xs text-muted-foreground">с {{ formatDate(activeParameters.validFrom) }}</span>
                  </div>
                </div>
                <span class="text-2xl font-bold">{{ formatPercent(activeParameters.commissionPercent) }}</span>
              </div>

              <div class="flex items-center justify-between rounded-lg border bg-card p-4">
                <div class="flex items-center gap-3">
                  <CreditCard class="size-4 text-muted-foreground" />
                  <div class="flex flex-col">
                    <span class="text-xs uppercase tracking-wide text-muted-foreground">Эквайринг</span>
                    <span class="text-xs text-muted-foreground">с {{ formatDate(activeParameters.validFrom) }}</span>
                  </div>
                </div>
                <span class="text-2xl font-bold">{{ formatPercent(activeParameters.acquiringPercent) }}</span>
              </div>

              <div class="flex items-center justify-between rounded-lg border bg-card p-4">
                <div class="flex items-center gap-3">
                  <Tag class="size-4 text-muted-foreground" />
                  <div class="flex flex-col">
                    <span class="text-xs uppercase tracking-wide text-muted-foreground">СПП</span>
                    <span class="text-xs text-muted-foreground">
                      {{ activeParameters.sppEnabled ? 'учитывается в расчётах' : 'не учитывается' }}
                    </span>
                  </div>
                </div>
                <span class="text-2xl font-bold">{{ formatPercent(activeParameters.sppPercent) }}</span>
              </div>
            </div>

            <Button @click="isCreateDialogOpen = true">
              <Plus class="size-4 mr-2" />
              Изменить параметры
            </Button>

            <Separator />

            <button
              v-if="history.length > 0"
              type="button"
              class="flex items-center justify-between text-sm text-muted-foreground transition-colors hover:text-foreground"
              @click="showHistory = true"
            >
              <span>История изменений ({{ history.length }})</span>
              <ChevronRight class="size-4" />
            </button>
          </section>

          <section v-else class="flex flex-col items-center gap-4 rounded-lg border border-dashed p-8 text-center">
            <p class="text-sm text-muted-foreground">
              Параметры канала ещё не заданы. Без них нельзя рассчитать маржу по этому каналу.
            </p>
            <Button @click="isCreateDialogOpen = true">
              <Plus class="size-4 mr-2" />
              Задать параметры
            </Button>
          </section>
        </template>

        <template v-else>
          <div class="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Назад к параметрам"
              @click="showHistory = false"
            >
              <ArrowLeft />
            </Button>
            <h2 class="text-sm font-semibold">История изменений</h2>
          </div>

          <ol class="flex flex-col">
            <li
              v-for="(item, index) in history"
              :key="item.id"
              class="relative pb-6 pl-6 last:pb-0"
            >
              <span
                v-if="index < history.length - 1"
                class="absolute left-[5px] top-3 bottom-0 w-px bg-border"
              />
              <span
                class="absolute left-0 top-1.5 size-2.5 rounded-full border-2 bg-background"
                :class="isScheduled(item) ? 'border-primary' : 'border-muted-foreground'"
              />

              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">{{ formatDate(item.validFrom) }}</span>
                  <Badge v-if="isScheduled(item)" variant="warning">Запланировано</Badge>
                  <Badge v-else-if="item.id === activeParameters?.id" variant="success">Действует</Badge>
                </div>
                <span class="text-xs text-muted-foreground">
                  Комиссия {{ formatPercent(item.commissionPercent) }} · Эквайринг
                  {{ formatPercent(item.acquiringPercent) }} · СПП {{ formatPercent(item.sppPercent) }}
                  {{ item.sppEnabled ? '(вкл.)' : '(выкл.)' }}
                </span>
              </div>
            </li>
          </ol>
        </template>
      </div>
    </SheetContent>
  </Sheet>

  <CreateChannelParametersDialog
    v-model="isCreateDialogOpen"
    :channel-id="props.channel.id"
    :channel-name="props.channel.name"
    :defaults="parameterDefaults"
    @created="handleCreated"
  />
</template>
