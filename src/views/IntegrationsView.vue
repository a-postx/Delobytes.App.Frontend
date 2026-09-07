<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { integrationsApi } from '@/services/api'
import type { AvailableChannel } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import ChannelCard from '@/components/features/ChannelCard.vue'
import CreateConnectionDialog from '@/components/features/CreateConnectionDialog.vue'
import ManageConnectionDialog from '@/components/features/ManageConnectionDialog.vue'

const channels = ref<AvailableChannel[]>([])
const isLoading = ref<boolean>(true)
const selectedChannel = ref<AvailableChannel | null>(null)
const isConnectDialogOpen = ref<boolean>(false)
const isManageDialogOpen = ref<boolean>(false)

const loadChannels = async (): Promise<void> => {
  try {
    channels.value = await integrationsApi.getAvailableChannels()
  } catch {
    toast.error('Не удалось загрузить каналы')
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await loadChannels()
})

const openConnectDialog = (channel: AvailableChannel): void => {
  selectedChannel.value = channel
  isConnectDialogOpen.value = true
}

const openManageDialog = (channel: AvailableChannel): void => {
  selectedChannel.value = channel
  isManageDialogOpen.value = true
}

const handleConnected = async (): Promise<void> => {
  isLoading.value = true
  await loadChannels()
}

const handleDeleted = async (): Promise<void> => {
  isLoading.value = true
  await loadChannels()
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <div class="flex flex-col gap-2">
      <h1 class="text-2xl font-bold">Каналы продаж</h1>
      <p class="text-muted-foreground">
        Подключите маркетплейсы для автоматического сбора данных о продажах.
      </p>
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

    <!-- Channel grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <ChannelCard
        v-for="channel in channels"
        :key="channel.code"
        :channel="channel"
        @connect="openConnectDialog(channel)"
        @manage="openManageDialog(channel)"
      />
    </div>
  </div>

  <!-- Connect dialog -->
  <CreateConnectionDialog
    v-if="selectedChannel && !selectedChannel.isConnected"
    :channel="selectedChannel"
    v-model="isConnectDialogOpen"
    @connected="handleConnected"
  />

  <!-- Manage / delete dialog -->
  <ManageConnectionDialog
    v-if="selectedChannel && selectedChannel.isConnected"
    :channel="selectedChannel"
    v-model="isManageDialogOpen"
    @deleted="handleDeleted"
  />
</template>
