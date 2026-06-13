import { createRouter, createWebHistory } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'
import AccountsPage from '@/pages/AccountsPage.vue'
import DashboardPage from '@/pages/DashboardPage.vue'
import DnsPage from '@/pages/DnsPage.vue'
import DomainsPage from '@/pages/DomainsPage.vue'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage.vue'
import LoginPage from '@/pages/LoginPage.vue'
import RegisterPage from '@/pages/RegisterPage.vue'
import UsersPage from '@/pages/UsersPage.vue'
import { pinia } from '@/stores'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: {
        guestOnly: true,
      },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgotPasswordPage,
      meta: {
        guestOnly: true,
      },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterPage,
      meta: {
        guestOnly: true,
      },
    },
    {
      path: '/',
      component: AppShell,
      meta: {
        requiresAuth: true,
      },
      children: [
        {
          path: '',
          redirect: '/dashboard',
        },
        {
          path: '/dashboard',
          name: 'dashboard',
          component: DashboardPage,
        },
        {
          path: '/accounts',
          name: 'accounts',
          component: AccountsPage,
        },
        {
          path: '/domains',
          name: 'domains',
          component: DomainsPage,
        },
        {
          path: '/dns',
          name: 'dns',
          component: DnsPage,
        },
        {
          path: '/users',
          name: 'users',
          component: UsersPage,
          meta: {
            requiresAdmin: true,
          },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore(pinia)
  await authStore.initialize()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: 'login',
      query: {
        redirect: to.fullPath,
      },
    }
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return '/dashboard'
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    const redirect =
      typeof to.query.redirect === 'string' && to.query.redirect
        ? to.query.redirect
        : '/dashboard'

    return redirect
  }

  return true
})

export default router
