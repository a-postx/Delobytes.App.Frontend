import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import SetupTenantView from '@/views/SetupTenantView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: {
        title: 'Home',
        requiresAuth: true
      }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: {
        title: 'Login'
      }
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: {
        title: 'Register'
      }
    },
    {
      path: '/setup-tenant',
      name: 'setup-tenant',
      component: SetupTenantView,
      meta: {
        title: 'Setup Tenant'
      }
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - Delobytes`
  }

  // Check authentication
  const token = localStorage.getItem('accessToken')
  const requiresAuth = to.meta.requiresAuth

  if (requiresAuth && !token) {
    // Redirect to login if route requires auth and user is not authenticated
    next('/login')
  } else if ((to.name === 'login' || to.name === 'register') && token) {
    // Redirect to home if user is already authenticated
    next('/')
  } else {
    next()
  }
})

export default router
