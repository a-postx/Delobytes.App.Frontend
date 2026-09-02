<script setup lang="ts">
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
} from 'reka-ui'
</script>

<template>
  <AlertDialogRoot>
    <AlertDialogTrigger
      class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-semibold shadow-sm focus:ring-ring/50 focus:ring-3 focus:outline-none border-0"
    >
      Open alert dialog
    </AlertDialogTrigger>
    <AlertDialogPortal>
      <AlertDialogOverlay class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-black/80" />
      <AlertDialogContent
        class="data-[state=open]:animate-contentShow bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]"
      >
        <AlertDialogTitle class="text-foreground m-0 text-lg font-semibold">
          Are you absolutely sure?
        </AlertDialogTitle>
        <AlertDialogDescription class="text-muted-foreground mt-2 mb-6 text-sm leading-normal">
          This action cannot be undone. This will permanently delete your account and remove your data from our servers.
        </AlertDialogDescription>
        <div class="flex justify-end gap-3">
          <AlertDialogCancel
            class="border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-ring focus-visible:ring-3 focus-visible:border-ring"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-destructive/20 focus-visible:ring-3 focus-visible:border-destructive dark:focus-visible:ring-destructive/40"
          >
            Continue
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
