<script setup lang="ts">
import { Copy, Check } from 'lucide-vue-next'
import { ref, getCurrentInstance } from 'vue'
import type { HTMLAttributes } from 'vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useNotification } from '@/composables/useNotification'
import type { ButtonVariants } from '@/components/ui/button'

interface Props extends Record<string, any> {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  tooltipText?: string
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'ghost',
  size: 'icon-sm',
  tooltipText: 'Copy to clipboard'
})

const { success } = useNotification()
const isCopied = ref<boolean>(false)

const handleCopy = async (): Promise<void> => {
  try {
    const instance = getCurrentInstance()
    if (!instance?.parent?.$el) {
      console.error('Parent element not found')
      return
    }

    const parentElement = instance.parent.$el

    // Пытаемся получить текст из input/textarea
    const inputElement = parentElement.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement
    let text = inputElement?.value

    // Если input/textarea нет, берем textContent
    if (!text) {
      text = parentElement.textContent?.trim() || ''
    }

    if (!text) {
      console.warn('No text found to copy')
      return
    }

    await navigator.clipboard.writeText(text)
    isCopied.value = true
    success('Copied to clipboard', 2000)

    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          :variant="variant"
          :size="size"
          :class="props.class"
          @click="handleCopy"
        >
          <Copy v-if="!isCopied" />
          <Check v-else />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{{ tooltipText }}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
