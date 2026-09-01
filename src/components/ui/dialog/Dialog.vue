<script setup lang="ts">
import { X } from 'lucide-vue-next'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'
</script>

<template>
  <DialogRoot>
    <DialogTrigger
      class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-semibold shadow-sm focus:ring-ring/50 focus:ring-3 focus:outline-none border-0"
    >
      Edit profile
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="data-[state=open]:animate-overlayShow fixed inset-0 z-30 bg-black/80" />
      <DialogContent
        class="data-[state=open]:animate-contentShow bg-popover text-popover-foreground fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg p-6 focus:outline-none z-[100]"
      >
        <DialogTitle class="text-foreground m-0 text-lg font-semibold">
          Edit profile
        </DialogTitle>
        <DialogDescription class="text-muted-foreground mt-2 mb-4 text-sm leading-normal">
          Make changes to your profile here. Click save when you're done.
        </DialogDescription>
        <fieldset class="mb-4 flex items-center gap-4">
          <label
            class="text-foreground w-[90px] text-right text-sm font-medium"
            for="name"
          > Name </label>
          <input
            id="name"
            class="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/50 flex-1 h-9 w-full rounded-md border px-3 text-sm outline-none focus:ring-3 transition-[color,box-shadow]"
            defaultValue="Pedro Duarte"
          >
        </fieldset>
        <fieldset class="mb-4 flex items-center gap-4">
          <label
            class="text-foreground w-[90px] text-right text-sm font-medium"
            for="username"
          > Username </label>
          <input
            id="username"
            class="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/50 flex-1 h-9 w-full rounded-md border px-3 text-sm outline-none focus:ring-3 transition-[color,box-shadow]"
            defaultValue="@peduarte"
          >
        </fieldset>
        <div class="mt-6 flex justify-end">
          <DialogClose as-child>
            <button
              class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-semibold focus:ring-ring/50 focus:ring-3 focus:outline-none"
            >
              Save changes
            </button>
          </DialogClose>
        </div>
        <DialogClose
          class="text-muted-foreground hover:text-foreground hover:bg-secondary absolute top-4 right-4 inline-flex h-6 w-6 appearance-none items-center justify-center rounded-xs focus:ring-ring focus:ring-2 focus:outline-none transition-colors"
          aria-label="Close"
        >
          <X class="size-4" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
