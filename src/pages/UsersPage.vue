<script setup lang="ts">
import type { AuthUser, UpdateUserRoleInput, UserRole } from '@shared/types'

import { message } from 'ant-design-vue'
import { computed, onMounted, ref } from 'vue'

import AdminResetPasswordModal from '@/components/users/AdminResetPasswordModal.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime } from '@/utils/datetime'
import { listUsers, updateUserRole } from '@/services/users'

const authStore = useAuthStore()
const loading = ref(false)
const updatingUserId = ref('')
const resetPasswordOpen = ref(false)
const currentUser = ref<AuthUser | null>(null)
const users = ref<AuthUser[]>([])

const columns = [
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { title: '角色', dataIndex: 'role', key: 'role', width: 180 },
  { title: '最近登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 180 },
  { title: '注册时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 180 },
  { title: '操作', key: 'action', width: 220 },
]

const roleOptions = [
  { label: '普通用户', value: 'user' },
  { label: '管理员', value: 'admin' },
  { label: '超级管理员', value: 'super_admin' },
]

const roleLabelMap: Record<UserRole, string> = {
  user: '普通用户',
  admin: '管理员',
  super_admin: '超级管理员',
}

const canAssignRole = computed(() => authStore.isSuperAdmin)

function roleTagColor(role: UserRole) {
  if (role === 'super_admin') {
    return 'volcano'
  }

  if (role === 'admin') {
    return 'orange'
  }

  return 'default'
}

function getRoleLabel(role: UserRole) {
  return roleLabelMap[role]
}

function formatUserTime(record: AuthUser, field: 'createdAt' | 'updatedAt') {
  return formatDateTime(record[field])
}

function canEditRole(user: AuthUser) {
  return canAssignRole.value && user.role !== 'super_admin'
}

async function fetchUsers() {
  loading.value = true
  try {
    users.value = await listUsers()
  } finally {
    loading.value = false
  }
}

async function handleRoleChange(user: AuthUser, role: UpdateUserRoleInput['role']) {
  if (!canAssignRole.value) {
    return
  }

  updatingUserId.value = user.id
  try {
    const updatedUser = await updateUserRole(user.id, { role })
    users.value = users.value.map((item) => (item.id === updatedUser.id ? updatedUser : item))

    if (authStore.user?.id === updatedUser.id) {
      authStore.user = updatedUser
    }

    message.success(`已更新 ${updatedUser.email} 的角色`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '更新用户角色失败')
  } finally {
    updatingUserId.value = ''
  }
}

function handleRoleSelect(user: AuthUser, value: string | number) {
  void handleRoleChange(user, value as UpdateUserRoleInput['role'])
}

function openResetPassword(user: AuthUser) {
  currentUser.value = user
  resetPasswordOpen.value = true
}

onMounted(() => {
  void fetchUsers().catch((error) => {
    message.error(error instanceof Error ? error.message : '加载用户列表失败')
  })
})
</script>

<template>
  <div class="page-stack">
    <PageHeader
      title="用户管理"
      description="查看所有注册用户，并由超级管理员统一分配普通用户、管理员和超级管理员角色。"
    />

    <div class="panel-card">
      <a-table
        row-key="id"
        :columns="columns"
        :data-source="users"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'role'">
            <a-tag :color="roleTagColor(record.role)">
              {{ getRoleLabel(record.role) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'lastLoginAt'">
            {{ formatDateTime(record.lastLoginAt, '从未登录') }}
          </template>

          <template v-else-if="column.key === 'createdAt' || column.key === 'updatedAt'">
            {{ formatUserTime(record, column.key) }}
          </template>

          <template v-else-if="column.key === 'action'">
            <a-space v-if="authStore.isAdmin">
              <a-select
                v-if="canEditRole(record)"
                :value="record.role"
                style="width: 140px"
                :options="roleOptions"
                :loading="updatingUserId === record.id"
                @update:value="handleRoleSelect(record, $event)"
              />
              <span v-else-if="record.role === 'super_admin'" class="text-muted">
                超级管理员角色不可修改
              </span>
              <a-button size="small" @click="openResetPassword(record)">重置密码</a-button>
            </a-space>
            <span v-else class="text-muted">仅管理员可管理用户</span>
          </template>
        </template>
      </a-table>
    </div>

    <AdminResetPasswordModal
      v-if="currentUser"
      v-model:open="resetPasswordOpen"
      :user-id="currentUser.id"
      :user-email="currentUser.email"
    />
  </div>
</template>
