import type { DnsRecord, DnsRecordInput, DnsRecordQuery } from '@shared/types'

import { message } from 'ant-design-vue'
import { computed, reactive, ref } from 'vue'

import {
  batchDeleteDnsRecords,
  batchToggleProxied,
  createDnsRecord,
  listDnsRecords,
  removeDnsRecord,
  updateDnsRecord,
} from '@/services/cloudflare'
import { normalizeDnsPayload } from '@/utils/dns'

interface DnsService {
  listDnsRecords: typeof listDnsRecords
  createDnsRecord: typeof createDnsRecord
  updateDnsRecord: typeof updateDnsRecord
  removeDnsRecord: typeof removeDnsRecord
  batchDeleteDnsRecords: typeof batchDeleteDnsRecords
  batchToggleProxied: typeof batchToggleProxied
}

const defaultService: DnsService = {
  listDnsRecords,
  createDnsRecord,
  updateDnsRecord,
  removeDnsRecord,
  batchDeleteDnsRecords,
  batchToggleProxied,
}

export function useDnsManagement(service: DnsService = defaultService) {
  const loading = ref(false)
  const submitting = ref(false)
  const records = ref<DnsRecord[]>([])
  const selectedRowKeys = ref<string[]>([])

  const query = reactive<DnsRecordQuery>({
    accountId: '',
    zoneId: '',
    page: 1,
    pageSize: 20,
    type: undefined,
    keyword: '',
  })

  const pagination = reactive({
    total: 0,
    current: 1,
    pageSize: 20,
  })

  const hasSelection = computed(() => selectedRowKeys.value.length > 0)

  async function fetchRecords(overrides?: Partial<DnsRecordQuery>) {
    Object.assign(query, overrides ?? {})

    if (!query.accountId || !query.zoneId) {
      records.value = []
      pagination.total = 0
      return
    }

    loading.value = true
    try {
      const result = await service.listDnsRecords(query)
      records.value = result.items
      pagination.total = result.total
      pagination.current = result.page
      pagination.pageSize = result.pageSize
    } finally {
      loading.value = false
    }
  }

  async function submitRecord(payload: {
    accountId: string
    zoneId: string
    record: DnsRecordInput
    recordId?: string
  }) {
    submitting.value = true
    try {
      const record = normalizeDnsPayload(payload.record)
      if (payload.recordId) {
        await service.updateDnsRecord({
          accountId: payload.accountId,
          zoneId: payload.zoneId,
          recordId: payload.recordId,
          record,
        })
        message.success('DNS 记录已更新')
      } else {
        await service.createDnsRecord({
          accountId: payload.accountId,
          zoneId: payload.zoneId,
          record,
        })
        message.success('DNS 记录已创建')
      }

      await fetchRecords()
    } finally {
      submitting.value = false
    }
  }

  async function deleteRecord(payload: {
    accountId: string
    zoneId: string
    recordId: string
  }) {
    await service.removeDnsRecord(payload)
    message.success('DNS 记录已删除')
    await fetchRecords()
  }

  async function deleteSelected(accountId: string, zoneId: string) {
    if (!selectedRowKeys.value.length) {
      return
    }

    const result = await service.batchDeleteDnsRecords({
      accountId,
      zoneId,
      recordIds: selectedRowKeys.value,
    })
    selectedRowKeys.value = []
    message.success(`批量删除完成，成功 ${result.successCount} 条`)
    await fetchRecords()
  }

  async function toggleSelectedProxied(
    accountId: string,
    zoneId: string,
    proxied: boolean,
  ) {
    if (!selectedRowKeys.value.length) {
      return
    }

    const result = await service.batchToggleProxied({
      accountId,
      zoneId,
      recordIds: selectedRowKeys.value,
      proxied,
    })
    message.success(`代理状态更新完成，成功 ${result.successCount} 条`)
    await fetchRecords()
  }

  function resetSelection() {
    selectedRowKeys.value = []
  }

  return {
    loading,
    submitting,
    records,
    query,
    pagination,
    selectedRowKeys,
    hasSelection,
    fetchRecords,
    submitRecord,
    deleteRecord,
    deleteSelected,
    toggleSelectedProxied,
    resetSelection,
  }
}
