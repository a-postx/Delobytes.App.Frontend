<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useDraftRegistry } from '@/composables/usePageDraft'

const draft = useDraftRegistry()

const labels = computed<string>(() =>
  draft.dirtySections.value.map(section => section.label).join(', '),
)

const onOpenChange = (open: boolean): void => {
  if (!open) {
    draft.resolveLeave(false)
  }
}
</script>

<template>
  <AlertDialogRoot
    :open="draft.leaveOpen.value"
    @update:open="onOpenChange"
  >
    <AlertDialogPortal>
      <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/50" />
      <AlertDialogContent
        class="fixed left-1/2 top-1/2 z-[100] w-[90vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-md border bg-popover p-4 text-popover-foreground shadow-lg focus:outline-none"
      >
        <AlertDialogTitle class="text-sm font-semibold">
          Уйти со страницы?
        </AlertDialogTitle>
        <AlertDialogDescription class="mt-1.5 text-sm text-muted-foreground">
          Не сохранено: {{ labels }}. Правки будут потеряны.
        </AlertDialogDescription>
        <div class="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            @click="draft.resolveLeave(false)"
          >
            Остаться
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="text-destructive hover:text-destructive"
            @click="draft.resolveLeave(true)"
          >
            Уйти
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
