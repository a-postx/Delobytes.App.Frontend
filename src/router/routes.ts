import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import HomeView from '@/views/HomeView.vue'
import ApiConnectionTestView from '@/views/ApiConnectionTestView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import SetupTenantView from '@/views/SetupTenantView.vue'
import SettingsView from '@/views/SettingsView.vue'
import TenantSettingsView from '@/views/TenantSettingsView.vue'
import IntegrationsView from '@/views/IntegrationsView.vue'
import YandexCallbackView from '@/views/YandexCallbackView.vue'
import GoogleCallbackView from '@/views/GoogleCallbackView.vue'
import AcceptInvitationView from '@/views/AcceptInvitationView.vue'
import ComponentsView from '@/views/ComponentsView.vue'
import SuppliersView from '@/views/SuppliersView.vue'
import TariffGridsView from '@/views/TariffGridsView.vue'
import WorkRatesView from '@/views/WorkRatesView.vue'
import ProductWorkRatesView from '@/views/ProductWorkRatesView.vue'
import StepperDemoView from '@/views/StepperDemoView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import ErrorPagesGalleryView from '@/views/errors/ErrorPagesGalleryView.vue'
import Error404MinimalView from '@/views/errors/Error404MinimalView.vue'
import Error404HubView from '@/views/errors/Error404HubView.vue'
import Error404ConsoleView from '@/views/errors/Error404ConsoleView.vue'
import Error404SplitView from '@/views/errors/Error404SplitView.vue'
import Error404SpotlightView from '@/views/errors/Error404SpotlightView.vue'
/**
 * Конфигурация маршрутов вынесена отдельно от создания роутера,
 * чтобы её можно было проверять в тестах на memory history.
 */
export const routes: RouteRecordRaw[] = [
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
          title: 'Главная',
          requiresAuth: true,
        },
      },
      {
        path: 'apitest',
        name: 'api-connection-test',
        component: ApiConnectionTestView,
        meta: {
          title: 'API Connection Test',
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
      {
        path: 'integrations',
        name: 'integrations',
        component: IntegrationsView,
        meta: {
          title: 'Интеграции',
          requiresAuth: true,
        },
      },
      {
        path: 'catalogs/components',
        name: 'components',
        component: ComponentsView,
        meta: {
          title: 'Компоненты',
          requiresAuth: true,
        },
      },
      {
        path: 'catalogs/suppliers',
        name: 'suppliers',
        component: SuppliersView,
        meta: {
          title: 'Поставщики',
          requiresAuth: true,
        },
      },
      {
        path: 'catalogs/tariff-grids',
        name: 'tariff-grids',
        component: TariffGridsView,
        meta: {
          title: 'Тарифные сетки',
          requiresAuth: true,
        },
      },
      {
        path: 'catalogs/work-rates',
        name: 'work-rates',
        component: WorkRatesView,
        meta: {
          title: 'Ставки работ',
          requiresAuth: true,
        },
      },
      {
        path: 'catalogs/product-work-rates',
        name: 'product-work-rates',
        component: ProductWorkRatesView,
        meta: {
          title: 'Нормы выработки',
          requiresAuth: true,
        },
      },
      {
        path: 'stepper-demo',
        name: 'stepper-demo',
        component: StepperDemoView,
        meta: {
          title: 'Stepper Demo',
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
  /**
   * Витрина дизайн-системы страниц ошибок: пять самостоятельных вариантов 404
   * для отбора лучшего дизайна плюс галерея-каталог. Страницы автономны
   * (без сайдбара), как и production-страница 404, поэтому доступны без токена.
   */
  {
    path: '/design/errors',
    name: 'error-pages-gallery',
    component: ErrorPagesGalleryView,
    meta: {
      title: 'Дизайн-система ошибок',
    },
  },
  {
    path: '/design/errors/404/minimal',
    name: 'error-404-minimal',
    component: Error404MinimalView,
    meta: {
      title: '404 · Минимализм',
    },
  },
  {
    path: '/design/errors/404/hub',
    name: 'error-404-hub',
    component: Error404HubView,
    meta: {
      title: '404 · Полезный хаб',
    },
  },
  {
    path: '/design/errors/404/console',
    name: 'error-404-console',
    component: Error404ConsoleView,
    meta: {
      title: '404 · Консоль разработчика',
    },
  },
  {
    path: '/design/errors/404/split',
    name: 'error-404-split',
    component: Error404SplitView,
    meta: {
      title: '404 · Разделённый экран',
    },
  },
  {
    path: '/design/errors/404/spotlight',
    name: 'error-404-spotlight',
    component: Error404SpotlightView,
    meta: {
      title: '404 · Споттлайт',
    },
  },
  {
    // Единственный catch-all: любое несовпадение отдаёт страницу «не найдено».
    // Без токена каркас приложения недоступен, поэтому страница автономна —
    // сайдбар с недоступными разделами только сбивал бы с толку.
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: NotFoundView,
    meta: {
      title: 'Страница не найдена',
    },
  },
]

export default routes
