import type { ApiErrorResponse, ApiSuccess } from '@shared/types'

import { toApiError } from './errors'

export function getRequestId(request: Request): string {
  return request.headers.get('x-request-id') ?? crypto.randomUUID()
}

export function jsonSuccess<T>(
  data: T,
  requestId: string,
  init?: ResponseInit,
): Response {
  const payload: ApiSuccess<T> = {
    success: true,
    data,
    requestId,
  }

  return Response.json(payload, init)
}

export function jsonError(
  error: unknown,
  requestId: string,
  init?: ResponseInit,
): Response {
  const normalized = toApiError(error)
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      details: normalized.details,
    },
    requestId,
  }

  return Response.json(payload, {
    status: normalized.status,
    ...init,
  })
}

export function corsHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Admin-Token, X-Request-Id, X-Session-Token',
    'Access-Control-Allow-Methods':
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  }
}
