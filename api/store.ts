import type {
  AccountZoneSummary,
  AuthSessionPayload,
  AuthUser,
  ChangePasswordInput,
  CloudflareAccount,
  CloudflareAccountInput,
  CloudflareCredentialPayload,
  LoginInput,
  ResetPasswordInput,
  RegisterInput,
  RuntimeConfig,
  UserRole,
  ZoneCacheSnapshot,
} from '@shared/types'

import { decryptJson, encryptJson, hashPassword, verifyPassword } from './crypto'
import { ApiError } from './errors'

export interface KvLikeStore {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
}

export interface EnvBindings {
  ACCOUNT_STORE?: KvLikeStore
  ADMIN_TOKEN?: string
  ENCRYPTION_SECRET?: string
  SUPER_ADMIN_EMAIL?: string
  MAIL_API_TOKEN?: string
  MAIL_API_CUSTOM_AUTH?: string
  MAIL_API_URL?: string
  MAIL_FROM_NAME?: string
  MAIL_CODE_EXPIRE_MINUTES?: string
  MAIL_CODE_RESEND_INTERVAL_SECONDS?: string
  ALLOWED_ORIGIN?: string
  RATE_LIMIT_MAX?: string
  RATE_LIMIT_WINDOW_MS?: string
}

interface StoredAccountRecord extends CloudflareAccount {
  credentialCiphertext: string
}

interface StoredUserRecord extends AuthUser {
  passwordHash: string
}

interface StoredSessionRecord {
  token: string
  userId: string
  createdAt: string
}

interface StoredRegisterCodeRecord {
  email: string
  code: string
  sentAt: string
  expiresAt: string
}

interface StoredRuntimeConfigRecord extends RuntimeConfig {
  updatedAt: string
}

const USER_PREFIX = 'auth-user:'
const USER_EMAIL_PREFIX = 'auth-user-email:'
const USER_INDEX_KEY = 'auth-user:index'
const SESSION_PREFIX = 'auth-session:'
const REGISTER_CODE_PREFIX = 'auth-register-code:'
const PASSWORD_RESET_CODE_PREFIX = 'auth-password-reset-code:'
const ACCOUNT_PREFIX = 'cf-account:'
const ACCOUNT_INDEX_PREFIX = 'cf-account:index:'
const ZONE_CACHE_PREFIX = 'cf-zone-cache:'
const RUNTIME_CONFIG_KEY = 'system:runtime-config'

function getRuntimeStore(env: EnvBindings): KvLikeStore {
  if (env.ACCOUNT_STORE) {
    return env.ACCOUNT_STORE
  }

  throw new ApiError(
    500,
    'ACCOUNT_STORE_NOT_CONFIGURED',
    '未配置持久化账户存储，请为 Worker 绑定 ACCOUNT_STORE KV 命名空间',
  )
}

function getEncryptionSecret(env: EnvBindings): string {
  return env.ENCRYPTION_SECRET || 'local-dev-encryption-secret'
}

export function getSuperAdminEmail(env: EnvBindings): string {
  if (!env.SUPER_ADMIN_EMAIL?.trim()) {
    throw new ApiError(500, 'SUPER_ADMIN_NOT_CONFIGURED', '未配置超级管理员邮箱')
  }

  return env.SUPER_ADMIN_EMAIL.trim().toLowerCase()
}

export function isElevatedRole(role: UserRole): boolean {
  return role === 'admin' || role === 'super_admin'
}

export function isSuperAdminRole(role: UserRole): boolean {
  return role === 'super_admin'
}

function resolveUserRole(
  env: EnvBindings,
  email: string,
  role?: UserRole,
): UserRole {
  if (email.toLowerCase() === getSuperAdminEmail(env)) {
    return 'super_admin'
  }

  return role ?? 'user'
}

async function getStringList(env: EnvBindings, key: string): Promise<string[]> {
  const raw = await getRuntimeStore(env).get(key)
  if (!raw) {
    return []
  }

  return JSON.parse(raw) as string[]
}

async function saveStringList(
  env: EnvBindings,
  key: string,
  values: string[],
): Promise<void> {
  await getRuntimeStore(env).put(key, JSON.stringify(values))
}

function buildUserKey(userId: string): string {
  return `${USER_PREFIX}${userId}`
}

function buildUserEmailKey(email: string): string {
  return `${USER_EMAIL_PREFIX}${email}`
}

function buildSessionKey(token: string): string {
  return `${SESSION_PREFIX}${token}`
}

function buildRegisterCodeKey(email: string): string {
  return `${REGISTER_CODE_PREFIX}${email}`
}

function buildPasswordResetCodeKey(email: string): string {
  return `${PASSWORD_RESET_CODE_PREFIX}${email}`
}

function buildAccountIndexKey(userId: string): string {
  return `${ACCOUNT_INDEX_PREFIX}${userId}`
}

function buildAccountKey(userId: string, accountId: string): string {
  return `${ACCOUNT_PREFIX}${userId}:${accountId}`
}

function buildZoneCacheKey(userId: string): string {
  return `${ZONE_CACHE_PREFIX}${userId}`
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function buildCredentialPreview(input: CloudflareAccountInput): string {
  if (input.authType === 'apiToken') {
    const suffix = input.apiToken?.slice(-4) ?? 'none'
    return `Token ****${suffix}`
  }

  const suffix = input.globalApiKey?.slice(-4) ?? 'none'
  return `Key ****${suffix}`
}

function sanitizeAccount(record: StoredAccountRecord): CloudflareAccount {
  const { credentialCiphertext: _credentialCiphertext, ...account } = record
  return account
}

function sanitizeUser(env: EnvBindings, record: StoredUserRecord): AuthUser {
  const { passwordHash: _passwordHash, ...user } = record
  return {
    ...user,
    role: resolveUserRole(env, record.email, record.role),
  }
}

async function getUserIds(env: EnvBindings): Promise<string[]> {
  return getStringList(env, USER_INDEX_KEY)
}

async function saveUserIds(env: EnvBindings, ids: string[]): Promise<void> {
  await saveStringList(env, USER_INDEX_KEY, ids)
}

async function getAccountIds(env: EnvBindings, userId: string): Promise<string[]> {
  return getStringList(env, buildAccountIndexKey(userId))
}

async function saveAccountIds(
  env: EnvBindings,
  userId: string,
  ids: string[],
): Promise<void> {
  await saveStringList(env, buildAccountIndexKey(userId), ids)
}

export async function listUsers(env: EnvBindings): Promise<AuthUser[]> {
  const store = getRuntimeStore(env)
  const ids = await getUserIds(env)
  const records = await Promise.all(
    ids.map((id) => store.get(buildUserKey(id))),
  )

  return records
    .filter((value): value is string => Boolean(value))
    .map((value) => JSON.parse(value) as StoredUserRecord)
    .map((value) => sanitizeUser(env, value))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

async function getStoredUser(env: EnvBindings, userId: string): Promise<StoredUserRecord> {
  const raw = await getRuntimeStore(env).get(buildUserKey(userId))
  if (!raw) {
    throw new ApiError(401, 'UNAUTHORIZED', '登录状态已失效')
  }

  return JSON.parse(raw) as StoredUserRecord
}

export async function getUserById(
  env: EnvBindings,
  userId: string,
): Promise<AuthUser> {
  return sanitizeUser(env, await getStoredUser(env, userId))
}

export async function findUserByEmail(
  env: EnvBindings,
  email: string,
): Promise<AuthUser | null> {
  const userId = await getRuntimeStore(env).get(buildUserEmailKey(email))
  if (!userId) {
    return null
  }

  return getUserById(env, userId)
}

async function getStoredUserByEmail(
  env: EnvBindings,
  email: string,
): Promise<StoredUserRecord | null> {
  const userId = await getRuntimeStore(env).get(buildUserEmailKey(email))
  if (!userId) {
    return null
  }

  return getStoredUser(env, userId)
}

export async function createUser(
  env: EnvBindings,
  input: RegisterInput,
): Promise<AuthUser> {
  const existing = await getStoredUserByEmail(env, input.email)
  if (existing) {
    throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', '该邮箱已注册')
  }

  const now = new Date().toISOString()
  const record: StoredUserRecord = {
    id: crypto.randomUUID(),
    email: input.email,
    role: resolveUserRole(env, input.email),
    createdAt: now,
    updatedAt: now,
    passwordHash: await hashPassword(input.password, getEncryptionSecret(env)),
  }

  const store = getRuntimeStore(env)
  await store.put(buildUserKey(record.id), JSON.stringify(record))
  await store.put(buildUserEmailKey(record.email), record.id)
  await saveUserIds(env, [...(await getUserIds(env)), record.id])

  return sanitizeUser(env, record)
}

export async function verifyUserCredentials(
  env: EnvBindings,
  input: LoginInput,
): Promise<AuthUser> {
  const record = await getStoredUserByEmail(env, input.email)
  if (!record) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', '邮箱或密码错误')
  }

  const isValid = await verifyPassword(
    input.password,
    record.passwordHash,
    getEncryptionSecret(env),
  )
  if (!isValid) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', '邮箱或密码错误')
  }

  return sanitizeUser(env, record)
}

export async function touchUserLastLogin(
  env: EnvBindings,
  userId: string,
): Promise<AuthUser> {
  const current = await getStoredUser(env, userId)
  const nextRecord: StoredUserRecord = {
    ...current,
    role: resolveUserRole(env, current.email, current.role),
    lastLoginAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await getRuntimeStore(env).put(buildUserKey(userId), JSON.stringify(nextRecord))
  return sanitizeUser(env, nextRecord)
}

export async function createSession(
  env: EnvBindings,
  user: AuthUser,
): Promise<AuthSessionPayload> {
  const token = crypto.randomUUID()
  const sessionRecord: StoredSessionRecord = {
    token,
    userId: user.id,
    createdAt: new Date().toISOString(),
  }

  await getRuntimeStore(env).put(buildSessionKey(token), JSON.stringify(sessionRecord))

  return {
    token,
    user,
  }
}

export async function getUserBySessionToken(
  env: EnvBindings,
  token: string,
): Promise<AuthUser> {
  const store = getRuntimeStore(env)
  const raw = await store.get(buildSessionKey(token))
  if (!raw) {
    throw new ApiError(401, 'UNAUTHORIZED', '登录状态已失效')
  }

  const session = JSON.parse(raw) as StoredSessionRecord
  return getUserById(env, session.userId)
}

export async function deleteSession(env: EnvBindings, token: string): Promise<void> {
  await getRuntimeStore(env).delete(buildSessionKey(token))
}

export async function updateUserRole(
  env: EnvBindings,
  userId: string,
  role: UserRole,
): Promise<AuthUser> {
  const current = await getStoredUser(env, userId)
  const nextRecord: StoredUserRecord = {
    ...current,
    role: resolveUserRole(env, current.email, role),
    updatedAt: new Date().toISOString(),
  }

  await getRuntimeStore(env).put(buildUserKey(userId), JSON.stringify(nextRecord))
  return sanitizeUser(env, nextRecord)
}

async function saveEmailCode(
  env: EnvBindings,
  key: string,
  email: string,
  code: string,
): Promise<StoredRegisterCodeRecord> {
  const store = getRuntimeStore(env)
  const currentRaw = await store.get(key)
  const resendIntervalSeconds = getRegisterCodeResendIntervalSeconds(env)

  if (currentRaw) {
    const current = JSON.parse(currentRaw) as StoredRegisterCodeRecord
    const sentAtTime = Date.parse(current.sentAt)
    if (Number.isFinite(sentAtTime)) {
      const elapsedSeconds = Math.floor((Date.now() - sentAtTime) / 1000)
      if (elapsedSeconds < resendIntervalSeconds) {
        throw new ApiError(
          429,
          'EMAIL_CODE_RATE_LIMITED',
          `验证码发送过于频繁，请 ${resendIntervalSeconds - elapsedSeconds} 秒后再试`,
        )
      }
    }
  }

  const now = new Date()
  const expiresAt = new Date(
    now.getTime() + getRegisterCodeExpireMinutes(env) * 60 * 1000,
  )
  const record: StoredRegisterCodeRecord = {
    email,
    code,
    sentAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }

  await store.put(key, JSON.stringify(record))
  return record
}

async function consumeEmailCode(
  env: EnvBindings,
  key: string,
  code: string,
): Promise<void> {
  const store = getRuntimeStore(env)
  const raw = await store.get(key)

  if (!raw) {
    throw new ApiError(400, 'EMAIL_CODE_INVALID', '请先获取邮箱验证码')
  }

  const record = JSON.parse(raw) as StoredRegisterCodeRecord
  if (Date.parse(record.expiresAt) <= Date.now()) {
    await store.delete(key)
    throw new ApiError(400, 'EMAIL_CODE_EXPIRED', '邮箱验证码已过期，请重新获取')
  }

  if (record.code !== code) {
    throw new ApiError(400, 'EMAIL_CODE_INVALID', '邮箱验证码错误')
  }

  await store.delete(key)
}

export function getRegisterCodeExpireMinutes(env: EnvBindings): number {
  const parsed = Number(env.MAIL_CODE_EXPIRE_MINUTES ?? 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10
}

export function getRegisterCodeResendIntervalSeconds(env: EnvBindings): number {
  const parsed = Number(env.MAIL_CODE_RESEND_INTERVAL_SECONDS ?? 60)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60
}

export async function saveRegisterCode(
  env: EnvBindings,
  email: string,
  code: string,
): Promise<StoredRegisterCodeRecord> {
  return saveEmailCode(env, buildRegisterCodeKey(email), email, code)
}

export async function consumeRegisterCode(
  env: EnvBindings,
  email: string,
  code: string,
): Promise<void> {
  await consumeEmailCode(env, buildRegisterCodeKey(email), code)
}

export async function savePasswordResetCode(
  env: EnvBindings,
  email: string,
  code: string,
): Promise<StoredRegisterCodeRecord> {
  return saveEmailCode(env, buildPasswordResetCodeKey(email), email, code)
}

export async function consumePasswordResetCode(
  env: EnvBindings,
  email: string,
  code: string,
): Promise<void> {
  await consumeEmailCode(env, buildPasswordResetCodeKey(email), code)
}

export async function resetUserPasswordByEmail(
  env: EnvBindings,
  input: ResetPasswordInput,
): Promise<AuthUser> {
  const current = await getStoredUserByEmail(env, input.email)
  if (!current) {
    throw new ApiError(404, 'USER_NOT_FOUND', '用户不存在')
  }

  const nextRecord: StoredUserRecord = {
    ...current,
    passwordHash: await hashPassword(input.password, getEncryptionSecret(env)),
    updatedAt: new Date().toISOString(),
  }

  await getRuntimeStore(env).put(buildUserKey(current.id), JSON.stringify(nextRecord))
  return sanitizeUser(env, nextRecord)
}

export async function changeUserPassword(
  env: EnvBindings,
  userId: string,
  input: ChangePasswordInput,
): Promise<AuthUser> {
  const current = await getStoredUser(env, userId)
  const isValid = await verifyPassword(
    input.currentPassword,
    current.passwordHash,
    getEncryptionSecret(env),
  )
  if (!isValid) {
    throw new ApiError(400, 'INVALID_CURRENT_PASSWORD', '当前密码错误')
  }

  const nextRecord: StoredUserRecord = {
    ...current,
    passwordHash: await hashPassword(input.newPassword, getEncryptionSecret(env)),
    updatedAt: new Date().toISOString(),
  }

  await getRuntimeStore(env).put(buildUserKey(userId), JSON.stringify(nextRecord))
  return sanitizeUser(env, nextRecord)
}

export async function adminResetUserPassword(
  env: EnvBindings,
  userId: string,
  newPassword: string,
): Promise<AuthUser> {
  const current = await getStoredUser(env, userId)
  const nextRecord: StoredUserRecord = {
    ...current,
    passwordHash: await hashPassword(newPassword, getEncryptionSecret(env)),
    updatedAt: new Date().toISOString(),
  }

  await getRuntimeStore(env).put(buildUserKey(userId), JSON.stringify(nextRecord))
  return sanitizeUser(env, nextRecord)
}

export async function getRuntimeConfig(
  env: EnvBindings,
  fallbackApiBaseUrl: string,
): Promise<RuntimeConfig> {
  const raw = await getRuntimeStore(env).get(RUNTIME_CONFIG_KEY)
  const fallback = normalizeBaseUrl(fallbackApiBaseUrl)

  if (!raw) {
    return {
      apiBaseUrl: fallback,
    }
  }

  const record = JSON.parse(raw) as Partial<StoredRuntimeConfigRecord>
  return {
    apiBaseUrl:
      typeof record.apiBaseUrl === 'string' && record.apiBaseUrl.trim()
        ? normalizeBaseUrl(record.apiBaseUrl)
        : fallback,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
  }
}

export async function updateRuntimeConfig(
  env: EnvBindings,
  apiBaseUrl: string,
): Promise<RuntimeConfig> {
  const record: StoredRuntimeConfigRecord = {
    apiBaseUrl: normalizeBaseUrl(apiBaseUrl),
    updatedAt: new Date().toISOString(),
  }

  await getRuntimeStore(env).put(RUNTIME_CONFIG_KEY, JSON.stringify(record))
  return record
}

export async function listAccounts(
  env: EnvBindings,
  userId: string,
): Promise<CloudflareAccount[]> {
  const store = getRuntimeStore(env)
  const ids = await getAccountIds(env, userId)
  const records = await Promise.all(ids.map((id) => store.get(buildAccountKey(userId, id))))

  return records
    .filter((value): value is string => Boolean(value))
    .map((value) => JSON.parse(value) as StoredAccountRecord)
    .map(sanitizeAccount)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export async function listAllAccounts(env: EnvBindings): Promise<CloudflareAccount[]> {
  const users = await listUsers(env)
  const results = await Promise.all(users.map((user) => listAccounts(env, user.id)))
  return results
    .flat()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

export async function listAccessibleAccounts(
  env: EnvBindings,
  actor: AuthUser,
): Promise<CloudflareAccount[]> {
  if (canAccessAllAccounts(actor)) {
    return listAllAccounts(env)
  }

  return listAccounts(env, actor.id)
}

async function findStoredAccountAcrossUsers(
  env: EnvBindings,
  accountId: string,
): Promise<{ ownerUserId: string; account: StoredAccountRecord }> {
  const users = await listUsers(env)

  for (const user of users) {
    const raw = await getRuntimeStore(env).get(buildAccountKey(user.id, accountId))
    if (raw) {
      return {
        ownerUserId: user.id,
        account: JSON.parse(raw) as StoredAccountRecord,
      }
    }
  }

  throw new ApiError(404, 'ACCOUNT_NOT_FOUND', '账户不存在')
}

function canAccessAllAccounts(actor: AuthUser): boolean {
  return isElevatedRole(actor.role)
}

export async function getStoredAccount(
  env: EnvBindings,
  userId: string,
  accountId: string,
): Promise<StoredAccountRecord> {
  const store = getRuntimeStore(env)
  const raw = await store.get(buildAccountKey(userId, accountId))
  if (!raw) {
    throw new ApiError(404, 'ACCOUNT_NOT_FOUND', '账户不存在')
  }

  const record = JSON.parse(raw) as StoredAccountRecord
  if (record.ownerUserId !== userId) {
    throw new ApiError(404, 'ACCOUNT_NOT_FOUND', '账户不存在')
  }

  return record
}

export async function getAccessibleStoredAccount(
  env: EnvBindings,
  actor: AuthUser,
  accountId: string,
): Promise<{ ownerUserId: string; account: StoredAccountRecord }> {
  if (canAccessAllAccounts(actor)) {
    return findStoredAccountAcrossUsers(env, accountId)
  }

  return {
    ownerUserId: actor.id,
    account: await getStoredAccount(env, actor.id, accountId),
  }
}

export async function createAccount(
  env: EnvBindings,
  userId: string,
  input: CloudflareAccountInput,
): Promise<CloudflareAccount> {
  const now = new Date().toISOString()
  const credentialCiphertext = await encryptJson<CloudflareCredentialPayload>(
    {
      authType: input.authType,
      apiToken: input.apiToken,
      globalApiKey: input.globalApiKey,
    },
    getEncryptionSecret(env),
  )

  const record: StoredAccountRecord = {
    id: crypto.randomUUID(),
    ownerUserId: userId,
    name: input.name,
    email: input.email,
    authType: input.authType,
    enabled: input.enabled,
    note: input.note ?? '',
    createdAt: now,
    updatedAt: now,
    credentialPreview: buildCredentialPreview(input),
    credentialCiphertext,
  }

  await getRuntimeStore(env).put(buildAccountKey(userId, record.id), JSON.stringify(record))
  await saveAccountIds(env, userId, [...(await getAccountIds(env, userId)), record.id])

  return sanitizeAccount(record)
}

export async function updateAccount(
  env: EnvBindings,
  userId: string,
  accountId: string,
  input: CloudflareAccountInput,
): Promise<CloudflareAccount> {
  const current = await getStoredAccount(env, userId, accountId)
  const nextCredentialCiphertext =
    input.apiToken || input.globalApiKey
      ? await encryptJson<CloudflareCredentialPayload>(
          {
            authType: input.authType,
            apiToken: input.apiToken,
            globalApiKey: input.globalApiKey,
          },
          getEncryptionSecret(env),
        )
      : current.credentialCiphertext

  const nextRecord: StoredAccountRecord = {
    ...current,
    name: input.name,
    email: input.email,
    authType: input.authType,
    enabled: input.enabled,
    note: input.note ?? '',
    updatedAt: new Date().toISOString(),
    credentialPreview:
      input.apiToken || input.globalApiKey
        ? buildCredentialPreview(input)
        : current.credentialPreview,
    credentialCiphertext: nextCredentialCiphertext,
  }

  await getRuntimeStore(env).put(buildAccountKey(userId, accountId), JSON.stringify(nextRecord))

  return sanitizeAccount(nextRecord)
}

export async function updateAccessibleAccount(
  env: EnvBindings,
  actor: AuthUser,
  accountId: string,
  input: CloudflareAccountInput,
): Promise<CloudflareAccount> {
  const { ownerUserId } = await getAccessibleStoredAccount(env, actor, accountId)
  return updateAccount(env, ownerUserId, accountId, input)
}

export async function deleteAccount(
  env: EnvBindings,
  userId: string,
  accountId: string,
): Promise<void> {
  await getStoredAccount(env, userId, accountId)
  await getRuntimeStore(env).delete(buildAccountKey(userId, accountId))
  await saveAccountIds(
    env,
    userId,
    (await getAccountIds(env, userId)).filter((id) => id !== accountId),
  )
}

export async function deleteAccessibleAccount(
  env: EnvBindings,
  actor: AuthUser,
  accountId: string,
): Promise<{ ownerUserId: string }> {
  const { ownerUserId } = await getAccessibleStoredAccount(env, actor, accountId)
  await deleteAccount(env, ownerUserId, accountId)
  return { ownerUserId }
}

export async function getAccountCredential(
  env: EnvBindings,
  userId: string,
  accountId: string,
): Promise<{ account: CloudflareAccount; credential: CloudflareCredentialPayload }> {
  const account = await getStoredAccount(env, userId, accountId)
  const credential = await decryptJson<CloudflareCredentialPayload>(
    account.credentialCiphertext,
    getEncryptionSecret(env),
  )

  return {
    account: sanitizeAccount(account),
    credential,
  }
}

export async function getAccessibleAccountCredential(
  env: EnvBindings,
  actor: AuthUser,
  accountId: string,
): Promise<{
  ownerUserId: string
  account: CloudflareAccount
  credential: CloudflareCredentialPayload
}> {
  const { ownerUserId, account } = await getAccessibleStoredAccount(env, actor, accountId)
  const credential = await decryptJson<CloudflareCredentialPayload>(
    account.credentialCiphertext,
    getEncryptionSecret(env),
  )

  return {
    ownerUserId,
    account: sanitizeAccount(account),
    credential,
  }
}

export async function touchAccountVerification(
  env: EnvBindings,
  userId: string,
  accountId: string,
): Promise<void> {
  const account = await getStoredAccount(env, userId, accountId)
  const updated: StoredAccountRecord = {
    ...account,
    lastVerifiedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  await getRuntimeStore(env).put(buildAccountKey(userId, accountId), JSON.stringify(updated))
}

export async function touchAccessibleAccountVerification(
  env: EnvBindings,
  actor: AuthUser,
  accountId: string,
): Promise<void> {
  const { ownerUserId } = await getAccessibleStoredAccount(env, actor, accountId)
  await touchAccountVerification(env, ownerUserId, accountId)
}

export async function saveZoneCache(
  env: EnvBindings,
  userId: string,
  payload: ZoneCacheSnapshot,
): Promise<void> {
  await getRuntimeStore(env).put(buildZoneCacheKey(userId), JSON.stringify(payload))
}

export async function getZoneCache(
  env: EnvBindings,
  userId: string,
): Promise<ZoneCacheSnapshot> {
  const raw = await getRuntimeStore(env).get(buildZoneCacheKey(userId))
  if (!raw) {
    return {
      items: [],
      syncedAt: '',
      totalAccounts: 0,
      totalZones: 0,
      failedAccounts: [],
    }
  }

  return JSON.parse(raw) as ZoneCacheSnapshot
}

export async function getAllZoneCaches(env: EnvBindings): Promise<ZoneCacheSnapshot> {
  const users = await listUsers(env)
  const snapshots = await Promise.all(users.map((user) => getZoneCache(env, user.id)))
  const items = snapshots
    .flatMap((snapshot) => snapshot.items)
    .sort((left, right) => left.name.localeCompare(right.name))
  const failedAccounts = snapshots.flatMap((snapshot) => snapshot.failedAccounts)

  return {
    items,
    syncedAt: snapshots
      .map((snapshot) => snapshot.syncedAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? '',
    totalAccounts: new Set(items.map((item) => item.accountId)).size,
    totalZones: items.length,
    failedAccounts,
  }
}

export async function getAccessibleZoneCache(
  env: EnvBindings,
  actor: AuthUser,
): Promise<ZoneCacheSnapshot> {
  if (canAccessAllAccounts(actor)) {
    return getAllZoneCaches(env)
  }

  return getZoneCache(env, actor.id)
}

export async function removeAccountFromZoneCache(
  env: EnvBindings,
  userId: string,
  accountId: string,
): Promise<void> {
  const current = await getZoneCache(env, userId)
  const nextItems = current.items.filter((item) => item.accountId !== accountId)

  await saveZoneCache(env, userId, {
    ...current,
    items: nextItems,
    totalZones: nextItems.length,
  })
}

export function mergeAccountZones(
  account: CloudflareAccount,
  zones: AccountZoneSummary[],
  syncedAt: string,
) {
  return zones.map((zone) => ({
    ...zone,
    accountId: account.id,
    accountName: account.name,
    accountEmail: account.email,
    syncedAt,
  }))
}
