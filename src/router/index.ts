import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import SetupTenantView from '@/views/SetupTenantView.vue'
import SettingsView from '@/views/SettingsView.vue'
import TenantSettingsView from '@/views/TenantSettingsView.vue'
import YandexCallbackView from '@/views/YandexCallbackView.vue'
import GoogleCallbackView from '@/views/GoogleCallbackView.vue'
import AcceptInvitationView from '@/views/AcceptInvitationView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppLayout,
      meta: {
        requiresAuth: true,
      },
      children: [
        {
          path: '',
          name: 'home',
          component: HomeView,
          meta: {
            title: 'Компоненты',
            requiresAuth: true,
          },
        },
        {
          path: 'settings',
          name: 'settings',
          component: SettingsView,
          meta: {
            title: 'Настройки',
            requiresAuth: true,
          },
        },
        {
          path: 'tenant-settings',
          name: 'tenant-settings',
          component: TenantSettingsView,
          meta: {
            title: 'Настройки пространства',
            requiresAuth: true,
          },
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: {
        title: 'Вход',
      },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: {
        title: 'Регистрация',
      },
    },
    {
      path: '/setup-tenant',
      name: 'setup-tenant',
      component: SetupTenantView,
      meta: {
        title: 'Создание пространства',
      },
    },
    {
      path: '/auth/yandex/callback',
      name: 'yandex-callback',
      component: YandexCallbackView,
      meta: {
        title: 'Вход через Яндекс',
      },
    },
    {
      path: '/auth/google/callback',
      name: 'google-callback',
      component: GoogleCallbackView,
      meta: {
        title: 'Вход через Google',
      },
    },
    {
      path: '/invite',
      name: 'accept-invitation',
      component: AcceptInvitationView,
      meta: {
        title: 'Принятие приглашения',
      },
    },
  ],
})
      path: '/invite',
      name: 'accept-invitation',
      component: AcceptInvitationView,
      meta: {
        title: 'Принятие приглашения',
      },
    },
  ],
})

router.beforeEach((to, _from, next) => {
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - Delobytes`
  }

  const token = localStorage.getItem('accessToken')
  const requiresAuth = to.meta.requiresAuth

  if (requiresAuth && !token) {
    next('/login')
  } else if ((to.name === 'login' || to.name === 'register') && token) {
    next('/')
  } else {
    next()
  }
})

export default router
