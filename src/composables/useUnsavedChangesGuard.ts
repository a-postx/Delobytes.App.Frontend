import { onBeforeUnmount, onMounted, watch } from 'vue'
import type { Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

/**
 * Ключи изменённых секций текущей страницы. Набор общий для страницы, потому что уход
 * блокируется один раз, а правки могут быть в нескольких местах сразу: форма товара
 * и состав — независимые блоки одного экрана.
 */
const dirtyKeys: Set<string> = new Set<string>()

const hasAnyDirty = (): boolean => dirtyKeys.size > 0

/**
 * Предупреждение о несохранённых изменениях при уходе со страницы.
 *
 * Закрытие вкладки, перезагрузка и уход по внешней ссылке перехватываются браузером
 * (`beforeunload`) — текст предупреждения задаёт браузер, свои слова показать нельзя.
 * Переходы внутри приложения перехватывает навигационный хук роутера, и там текст свой.
 *
 * @param key уникальное имя секции в пределах страницы
 * @param isDirty реактивный признак наличия правок в этой секции
 * @param message текст вопроса для переходов внутри приложения
 */
export function useUnsavedChangesGuard(
  key: string,
  isDirty: Ref<boolean> | (() => boolean),
  message = 'Есть несохранённые изменения. Покинуть страницу без сохранения?',
): void {
  const readDirty = (): boolean =>
    typeof isDirty === 'function' ? isDirty() : isDirty.value

  const applyDirty = (dirty: boolean): void => {
    if (dirty) {
      dirtyKeys.add(key)
    } else {
      dirtyKeys.delete(key)
    }
  }

  applyDirty(readDirty())

  watch(readDirty, applyDirty)

  const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (!hasAnyDirty()) {
      return
    }

    // Современные браузеры игнорируют любой текст и показывают собственное сообщение,
    // но без preventDefault диалог не появится вообще.
    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
    dirtyKeys.delete(key)
  })

  onBeforeRouteLeave(() => {
    if (!hasAnyDirty()) {
      return true
    }

    return window.confirm(message)
  })
}
