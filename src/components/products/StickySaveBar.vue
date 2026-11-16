<script setup lang="ts">
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'

withDefaults(
  defineProps<{
    visible: boolean
    saving?: boolean
    message?: string
  }>(),
  {
    saving: false,
    message: 'Есть несохранённые изменения',
  },
)

const emit = defineEmits<{
  save: []
  discard: []
}>()
</script>

<template>
  <Transition
    enter-active-class="transition-transform duration-200 ease-out"
    leave-active-class="transition-transform duration-150 ease-in"
    enter-from-class="translate-y-full"
    leave-to-class="translate-y-full"
  >
    <div
      v-if="visible"
      role="status"
      class="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div class="container mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <span class="text-sm text-muted-foreground">{{ message }}</span>
        <div class="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="saving"
            @click="emit('discard')"
          >
            Отмена
          </Button>
          <Button
            size="sm"
            :disabled="saving"
            @click="emit('save')"
          >
            <Spinner
              v-if="saving"
              class="mr-2"
            />
            {{ saving ? 'Сохранение...' : 'Сохранить' }}
          </Button>
        </div>
      </div>
    </div>
  </Transition>
</template>
