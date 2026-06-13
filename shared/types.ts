export type AccountAuthType = 'apiToken' | 'globalApiKey'
export type UserRole = 'user' | 'admin' | 'super_admin'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

export interface AuthSessionPayload {
  token: string
  user: AuthUser
}

export interface RegisterInput {
  email: string
  password: string
  emailCode: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface SendRegisterCodeInput {
  email: string
}

export interface SendRegisterCodeResult {
  sent: true
  email: string
  expiresInSeconds: number
  retryAfterSeconds: number
}

export interface SendPasswordResetCodeInput {
  email: string
}

export interface SendPasswordResetCodeResult {
  sent: true
  email: string
  expiresInSeconds: number
  retryAfterSeconds: number
}

export interface ResetPasswordInput {
  email: string
  password: string
  emailCode: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export interface AdminResetPasswordInput {
  newPassword: string
}

export interface UpdateUserRoleInput {
  role: Exclude<UserRole, 'super_admin'> | 'super_admin'
}

export interface RuntimeConfig {
  apiBaseUrl: string
  updatedAt?: string
}

export interface UpdateRuntimeConfigInput {
  apiBaseUrl: string
}

export interface CloudflareCredentialPayload {
  authType: AccountAuthType
  apiToken?: string
  globalApiKey?: string
}

export interface CloudflareAccount {
  id: string
  ownerUserId?: string
  name: string
  email: string
  authType: AccountAuthType
  enabled: boolean
  note: string
  createdAt: string
  updatedAt: string
  lastVerifiedAt?: string
  credentialPreview: string
}

export interface CloudflareAccountInput {
  name: string
  email: string
  authType: AccountAuthType
  apiToken?: string
  globalApiKey?: string
  note?: string
  enabled: boolean
}

export interface CloudflareZone {
  id: string
  name: string
  status: string
  paused: boolean
  type: string
  planName: string
}

export interface AccountZoneSummary extends CloudflareZone {
  accountId: string
  accountName: string
  accountEmail: string
}

export interface SyncedZoneRecord extends AccountZoneSummary {
  syncedAt: string
}

export interface ZoneCacheSnapshot {
  items: SyncedZoneRecord[]
  syncedAt: string
  totalAccounts: number
  totalZones: number
  failedAccounts: Array<{
    accountId: string
    accountEmail: string
    message: string
  }>
}

export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT'

export interface DnsRecord {
  id: string
  type: DnsRecordType
  name: string
  content: string
  ttl: number
  proxied?: boolean
  priority?: number
  comment?: string
  modifiedOn?: string
}

export interface DnsRecordInput {
  type: DnsRecordType
  name: string
  content: string
  ttl: number
  proxied?: boolean
  priority?: number
  comment?: string
}

export interface DnsRecordQuery {
  accountId: string
  zoneId: string
  page: number
  pageSize: number
  type?: DnsRecordType
  keyword?: string
}

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface BatchDeletePayload {
  accountId: string
  zoneId: string
  recordIds: string[]
}

export interface BatchProxiedPayload extends BatchDeletePayload {
  proxied: boolean
}

export interface ApiSuccess<T> {
  success: true
  data: T
  requestId: string
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
  requestId: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorResponse
