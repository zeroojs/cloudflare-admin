export const SESSION_TOKEN_KEY = 'cloudflare-admin-session-token'

export function getStoredSessionToken(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(SESSION_TOKEN_KEY) ?? ''
}

export function setStoredSessionToken(token: string): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SESSION_TOKEN_KEY, token)
}

export function clearStoredSessionToken(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(SESSION_TOKEN_KEY)
}
