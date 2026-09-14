<script setup lang="ts">
import { getCurrentInstance, onErrorCaptured, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { useRoute } from 'vue-router'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import ErrorState from '@/components/feedback/ErrorState.vue'

/**
 * Роутер может отсутствовать (например, компонент монтируется изолированно
 * в тестах), поэтому зависимость необязательна.
 */
const instance = getCurrentInstance()
const route: RouteLocationNormalizedLoaded | undefined =
  instance?.appContext.config.globalProperties.$router !== undefined ? useRoute() : undefined

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

function reset(): void {
  error.value = null
}

defineExpose({ reset })
</script>

<template>
  <ErrorState
    v-if="error"
    variant="embedded"
    code="500"
    title="Не удалось отобразить раздел"
    description="Произошла ошибка при построении страницы. Остальные разделы продолжают работать — попробуйте ещё раз или вернитесь назад."
    retry-label="Попробовать снова"
    @retry="reset"
  >
    <template #actions>
      <slot name="fallback-actions" />
    </template>
  </ErrorState>
  <slot v-else />
</template>
