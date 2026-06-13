<script setup lang="ts">
import {
  ApiOutlined,
  AppstoreOutlined,
  GlobalOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { computed, h, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import ChangePasswordModal from '@/components/auth/ChangePasswordModal.vue'
import { useAccounts } from '@/composables/useAccounts'
import { useTheme, type ThemeMode } from '@/composables/useTheme'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const changePasswordOpen = ref(false)
const authStore = useAuthStore()
const workspace = useWorkspaceStore()
const { fetchAccounts, fetchAllZones, loadingZones } = useAccounts()
const { themeMode, resolvedTheme, setThemeMode } = useTheme()

const selectedKeys = computed(() => [route.path])
const items = computed(() => {
  const nextItems = [
    {
      key: '/dashboard',
      icon: () => h(AppstoreOutlined),
      label: '系统总览',
    },
    {
      key: '/domains',
      icon: () => h(GlobalOutlined),
      label: '域名管理',
    },
    {
      key: '/accounts',
      icon: () => h(GlobalOutlined),
      label: '账户管理',
    },
    {
      key: '/dns',
      icon: () => h(ApiOutlined),
      label: 'DNS 管理',
    },
  ]

  if (authStore.isAdmin) {
    nextItems.push({
      key: '/users',
      icon: () => h(TeamOutlined),
      label: '用户管理',
    })
  }

  return nextItems
})
const themeOptions = [
  {
    label: h('span', { class: 'theme-option' }, '黑夜'),
    value: 'dark',
  },
  {
    label: h('span', { class: 'theme-option' }, '白天'),
    value: 'light',
  },
  {
    label: h('span', { class: 'theme-option' }, '自动'),
    value: 'auto',
  },
]
const groupedZones = computed(() =>
  workspace.accounts
    .map((account) => ({
      accountId: account.id,
      accountName: account.name,
      zones: workspace.allZones.filter((zone) => zone.accountId === account.id),
    }))
    .filter((group) => group.zones.length > 0),
)

function navigate({ key }: { key: string }) {
  void router.push(key)
}

function openZone(accountId: string, zoneId: string) {
  workspace.setSelectedAccount(accountId)
  workspace.setSelectedZone(zoneId)
  void router.push('/dns')
}

function handleThemeChange(value: string | number) {
  setThemeMode(value as ThemeMode)
}

async function handleLogout() {
  try {
    await authStore.logout()
    workspace.reset()
    message.success('已退出登录')
    await router.replace('/login')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '退出登录失败')
  }
}

onMounted(() => {
  void fetchAccounts()
    .then(() => fetchAllZones())
    .catch((error) => {
      message.error(error instanceof Error ? error.message : '加载侧边栏域名列表失败')
    })
})
</script>

<template>
  <a-layout class="app-shell">
    <a-layout-sider
      v-model:collapsed="collapsed"
      :trigger="null"
      collapsible
      breakpoint="lg"
      class="app-shell__sider"
    >
      <div class="brand-panel">
        <RouterLink to="/dashboard" class="brand-panel__logo">
          <span class="brand-panel__dot" />
          <span v-if="!collapsed">Cloudflare Admin</span>
        </RouterLink>
        <p v-if="!collapsed" class="brand-panel__meta">多账户 DNS 运维控制台</p>
      </div>
      <a-menu
        :theme="resolvedTheme === 'light' ? 'light' : 'dark'"
        mode="inline"
        :selected-keys="selectedKeys"
        :items="items"
        @click="navigate"
      />
      <div v-if="!collapsed" class="sider-zones">
        <div class="sider-zones__header">
          <span>全部域名</span>
          <a-spin size="small" :spinning="loadingZones" />
        </div>
        <div v-if="groupedZones.length" class="sider-zones__groups">
          <div
            v-for="group in groupedZones"
            :key="group.accountId"
            class="sider-zones__group"
          >
            <p class="sider-zones__group-title">{{ group.accountName }}</p>
            <button
              v-for="zone in group.zones"
              :key="`${zone.accountId}-${zone.id}`"
              type="button"
              class="sider-zones__item"
              :class="{
                'sider-zones__item--active':
                  workspace.selectedAccountId === zone.accountId &&
                  workspace.selectedZoneId === zone.id,
              }"
              @click="openZone(zone.accountId, zone.id)"
            >
              <span class="sider-zones__item-name">{{ zone.name }}</span>
              <span class="sider-zones__item-meta">{{ zone.status }}</span>
            </button>
          </div>
        </div>
        <a-empty v-else description="暂无域名" :image="false" />
      </div>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="app-shell__header">
        <a-button type="text" class="header-trigger" @click="collapsed = !collapsed">
          <component :is="collapsed ? MenuUnfoldOutlined : MenuFoldOutlined" />
        </a-button>
        <div class="header-title">
          <p>Cloudflare Domain & DNS Console</p>
          <span>Cloudflare 多账户域名 DNS 管理系统</span>
        </div>
        <div class="header-actions">
          <a-segmented
            :value="themeMode"
            :options="themeOptions"
            @update:value="handleThemeChange"
          />
          <a-divider type="vertical" />
          <span class="header-user">
            {{ authStore.user?.email }}
            <span v-if="authStore.user" class="header-user__role">
              {{
                authStore.user.role === 'super_admin'
                  ? '超级管理员'
                  : authStore.user.role === 'admin'
                    ? '管理员'
                    : '普通用户'
              }}
            </span>
          </span>
          <a-button @click="changePasswordOpen = true">修改密码</a-button>
          <a-button @click="handleLogout">退出登录</a-button>
        </div>
      </a-layout-header>
      <a-layout-content class="app-shell__content">
        <router-view />
      </a-layout-content>
    </a-layout>
    <ChangePasswordModal v-model:open="changePasswordOpen" />
  </a-layout>
</template>
