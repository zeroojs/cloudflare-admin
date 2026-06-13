import {
  batchDeleteDnsRecords,
  batchToggleProxied,
  createDnsRecord,
  deleteDnsRecord,
  listDnsRecords,
  listZones,
  updateDnsRecord,
  verifyCloudflareAccount,
} from './cloudflare'
import { ApiError } from './errors'
import {
  sendAdminResetPasswordNotificationEmail,
  sendPasswordChangedNotificationEmail,
  sendPasswordResetCodeEmail,
  sendPasswordResetSuccessNotificationEmail,
  sendRegisterCodeEmail,
} from './mail'
import { applyRateLimit } from './rate-limit'
import { corsHeaders, getRequestId, jsonError, jsonSuccess } from './response'
import type { EnvBindings } from './store'
import {
  adminResetUserPassword,
  changeUserPassword,
  consumePasswordResetCode,
  consumeRegisterCode,
  createSession,
  createAccount,
  createUser,
  deleteSession,
  deleteAccessibleAccount,
  findUserByEmail,
  getAccessibleAccountCredential,
  getAccessibleStoredAccount,
  getAccessibleZoneCache,
  getRuntimeConfig,
  getUserBySessionToken,
  getRegisterCodeExpireMinutes,
  getRegisterCodeResendIntervalSeconds,
  isElevatedRole,
  isSuperAdminRole,
  listAccessibleAccounts,
  listUsers,
  removeAccountFromZoneCache,
  resetUserPasswordByEmail,
  savePasswordResetCode,
  saveRegisterCode,
  touchAccessibleAccountVerification,
  touchUserLastLogin,
  updateAccount,
  updateRuntimeConfig,
  updateUserRole,
  verifyUserCredentials,
} from './store'
import {
  validateAdminResetPasswordInput,
  validateChangePasswordInput,
  validateLoginInput,
  readJson,
  validateAccountInput,
  validateBatchDeletePayload,
  validateBatchProxiedPayload,
  validateDnsInput,
  validateDnsQuery,
  validateResetPasswordInput,
  validateSendPasswordResetCodeInput,
  validateRegisterInput,
  validateSendRegisterCodeInput,
  validateUpdateRuntimeConfigInput,
  validateUpdateUserRoleInput,
} from './validators'
import { syncAccountZoneCache, syncAllZoneCaches, syncZoneCache } from './zone-cache'

interface ScheduledControllerLike {
  cron: string
  scheduledTime: number
  type: string
}

interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void
}

function generateEmailCode(): string {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return String(value).padStart(6, '0')
}

function getAllowedOrigin(env: EnvBindings): string {
  return env.ALLOWED_ORIGIN || '*'
}

function getSessionToken(request: Request): string {
  const headerToken = request.headers.get('x-session-token')?.trim()
  if (headerToken) {
    return headerToken
  }

  const authorization = request.headers.get('authorization')?.trim()
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim()
  }

  return ''
}

async function requireUserAuth(env: EnvBindings, request: Request) {
  const token = getSessionToken(request)
  if (!token) {
    throw new ApiError(401, 'UNAUTHORIZED', '请先登录')
  }

  const user = await getUserBySessionToken(env, token)
  return {
    token,
    user,
  }
}

function requireAdminAccess(user: Awaited<ReturnType<typeof getUserBySessionToken>>): void {
  if (!isElevatedRole(user.role)) {
    throw new ApiError(403, 'FORBIDDEN', '仅管理员可访问')
  }
}

function requireSuperAdminAccess(user: Awaited<ReturnType<typeof getUserBySessionToken>>): void {
  if (!isSuperAdminRole(user.role)) {
    throw new ApiError(403, 'FORBIDDEN', '仅超级管理员可执行该操作')
  }
}

function filterVisibleUsers(
  actor: Awaited<ReturnType<typeof getUserBySessionToken>>,
  users: Awaited<ReturnType<typeof listUsers>>,
) {
  if (isSuperAdminRole(actor.role)) {
    return users
  }

  return users.filter((user) => user.role !== 'super_admin')
}

async function getManageableUser(
  env: EnvBindings,
  actor: Awaited<ReturnType<typeof getUserBySessionToken>>,
  userId: string,
) {
  const users = await listUsers(env)
  const targetUser = users.find((user) => user.id === userId)
  if (!targetUser) {
    throw new ApiError(404, 'USER_NOT_FOUND', '用户不存在')
  }

  if (targetUser.role === 'super_admin' && !isSuperAdminRole(actor.role)) {
    throw new ApiError(403, 'FORBIDDEN', '无权操作超级管理员账户')
  }

  return targetUser
}

async function getRoleEditableUser(
  env: EnvBindings,
  actor: Awaited<ReturnType<typeof getUserBySessionToken>>,
  userId: string,
) {
  const targetUser = await getManageableUser(env, actor, userId)

  if (targetUser.role === 'super_admin') {
    throw new ApiError(403, 'FORBIDDEN', '超级管理员的角色信息不可修改')
  }

  return targetUser
}

async function handleAccounts(
  env: EnvBindings,
  user: Awaited<ReturnType<typeof getUserBySessionToken>>,
  request: Request,
  requestId: string,
  accountId?: string,
  action?: string,
): Promise<Response> {
  if (request.method === 'GET' && !accountId) {
    return jsonSuccess(await listAccessibleAccounts(env, user), requestId)
  }

  if (request.method === 'POST' && !accountId) {
    const input = validateAccountInput(await readJson(request))
    const createdAccount = await createAccount(env, user.id, input)
    await syncAccountZoneCache(env, user.id, createdAccount.id)
    return jsonSuccess(createdAccount, requestId, {
      status: 201,
    })
  }

  if (request.method === 'PUT' && accountId) {
    const input = validateAccountInput(await readJson(request), {
      requireCredential: false,
    })
    const { ownerUserId } = await getAccessibleStoredAccount(env, user, accountId)
    const updatedAccount = await updateAccount(env, ownerUserId, accountId, input)
    await syncAccountZoneCache(env, ownerUserId, accountId)
    return jsonSuccess(updatedAccount, requestId)
  }

  if (request.method === 'DELETE' && accountId) {
    const { ownerUserId } = await deleteAccessibleAccount(env, user, accountId)
    await removeAccountFromZoneCache(env, ownerUserId, accountId)
    return jsonSuccess({ deleted: true }, requestId)
  }

  if (request.method === 'POST' && accountId && action === 'verify') {
    const { account, credential } = await getAccessibleAccountCredential(env, user, accountId)
    const result = await verifyCloudflareAccount(account, credential)
    await touchAccessibleAccountVerification(env, user, accountId)
    return jsonSuccess(result, requestId)
  }

  if (request.method === 'GET' && accountId && action === 'zones') {
    const { account, credential } = await getAccessibleAccountCredential(env, user, accountId)
    return jsonSuccess(await listZones(account, credential), requestId)
  }

  throw new ApiError(405, 'METHOD_NOT_ALLOWED', '请求方法不支持')
}

async function handleZoneCache(
  env: EnvBindings,
  user: Awaited<ReturnType<typeof getUserBySessionToken>>,
  request: Request,
  requestId: string,
  action?: string,
): Promise<Response> {
  if (request.method === 'GET' && !action) {
    return jsonSuccess(await getAccessibleZoneCache(env, user), requestId)
  }

  if (request.method === 'POST' && action === 'sync') {
    if (isElevatedRole(user.role)) {
      await syncAllZoneCaches(env)
      return jsonSuccess(await getAccessibleZoneCache(env, user), requestId)
    }

    return jsonSuccess(await syncZoneCache(env, user.id), requestId)
  }

  throw new ApiError(405, 'METHOD_NOT_ALLOWED', '请求方法不支持')
}

async function handleDnsRecords(
  env: EnvBindings,
  user: Awaited<ReturnType<typeof getUserBySessionToken>>,
  request: Request,
  url: URL,
  requestId: string,
  recordId?: string,
  action?: string,
): Promise<Response> {
  if (request.method === 'GET' && !recordId) {
    const query = validateDnsQuery(url)
    const { account, credential } = await getAccessibleAccountCredential(env, user, query.accountId)
    return jsonSuccess(await listDnsRecords(account, credential, query), requestId)
  }

  if (request.method === 'POST' && !recordId) {
    const payload = await readJson<{
      accountId: string
      zoneId: string
      record: unknown
    }>(request)
    const { account, credential } = await getAccessibleAccountCredential(
      env,
      user,
      payload.accountId,
    )
    const record = validateDnsInput(payload.record as Record<string, unknown>)
    return jsonSuccess(
      await createDnsRecord(account, credential, payload.zoneId, record),
      requestId,
      { status: 201 },
    )
  }

  if (request.method === 'PUT' && recordId) {
    const payload = await readJson<{
      accountId: string
      zoneId: string
      record: unknown
    }>(request)
    const { account, credential } = await getAccessibleAccountCredential(
      env,
      user,
      payload.accountId,
    )
    const record = validateDnsInput(payload.record as Record<string, unknown>)
    return jsonSuccess(
      await updateDnsRecord(account, credential, payload.zoneId, recordId, record),
      requestId,
    )
  }

  if (request.method === 'DELETE' && recordId) {
    const accountId = url.searchParams.get('accountId') ?? ''
    const zoneId = url.searchParams.get('zoneId') ?? ''
    const { account, credential } = await getAccessibleAccountCredential(env, user, accountId)
    await deleteDnsRecord(account, credential, zoneId, recordId)
    return jsonSuccess({ deleted: true }, requestId)
  }

  if (request.method === 'POST' && action === 'batch-delete') {
    const payload = validateBatchDeletePayload(await readJson(request))
    const { account, credential } = await getAccessibleAccountCredential(
      env,
      user,
      payload.accountId,
    )
    return jsonSuccess(
      await batchDeleteDnsRecords(account, credential, payload),
      requestId,
    )
  }

  if (request.method === 'POST' && action === 'batch-proxied') {
    const payload = validateBatchProxiedPayload(await readJson(request))
    const { account, credential } = await getAccessibleAccountCredential(
      env,
      user,
      payload.accountId,
    )
    return jsonSuccess(
      await batchToggleProxied(account, credential, payload),
      requestId,
    )
  }

  throw new ApiError(405, 'METHOD_NOT_ALLOWED', '请求方法不支持')
}

async function handleAuth(
  env: EnvBindings,
  request: Request,
  requestId: string,
  action?: string,
): Promise<Response> {
  if (request.method === 'POST' && action === 'register-code') {
    const input = validateSendRegisterCodeInput(await readJson(request))
    const existingUser = await findUserByEmail(env, input.email)
    if (existingUser) {
      throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', '该邮箱已注册')
    }

    const code = generateEmailCode()
    await saveRegisterCode(env, input.email, code)
    await sendRegisterCodeEmail(
      env,
      input.email,
      code,
      getRegisterCodeExpireMinutes(env),
    )

    return jsonSuccess(
      {
        sent: true,
        email: input.email,
        expiresInSeconds: getRegisterCodeExpireMinutes(env) * 60,
        retryAfterSeconds: getRegisterCodeResendIntervalSeconds(env),
      },
      requestId,
    )
  }

  if (request.method === 'POST' && action === 'password-reset-code') {
    const input = validateSendPasswordResetCodeInput(await readJson(request))
    const existingUser = await findUserByEmail(env, input.email)
    if (!existingUser) {
      throw new ApiError(404, 'USER_NOT_FOUND', '该邮箱尚未注册')
    }

    const code = generateEmailCode()
    await savePasswordResetCode(env, input.email, code)
    await sendPasswordResetCodeEmail(
      env,
      input.email,
      code,
      getRegisterCodeExpireMinutes(env),
    )

    return jsonSuccess(
      {
        sent: true,
        email: input.email,
        expiresInSeconds: getRegisterCodeExpireMinutes(env) * 60,
        retryAfterSeconds: getRegisterCodeResendIntervalSeconds(env),
      },
      requestId,
    )
  }

  if (request.method === 'POST' && action === 'register') {
    const input = validateRegisterInput(await readJson(request))
    await consumeRegisterCode(env, input.email, input.emailCode)
    const user = await createUser(env, input)
    const session = await createSession(env, user)
    return jsonSuccess(session, requestId, { status: 201 })
  }

  if (request.method === 'POST' && action === 'login') {
    const input = validateLoginInput(await readJson(request))
    const user = await verifyUserCredentials(env, input)
    const nextUser = await touchUserLastLogin(env, user.id)
    const session = await createSession(env, nextUser)
    return jsonSuccess(session, requestId)
  }

  if (request.method === 'POST' && action === 'password-reset') {
    const input = validateResetPasswordInput(await readJson(request))
    await consumePasswordResetCode(env, input.email, input.emailCode)
    const updatedUser = await resetUserPasswordByEmail(env, input)
    await sendPasswordResetSuccessNotificationEmail(env, updatedUser.email)
    return jsonSuccess({ reset: true }, requestId)
  }

  if (request.method === 'POST' && action === 'change-password') {
    const { user } = await requireUserAuth(env, request)
    const input = validateChangePasswordInput(await readJson(request))
    const updatedUser = await changeUserPassword(env, user.id, input)
    await sendPasswordChangedNotificationEmail(env, updatedUser.email)
    return jsonSuccess({ changed: true }, requestId)
  }

  if (request.method === 'GET' && action === 'me') {
    const { user } = await requireUserAuth(env, request)
    return jsonSuccess(user, requestId)
  }

  if (request.method === 'POST' && action === 'logout') {
    const { token } = await requireUserAuth(env, request)
    await deleteSession(env, token)
    return jsonSuccess({ loggedOut: true }, requestId)
  }

  throw new ApiError(405, 'METHOD_NOT_ALLOWED', '请求方法不支持')
}

async function handleUsers(
  env: EnvBindings,
  actor: Awaited<ReturnType<typeof getUserBySessionToken>>,
  request: Request,
  requestId: string,
  userId?: string,
  action?: string,
): Promise<Response> {
  requireAdminAccess(actor)

  if (request.method === 'GET' && !userId) {
    return jsonSuccess(filterVisibleUsers(actor, await listUsers(env)), requestId)
  }

  if (request.method === 'PUT' && userId && action === 'role') {
    requireSuperAdminAccess(actor)
    await getRoleEditableUser(env, actor, userId)
    const input = validateUpdateUserRoleInput(await readJson(request))
    const updatedUser = await updateUserRole(env, userId, input.role)
    return jsonSuccess(updatedUser, requestId)
  }

  if (request.method === 'PUT' && userId && action === 'reset-password') {
    await getManageableUser(env, actor, userId)
    const input = validateAdminResetPasswordInput(await readJson(request))
    const updatedUser = await adminResetUserPassword(env, userId, input.newPassword)
    await sendAdminResetPasswordNotificationEmail(env, updatedUser.email, actor.email)
    return jsonSuccess({ reset: true }, requestId)
  }

  throw new ApiError(405, 'METHOD_NOT_ALLOWED', '请求方法不支持')
}

async function handleRuntimeConfig(
  env: EnvBindings,
  request: Request,
  url: URL,
  requestId: string,
  actor?: Awaited<ReturnType<typeof getUserBySessionToken>>,
): Promise<Response> {
  if (request.method === 'GET') {
    return jsonSuccess(await getRuntimeConfig(env, url.origin), requestId)
  }

  if (request.method === 'PUT') {
    if (!actor) {
      throw new ApiError(401, 'UNAUTHORIZED', '请先登录')
    }

    requireAdminAccess(actor)
    const input = validateUpdateRuntimeConfigInput(await readJson(request))
    return jsonSuccess(await updateRuntimeConfig(env, input.apiBaseUrl), requestId)
  }

  throw new ApiError(405, 'METHOD_NOT_ALLOWED', '请求方法不支持')
}

export async function handleRequest(
  request: Request,
  env: EnvBindings,
): Promise<Response> {
  const requestId = getRequestId(request)
  const origin = getAllowedOrigin(env)

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    })
  }

  try {
    const url = new URL(request.url)
    const { pathname } = url

    if (pathname === '/api/health') {
      return jsonSuccess({ ok: true }, requestId, {
        headers: corsHeaders(origin),
      })
    }

    if (pathname === '/api/runtime-config' && request.method === 'GET') {
      return handleRuntimeConfig(env, request, url, requestId)
    }

    applyRateLimit(env, request, pathname)

    let response: Response
    const authMatch = pathname.match(/^\/api\/auth\/?([^/]+)?$/)
    const accountMatch = pathname.match(/^\/api\/accounts\/?([^/]+)?\/?([^/]+)?$/)
    const dnsMatch = pathname.match(/^\/api\/dns-records\/?([^/]+)?$/)
    const userMatch = pathname.match(/^\/api\/users\/?([^/]+)?\/?([^/]+)?$/)
    const zoneCacheMatch = pathname.match(/^\/api\/zones-cache\/?([^/]+)?$/)

    if (
      pathname === '/api/auth/register' ||
      pathname === '/api/auth/login' ||
      pathname === '/api/auth/register-code' ||
      pathname === '/api/auth/password-reset-code' ||
      pathname === '/api/auth/password-reset'
    ) {
      response = await handleAuth(env, request, requestId, authMatch?.[1])
    } else if (
      pathname === '/api/auth/me' ||
      pathname === '/api/auth/logout' ||
      pathname === '/api/auth/change-password'
    ) {
      response = await handleAuth(env, request, requestId, authMatch?.[1])
    } else {
      const authContext = await requireUserAuth(env, request)
      const user = authContext.user

      if (pathname === '/api/accounts') {
        response = await handleAccounts(env, user, request, requestId)
      } else if (pathname === '/api/runtime-config') {
        response = await handleRuntimeConfig(env, request, url, requestId, user)
      } else if (accountMatch) {
        response = await handleAccounts(
          env,
          user,
          request,
          requestId,
          accountMatch[1],
          accountMatch[2],
        )
      } else if (pathname === '/api/dns-records') {
        response = await handleDnsRecords(env, user, request, url, requestId)
      } else if (pathname === '/api/dns-records/batch-delete') {
        response = await handleDnsRecords(
          env,
          user,
          request,
          url,
          requestId,
          undefined,
          'batch-delete',
        )
      } else if (pathname === '/api/dns-records/batch-proxied') {
        response = await handleDnsRecords(
          env,
          user,
          request,
          url,
          requestId,
          undefined,
          'batch-proxied',
        )
      } else if (dnsMatch?.[1]) {
        response = await handleDnsRecords(
          env,
          user,
          request,
          url,
          requestId,
          dnsMatch[1],
        )
      } else if (pathname === '/api/users') {
        response = await handleUsers(env, user, request, requestId)
      } else if (userMatch?.[1]) {
        response = await handleUsers(env, user, request, requestId, userMatch[1], userMatch[2])
      } else if (pathname === '/api/zones-cache') {
        response = await handleZoneCache(env, user, request, requestId)
      } else if (zoneCacheMatch?.[1]) {
        response = await handleZoneCache(env, user, request, requestId, zoneCacheMatch[1])
      } else {
        throw new ApiError(404, 'NOT_FOUND', '接口不存在')
      }
    }

    const headers = new Headers(response.headers)
    Object.entries(corsHeaders(origin)).forEach(([key, value]) =>
      headers.set(key, value),
    )
    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (error) {
    return jsonError(error, requestId, {
      headers: corsHeaders(origin),
    })
  }
}

export default {
  fetch(request: Request, env: EnvBindings): Promise<Response> {
    return handleRequest(request, env)
  },
  scheduled(
    controller: ScheduledControllerLike,
    env: EnvBindings,
    ctx: ExecutionContextLike,
  ): void {
    if (controller.cron === '0 19 * * *') {
      ctx.waitUntil(syncAllZoneCaches(env))
      return
    }

    ctx.waitUntil(syncAllZoneCaches(env))
  },
}
