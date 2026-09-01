<script setup lang="ts">
import { Copy, Check } from 'lucide-vue-next'
import { ref } from 'vue'
import type { HTMLAttributes } from 'vue'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useNotification } from '@/composables/useNotification'
import type { ButtonVariants } from '@/components/ui/button'

interface Props {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  tooltipText?: string
  class?: HTMLAttributes['class']
  value?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'ghost',
  size: 'icon-sm',
  tooltipText: 'Copy to clipboard',
  value: ''
})

const { success } = useNotification()
const isCopied = ref<boolean>(false)
const buttonRef = ref<HTMLElement | null>(null)

const handleCopy = async (): Promise<void> => {
  try {
    if (!buttonRef.value) {
      console.error('Button ref not found')
      return
    }

    // Ищем ближайший родительский элемент с классом relative
    const relativeContainer = buttonRef.value.closest('.relative')

    if (!relativeContainer) {
      console.error('Relative container not found')
      return
    }

    // Пытаемся получить текст из input/textarea внутри relative контейнера
    const inputElement = relativeContainer.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement
    let text = inputElement?.value

    // Если input/textarea нет, берем textContent
    if (!text) {
      // Клонируем элемент и удаляем из него кнопку для получения чистого текста
      const clone = relativeContainer.cloneNode(true) as HTMLElement
      const buttonInClone = clone.querySelector('[data-slot="button"]')
      if (buttonInClone) {
        buttonInClone.remove()
      }
      text = clone.textContent?.trim() || ''
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
          ref="buttonRef"
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
