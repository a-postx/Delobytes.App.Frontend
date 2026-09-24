import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import { NavGroup } from '@/router/navGroups'
import HomeView from '@/views/HomeView.vue'
import ApiConnectionTestView from '@/views/ApiConnectionTestView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import SetupTenantView from '@/views/SetupTenantView.vue'
import SettingsView from '@/views/SettingsView.vue'
import TenantSettingsView from '@/views/TenantSettingsView.vue'
import SalesChannelsView from '@/views/SalesChannelsView.vue'
import YandexCallbackView from '@/views/YandexCallbackView.vue'
import GoogleCallbackView from '@/views/GoogleCallbackView.vue'
import AcceptInvitationView from '@/views/AcceptInvitationView.vue'
import ComponentsView from '@/views/ComponentsView.vue'
import SuppliersView from '@/views/SuppliersView.vue'
import CostTypesView from '@/views/CostTypesView.vue'
import ProductsView from '@/views/ProductsView.vue'
import ProductChannelCostsView from '@/views/ProductChannelCostsView.vue'
import WorkRatesView from '@/views/WorkRatesView.vue'
import ProductWorkRatesView from '@/views/ProductWorkRatesView.vue'
import StepperDemoView from '@/views/StepperDemoView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

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
          group: NavGroup.Panels,
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
          group: NavGroup.System,
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
        path: 'catalogs/sales-channels',
        name: 'sales-channels',
        component: SalesChannelsView,
        meta: {
          group: NavGroup.Sales,
          title: 'Каналы продаж',
          requiresAuth: true,
        },
      },
      {
        path: 'catalogs/components',
        name: 'components',
        component: ComponentsView,
        meta: {
          group: NavGroup.Production,
          title: 'Компоненты',
          requiresAuth: true,
        },
      },
      {
        path: 'catalogs/suppliers',
        name: 'suppliers',
        component: SuppliersView,
        meta: {
          group: NavGroup.Platform,
          title: 'Поставщики',
          requiresAuth: true,
        },
      },
      {
        path: 'catalogs/products',
        name: 'products',
        component: ProductsView,
        meta: {
          group: NavGroup.Platform,
          title: 'Каталог',
          requiresAuth: true,
        },
      },
      {
        path: 'catalogs/cost-types',
        name: 'cost-types',
        component: CostTypesView,
        meta: {
          group: NavGroup.Sales,
          title: 'Типы расходов',
          requiresAuth: true,
        },
      },
      {
        path: 'catalogs/product-channel-costs',
        name: 'product-channel-costs',
        component: ProductChannelCostsView,
        meta: {
          group: NavGroup.Sales,
          title: 'Расходы по каналам',
          requiresAuth: true,
        },
      },
      {
        path: 'catalogs/work-rates',
        name: 'work-rates',
        component: WorkRatesView,
        meta: {
          group: NavGroup.Production,
          title: 'Ставки работ',
          requiresAuth: true,
        },
      },
      {
        path: 'catalogs/product-work-rates',
        name: 'product-work-rates',
        component: ProductWorkRatesView,
        meta: {
          group: NavGroup.Production,
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