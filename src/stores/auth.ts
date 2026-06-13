import type { AuthSessionPayload, AuthUser, LoginInput, RegisterInput } from '@shared/types'

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  getCurrentUser,
  loginByEmail,
  logoutCurrentUser,
  registerByEmail,
} from '@/services/auth'
import {
  clearStoredSessionToken,
  getStoredSessionToken,
  setStoredSessionToken,
} from '@/utils/session'

export const useAuthStore = defineStore('auth', () => {
  const sessionToken = ref(getStoredSessionToken())
  const user = ref<AuthUser | null>(null)
  const initialized = ref(false)
  const loading = ref(false)

  const isAuthenticated = computed(
    () => Boolean(sessionToken.value) && Boolean(user.value),
  )
  const isAdmin = computed(
    () => user.value?.role === 'admin' || user.value?.role === 'super_admin',
  )
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')

  function applySession(payload: AuthSessionPayload) {
    sessionToken.value = payload.token
    user.value = payload.user
    setStoredSessionToken(payload.token)
  }

  function clearSession() {
    sessionToken.value = ''
    user.value = null
    clearStoredSessionToken()
  }

  async function fetchCurrentUser() {
    if (!sessionToken.value) {
      user.value = null
      initialized.value = true
      return null
    }

    try {
      user.value = await getCurrentUser()
      return user.value
    } catch (error) {
      clearSession()
      throw error
    } finally {
      initialized.value = true
    }
  }

  async function initialize() {
    if (initialized.value) {
      return user.value
    }

    sessionToken.value = getStoredSessionToken()
    if (!sessionToken.value) {
      initialized.value = true
      user.value = null
      return null
    }

    try {
      return await fetchCurrentUser()
    } catch {
      return null
    }
  }

  async function register(payload: RegisterInput) {
    loading.value = true
    try {
      const session = await registerByEmail(payload)
      applySession(session)
      initialized.value = true
      return session.user
    } finally {
      loading.value = false
    }
  }

  async function login(payload: LoginInput) {
    loading.value = true
    try {
      const session = await loginByEmail(payload)
      applySession(session)
      initialized.value = true
      return session.user
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    try {
      if (sessionToken.value) {
        await logoutCurrentUser()
      }
    } finally {
      clearSession()
      initialized.value = true
      loading.value = false
    }
  }

  return {
    sessionToken,
    user,
    initialized,
    loading,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    initialize,
    fetchCurrentUser,
    register,
    login,
    logout,
    clearSession,
  }
})
