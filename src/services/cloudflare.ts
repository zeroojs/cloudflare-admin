import type {
  BatchDeletePayload,
  BatchProxiedPayload,
  CloudflareAccount,
  CloudflareAccountInput,
  CloudflareZone,
  DnsRecord,
  DnsRecordInput,
  DnsRecordQuery,
  PaginatedResult,
  ZoneCacheSnapshot,
} from '@shared/types'

import { apiRequest } from './http'

export function listAccounts(): Promise<CloudflareAccount[]> {
  return apiRequest('/api/accounts')
}

export function createAccount(
  payload: CloudflareAccountInput,
): Promise<CloudflareAccount> {
  return apiRequest('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAccount(
  accountId: string,
  payload: CloudflareAccountInput,
): Promise<CloudflareAccount> {
  return apiRequest(`/api/accounts/${accountId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function removeAccount(accountId: string): Promise<{ deleted: true }> {
  return apiRequest(`/api/accounts/${accountId}`, {
    method: 'DELETE',
  })
}

export function verifyAccount(
  accountId: string,
): Promise<{ zoneCount: number }> {
  return apiRequest(`/api/accounts/${accountId}/verify`, {
    method: 'POST',
  })
}

export function listZones(accountId: string): Promise<CloudflareZone[]> {
  return apiRequest(`/api/accounts/${accountId}/zones`)
}

export function listSyncedZones(): Promise<ZoneCacheSnapshot> {
  return apiRequest('/api/zones-cache')
}

export function syncZonesCache(): Promise<ZoneCacheSnapshot> {
  return apiRequest('/api/zones-cache/sync', {
    method: 'POST',
  })
}

export function listDnsRecords(
  query: DnsRecordQuery,
): Promise<PaginatedResult<DnsRecord>> {
  const params = new URLSearchParams({
    accountId: query.accountId,
    zoneId: query.zoneId,
    page: String(query.page),
    pageSize: String(query.pageSize),
  })

  if (query.type) {
    params.set('type', query.type)
  }

  if (query.keyword) {
    params.set('keyword', query.keyword)
  }

  return apiRequest(`/api/dns-records?${params.toString()}`)
}

export function createDnsRecord(payload: {
  accountId: string
  zoneId: string
  record: DnsRecordInput
}): Promise<DnsRecord> {
  return apiRequest('/api/dns-records', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateDnsRecord(payload: {
  accountId: string
  zoneId: string
  recordId: string
  record: DnsRecordInput
}): Promise<DnsRecord> {
  return apiRequest(`/api/dns-records/${payload.recordId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function removeDnsRecord(payload: {
  accountId: string
  zoneId: string
  recordId: string
}): Promise<{ deleted: true }> {
  return apiRequest(
    `/api/dns-records/${payload.recordId}?accountId=${payload.accountId}&zoneId=${payload.zoneId}`,
    {
      method: 'DELETE',
    },
  )
}

export function batchDeleteDnsRecords(
  payload: BatchDeletePayload,
): Promise<{ successCount: number; failedIds: string[] }> {
  return apiRequest('/api/dns-records/batch-delete', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function batchToggleProxied(
  payload: BatchProxiedPayload,
): Promise<{ successCount: number; failedIds: string[] }> {
  return apiRequest('/api/dns-records/batch-proxied', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
