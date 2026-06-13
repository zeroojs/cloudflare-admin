import type { ApiResponse, RuntimeConfig } from '@shared/types'

import { clearStoredSessionToken, getStoredSessionToken } from '@/utils/session'

// const bootstrapApiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL ?? '')
const bootstrapApiBaseUrl = 'https://cloudflare-admin-worker-api.letssl.cn'
const runtimeConfigPath = '/api/runtime-config'
let apiBaseUrl = bootstrapApiBaseUrl
let runtimeConfigPromise: Promise<void> | null = null

export class HttpError extends Error {
  readonly code: string
  readonly details?: unknown

  constructor(message: string, code = 'HTTP_ERROR', details?: unknown) {
    super(message)
    this.name = 'HttpError'
    this.code = code
    this.details = details
  }
}

function normalizeBaseUrl(input: string): string {
  return input.trim().replace(/\/+$/, '')
}

function getWindowOrigin(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  return normalizeBaseUrl(window.location.origin)
}

function getRuntimeConfigBootstrapBaseUrl(): string {
  return bootstrapApiBaseUrl || getWindowOrigin()
}

function buildUrl(baseUrl: string, input: string): string {
  return `${baseUrl}${input.startsWith('/') ? input : `/${input}`}`
}

async function loadRuntimeConfig(): Promise<void> {
  const bootstrapBaseUrl = getRuntimeConfigBootstrapBaseUrl()
  if (!bootstrapBaseUrl) {
    return
  }

  try {
    const response = await fetch(buildUrl(bootstrapBaseUrl, runtimeConfigPath))
    if (!response.ok) {
      return
    }

    const rawText = await response.text()
    if (!rawText) {
      return
    }

    const payload = JSON.parse(rawText) as ApiResponse<RuntimeConfig>
    if (payload.success && payload.data.apiBaseUrl.trim()) {
      apiBaseUrl = normalizeBaseUrl(payload.data.apiBaseUrl)
    }
  } catch {
    // 运行时配置加载失败时退回构建期配置，避免阻塞前端启动。
  }
}

export async function initializeApiBaseUrl(): Promise<void> {
  if (!runtimeConfigPromise) {
    runtimeConfigPromise = loadRuntimeConfig()
  }

  await runtimeConfigPromise
}

async function resolveApiUrl(input: string): Promise<string> {
  if (/^https?:\/\//i.test(input)) {
    return input
  }

  await initializeApiBaseUrl()
  const activeApiBaseUrl = apiBaseUrl || getRuntimeConfigBootstrapBaseUrl()
  if (!activeApiBaseUrl) {
    return input
  }

  return buildUrl(activeApiBaseUrl, input)
}

export async function apiRequest<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const sessionToken = getStoredSessionToken()
  const response = await fetch(await resolveApiUrl(input), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { 'X-Session-Token': sessionToken } : {}),
      ...(init?.headers ?? {}),
    },
  })

  const rawText = await response.text()
  if (!rawText) {
    throw new HttpError('后端服务暂无响应，请检查 Worker 是否已启动', 'EMPTY_RESPONSE')
  }

  let payload: ApiResponse<T>
  try {
    payload = JSON.parse(rawText) as ApiResponse<T>
  } catch {
    throw new HttpError('接口返回格式无效，请检查后端服务状态', 'INVALID_RESPONSE')
  }

  if (!payload.success) {
    if (payload.error.code === 'UNAUTHORIZED') {
      clearStoredSessionToken()
    }

    throw new HttpError(
      payload.error.message,
      payload.error.code,
      payload.error.details,
    )
  }

  return payload.data
}
