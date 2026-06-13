import type { EnvBindings } from './store'

import { ApiError } from './errors'

interface RateLimitState {
  count: number
  expiresAt: number
}

const memoryRateLimit = new Map<string, RateLimitState>()

export function applyRateLimit(
  env: EnvBindings,
  request: Request,
  bucket = 'global',
): void {
  const now = Date.now()
  const windowMs = Number(env.RATE_LIMIT_WINDOW_MS ?? 60_000)
  const max = Number(env.RATE_LIMIT_MAX ?? 120)
  const clientIp = request.headers.get('cf-connecting-ip') ?? 'local'
  const key = `${bucket}:${clientIp}`
  const current = memoryRateLimit.get(key)

  if (!current || current.expiresAt <= now) {
    memoryRateLimit.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    })
    return
  }

  if (current.count >= max) {
    throw new ApiError(429, 'RATE_LIMITED', '请求过于频繁，请稍后再试')
  }

  current.count += 1
  memoryRateLimit.set(key, current)
}
