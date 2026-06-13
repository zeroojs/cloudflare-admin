import type { DnsRecordInput, DnsRecordType } from '@shared/types'

export const dnsTypeOptions: Array<{ label: string; value: DnsRecordType }> = [
  { label: 'A', value: 'A' },
  { label: 'AAAA', value: 'AAAA' },
  { label: 'CNAME', value: 'CNAME' },
  { label: 'MX', value: 'MX' },
  { label: 'TXT', value: 'TXT' },
]

export const ttlOptions = [
  { label: '自动', value: 1 },
  { label: '2 分钟', value: 120 },
  { label: '5 分钟', value: 300 },
  { label: '1 小时', value: 3600 },
]

export function getRecordContentLabel(type: DnsRecordType): string {
  if (type === 'A' || type === 'AAAA') {
    return 'IP 地址'
  }

  if (type === 'TXT') {
    return '文本值'
  }

  return '目标值'
}

export function normalizeDnsPayload(payload: DnsRecordInput): DnsRecordInput {
  return {
    ...payload,
    name: payload.name.trim(),
    content: payload.content.trim(),
    comment: payload.comment?.trim(),
    priority: payload.type === 'MX' ? payload.priority ?? 10 : undefined,
    proxied: payload.type === 'TXT' || payload.type === 'MX' ? false : payload.proxied,
  }
}
