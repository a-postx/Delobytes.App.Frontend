import { computed } from 'vue'
import type { CurrentUser } from '@/types'
import { meApi } from '@/services/api'

export function useCurrentUser() {
  const currentUser = computed<CurrentUser | null>(() => {
    const raw = localStorage.getItem('currentUser')
    if (!raw) return null
    try {
      return JSON.parse(raw) as CurrentUser
    } catch {
      return null
    }
  })

  const role = computed<string>(() => currentUser.value?.role ?? '')

  const canWrite = computed<boolean>(() => {
    const r = role.value
    return r === 'Administrator' || r === 'Manager'
  })

  const fetchCurrentUser = async (): Promise<void> => {
    try {
      const user = await meApi.getCurrentUser()
      localStorage.setItem('currentUser', JSON.stringify(user))
    } catch {
      localStorage.removeItem('currentUser')
    }
  }

  return { currentUser, role, canWrite, fetchCurrentUser }
}
