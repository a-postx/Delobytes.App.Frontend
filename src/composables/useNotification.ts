import { toast } from 'vue-sonner'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

/**
 * Идентификатор показанного уведомления. vue-sonner возвращает строку или число,
 * поэтому тип не сужается: он нужен только для последующего remove().
 */
export type NotificationId = string | number

/**
 * Адаптер над vue-sonner.
 *
 * Единственный смонтированный тостер в приложении — `<Toaster>` из vue-sonner (src/App.vue).
 * Собственный реестр уведомлений дублировал эту ответственность и никем не читался:
 * сообщения об ошибках уходили в ref, который не отрисовывался ни одним компонентом.
 */
export function useNotification() {
  const show = (message: string, type: NotificationType = 'info', duration = 5000): NotificationId => {
    return toast[type](message, { duration })
  }

  const success = (message: string, duration?: number): NotificationId => {
    return show(message, 'success', duration)
  }

  const error = (message: string, duration?: number): NotificationId => {
    return show(message, 'error', duration)
  }

  const warning = (message: string, duration?: number): NotificationId => {
    return show(message, 'warning', duration)
  }

  const info = (message: string, duration?: number): NotificationId => {
    return show(message, 'info', duration)
  }

  const remove = (id: NotificationId): void => {
    toast.dismiss(id)
  }

  const clear = (): void => {
    toast.dismiss()
  }

  return {
    show,
    success,
    error,
    warning,
    info,
    remove,
    clear
  }
}
