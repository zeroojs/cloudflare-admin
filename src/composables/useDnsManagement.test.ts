import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDnsManagement } from './useDnsManagement'

vi.mock('ant-design-vue', () => ({
  message: {
    success: vi.fn(),
  },
}))

describe('useDnsManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('提交 MX 记录时会归一化优先级与代理状态', async () => {
    const service = {
      listDnsRecords: vi.fn().mockResolvedValue({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
      }),
      createDnsRecord: vi.fn().mockResolvedValue({}),
      updateDnsRecord: vi.fn().mockResolvedValue({}),
      removeDnsRecord: vi.fn().mockResolvedValue({ deleted: true }),
      batchDeleteDnsRecords: vi.fn().mockResolvedValue({
        successCount: 0,
        failedIds: [],
      }),
      batchToggleProxied: vi.fn().mockResolvedValue({
        successCount: 0,
        failedIds: [],
      }),
    }

    const dns = useDnsManagement(service)
    dns.query.accountId = 'account-1'
    dns.query.zoneId = 'zone-1'

    await dns.submitRecord({
      accountId: 'account-1',
      zoneId: 'zone-1',
      record: {
        type: 'MX',
        name: 'mail',
        content: 'mx.example.com',
        ttl: 120,
        proxied: true,
      },
    })

    expect(service.createDnsRecord).toHaveBeenCalledWith({
      accountId: 'account-1',
      zoneId: 'zone-1',
      record: expect.objectContaining({
        priority: 10,
        proxied: false,
      }),
    })
    expect(service.listDnsRecords).toHaveBeenCalled()
  })

  it('批量删除后会清空选中项并刷新列表', async () => {
    const service = {
      listDnsRecords: vi.fn().mockResolvedValue({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
      }),
      createDnsRecord: vi.fn().mockResolvedValue({}),
      updateDnsRecord: vi.fn().mockResolvedValue({}),
      removeDnsRecord: vi.fn().mockResolvedValue({ deleted: true }),
      batchDeleteDnsRecords: vi.fn().mockResolvedValue({
        successCount: 2,
        failedIds: [],
      }),
      batchToggleProxied: vi.fn().mockResolvedValue({
        successCount: 0,
        failedIds: [],
      }),
    }

    const dns = useDnsManagement(service)
    dns.selectedRowKeys.value = ['record-1', 'record-2']
    dns.query.accountId = 'account-1'
    dns.query.zoneId = 'zone-1'

    await dns.deleteSelected('account-1', 'zone-1')

    expect(service.batchDeleteDnsRecords).toHaveBeenCalledWith({
      accountId: 'account-1',
      zoneId: 'zone-1',
      recordIds: ['record-1', 'record-2'],
    })
    expect(dns.selectedRowKeys.value).toEqual([])
    expect(service.listDnsRecords).toHaveBeenCalled()
  })
})
