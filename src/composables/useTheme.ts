import { computed, onMounted } from 'vue'
import { useStorage } from '@vueuse/core'

type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'app-theme'
const DARK_CLASS = 'dark'

const theme = useStorage<Theme>(THEME_STORAGE_KEY, 'light')

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')

  const initTheme = (): void => {
    applyTheme(theme.value)
  }

  const applyTheme = (selectedTheme: Theme): void => {
    const htmlElement = document.documentElement

    if (selectedTheme === 'dark') {
      htmlElement.classList.add(DARK_CLASS)
    } else {
      htmlElement.classList.remove(DARK_CLASS)
    }
  }

  const setTheme = (selectedTheme: Theme): void => {
    theme.value = selectedTheme
    applyTheme(selectedTheme)
  }

  const toggleTheme = (): void => {
    const newTheme = theme.value === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  return {
    theme: computed(() => theme.value),
    isDark,
    initTheme,
    setTheme,
    toggleTheme,
  }
}
