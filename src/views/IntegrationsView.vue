<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Plus } from 'lucide-vue-next'
import { integrationsApi, channelsApi } from '@/services/api'
import type { AvailableChannel, Connection } from '@/types'
import type { ChannelItem } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ChannelCard, { type ChannelCardModel } from '@/components/features/ChannelCard.vue'
import CreateChannelDialog from '@/components/features/CreateChannelDialog.vue'
import CreateConnectionDialog from '@/components/features/CreateConnectionDialog.vue'

const templates = ref<AvailableChannel[]>([])
const channels = ref<ChannelItem[]>([])
const connections = ref<Connection[]>([])
const isLoading = ref<boolean>(true)

const isCreateChannelDialogOpen = ref<boolean>(false)
const isConnectDialogOpen = ref<boolean>(false)
const connectTarget = ref<ChannelCardModel | null>(null)

const templateById = computed(() => new Map(templates.value.map(t => [t.id, t])))

// Клиентское соединение Channel (Catalog) + Connection (Integrations) по channelId.
// Модули остаются несвязанными на бэкенде — join делает фронтенд, это осознанный выбор архитектуры.
const channelCards = computed<ChannelCardModel[]>(() =>
  channels.value.map((ch) => {
    const template = ch.systemChannelTemplateId ? templateById.value.get(ch.systemChannelTemplateId) ?? null : null
    const activeConnection = connections.value.find(c => c.channelId === ch.id && c.isActive) ?? null
    const anyConnection = activeConnection
      ?? connections.value.find(c => c.channelId === ch.id) ?? null

    return {
      id: ch.id,
      name: ch.name,
      templateDisplayName: template?.displayName ?? null,
      isCustom: ch.isCustom,
      isActive: ch.isActive,
      connection: anyConnection,
    }
  }),
)

const templateCodeForChannel = (channelId: string): { code: string; displayName: string } | null => {
  const channel = channels.value.find(c => c.id === channelId)
  if (!channel?.systemChannelTemplateId) return null
  const template = templateById.value.get(channel.systemChannelTemplateId)
  return template ? { code: template.code, displayName: template.displayName } : null
}

const loadAll = async (): Promise<void> => {
  try {
    const [templatesResp, channelsResp, connectionsResp] = await Promise.all([
      integrationsApi.getAvailableChannels(),
      channelsApi.getAll(),
      integrationsApi.getConnections(),
    ])
    templates.value = templatesResp
    channels.value = channelsResp.items
    connections.value = connectionsResp
  } catch {
    toast.error('Не удалось загрузить интеграции')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadAll)

const openConnectDialog = (channel: ChannelCardModel): void => {
  connectTarget.value = channel
  isConnectDialogOpen.value = true
}

// После создания канала сразу предлагаем ввести API-ключ, если это не кастомный канал.
const handleChannelCreated = async (channelId: string, templateCode: string | null): Promise<void> => {
  isLoading.value = true
  await loadAll()

  if (templateCode) {
    const created = channelCards.value.find(c => c.id === channelId)
    if (created) {
      openConnectDialog(created)
    }
  }
}

const handleConnected = async (): Promise<void> => {
  isLoading.value = true
  await loadAll()
}

const handleDeleted = async (): Promise<void> => {
  isLoading.value = true
  await loadAll()
}

const handleRenamed = async (): Promise<void> => {
  isLoading.value = true
  await loadAll()
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-2">
        <h1 class="text-xl font-bold">Каналы продаж</h1>
        <p class="text-muted-foreground">
          Каналы продаж и интеграции с ними.
        </p>
      </div>
      <Button class="gap-2" @click="isCreateChannelDialogOpen = true">
        <Plus class="size-4" />
        Добавить канал
      </Button>
    </div>

    <!-- Skeleton grid while loading -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="n in 6"
        :key="n"
        class="rounded-lg border bg-card p-6 flex flex-col gap-4"
      >
        <div class="flex flex-col gap-2">
          <Skeleton class="h-5 w-2/3" />
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-4/5" />
        </div>
        <Skeleton class="h-3 w-1/4" />
        <Skeleton class="h-9 w-28 mt-auto" />
      </div>
    </div>

    <div v-else-if="channelCards.length === 0" class="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
      Каналов продаж пока нет. Нажмите «Добавить», чтобы создать первый.
    </div>

    <!-- Channel grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <ChannelCard
        v-for="channel in channelCards"
        :key="channel.id"
        :channel="channel"
        @connect="openConnectDialog(channel)"
        @deleted="handleDeleted"
        @renamed="handleRenamed"
      />
    </div>
  </div>

  <!-- Диалог создания канала -->
  <CreateChannelDialog
    v-model="isCreateChannelDialogOpen"
    :templates="templates"
    @created="handleChannelCreated"
  />

  <!-- Диалог привязки подключения к каналу -->
  <CreateConnectionDialog
    v-if="connectTarget && templateCodeForChannel(connectTarget.id)"
    :channel-id="connectTarget.id"
    :channel-name="connectTarget.name"
    :template-code="templateCodeForChannel(connectTarget.id)!.code"
    :template-display-name="templateCodeForChannel(connectTarget.id)!.displayName"
    v-model="isConnectDialogOpen"
    @connected="handleConnected"
  />
</template>
