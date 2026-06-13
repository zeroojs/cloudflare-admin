<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, onMounted } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import { useAccounts } from '@/composables/useAccounts'

const { fetchAccounts, workspace, loadingAccounts } = useAccounts()

const stats = computed(() => {
  const total = workspace.accounts.length
  const enabled = workspace.accounts.filter((item) => item.enabled).length
  const verified = workspace.accounts.filter((item) => item.lastVerifiedAt).length

  return [
    { label: '接入账户', value: total, hint: '统一纳管的 Cloudflare 账户数量' },
    { label: '已启用账户', value: enabled, hint: '当前可参与调度的账户数量' },
    { label: '已验证账户', value: verified, hint: '最近通过 API 凭证校验的账户数量' },
  ]
})

onMounted(() => {
  void fetchAccounts().catch((error) => {
    message.error(error instanceof Error ? error.message : '加载账户概览失败')
  })
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="系统总览"
      description="集中查看 Cloudflare 多账户接入情况，并快速进入 DNS 解析运维流程。"
    />

    <a-row :gutter="[16, 16]">
      <a-col v-for="item in stats" :key="item.label" :xs="24" :md="8">
        <div class="overview-card">
          <span class="overview-card__label">{{ item.label }}</span>
          <strong class="overview-card__value">
            <a-skeleton-button v-if="loadingAccounts" active block />
            <template v-else>{{ item.value }}</template>
          </strong>
          <p class="overview-card__hint">{{ item.hint }}</p>
        </div>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :xl="14">
        <div class="panel-card">
          <h3>交付重点</h3>
          <a-timeline>
            <a-timeline-item color="green">多账户 Cloudflare 凭证加密存储与统一调度</a-timeline-item>
            <a-timeline-item color="blue">DNS 记录分页、筛选、增删改查与批量操作</a-timeline-item>
            <a-timeline-item color="orange">Worker 层权限校验、异常格式化与请求限流</a-timeline-item>
          </a-timeline>
        </div>
      </a-col>
      <a-col :xs="24" :xl="10">
        <div class="panel-card">
          <h3>快速开始</h3>
          <div class="quick-start-list">
            <div class="quick-start-item quick-start-item--info">
              <span class="quick-start-item__step">步骤 1</span>
              <strong class="quick-start-item__title">添加 Cloudflare 账户</strong>
              <p class="quick-start-item__description">
                进入“账户管理”，填写账户名称、邮箱与 API Token 或 Global API Key，并执行连接测试。
              </p>
            </div>
            <div class="quick-start-item quick-start-item--success">
              <span class="quick-start-item__step">步骤 2</span>
              <strong class="quick-start-item__title">切换账户并选择域名</strong>
              <p class="quick-start-item__description">
                进入“DNS 管理”，先切换目标账户，再选择对应的域名 Zone 加载解析记录。
              </p>
            </div>
            <div class="quick-start-item quick-start-item--warning">
              <span class="quick-start-item__step">本地调试</span>
              <strong class="quick-start-item__title">默认管理口令</strong>
              <p class="quick-start-item__description">
                请求头使用 <code>x-admin-token</code>，默认值为 <code>local-dev-token</code>。
              </p>
            </div>
          </div>
        </div>
      </a-col>
    </a-row>
  </div>
</template>
