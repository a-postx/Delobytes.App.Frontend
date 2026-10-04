import { onBeforeUnmount, onMounted, watch } from 'vue'
import type { Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

/** Вопрос по умолчанию, когда изменено несколько секций сразу. */
const DEFAULT_MESSAGE = 'Есть несохранённые изменения. Покинуть страницу без сохранения?'

/**
 * Изменённые секции текущей страницы: ключ → текст вопроса именно для этой секции.
 * Хранится в модуле, потому что правки могут быть в нескольких местах сразу
 * (форма товара и состав — независимые блоки одного экрана), а уход блокируется один раз.
 */
const dirtySections: Map<string, string> = new Map<string, string>()

/**
 * Помечает секцию страницы как содержащую несохранённые правки.
 * Навигацию НЕ перехватывает: хук ухода регистрируется один раз владельцем страницы
 * через {@link useUnsavedChangesGuard}. Иначе каждый блок повесил бы свой хук, и на один
 * уход пришлось бы по вопросу от каждого — пользователь получил бы два диалога подряд.
 *
 * @param key уникальное имя секции в пределах страницы
 * @param isDirty реактивный признак наличия правок в этой секции
 * @param message текст вопроса про правки именно этой секции
 */
export function markUnsavedChanges(
  key: string,
  isDirty: Ref<boolean> | (() => boolean),
  message: string = DEFAULT_MESSAGE,
): void {
  const readDirty = (): boolean =>
    typeof isDirty === 'function' ? isDirty() : isDirty.value

  const applyDirty = (dirty: boolean): void => {
    if (dirty) {
      dirtySections.set(key, message)
    } else {
      dirtySections.delete(key)
    }
  }

  applyDirty(readDirty())

  watch(readDirty, applyDirty)

  onBeforeUnmount(() => {
    dirtySections.delete(key)
  })
}

/**
 * Предупреждение о несохранённых изменениях при уходе со страницы.
 * Вызывается ровно один раз — в компоненте, который владеет страницей; секции о правках
 * сообщают через {@link markUnsavedChanges}.
 *
 * Закрытие вкладки, перезагрузка и уход по внешней ссылке перехватываются браузером
 * (`beforeunload`) — текст там задаёт браузер, свои слова показать нельзя.
 * Переходы внутри приложения перехватывает навигационный хук роутера, и там текст свой:
 * вопрос про конкретную секцию, если изменена одна, и общий, если изменены обе.
 *
 * @param message текст вопроса, когда изменено несколько секций сразу
 */
export function useUnsavedChangesGuard(message: string = DEFAULT_MESSAGE): void {
  /**
   * Возвращает текст вопроса или null, когда сохранять нечего.
   * Текст одной секции конкретнее общего, поэтому при единственной изменённой секции
   * показывается он — пользователь сразу понимает, что именно потеряет.
   */
  const resolveMessage = (): string | null => {
    if (dirtySections.size === 0) {
      return null
    }

    if (dirtySections.size === 1) {
      const [onlyKey] = dirtySections.keys()
      return dirtySections.get(onlyKey) ?? message
    }

    return message
  }

  const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (dirtySections.size === 0) {
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
    dirtySections.clear()
  })

  onBeforeRouteLeave(() => {
    const question: string | null = resolveMessage()

    if (question === null) {
      return true
    }

    return window.confirm(question)
  })
}