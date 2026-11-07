<script setup lang="ts">
import { computed, getCurrentInstance, onErrorCaptured, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useRoute } from 'vue-router'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import ErrorState from '@/components/feedback/ErrorState.vue'
import type { ErrorStateVariant } from '@/components/feedback/ErrorState.vue'

/**
 * Роутер может отсутствовать (например, компонент монтируется изолированно
 * в тестах), поэтому зависимость необязательна.
 */
const instance = getCurrentInstance()
const route: RouteLocationNormalizedLoaded | undefined =
  instance?.appContext.config.globalProperties.$router !== undefined ? useRoute() : undefined

/**
 * Вид заглушки. Виджеты дашборда оборачиваются в собственную границу, и полноразмерный
 * `embedded` внутри маленькой карточки раздувал бы её на пол-экрана, поэтому они просят `compact`.
 */
const props = withDefaults(defineProps<{ variant?: ErrorStateVariant }>(), {
  variant: 'embedded',
})

const error: Ref<unknown | null> = ref<unknown | null>(null)

/**
 * Ловим ошибки дочерних компонентов. Без этого исключение в рендере сносит
 * поддерево и пользователь видит пустую страницу без единого объяснения.
 */
onErrorCaptured((caught: unknown, _instance, info: string): boolean => {
  console.error('[AppErrorBoundary] Ошибка рендера:', info, caught)
  error.value = caught
  return false
})

/** Смена маршрута сбрасывает ошибку: у следующего экрана должен быть шанс отрисоваться. */
watch(
  () => route?.fullPath,
  () => {
    error.value = null
  },
)

/**
 * Сообщение пойманной ошибки — только для сборок разработки. В production внутренние
 * детали не показываем: текст исключения может содержать имена полей и путей.
 */
const errorDetails: ComputedRef<string | null> = computed<string | null>(() => {
  if (!import.meta.env.DEV) {
    return null
  }

  const caught = error.value

  if (caught instanceof Error) {
    return caught.stack ?? `${caught.name}: ${caught.message}`
  }

  if (typeof caught === 'string') {
    return caught
  }

  try {
    return JSON.stringify(caught, null, 2)
  } catch {
    return String(caught)
  }
})

function reset(): void {
  error.value = null
}

defineExpose({ reset })
</script>

<template>
  <ErrorState
    v-if="error"
    :variant="props.variant"
    title="Не удалось отобразить раздел"
    description="Произошла ошибка при построении страницы. Остальные разделы продолжают работать — попробуйте ещё раз или вернитесь назад."
    retry-label="Попробовать снова"
    @retry="reset"
  >
    <template #actions>
      <slot name="fallback-actions" />
    </template>
    <template
      v-if="errorDetails"
      #footer
    >
      <details class="mt-2 w-full max-w-md text-left text-xs text-muted-foreground">
        <summary class="cursor-pointer select-none">Подробности (только в режиме разработки)</summary>
        <pre class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/40 p-3">{{ errorDetails }}</pre>
      </details>
    </template>
  </ErrorState>
  <slot v-else />
</template>
