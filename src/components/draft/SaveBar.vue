<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useDraftRegistry } from '@/composables/usePageDraft'
import type { DraftPartialFailure } from '@/composables/usePageDraft'

const draft = useDraftRegistry()

const visible = computed<boolean>(
  () => draft.dirtySections.value.length > 0 || draft.partialFailure.value !== null,
)

const partial = computed<DraftPartialFailure | null>(() => draft.partialFailure.value)

const dirtyLabels = computed<string>(() =>
  draft.dirtySections.value.map(section => section.label).join(', '),
)

const onKeydown = (event: KeyboardEvent): void => {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') {
    return
  }
  if (!draft.isDirty.value) {
    return
  }

  event.preventDefault()
  void draft.saveAll()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
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
      role="region"
      aria-label="Несохранённые изменения"
      class="sticky bottom-0 z-30 -mx-4 mt-2 border-t border-save-bar-border bg-save-bar px-4 py-3 text-save-bar-foreground shadow-[0_-14px_30px_-22px_rgba(0,0,0,0.75)]"
    >
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p
          class="text-sm"
          aria-live="polite"
        >
          <template v-if="partial">
            <span class="text-save-bar-muted">Сохранено {{ partial.ok }} из {{ partial.total }} · не сохранено:</span>
            <span class="ml-1 font-medium text-save-bar-fail">{{ partial.failedLabel }}</span>
          </template>
          <template v-else>
            <span class="text-save-bar-muted">Не сохранено:</span>
            <span class="ml-1 font-medium">{{ dirtyLabels }}</span>
          </template>
        </p>
        <div class="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            class="border-save-bar-foreground/25 bg-transparent text-save-bar-foreground hover:bg-save-bar-foreground/10 hover:text-save-bar-foreground focus-visible:ring-save-bar-ring"
            :disabled="draft.isBusy.value"
            @click="draft.discardAll()"
          >
            Отменить всё
          </Button>
          <Button
            size="sm"
            class="bg-save-bar-primary text-save-bar-primary-foreground hover:bg-save-bar-primary/90 focus-visible:ring-save-bar-ring"
            :disabled="draft.isBusy.value"
            @click="draft.saveAll()"
          >
            <Spinner
              v-if="draft.isBusy.value"
              class="size-4"
            />
            {{ partial ? 'Повторить' : 'Сохранить всё' }}
          </Button>
        </div>
      </div>
    </div>
  </Transition>
</template>
