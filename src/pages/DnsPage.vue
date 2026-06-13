<script setup lang="ts">
import type { DnsRecord } from '@shared/types'

import { message, Modal } from 'ant-design-vue'
import { computed, onMounted, ref, watch } from 'vue'

import StatusTag from '@/components/common/StatusTag.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import DnsRecordDrawer from '@/components/dns/DnsRecordDrawer.vue'
import { useAccounts } from '@/composables/useAccounts'
import { useDnsManagement } from '@/composables/useDnsManagement'
import { formatDateTime } from '@/utils/datetime'
import { dnsTypeOptions } from '@/utils/dns'

const {
  workspace,
  fetchAccounts,
  fetchSyncedZones,
  fetchZones,
  getZoneOptions,
  loadingZones,
} = useAccounts()
const dns = useDnsManagement()

const drawerOpen = ref(false)
const editingRecord = ref<DnsRecord | null>(null)

const columns = [
  { title: '记录名称', dataIndex: 'name', key: 'name', sorter: true },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '记录值', dataIndex: 'content', key: 'content', ellipsis: true },
  { title: 'TTL', dataIndex: 'ttl', key: 'ttl' },
  { title: '优先级', dataIndex: 'priority', key: 'priority' },
  { title: '代理状态', dataIndex: 'proxied', key: 'proxied' },
  { title: '更新时间', dataIndex: 'modifiedOn', key: 'modifiedOn' },
  { title: '操作', key: 'action', width: 220 },
]

const selectedAccountId = computed({
  get: () => workspace.selectedAccountId,
  set: (value: string) => workspace.setSelectedAccount(value),
})

const selectedZoneId = computed({
  get: () => workspace.selectedZoneId,
  set: (value: string) => workspace.setSelectedZone(value),
})

const effectiveAccountId = computed(() => {
  if (workspace.selectedAccountId) {
    return workspace.selectedAccountId
  }

  return (
    workspace.syncedZones.find((item) => item.id === workspace.selectedZoneId)?.accountId ?? ''
  )
})

const zoneOptions = computed(() =>
  getZoneOptions(workspace.selectedAccountId).map((item) => ({
    label: workspace.selectedAccountId
      ? item.name
      : `${item.name} (${item.accountEmail})`,
    value: item.id,
  })),
)

const rowSelection = computed(() => ({
  selectedRowKeys: dns.selectedRowKeys.value,
  onChange: (keys: Array<string | number>) => {
    dns.selectedRowKeys.value = keys.map(String)
  },
}))

async function initialize() {
  await fetchAccounts()
  const syncedZones = await fetchSyncedZones()

  if (!workspace.selectedZoneId && syncedZones.length > 0) {
    const defaultZone = syncedZones[0]
    workspace.setSelectedAccount('')
    workspace.setSelectedZone(defaultZone.id)
  }
}

watch(
  () => workspace.selectedAccountId,
  async (accountId) => {
    dns.resetSelection()
    if (!accountId) {
      return
    }

    try {
      await fetchZones(accountId)
      if (workspace.selectedZoneId) {
        await dns.fetchRecords({
          accountId,
          zoneId: workspace.selectedZoneId,
          page: 1,
        })
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载域名列表失败')
    }
  },
  { immediate: true },
)

watch(
  () => workspace.selectedZoneId,
  async (zoneId) => {
    dns.resetSelection()
    if (!zoneId) {
      return
    }

    const selectedZone =
      workspace.syncedZones.find((item) => item.id === zoneId) ?? null
    const accountId = workspace.selectedAccountId || selectedZone?.accountId || ''

    if (!accountId) {
      return
    }

    if (accountId && !workspace.zonesByAccount[accountId]?.length) {
      await fetchZones(accountId)
    }

    try {
      await dns.fetchRecords({
        accountId,
        zoneId,
        page: 1,
      })
    } catch (error) {
      message.error(error instanceof Error ? error.message : '加载 DNS 记录失败')
    }
  },
)

onMounted(() => {
  void initialize().catch((error) => {
    message.error(error instanceof Error ? error.message : '初始化 DNS 页面失败')
  })
})

function openCreateDrawer() {
  editingRecord.value = null
  drawerOpen.value = true
}

function openEditDrawer(record: DnsRecord) {
  editingRecord.value = record
  drawerOpen.value = true
}

async function handleSubmit(payload: Parameters<typeof dns.submitRecord>[0]['record']) {
  if (!effectiveAccountId.value || !workspace.selectedZoneId) {
    message.warning('请先选择账户与域名')
    return
  }

  try {
    await dns.submitRecord({
      accountId: effectiveAccountId.value,
      zoneId: workspace.selectedZoneId,
      record: payload,
      recordId: editingRecord.value?.id,
    })
    drawerOpen.value = false
    editingRecord.value = null
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存 DNS 记录失败')
  }
}

function confirmDelete(record: DnsRecord) {
  if (!effectiveAccountId.value || !workspace.selectedZoneId) {
    return
  }

  Modal.confirm({
    title: `确认删除记录「${record.name}」吗？`,
    content: '该操作不可撤销，请确认当前域名与记录无误。',
    okType: 'danger',
    async onOk() {
      try {
        await dns.deleteRecord({
          accountId: effectiveAccountId.value,
          zoneId: workspace.selectedZoneId,
          recordId: record.id,
        })
      } catch (error) {
        message.error(error instanceof Error ? error.message : '删除 DNS 记录失败')
      }
    },
  })
}

function confirmBatchDelete() {
  if (!effectiveAccountId.value || !workspace.selectedZoneId) {
    return
  }

  Modal.confirm({
    title: `确认批量删除 ${dns.selectedRowKeys.value.length} 条记录吗？`,
    content: '请确认所选记录无误，批量删除不可撤销。',
    okType: 'danger',
    async onOk() {
      try {
        await dns.deleteSelected(effectiveAccountId.value, workspace.selectedZoneId)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '批量删除失败')
      }
    },
  })
}

async function handleBatchProxied(proxied: boolean) {
  if (!effectiveAccountId.value || !workspace.selectedZoneId) {
    return
  }

  try {
    await dns.toggleSelectedProxied(
      effectiveAccountId.value,
      workspace.selectedZoneId,
      proxied,
    )
  } catch (error) {
    message.error(error instanceof Error ? error.message : '批量更新代理状态失败')
  }
}

async function handleSearch() {
  try {
    await dns.fetchRecords({
      accountId: effectiveAccountId.value,
      zoneId: workspace.selectedZoneId,
      page: 1,
    })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '查询 DNS 记录失败')
  }
}

async function handleTableChange(pagination: { current?: number; pageSize?: number }) {
  try {
    await dns.fetchRecords({
      accountId: effectiveAccountId.value,
      zoneId: workspace.selectedZoneId,
      page: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 20,
    })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '分页查询失败')
  }
}
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="DNS 管理"
      description="按 Cloudflare 账户与域名统一管理 DNS 解析记录，支持分页筛选、增删改查与批量操作。"
    >
      <a-button type="primary" :disabled="!selectedZoneId" @click="openCreateDrawer">
        新增记录
      </a-button>
    </PageHeader>

    <div class="panel-card">
      <div class="toolbar-grid">
        <a-form-item label="Cloudflare 账户" class="toolbar-grid__item">
          <a-select
            v-model:value="selectedAccountId"
            placeholder="选择账户"
            :options="workspace.accounts.map((item) => ({ label: item.name, value: item.id }))"
          />
        </a-form-item>
        <a-form-item label="域名 Zone" class="toolbar-grid__item">
          <a-select
            v-model:value="selectedZoneId"
            placeholder="选择域名"
            :loading="loadingZones"
            :options="zoneOptions"
          />
        </a-form-item>
        <a-form-item label="记录类型" class="toolbar-grid__item">
          <a-select
            v-model:value="dns.query.type"
            allow-clear
            placeholder="全部类型"
            :options="dnsTypeOptions"
          />
        </a-form-item>
        <a-form-item label="关键字" class="toolbar-grid__item">
          <a-input-search
            v-model:value="dns.query.keyword"
            placeholder="按记录名称筛选"
            allow-clear
            @search="handleSearch"
          />
        </a-form-item>
      </div>

      <div class="toolbar-actions">
        <a-space wrap>
          <a-button @click="handleSearch">查询</a-button>
          <a-button @click="dns.query.type = undefined; dns.query.keyword = ''; handleSearch()">
            重置
          </a-button>
          <a-divider type="vertical" />
          <a-button danger :disabled="!dns.hasSelection" @click="confirmBatchDelete">
            批量删除
          </a-button>
          <a-button :disabled="!dns.hasSelection" @click="handleBatchProxied(true)">
            批量开启代理
          </a-button>
          <a-button :disabled="!dns.hasSelection" @click="handleBatchProxied(false)">
            批量关闭代理
          </a-button>
        </a-space>
      </div>
    </div>

    <div class="panel-card">
      <a-table
        row-key="id"
        :columns="columns"
        :data-source="dns.records.value"
        :loading="dns.loading.value"
        :row-selection="rowSelection"
        :pagination="{
          current: dns.pagination.current,
          pageSize: dns.pagination.pageSize,
          total: dns.pagination.total,
          showSizeChanger: true,
        }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'proxied'">
            <StatusTag
              :status="record.proxied ? 'processing' : 'default'"
              :text="record.proxied ? '已代理' : '仅 DNS'"
            />
          </template>
          <template v-else-if="column.key === 'priority'">
            {{ record.priority ?? '-' }}
          </template>
          <template v-else-if="column.key === 'modifiedOn'">
            {{ formatDateTime(record.modifiedOn) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button size="small" @click="openEditDrawer(record)">编辑</a-button>
              <a-button danger size="small" @click="confirmDelete(record)">删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <DnsRecordDrawer
      v-model:open="drawerOpen"
      :current-record="editingRecord"
      :submitting="dns.submitting.value"
      @submit="handleSubmit"
    />
  </div>
</template>
