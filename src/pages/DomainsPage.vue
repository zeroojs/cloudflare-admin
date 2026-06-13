<script setup lang="ts">
import type { AccountZoneSummary } from '@shared/types'

import { message } from 'ant-design-vue'
import { computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'

import PageHeader from '@/components/common/PageHeader.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { useAccounts } from '@/composables/useAccounts'

const router = useRouter()
const { workspace, fetchAccounts, fetchAllZones, loadingAccounts, loadingZones } =
  useAccounts()

const filters = reactive({
  accountId: '',
  keyword: '',
  planName: '',
})

const columns = [
  { title: '域名', dataIndex: 'name', key: 'name', sorter: true },
  { title: '账户邮箱', dataIndex: 'accountEmail', key: 'accountEmail' },
  { title: '计划', dataIndex: 'planName', key: 'planName' },
  { title: '状态', dataIndex: 'status', key: 'status' },
  { title: '操作', key: 'action', width: 180 },
]

const accountOptions = computed(() =>
  workspace.accounts.map((item) => ({
    label: `${item.name} (${item.email})`,
    value: item.id,
  })),
)

const planOptions = [
  { label: 'Business', value: 'Business' },
  { label: 'Pro', value: 'Pro' },
  { label: '免费', value: '免费' },
]

const filteredDomains = computed(() =>
  workspace.allZones.filter((zone) => {
    const matchedAccount =
      !filters.accountId || zone.accountId === filters.accountId
    const matchedKeyword =
      !filters.keyword ||
      zone.name.toLowerCase().includes(filters.keyword.toLowerCase())
    const matchedPlan =
      !filters.planName || zone.planName === filters.planName

    return matchedAccount && matchedKeyword && matchedPlan
  }),
)

const loading = computed(
  () => loadingAccounts.value || loadingZones.value,
)

async function initialize() {
  await fetchAccounts()
  await fetchAllZones()
}

function resetFilters() {
  filters.accountId = ''
  filters.keyword = ''
  filters.planName = ''
}

function openDns(record: AccountZoneSummary) {
  workspace.setSelectedAccount(record.accountId)
  workspace.setSelectedZone(record.id)
  void router.push('/dns')
}

onMounted(() => {
  void initialize().catch((error) => {
    message.error(error instanceof Error ? error.message : '加载域名列表失败')
  })
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="域名管理"
      description="按列表查看全部账户下的 Cloudflare 域名，并展示账户邮箱与套餐信息。"
    />

    <div class="panel-card">
      <div class="toolbar-grid">
        <a-form-item label="Cloudflare 账户" class="toolbar-grid__item">
          <a-select
            v-model:value="filters.accountId"
            allow-clear
            placeholder="全部账户"
            :options="accountOptions"
          />
        </a-form-item>
        <a-form-item label="域名关键字" class="toolbar-grid__item">
          <a-input
            v-model:value="filters.keyword"
            placeholder="按域名筛选"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="计划" class="toolbar-grid__item">
          <a-select
            v-model:value="filters.planName"
            allow-clear
            placeholder="全部套餐"
            :options="planOptions"
          />
        </a-form-item>
        <a-form-item label="统计" class="toolbar-grid__item">
          <a-input :value="`当前 ${filteredDomains.length} 个域名`" disabled />
        </a-form-item>
      </div>

      <div class="toolbar-actions">
        <a-space wrap>
          <a-button @click="initialize">刷新</a-button>
          <a-button @click="resetFilters">重置</a-button>
        </a-space>
      </div>
    </div>

    <div class="panel-card">
      <a-table
        row-key="id"
        :columns="columns"
        :data-source="filteredDomains"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: true }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'planName'">
            <a-tag color="orange">{{ record.planName }}</a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <StatusTag
              :status="record.status === 'active' ? 'success' : 'warning'"
              :text="record.status"
            />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button size="small" @click="openDns(record)">查看 DNS</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>
