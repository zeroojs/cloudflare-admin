import type {
  AdminResetPasswordInput,
  BatchDeletePayload,
  BatchProxiedPayload,
  ChangePasswordInput,
  CloudflareAccountInput,
  DnsRecordInput,
  DnsRecordQuery,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SendPasswordResetCodeInput,
  SendRegisterCodeInput,
  UpdateRuntimeConfigInput,
  UpdateUserRoleInput,
} from '@shared/types'

import { ApiError } from './errors'

const DNS_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT'] as const

function ensureString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} 不能为空`)
  }

  return value.trim()
}

function ensureEmail(value: unknown, field: string): string {
  const email = ensureString(value, field).toLowerCase()
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(email)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} 格式无效`)
  }

  return email
}

function ensureHttpUrl(value: unknown, field: string): string {
  const url = ensureString(value, field).replace(/\/+$/, '')

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} 格式无效`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} 仅支持 http 或 https`)
  }

  return url
}

function ensureBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} 必须为布尔值`)
  }

  return value
}

function ensureNumber(
  value: unknown,
  field: string,
  { min, max }: { min?: number; max?: number } = {},
): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} 必须为数字`)
  }

  if (typeof min === 'number' && parsed < min) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} 不能小于 ${min}`)
  }

  if (typeof max === 'number' && parsed > max) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} 不能大于 ${max}`)
  }

  return parsed
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new ApiError(400, 'INVALID_JSON', '请求体 JSON 格式无效')
  }
}

export function validateRegisterInput(
  payload: Partial<RegisterInput>,
): RegisterInput {
  const password = ensureString(payload.password, '登录密码')
  if (password.length < 8) {
    throw new ApiError(400, 'VALIDATION_ERROR', '登录密码长度至少为 8 位')
  }

  return {
    email: ensureEmail(payload.email, '登录邮箱'),
    password,
    emailCode: ensureString(payload.emailCode, '邮箱验证码'),
  }
}

export function validateLoginInput(payload: Partial<LoginInput>): LoginInput {
  return {
    email: ensureEmail(payload.email, '登录邮箱'),
    password: ensureString(payload.password, '登录密码'),
  }
}

export function validateSendRegisterCodeInput(
  payload: Partial<SendRegisterCodeInput>,
): SendRegisterCodeInput {
  return {
    email: ensureEmail(payload.email, '登录邮箱'),
  }
}

export function validateSendPasswordResetCodeInput(
  payload: Partial<SendPasswordResetCodeInput>,
): SendPasswordResetCodeInput {
  return {
    email: ensureEmail(payload.email, '登录邮箱'),
  }
}

export function validateResetPasswordInput(
  payload: Partial<ResetPasswordInput>,
): ResetPasswordInput {
  const password = ensureString(payload.password, '新密码')
  if (password.length < 8) {
    throw new ApiError(400, 'VALIDATION_ERROR', '新密码长度至少为 8 位')
  }

  return {
    email: ensureEmail(payload.email, '登录邮箱'),
    password,
    emailCode: ensureString(payload.emailCode, '邮箱验证码'),
  }
}

export function validateChangePasswordInput(
  payload: Partial<ChangePasswordInput>,
): ChangePasswordInput {
  const currentPassword = ensureString(payload.currentPassword, '当前密码')
  const newPassword = ensureString(payload.newPassword, '新密码')
  if (newPassword.length < 8) {
    throw new ApiError(400, 'VALIDATION_ERROR', '新密码长度至少为 8 位')
  }

  return {
    currentPassword,
    newPassword,
  }
}

export function validateAdminResetPasswordInput(
  payload: Partial<AdminResetPasswordInput>,
): AdminResetPasswordInput {
  const newPassword = ensureString(payload.newPassword, '新密码')
  if (newPassword.length < 8) {
    throw new ApiError(400, 'VALIDATION_ERROR', '新密码长度至少为 8 位')
  }

  return {
    newPassword,
  }
}

export function validateUpdateUserRoleInput(
  payload: Partial<UpdateUserRoleInput>,
): UpdateUserRoleInput {
  const role = ensureString(payload.role, '用户角色') as UpdateUserRoleInput['role']
  if (role !== 'user' && role !== 'admin' && role !== 'super_admin') {
    throw new ApiError(400, 'VALIDATION_ERROR', '用户角色不支持')
  }

  return { role }
}

export function validateUpdateRuntimeConfigInput(
  payload: Partial<UpdateRuntimeConfigInput>,
): UpdateRuntimeConfigInput {
  return {
    apiBaseUrl: ensureHttpUrl(payload.apiBaseUrl, '前端 API 地址'),
  }
}

export function validateAccountInput(
  payload: Partial<CloudflareAccountInput>,
  options: { requireCredential?: boolean } = {},
): CloudflareAccountInput {
  const requireCredential = options.requireCredential ?? true
  const authType = ensureString(payload.authType, '认证类型')
  if (authType !== 'apiToken' && authType !== 'globalApiKey') {
    throw new ApiError(400, 'VALIDATION_ERROR', '认证类型不支持')
  }

  if (authType === 'apiToken' && requireCredential && !payload.apiToken?.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'API Token 不能为空')
  }

  if (
    authType === 'globalApiKey' &&
    requireCredential &&
    !payload.globalApiKey?.trim()
  ) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Global API Key 不能为空')
  }

  return {
    name: ensureString(payload.name, '账户名称'),
    email: ensureString(payload.email, '账户邮箱'),
    authType,
    apiToken: payload.apiToken?.trim(),
    globalApiKey: payload.globalApiKey?.trim(),
    note: payload.note?.trim() ?? '',
    enabled: ensureBoolean(payload.enabled, '启用状态'),
  }
}

export function validateDnsInput(
  payload: Partial<DnsRecordInput>,
): DnsRecordInput {
  const type = ensureString(payload.type, '记录类型') as DnsRecordInput['type']
  if (!DNS_TYPES.includes(type)) {
    throw new ApiError(400, 'VALIDATION_ERROR', '记录类型不支持')
  }

  if ((type === 'A' || type === 'AAAA') && !payload.content?.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'IP 地址不能为空')
  }

  if ((type === 'CNAME' || type === 'MX' || type === 'TXT') && !payload.content?.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', '记录值不能为空')
  }

  return {
    type,
    name: ensureString(payload.name, '主机记录'),
    content: ensureString(payload.content, '记录值'),
    ttl: ensureNumber(payload.ttl, 'TTL', { min: 1 }),
    proxied:
      typeof payload.proxied === 'boolean' ? payload.proxied : undefined,
    priority:
      typeof payload.priority === 'undefined'
        ? undefined
        : ensureNumber(payload.priority, '优先级', { min: 0 }),
    comment: payload.comment?.trim(),
  }
}

export function validateDnsQuery(url: URL): DnsRecordQuery {
  const accountId = ensureString(url.searchParams.get('accountId'), '账户 ID')
  const zoneId = ensureString(url.searchParams.get('zoneId'), '域名 ID')
  const page = ensureNumber(url.searchParams.get('page') ?? 1, '页码', {
    min: 1,
  })
  const pageSize = ensureNumber(
    url.searchParams.get('pageSize') ?? 20,
    '每页数量',
    {
      min: 1,
      max: 100,
    },
  )
  const typeValue = url.searchParams.get('type')?.trim()
  const keyword = url.searchParams.get('keyword')?.trim()

  if (typeValue && !DNS_TYPES.includes(typeValue as DnsRecordInput['type'])) {
    throw new ApiError(400, 'VALIDATION_ERROR', '筛选记录类型不支持')
  }

  return {
    accountId,
    zoneId,
    page,
    pageSize,
    type: typeValue as DnsRecordInput['type'] | undefined,
    keyword,
  }
}

export function validateBatchDeletePayload(
  payload: Partial<BatchDeletePayload>,
): BatchDeletePayload {
  if (!Array.isArray(payload.recordIds) || payload.recordIds.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', '请选择至少一条记录')
  }

  return {
    accountId: ensureString(payload.accountId, '账户 ID'),
    zoneId: ensureString(payload.zoneId, '域名 ID'),
    recordIds: payload.recordIds.map((item) => ensureString(item, '记录 ID')),
  }
}

export function validateBatchProxiedPayload(
  payload: Partial<BatchProxiedPayload>,
): BatchProxiedPayload {
  return {
    ...validateBatchDeletePayload(payload),
    proxied: ensureBoolean(payload.proxied, '代理状态'),
  }
}
