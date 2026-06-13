import type {
  BatchDeletePayload,
  BatchProxiedPayload,
  CloudflareAccount,
  CloudflareCredentialPayload,
  CloudflareZone,
  DnsRecord,
  DnsRecordInput,
  DnsRecordQuery,
  PaginatedResult,
} from '@shared/types'

import { ApiError } from './errors'

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4'

interface CloudflareEnvelope<T> {
  success: boolean
  errors: Array<{ code: number; message: string }>
  messages: Array<{ code: number; message: string }>
  result: T
  result_info?: {
    page: number
    per_page: number
    total_count: number
  }
}

function createHeaders(
  account: CloudflareAccount,
  credential: CloudflareCredentialPayload,
): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json',
  })

  if (credential.authType === 'apiToken' && credential.apiToken) {
    headers.set('Authorization', `Bearer ${credential.apiToken}`)
    return headers
  }

  if (
    credential.authType === 'globalApiKey' &&
    credential.globalApiKey &&
    account.email
  ) {
    headers.set('X-Auth-Key', credential.globalApiKey)
    headers.set('X-Auth-Email', account.email)
    return headers
  }

  throw new ApiError(400, 'INVALID_CREDENTIAL', 'Cloudflare 凭证不完整')
}

async function requestCloudflare<T>(
  account: CloudflareAccount,
  credential: CloudflareCredentialPayload,
  path: string,
  init?: RequestInit,
  attempt = 0,
): Promise<CloudflareEnvelope<T>> {
  const headers = createHeaders(account, credential)
  const response = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
    ...init,
    headers: {
      ...Object.fromEntries(headers.entries()),
      ...(init?.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {}),
    },
  })

  if ((response.status === 429 || response.status >= 500) && attempt < 2) {
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
    return requestCloudflare(account, credential, path, init, attempt + 1)
  }

  const payload = (await response.json()) as CloudflareEnvelope<T>
  if (!response.ok || !payload.success) {
    const firstError = payload.errors?.[0]
    throw new ApiError(
      response.status || 502,
      'CLOUDFLARE_API_ERROR',
      firstError?.message || 'Cloudflare API 请求失败',
      {
        status: response.status,
        errors: payload.errors,
        messages: payload.messages,
      },
    )
  }

  return payload
}

function mapZone(zone: Record<string, unknown>): CloudflareZone {
  const plan = zone.plan as Record<string, unknown> | undefined
  const rawPlanName = String(plan?.name ?? '').toLowerCase()

  let planName = '免费'
  if (rawPlanName.includes('business')) {
    planName = 'Business'
  } else if (rawPlanName.includes('pro')) {
    planName = 'Pro'
  }

  return {
    id: String(zone.id),
    name: String(zone.name),
    status: String(zone.status ?? 'unknown'),
    paused: Boolean(zone.paused),
    type: String(zone.type ?? 'full'),
    planName,
  }
}

function mapDnsRecord(record: Record<string, unknown>): DnsRecord {
  return {
    id: String(record.id),
    type: String(record.type) as DnsRecord['type'],
    name: String(record.name),
    content: String(record.content),
    ttl: Number(record.ttl ?? 1),
    proxied: typeof record.proxied === 'boolean' ? record.proxied : undefined,
    priority:
      typeof record.priority === 'number' ? record.priority : undefined,
    comment: typeof record.comment === 'string' ? record.comment : undefined,
    modifiedOn:
      typeof record.modified_on === 'string'
        ? record.modified_on
        : undefined,
  }
}

export async function verifyCloudflareAccount(
  account: CloudflareAccount,
  credential: CloudflareCredentialPayload,
): Promise<{ zoneCount: number }> {
  const response = await requestCloudflare<Array<Record<string, unknown>>>(
    account,
    credential,
    '/zones?per_page=1',
  )

  return {
    zoneCount: response.result_info?.total_count ?? response.result.length,
  }
}

export async function listZones(
  account: CloudflareAccount,
  credential: CloudflareCredentialPayload,
): Promise<CloudflareZone[]> {
  const response = await requestCloudflare<Array<Record<string, unknown>>>(
    account,
    credential,
    '/zones?per_page=100',
  )

  return response.result.map(mapZone)
}

export async function listDnsRecords(
  account: CloudflareAccount,
  credential: CloudflareCredentialPayload,
  query: DnsRecordQuery,
): Promise<PaginatedResult<DnsRecord>> {
  const params = new URLSearchParams({
    page: String(query.page),
    per_page: String(query.pageSize),
  })

  if (query.type) {
    params.set('type', query.type)
  }

  const response = await requestCloudflare<Array<Record<string, unknown>>>(
    account,
    credential,
    `/zones/${query.zoneId}/dns_records?${params.toString()}`,
  )

  let items = response.result.map(mapDnsRecord)
  if (query.keyword) {
    const lowered = query.keyword.toLowerCase()
    items = items.filter((item) => item.name.toLowerCase().includes(lowered))
  }

  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total: query.keyword
      ? items.length
      : response.result_info?.total_count ?? items.length,
  }
}

export async function createDnsRecord(
  account: CloudflareAccount,
  credential: CloudflareCredentialPayload,
  zoneId: string,
  input: DnsRecordInput,
): Promise<DnsRecord> {
  const response = await requestCloudflare<Record<string, unknown>>(
    account,
    credential,
    `/zones/${zoneId}/dns_records`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )

  return mapDnsRecord(response.result)
}

export async function updateDnsRecord(
  account: CloudflareAccount,
  credential: CloudflareCredentialPayload,
  zoneId: string,
  recordId: string,
  input: Partial<DnsRecordInput>,
): Promise<DnsRecord> {
  const response = await requestCloudflare<Record<string, unknown>>(
    account,
    credential,
    `/zones/${zoneId}/dns_records/${recordId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  )

  return mapDnsRecord(response.result)
}

export async function deleteDnsRecord(
  account: CloudflareAccount,
  credential: CloudflareCredentialPayload,
  zoneId: string,
  recordId: string,
): Promise<void> {
  await requestCloudflare<Record<string, unknown>>(
    account,
    credential,
    `/zones/${zoneId}/dns_records/${recordId}`,
    {
      method: 'DELETE',
    },
  )
}

export async function batchDeleteDnsRecords(
  account: CloudflareAccount,
  credential: CloudflareCredentialPayload,
  payload: BatchDeletePayload,
): Promise<{ successCount: number; failedIds: string[] }> {
  const results = await Promise.allSettled(
    payload.recordIds.map((recordId) =>
      deleteDnsRecord(account, credential, payload.zoneId, recordId),
    ),
  )

  return {
    successCount: results.filter((item) => item.status === 'fulfilled').length,
    failedIds: results
      .map((item, index) =>
        item.status === 'rejected' ? payload.recordIds[index] : null,
      )
      .filter((value): value is string => Boolean(value)),
  }
}

export async function batchToggleProxied(
  account: CloudflareAccount,
  credential: CloudflareCredentialPayload,
  payload: BatchProxiedPayload,
): Promise<{ successCount: number; failedIds: string[] }> {
  const results = await Promise.allSettled(
    payload.recordIds.map((recordId) =>
      updateDnsRecord(account, credential, payload.zoneId, recordId, {
        proxied: payload.proxied,
      }),
    ),
  )

  return {
    successCount: results.filter((item) => item.status === 'fulfilled').length,
    failedIds: results
      .map((item, index) =>
        item.status === 'rejected' ? payload.recordIds[index] : null,
      )
      .filter((value): value is string => Boolean(value)),
  }
}
