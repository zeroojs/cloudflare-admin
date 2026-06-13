import type {
  ChangePasswordInput,
  AuthSessionPayload,
  AuthUser,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SendPasswordResetCodeInput,
  SendPasswordResetCodeResult,
  SendRegisterCodeInput,
  SendRegisterCodeResult,
} from '@shared/types'

import { apiRequest } from './http'

export function registerByEmail(payload: RegisterInput): Promise<AuthSessionPayload> {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function sendRegisterCode(
  payload: SendRegisterCodeInput,
): Promise<SendRegisterCodeResult> {
  return apiRequest('/api/auth/register-code', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function sendPasswordResetCode(
  payload: SendPasswordResetCodeInput,
): Promise<SendPasswordResetCodeResult> {
  return apiRequest('/api/auth/password-reset-code', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function loginByEmail(payload: LoginInput): Promise<AuthSessionPayload> {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getCurrentUser(): Promise<AuthUser> {
  return apiRequest('/api/auth/me')
}

export function logoutCurrentUser(): Promise<{ loggedOut: true }> {
  return apiRequest('/api/auth/logout', {
    method: 'POST',
  })
}

export function resetPasswordByEmail(
  payload: ResetPasswordInput,
): Promise<{ reset: true }> {
  return apiRequest('/api/auth/password-reset', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function changePassword(
  payload: ChangePasswordInput,
): Promise<{ changed: true }> {
  return apiRequest('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
