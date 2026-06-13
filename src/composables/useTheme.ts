import { computed, ref } from 'vue'

export type ThemeMode = 'dark' | 'light' | 'auto'
type ResolvedTheme = 'dark' | 'light'

const STORAGE_KEY = 'theme-mode'
const themeMode = ref<ThemeMode>('auto')
const systemTheme = ref<ResolvedTheme>('dark')
let initialized = false

function detectSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(mode: ThemeMode) {
  const resolved = mode === 'auto' ? systemTheme.value : mode
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(resolved)
  document.documentElement.style.colorScheme = resolved
  localStorage.setItem(STORAGE_KEY, mode)
}

function initTheme() {
  if (initialized || typeof window === 'undefined') {
    return
  }

  initialized = true
  const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  if (saved === 'dark' || saved === 'light' || saved === 'auto') {
    themeMode.value = saved
  }

  systemTheme.value = detectSystemTheme()
  applyTheme(themeMode.value)

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (event) => {
    systemTheme.value = event.matches ? 'dark' : 'light'
    applyTheme(themeMode.value)
  })
}

export function useTheme() {
  initTheme()

  const resolvedTheme = computed<ResolvedTheme>(() =>
    themeMode.value === 'auto' ? systemTheme.value : themeMode.value,
  )

  function setThemeMode(nextMode: ThemeMode) {
    themeMode.value = nextMode
    applyTheme(nextMode)
  }

  return {
    themeMode,
    resolvedTheme,
    isDark: computed(() => resolvedTheme.value === 'dark'),
    setThemeMode,
  }
}
