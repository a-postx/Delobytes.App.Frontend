import { ref } from 'vue'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: number
  type: NotificationType
  message: string
  duration?: number
}

const notifications = ref<Notification[]>([])
let nextId = 1

export function useNotification() {
  const show = (message: string, type: NotificationType = 'info', duration = 5000) => {
    const notification: Notification = {
      id: nextId++,
      type,
      message,
      duration
    }

    notifications.value.push(notification)

    if (duration > 0) {
      setTimeout(() => {
        remove(notification.id)
      }, duration)
    }

    return notification.id
  }

  const success = (message: string, duration?: number) => {
    return show(message, 'success', duration)
  }

  const error = (message: string, duration?: number) => {
    return show(message, 'error', duration)
  }

  const warning = (message: string, duration?: number) => {
    return show(message, 'warning', duration)
  }

  const info = (message: string, duration?: number) => {
    return show(message, 'info', duration)
  }

  const remove = (id: number) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  const clear = () => {
    notifications.value = []
  }

  return {
    notifications,
    show,
    success,
    error,
    warning,
    info,
    remove,
    clear
  }
}
