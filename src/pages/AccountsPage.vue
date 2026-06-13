<script setup lang="ts">
import type { CloudflareAccount } from '@shared/types'

import { message, Modal } from 'ant-design-vue'
import { onMounted, ref } from 'vue'

import AccountFormDrawer from '@/components/accounts/AccountFormDrawer.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAccounts } from '@/composables/useAccounts'
import { formatDateTime } from '@/utils/datetime'

const {
  workspace,
  fetchAccounts,
  fetchSyncedZones,
  saveAccount,
  deleteAccountById,
  verifyAccountById,
  syncAllZones,
  loadingAccounts,
  syncingZones,
  testingAccountId,
  zoneSnapshot,
} = useAccounts()

const drawerOpen = ref(false)
const saving = ref(false)
const currentAccount = ref<CloudflareAccount | null>(null)

const columns = [
  { title: '账户名称', dataIndex: 'name', key: 'name' },
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { title: '认证方式', dataIndex: 'authType', key: 'authType' },
  { title: '凭证摘要', dataIndex: 'credentialPreview', key: 'credentialPreview' },
  { title: '最近校验', dataIndex: 'lastVerifiedAt', key: 'lastVerifiedAt' },
  { title: '状态', dataIndex: 'enabled', key: 'enabled' },
  { title: '操作', key: 'action', width: 220 },
]

function openCreateDrawer() {
  currentAccount.value = null
  drawerOpen.value = true
}

function openEditDrawer(record: CloudflareAccount) {
  currentAccount.value = record
  drawerOpen.value = true
}

async function handleSubmit(payload: Parameters<typeof saveAccount>[0]) {
  saving.value = true
  try {
    await saveAccount(payload, currentAccount.value)
    drawerOpen.value = false
    currentAccount.value = null
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存账户失败')
  } finally {
    saving.value = false
  }
}

function confirmDelete(record: CloudflareAccount) {
  Modal.confirm({
    title: `确认删除账户「${record.name}」吗？`,
    content: '删除后将无法继续使用该账户进行域名与 DNS 管理。',
    okType: 'danger',
    async onOk() {
      try {
        await deleteAccountById(record.id)
      } catch (error) {
        message.error(error instanceof Error ? error.message : '删除账户失败')
      }
    },
  })
}

async function handleVerify(record: CloudflareAccount) {
  try {
    await verifyAccountById(record.id)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '连接测试失败')
  }
}

async function handleSyncZones() {
  try {
    await syncAllZones()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '同步域名失败')
  }
}

onMounted(() => {
  void Promise.all([fetchAccounts(), fetchSyncedZones()]).catch((error) => {
    message.error(error instanceof Error ? error.message : '加载账户列表失败')
  })
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="账户管理"
      description="维护多个 Cloudflare 账户认证信息，为跨账户域名与 DNS 调度提供统一入口。"
    >
      <a-space>
        <a-button :loading="syncingZones" @click="handleSyncZones">同步域名</a-button>
        <a-button type="primary" @click="openCreateDrawer">新增账户</a-button>
      </a-space>
    </PageHeader>

    <div class="panel-card">
      <a-space direction="vertical" size="small">
        <span>最近同步：{{ formatDateTime(zoneSnapshot?.syncedAt, '尚未同步') }}</span>
        <span>已缓存域名：{{ zoneSnapshot?.totalZones ?? 0 }} 个</span>
        <span>同步失败账户：{{ zoneSnapshot?.failedAccounts.length ?? 0 }} 个</span>
      </a-space>
    </div>

    <div class="panel-card">
      <a-table
        :columns="columns"
        :data-source="workspace.accounts"
        :loading="loadingAccounts"
        row-key="id"
        :pagination="{ pageSize: 10 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'enabled'">
            <StatusTag
              :status="record.enabled ? 'success' : 'warning'"
              :text="record.enabled ? '已启用' : '已停用'"
            />
          </template>
          <template v-else-if="column.key === 'lastVerifiedAt'">
            {{ formatDateTime(record.lastVerifiedAt, '未校验') }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button size="small" @click="openEditDrawer(record)">编辑</a-button>
              <a-button
                size="small"
                :loading="testingAccountId === record.id"
                @click="handleVerify(record)"
              >
                连接测试
              </a-button>
              <a-button danger size="small" @click="confirmDelete(record)">删除</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <AccountFormDrawer
      v-model:open="drawerOpen"
      :current-account="currentAccount"
      :submitting="saving"
      @submit="handleSubmit"
    />
  </div>
</template>
