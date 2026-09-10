import { computed } from 'vue'
import type { CurrentUser } from '@/types'

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

  return { currentUser, role, canWrite }
}
