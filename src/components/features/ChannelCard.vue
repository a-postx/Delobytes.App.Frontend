<script setup lang="ts">
import type { AvailableChannel } from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const props = defineProps<{
  channel: AvailableChannel
}>()

const emit = defineEmits<{
  connect: []
  manage: []
}>()
</script>

<template>
  <Card :class="props.channel.isConnected ? 'opacity-75 bg-muted' : ''">
    <CardHeader class="relative">
      <CardTitle class="text-xl">{{ props.channel.displayName }}</CardTitle>
      <CardDescription>{{ props.channel.description ?? '' }}</CardDescription>
      <Badge
        v-if="props.channel.isConnected"
        variant="success"
        class="absolute top-3 right-3"
      >
        Подключён
      </Badge>
    </CardHeader>
    <CardContent>
      <span class="text-xs text-muted-foreground">API {{ props.channel.apiVersion }}</span>
    </CardContent>
    <CardFooter>
      <Button
        v-if="props.channel.isConnected"
        variant="outline"
        @click="emit('manage')"
      >
        Управление
      </Button>
      <Button
        v-else
        @click="emit('connect')"
      >
        Подключить
      </Button>
    </CardFooter>
  </Card>
</template>
