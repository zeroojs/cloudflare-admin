import type { AdminResetPasswordInput, AuthUser, UpdateUserRoleInput } from '@shared/types'

import { apiRequest } from './http'

export function listUsers(): Promise<AuthUser[]> {
  return apiRequest('/api/users')
}

export function updateUserRole(
  userId: string,
  payload: UpdateUserRoleInput,
): Promise<AuthUser> {
  return apiRequest(`/api/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function resetUserPassword(
  userId: string,
  payload: AdminResetPasswordInput,
): Promise<{ reset: true }> {
  return apiRequest(`/api/users/${userId}/reset-password`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
