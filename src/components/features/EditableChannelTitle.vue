<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Pencil } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'

const props = defineProps<{
  title: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  save: [newTitle: string]
}>()

const isEditing = ref<boolean>(false)
const editValue = ref<string>(props.title)
const inputRef = ref<HTMLInputElement | null>(null)

watch(() => props.title, (newTitle) => {
  if (!isEditing.value) {
    editValue.value = newTitle
  }
})

const startEdit = async (): Promise<void> => {
  if (props.disabled) {
    return
  }
  isEditing.value = true
  editValue.value = props.title
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
}

const save = (): void => {
  const trimmed = editValue.value.trim()
  if (trimmed.length === 0) {
    cancel()
    return
  }
  if (trimmed !== props.title) {
    emit('save', trimmed)
  }
  isEditing.value = false
}

const cancel = (): void => {
  editValue.value = props.title
  isEditing.value = false
}

const handleKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'Enter') {
    e.preventDefault()
    save()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancel()
  }
}
</script>

<template>
  <div v-if="isEditing" class="relative">
    <Input
      ref="inputRef"
      v-model="editValue"
      type="text"
      class="text-xl font-semibold h-auto py-0 px-0 border-none shadow-none focus-visible:ring-0"
      @blur="save"
      @keydown="handleKeydown"
    />
  </div>
  <div
    v-else
    class="group flex items-center gap-2 cursor-pointer"
    :class="{ 'opacity-50 cursor-not-allowed': props.disabled }"
    @click="startEdit"
  >
    <span class="text-xl font-semibold">{{ props.title }}</span>
    <Pencil
      v-if="!props.disabled"
      class="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
    />
  </div>
</template>
