import { createApp } from 'vue'
import type { App as VueApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'

const app: VueApp = createApp(App)

/**
 * Последний рубеж: ошибки вне дерева компонентов (глобальные асинхронные,
 * упавшие обработчики) не должны оставлять пользователя без интерфейса.
 */
app.config.errorHandler = (error: unknown, _instance, info: string): void => {
  console.error('[app] Необработанная ошибка:', info, error)
}

app.use(router)
app.mount('#app')

/**
 * Страховка для развёрнутого приложения: после выката новой версии хэши ассетов
 * меняются, и переход на лениво загруженный маршрут пытается скачать чанк,
 * которого больше нет. Единственный рабочий выход — перезагрузить страницу.
 */
router.onError((error: Error): void => {
  const isChunkLoadError: boolean =
    /dynamically imported module|Importing a module script failed|Loading chunk \d+ failed/i.test(
      error.message,
    )

  if (isChunkLoadError) {
    console.error('[router] Не удалось загрузить чанк, перезагружаем страницу:', error.message)
    window.location.reload()
  }
})
