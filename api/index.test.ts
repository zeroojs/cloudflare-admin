import { beforeEach, describe, expect, it, vi } from 'vitest'

import { handleRequest } from './index'
import type { EnvBindings, KvLikeStore } from './store'

function createMemoryKv(): { store: Map<string, string>; binding: KvLikeStore } {
  const store = new Map<string, string>()

  return {
    store,
    binding: {
      async get(key) {
        return store.get(key) ?? null
      },
      async put(key, value) {
        store.set(key, value)
      },
      async delete(key) {
        store.delete(key)
      },
    },
  }
}

function createEnv(binding: KvLikeStore): EnvBindings {
  return {
    ACCOUNT_STORE: binding,
    ENCRYPTION_SECRET: 'test-secret',
    SUPER_ADMIN_EMAIL: 'wlittleyang@163.com',
    MAIL_API_TOKEN: 'mail-api-token',
    MAIL_API_CUSTOM_AUTH: 'mail-custom-auth',
    MAIL_API_URL: 'https://tmapi.wxin.org/api/send_mail',
    MAIL_FROM_NAME: 'Cloudflare Admin',
    MAIL_CODE_EXPIRE_MINUTES: '10',
    MAIL_CODE_RESEND_INTERVAL_SECONDS: '60',
  }
}

function buildSessionHeaders(token?: string, contentType = false): HeadersInit {
  return {
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'x-session-token': token } : {}),
  }
}

function createMailSendSuccessResponse() {
  return new Response(
    JSON.stringify({
      success: true,
      message: 'ok',
    }),
    { status: 200 },
  )
}

function createMailAssertionFetch(
  assertBody: (body: Record<string, unknown>) => void,
) {
  return createMockFetch((url, init) => {
    if (url === 'https://tmapi.wxin.org/api/send_mail') {
      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}
      assertBody(body)
      return createMailSendSuccessResponse()
    }

    throw new Error(`Unhandled fetch: ${url}`)
  })
}

function createMockFetch(
  handler?: (url: string, init?: RequestInit) => Promise<Response> | Response,
) {
  return vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

    if (url === 'https://tmapi.wxin.org/api/send_mail') {
      const headers = new Headers(init?.headers)
      expect(headers.get('Authorization')).toBe('Bearer mail-api-token')
      expect(headers.get('x-custom-auth')).toBe('mail-custom-auth')
      expect(headers.get('Content-Type')).toBe('application/json')

      const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}
      expect(body.token).toBeUndefined()
      expect(body.to_mail).toBeTruthy()
      expect(body.is_html).toBe(true)
      expect(String(body.content)).toContain('Cloudflare Admin')
      return createMailSendSuccessResponse()
    }

    if (handler) {
      return await handler(url, init)
    }

    throw new Error(`Unhandled fetch: ${url}`)
  })
}

function getRegisterCodeFromStore(store: Map<string, string>, email: string): string {
  const raw = store.get(`auth-register-code:${email}`)
  if (!raw) {
    throw new Error(`Missing register code for ${email}`)
  }

  const payload = JSON.parse(raw) as { code: string }
  return payload.code
}

function getPasswordResetCodeFromStore(store: Map<string, string>, email: string): string {
  const raw = store.get(`auth-password-reset-code:${email}`)
  if (!raw) {
    throw new Error(`Missing password reset code for ${email}`)
  }

  const payload = JSON.parse(raw) as { code: string }
  return payload.code
}

async function registerUser(
  store: Map<string, string>,
  env: EnvBindings,
  email: string,
  password = 'password-123',
): Promise<{ token: string; user: { id: string; email: string } }> {
  vi.stubGlobal('fetch', createMockFetch())

  const sendCodeResponse = await handleRequest(
    new Request('https://example.com/api/auth/register-code', {
      method: 'POST',
      headers: buildSessionHeaders(undefined, true),
      body: JSON.stringify({
        email,
      }),
    }),
    env,
  )
  expect(sendCodeResponse.status).toBe(200)

  const emailCode = getRegisterCodeFromStore(store, email)

  const response = await handleRequest(
    new Request('https://example.com/api/auth/register', {
      method: 'POST',
      headers: buildSessionHeaders(undefined, true),
      body: JSON.stringify({
        email,
        password,
        emailCode,
      }),
    }),
    env,
  )
  const payload = await response.json()

  return payload.data
}

describe('handleRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('预检请求允许前端会话请求头', async () => {
    const { binding } = createMemoryKv()
    const env = createEnv(binding)

    const response = await handleRequest(
      new Request('https://example.com/api/accounts', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://cloudflare-admin-6pp.pages.dev',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'x-session-token,content-type',
        },
      }),
      env,
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-Session-Token')
  })

  it('公开运行时配置默认返回当前 Worker 地址', async () => {
    const { binding } = createMemoryKv()
    const env = createEnv(binding)

    const response = await handleRequest(
      new Request('https://cloudflare-admin-worker.cf-f47.workers.dev/api/runtime-config'),
      env,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.apiBaseUrl).toBe('https://cloudflare-admin-worker.cf-f47.workers.dev')
  })

  it('管理员可更新运行时 API 地址配置并写入 KV', async () => {
    const { store, binding } = createMemoryKv()
    const env = createEnv(binding)
    const superAdmin = await registerUser(store, env, 'wlittleyang@163.com')

    const updateResponse = await handleRequest(
      new Request('https://example.com/api/runtime-config', {
        method: 'PUT',
        headers: buildSessionHeaders(superAdmin.token, true),
        body: JSON.stringify({
          apiBaseUrl: 'https://api.example.com/',
        }),
      }),
      env,
    )
    const updatePayload = await updateResponse.json()

    expect(updateResponse.status).toBe(200)
    expect(updatePayload.success).toBe(true)
    expect(updatePayload.data.apiBaseUrl).toBe('https://api.example.com')
    expect(updatePayload.data.updatedAt).toBeTruthy()

    const readResponse = await handleRequest(
      new Request('https://example.com/api/runtime-config'),
      env,
    )
    const readPayload = await readResponse.json()

    expect(readResponse.status).toBe(200)
    expect(readPayload.data.apiBaseUrl).toBe('https://api.example.com')
  })

  it('未配置持久化 KV 时返回明确错误', async () => {
    const response = await handleRequest(
      new Request('https://example.com/api/auth/register-code', {
        method: 'POST',
        headers: buildSessionHeaders(undefined, true),
        body: JSON.stringify({
          email: 'missing@example.com',
        }),
      }),
      {
        ENCRYPTION_SECRET: 'test-secret',
        SUPER_ADMIN_EMAIL: 'wlittleyang@163.com',
        MAIL_API_TOKEN: 'mail-api-token',
        MAIL_API_CUSTOM_AUTH: 'mail-custom-auth',
        MAIL_API_URL: 'https://tmapi.wxin.org/api/send_mail',
      },
    )

    expect(response.status).toBe(500)
    const payload = await response.json()
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('ACCOUNT_STORE_NOT_CONFIGURED')
  })

  it('支持邮箱注册并返回当前登录用户信息', async () => {
    const { store, binding } = createMemoryKv()
    const env = createEnv(binding)

    const session = await registerUser(store, env, 'owner@example.com')

    expect(session.user.email).toBe('owner@example.com')
    expect(session.token).toBeTruthy()

    const meResponse = await handleRequest(
      new Request('https://example.com/api/auth/me', {
        headers: buildSessionHeaders(session.token),
      }),
      env,
    )
    const mePayload = await meResponse.json()

    expect(meResponse.status).toBe(200)
    expect(mePayload.success).toBe(true)
    expect(mePayload.data.email).toBe('owner@example.com')
    expect(mePayload.data.role).toBe('user')
  })

  it('默认超级管理员可查看所有用户并分配管理员角色', async () => {
    const { store, binding } = createMemoryKv()
    const env = createEnv(binding)
    const superAdmin = await registerUser(store, env, 'wlittleyang@163.com')
    const normalUser = await registerUser(store, env, 'member@example.com')

    const listUsersResponse = await handleRequest(
      new Request('https://example.com/api/users', {
        headers: buildSessionHeaders(superAdmin.token),
      }),
      env,
    )
    const listUsersPayload = await listUsersResponse.json()

    expect(listUsersResponse.status).toBe(200)
    expect(listUsersPayload.data).toHaveLength(2)
    expect(listUsersPayload.data[0].role).toBeTruthy()
    expect(listUsersPayload.data.find((item: { email: string }) => item.email === 'wlittleyang@163.com').role).toBe('super_admin')

    const updateRoleResponse = await handleRequest(
      new Request(`https://example.com/api/users/${normalUser.user.id}/role`, {
        method: 'PUT',
        headers: buildSessionHeaders(superAdmin.token, true),
        body: JSON.stringify({
          role: 'admin',
        }),
      }),
      env,
    )
    const updateRolePayload = await updateRoleResponse.json()

    expect(updateRoleResponse.status).toBe(200)
    expect(updateRolePayload.data.role).toBe('admin')

    const adminListUsersResponse = await handleRequest(
      new Request('https://example.com/api/users', {
        headers: buildSessionHeaders(normalUser.token),
      }),
      env,
    )
    const adminListUsersPayload = await adminListUsersResponse.json()
    expect(adminListUsersResponse.status).toBe(200)
    expect(
      adminListUsersPayload.data.find(
        (item: { email: string }) => item.email === 'wlittleyang@163.com',
      ),
    ).toBeUndefined()
  })

  it('只有超级管理员登录时用户列表才显示超级管理员', async () => {
    const { store, binding } = createMemoryKv()
    const env = createEnv(binding)
    const superAdmin = await registerUser(store, env, 'wlittleyang@163.com')
    const normalUser = await registerUser(store, env, 'member@example.com')

    await handleRequest(
      new Request(`https://example.com/api/users/${normalUser.user.id}/role`, {
        method: 'PUT',
        headers: buildSessionHeaders(superAdmin.token, true),
        body: JSON.stringify({
          role: 'admin',
        }),
      }),
      env,
    )

    const superAdminListResponse = await handleRequest(
      new Request('https://example.com/api/users', {
        headers: buildSessionHeaders(superAdmin.token),
      }),
      env,
    )
    const superAdminListPayload = await superAdminListResponse.json()
    expect(superAdminListResponse.status).toBe(200)
    expect(
      superAdminListPayload.data.find(
        (item: { email: string }) => item.email === 'wlittleyang@163.com',
      ),
    ).toBeTruthy()

    const adminLoginResponse = await handleRequest(
      new Request('https://example.com/api/auth/login', {
        method: 'POST',
        headers: buildSessionHeaders(undefined, true),
        body: JSON.stringify({
          email: 'member@example.com',
          password: 'password-123',
        }),
      }),
      env,
    )
    const adminLoginPayload = await adminLoginResponse.json()
    expect(adminLoginResponse.status).toBe(200)

    const adminListResponse = await handleRequest(
      new Request('https://example.com/api/users', {
        headers: buildSessionHeaders(adminLoginPayload.data.token),
      }),
      env,
    )
    const adminListPayload = await adminListResponse.json()
    expect(adminListResponse.status).toBe(200)
    expect(
      adminListPayload.data.find(
        (item: { email: string }) => item.email === 'wlittleyang@163.com',
      ),
    ).toBeUndefined()
  })

  it('超级管理员的角色信息谁也不能修改', async () => {
    const { store, binding } = createMemoryKv()
    const env = createEnv(binding)
    const superAdmin = await registerUser(store, env, 'wlittleyang@163.com')

    const updateRoleResponse = await handleRequest(
      new Request(`https://example.com/api/users/${superAdmin.user.id}/role`, {
        method: 'PUT',
        headers: buildSessionHeaders(superAdmin.token, true),
        body: JSON.stringify({
          role: 'admin',
        }),
      }),
      env,
    )
    const updateRolePayload = await updateRoleResponse.json()

    expect(updateRoleResponse.status).toBe(403)
    expect(updateRolePayload.error.message).toBe('超级管理员的角色信息不可修改')
  })

  it('加密存储账户凭证并按登录用户隔离账户列表', async () => {
    const { store, binding } = createMemoryKv()
    const env = createEnv(binding)
    const firstUser = await registerUser(store, env, 'admin@example.com')
    const secondUser = await registerUser(store, env, 'viewer@example.com')

    const createResponse = await handleRequest(
      new Request('https://example.com/api/accounts', {
        method: 'POST',
        headers: buildSessionHeaders(firstUser.token, true),
        body: JSON.stringify({
          name: '主账户',
          email: 'admin@example.com',
          authType: 'apiToken',
          apiToken: 'secret-token-1234',
          enabled: true,
        }),
      }),
      env,
    )

    expect(createResponse.status).toBe(201)
    const createPayload = await createResponse.json()
    expect(createPayload.success).toBe(true)
    expect(createPayload.data.credentialPreview).toBe('Token ****1234')
    expect(createPayload.data.ownerUserId).toBe(firstUser.user.id)

    const savedRaw = Array.from(store.values()).find((item) =>
      item.includes('credentialCiphertext'),
    )
    expect(savedRaw).toBeTruthy()
    expect(savedRaw).not.toContain('secret-token-1234')

    const listResponse = await handleRequest(
      new Request('https://example.com/api/accounts', {
        headers: buildSessionHeaders(firstUser.token),
      }),
      env,
    )
    const listPayload = await listResponse.json()

    expect(listPayload.success).toBe(true)
    expect(listPayload.data).toHaveLength(1)
    expect(listPayload.data[0].credentialPreview).toBe('Token ****1234')

    const isolatedResponse = await handleRequest(
      new Request('https://example.com/api/accounts', {
        headers: buildSessionHeaders(secondUser.token),
      }),
      env,
    )
    const isolatedPayload = await isolatedResponse.json()

    expect(isolatedPayload.success).toBe(true)
    expect(isolatedPayload.data).toHaveLength(0)
  })

  it('支持 DNS 记录查询与关键字筛选', async () => {
    const { store, binding } = createMemoryKv()
    const env = createEnv(binding)
    const session = await registerUser(store, env, 'ops@example.com')

    const createResponse = await handleRequest(
      new Request('https://example.com/api/accounts', {
        method: 'POST',
        headers: buildSessionHeaders(session.token, true),
        body: JSON.stringify({
          name: '运营账户',
          email: 'ops@example.com',
          authType: 'apiToken',
          apiToken: 'token-0000',
          enabled: true,
        }),
      }),
      env,
    )
    const createPayload = await createResponse.json()
    const accountId = createPayload.data.id as string

    vi.stubGlobal(
      'fetch',
      createMockFetch(() =>
        new Response(
          JSON.stringify({
            success: true,
            errors: [],
            messages: [],
            result: [
              {
                id: 'record-1',
                type: 'A',
                name: 'api.example.com',
                content: '1.1.1.1',
                ttl: 120,
                proxied: true,
              },
              {
                id: 'record-2',
                type: 'A',
                name: 'www.example.com',
                content: '1.1.1.2',
                ttl: 120,
                proxied: false,
              },
            ],
            result_info: {
              page: 1,
              per_page: 20,
              total_count: 2,
            },
          }),
          { status: 200 },
        ),
      ),
    )

    const response = await handleRequest(
      new Request(
        `https://example.com/api/dns-records?accountId=${accountId}&zoneId=zone-1&page=1&pageSize=20&keyword=api`,
        {
          headers: buildSessionHeaders(session.token),
        },
      ),
      env,
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.data.items).toHaveLength(1)
    expect(payload.data.items[0].name).toBe('api.example.com')
  })

  it('支持手动同步域名缓存', async () => {
    const { store, binding } = createMemoryKv()
    const env = createEnv(binding)
    const firstUser = await registerUser(store, env, 'sync@example.com')
    const secondUser = await registerUser(store, env, 'isolated@example.com')

    const createResponse = await handleRequest(
      new Request('https://example.com/api/accounts', {
        method: 'POST',
        headers: buildSessionHeaders(firstUser.token, true),
        body: JSON.stringify({
          name: '同步账户',
          email: 'sync@example.com',
          authType: 'apiToken',
          apiToken: 'token-sync-0000',
          enabled: true,
        }),
      }),
      env,
    )
    const createPayload = await createResponse.json()
    const accountId = createPayload.data.id as string

    vi.stubGlobal(
      'fetch',
      createMockFetch(() =>
        new Response(
          JSON.stringify({
            success: true,
            errors: [],
            messages: [],
            result: [
              {
                id: 'zone-1',
                name: 'example.com',
                status: 'active',
                paused: false,
                type: 'full',
                plan: { name: 'Pro Website' },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    )

    const syncResponse = await handleRequest(
      new Request('https://example.com/api/zones-cache/sync', {
        method: 'POST',
        headers: buildSessionHeaders(firstUser.token),
      }),
      env,
    )
    const syncPayload = await syncResponse.json()

    expect(syncResponse.status).toBe(200)
    expect(syncPayload.success).toBe(true)
    expect(syncPayload.data.totalAccounts).toBe(1)
    expect(syncPayload.data.totalZones).toBe(1)
    expect(syncPayload.data.items[0].accountId).toBe(accountId)
    expect(syncPayload.data.items[0].accountEmail).toBe('sync@example.com')
    expect(syncPayload.data.items[0].planName).toBe('Pro')

    const listResponse = await handleRequest(
      new Request('https://example.com/api/zones-cache', {
        headers: buildSessionHeaders(firstUser.token),
      }),
      env,
    )
    const listPayload = await listResponse.json()

    expect(listPayload.success).toBe(true)
    expect(listPayload.data.items).toHaveLength(1)
    expect(listPayload.data.items[0].name).toBe('example.com')

    const isolatedResponse = await handleRequest(
      new Request('https://example.com/api/zones-cache', {
        headers: buildSessionHeaders(secondUser.token),
      }),
      env,
    )
    const isolatedPayload = await isolatedResponse.json()

    expect(isolatedPayload.success).toBe(true)
    expect(isolatedPayload.data.items).toHaveLength(0)
  })

  it('新增账户成功后会自动同步当前账户的域名缓存', async () => {
    const { store, binding } = createMemoryKv()
    const env = createEnv(binding)
    const session = await registerUser(store, env, 'auto-sync@example.com')
    vi.stubGlobal(
      'fetch',
      createMockFetch((url) => {
        if (url === 'https://api.cloudflare.com/client/v4/zones?per_page=100') {
          return new Response(
            JSON.stringify({
              success: true,
              errors: [],
              messages: [],
              result: [
                {
                  id: 'zone-auto-1',
                  name: 'auto-sync-example.com',
                  status: 'active',
                  paused: false,
                  type: 'full',
                  plan: { name: 'Business Website' },
                },
              ],
            }),
            { status: 200 },
          )
        }

        throw new Error(`Unhandled fetch: ${url}`)
      }),
    )

    const createResponse = await handleRequest(
      new Request('https://example.com/api/accounts', {
        method: 'POST',
        headers: buildSessionHeaders(session.token, true),
        body: JSON.stringify({
          name: '自动同步账户',
          email: 'auto-sync@example.com',
          authType: 'apiToken',
          apiToken: 'token-auto-1234',
          enabled: true,
        }),
      }),
      env,
    )
    expect(createResponse.status).toBe(201)

    const cacheResponse = await handleRequest(
      new Request('https://example.com/api/zones-cache', {
        headers: buildSessionHeaders(session.token),
      }),
      env,
    )
    const cachePayload = await cacheResponse.json()

    expect(cacheResponse.status).toBe(200)
    expect(cachePayload.data.totalAccounts).toBe(1)
    expect(cachePayload.data.totalZones).toBe(1)
    expect(cachePayload.data.items[0].name).toBe('auto-sync-example.com')
    expect(cachePayload.data.items[0].planName).toBe('Business')
  })

  it('编辑账户成功后会自动刷新该账户的域名缓存', async () => {
    const { store, binding } = createMemoryKv()
    const env = createEnv(binding)
    const session = await registerUser(store, env, 'refresh-sync@example.com')
    vi.stubGlobal(
      'fetch',
      createMockFetch((url) => {
        if (url === 'https://api.cloudflare.com/client/v4/zones?per_page=100') {
          return new Response(
            JSON.stringify({
              success: true,
              errors: [],
              messages: [],
              result: [
                {
                  id: 'zone-refresh-old',
                  name: 'old-refresh-example.com',
                  status: 'active',
                  paused: false,
                  type: 'full',
                  plan: { name: 'Free Website' },
                },
              ],
            }),
            { status: 200 },
          )
        }

        throw new Error(`Unhandled fetch: ${url}`)
      }),
    )

    const createResponse = await handleRequest(
      new Request('https://example.com/api/accounts', {
        method: 'POST',
        headers: buildSessionHeaders(session.token, true),
        body: JSON.stringify({
          name: '旧账户名',
          email: 'refresh-sync@example.com',
          authType: 'apiToken',
          apiToken: 'token-refresh-1234',
          enabled: true,
        }),
      }),
      env,
    )
    const createPayload = await createResponse.json()
    const accountId = createPayload.data.id as string

    vi.stubGlobal(
      'fetch',
      createMockFetch((url) => {
        if (url === 'https://api.cloudflare.com/client/v4/zones?per_page=100') {
          return new Response(
            JSON.stringify({
              success: true,
              errors: [],
              messages: [],
              result: [
                {
                  id: 'zone-refresh-1',
                  name: 'refresh-example.com',
                  status: 'active',
                  paused: false,
                  type: 'full',
                  plan: { name: 'Pro Website' },
                },
              ],
            }),
            { status: 200 },
          )
        }

        throw new Error(`Unhandled fetch: ${url}`)
      }),
    )

    const updateResponse = await handleRequest(
      new Request(`https://example.com/api/accounts/${accountId}`, {
        method: 'PUT',
        headers: buildSessionHeaders(session.token, true),
        body: JSON.stringify({
          name: '新账户名',
          email: 'updated@example.com',
          authType: 'apiToken',
          enabled: true,
        }),
      }),
      env,
    )
    expect(updateResponse.status).toBe(200)

    const cacheResponse = await handleRequest(
      new Request('https://example.com/api/zones-cache', {
        headers: buildSessionHeaders(session.token),
      }),
      env,
    )
    const cachePayload = await cacheResponse.json()

    expect(cacheResponse.status).toBe(200)
    expect(cachePayload.data.totalZones).toBe(1)
    expect(cachePayload.data.items[0].accountName).toBe('新账户名')
    expect(cachePayload.data.items[0].accountEmail).toBe('updated@example.com')
    expect(cachePayload.data.items[0].name).toBe('refresh-example.com')
  })

  it('禁止访问其他用户的账户数据', async () => {
    const { store, binding } = createMemoryKv()
    const env = createEnv(binding)
    const firstUser = await registerUser(store, env, 'first@example.com')
    const secondUser = await registerUser(store, env, 'second@example.com')

    const createResponse = await handleRequest(
      new Request('https://example.com/api/accounts', {
        method: 'POST',
        headers: buildSessionHeaders(firstUser.token, true),
        body: JSON.stringify({
          name: '私有账户',
          email: 'private@example.com',
          authType: 'apiToken',
          apiToken: 'private-token-1234',
          enabled: true,
        }),
      }),
      env,
    )
    const createPayload = await createResponse.json()

    const forbiddenResponse = await handleRequest(
      new Request(`https://example.com/api/accounts/${createPayload.data.id}`, {
        method: 'DELETE',
        headers: buildSessionHeaders(secondUser.token),
      }),
      env,
    )
    const forbiddenPayload = await forbiddenResponse.json()

    expect(forbiddenResponse.status).toBe(404)
    expect(forbiddenPayload.success).toBe(false)
    expect(forbiddenPayload.error.code).toBe('ACCOUNT_NOT_FOUND')
  })

  it('管理员可查看全局账户，而普通用户仍只能看到自己的账户', async () => {
    const { store, binding } = createMemoryKv()
    const env = createEnv(binding)
    const superAdmin = await registerUser(store, env, 'wlittleyang@163.com')
    const adminUser = await registerUser(store, env, 'admin@example.com')
    const normalUser = await registerUser(store, env, 'owner@example.com')

    await handleRequest(
      new Request(`https://example.com/api/users/${adminUser.user.id}/role`, {
        method: 'PUT',
        headers: buildSessionHeaders(superAdmin.token, true),
        body: JSON.stringify({
          role: 'admin',
        }),
      }),
      env,
    )

    const createResponse = await handleRequest(
      new Request('https://example.com/api/accounts', {
        method: 'POST',
        headers: buildSessionHeaders(normalUser.token, true),
        body: JSON.stringify({
          name: '全局账户',
          email: 'owner@example.com',
          authType: 'apiToken',
          apiToken: 'global-token-1234',
          enabled: true,
        }),
      }),
      env,
    )
    expect(createResponse.status).toBe(201)

    const adminListResponse = await handleRequest(
      new Request('https://example.com/api/accounts', {
        headers: buildSessionHeaders(adminUser.token),
      }),
      env,
    )
    const adminListPayload = await adminListResponse.json()
    expect(adminListResponse.status).toBe(200)
    expect(adminListPayload.data).toHaveLength(1)

    const normalListResponse = await handleRequest(
      new Request('https://example.com/api/accounts', {
        headers: buildSessionHeaders(normalUser.token),
      }),
      env,
    )
    const normalListPayload = await normalListResponse.json()
    expect(normalListResponse.status).toBe(200)
    expect(normalListPayload.data).toHaveLength(1)

    const otherNormalUser = await registerUser(store, env, 'viewer@example.com')
    const isolatedResponse = await handleRequest(
      new Request('https://example.com/api/accounts', {
        headers: buildSessionHeaders(otherNormalUser.token),
      }),
      env,
    )
    const isolatedPayload = await isolatedResponse.json()
    expect(isolatedResponse.status).toBe(200)
    expect(isolatedPayload.data).toHaveLength(0)
  })

  it('支持邮箱验证码找回密码并用新密码登录', async () => {
    const { store, binding } = createMemoryKv()
    const env = createEnv(binding)
    await registerUser(store, env, 'reset@example.com', 'old-password-123')
    vi.stubGlobal(
      'fetch',
      createMailAssertionFetch((body) => {
        expect(body.subject).toBe('Cloudflare Admin 密码重置成功通知')
        expect(String(body.content)).toContain('邮箱验证码完成重置')
        expect(String(body.content)).toContain('reset@example.com')
      }),
    )

    const sendCodeResponse = await handleRequest(
      new Request('https://example.com/api/auth/password-reset-code', {
        method: 'POST',
        headers: buildSessionHeaders(undefined, true),
        body: JSON.stringify({
          email: 'reset@example.com',
        }),
      }),
      env,
    )
    expect(sendCodeResponse.status).toBe(200)

    const emailCode = getPasswordResetCodeFromStore(store, 'reset@example.com')
    const resetResponse = await handleRequest(
      new Request('https://example.com/api/auth/password-reset', {
        method: 'POST',
        headers: buildSessionHeaders(undefined, true),
        body: JSON.stringify({
          email: 'reset@example.com',
          password: 'new-password-123',
          emailCode,
        }),
      }),
      env,
    )
    expect(resetResponse.status).toBe(200)

    const loginResponse = await handleRequest(
      new Request('https://example.com/api/auth/login', {
        method: 'POST',
        headers: buildSessionHeaders(undefined, true),
        body: JSON.stringify({
          email: 'reset@example.com',
          password: 'new-password-123',
        }),
      }),
      env,
    )
    expect(loginResponse.status).toBe(200)
  })

  it('支持已登录用户修改自己的密码', async () => {
    const { store, binding } = createMemoryKv()
    const env = createEnv(binding)
    const session = await registerUser(store, env, 'change@example.com', 'old-password-123')
    vi.stubGlobal(
      'fetch',
      createMailAssertionFetch((body) => {
        expect(body.subject).toBe('Cloudflare Admin 密码修改成功通知')
        expect(String(body.content)).toContain('密码刚刚已修改成功')
        expect(String(body.content)).toContain('Security Notice')
        expect(String(body.content)).toContain('change@example.com')
      }),
    )

    const changeResponse = await handleRequest(
      new Request('https://example.com/api/auth/change-password', {
        method: 'POST',
        headers: buildSessionHeaders(session.token, true),
        body: JSON.stringify({
          currentPassword: 'old-password-123',
          newPassword: 'new-password-123',
        }),
      }),
      env,
    )
    expect(changeResponse.status).toBe(200)

    const loginResponse = await handleRequest(
      new Request('https://example.com/api/auth/login', {
        method: 'POST',
        headers: buildSessionHeaders(undefined, true),
        body: JSON.stringify({
          email: 'change@example.com',
          password: 'new-password-123',
        }),
      }),
      env,
    )
    expect(loginResponse.status).toBe(200)
  })

  it('管理员可直接重置用户密码且无需邮件验证码', async () => {
    const { store, binding } = createMemoryKv()
    const env = createEnv(binding)
    const superAdmin = await registerUser(store, env, 'wlittleyang@163.com')
    const targetUser = await registerUser(store, env, 'managed@example.com', 'origin-password-123')
    vi.stubGlobal(
      'fetch',
      createMailAssertionFetch((body) => {
        expect(body.subject).toBe('Cloudflare Admin 管理员已重置您的密码')
        expect(String(body.content)).toContain('管理员 wlittleyang@163.com 刚刚重置了您的 Cloudflare Admin 账户密码')
        expect(String(body.content)).toContain('managed@example.com')
      }),
    )

    const resetResponse = await handleRequest(
      new Request(`https://example.com/api/users/${targetUser.user.id}/reset-password`, {
        method: 'PUT',
        headers: buildSessionHeaders(superAdmin.token, true),
        body: JSON.stringify({
          newPassword: 'admin-reset-123',
        }),
      }),
      env,
    )
    expect(resetResponse.status).toBe(200)

    const loginResponse = await handleRequest(
      new Request('https://example.com/api/auth/login', {
        method: 'POST',
        headers: buildSessionHeaders(undefined, true),
        body: JSON.stringify({
          email: 'managed@example.com',
          password: 'admin-reset-123',
        }),
      }),
      env,
    )
    expect(loginResponse.status).toBe(200)
  })
})
