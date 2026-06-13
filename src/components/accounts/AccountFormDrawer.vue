<script setup lang="ts">
import type { CloudflareAccount, CloudflareAccountInput } from '@shared/types'

import { computed, reactive, watch } from 'vue'

const props = defineProps<{
  open: boolean
  currentAccount?: CloudflareAccount | null
  submitting: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [value: CloudflareAccountInput]
}>()

const form = reactive<CloudflareAccountInput>({
  name: '',
  email: '',
  authType: 'apiToken',
  apiToken: '',
  globalApiKey: '',
  note: '',
  enabled: true,
})

const title = computed(() =>
  props.currentAccount ? '编辑 Cloudflare 账户' : '新增 Cloudflare 账户',
)

function resetForm() {
  form.name = props.currentAccount?.name ?? ''
  form.email = props.currentAccount?.email ?? ''
  form.authType = props.currentAccount?.authType ?? 'apiToken'
  form.apiToken = ''
  form.globalApiKey = ''
  form.note = props.currentAccount?.note ?? ''
  form.enabled = props.currentAccount?.enabled ?? true
}

watch(
  () => [props.open, props.currentAccount],
  () => {
    resetForm()
  },
  { immediate: true },
)

function handleSubmit() {
  emit('submit', {
    ...form,
    apiToken: form.apiToken || undefined,
    globalApiKey: form.globalApiKey || undefined,
  })
}
</script>

<template>
  <a-drawer
    :open="open"
    :title="title"
    width="460"
    destroy-on-close
    @close="emit('update:open', false)"
  >
    <a-form layout="vertical" :model="form" @finish="handleSubmit">
      <a-form-item
        label="账户名称"
        name="name"
        :rules="[{ required: true, message: '请输入账户名称' }]"
      >
        <a-input v-model:value="form.name" placeholder="例如：主运营账户" />
      </a-form-item>
      <a-form-item
        label="账户邮箱"
        name="email"
        :rules="[{ required: true, message: '请输入账户邮箱' }]"
      >
        <a-input v-model:value="form.email" placeholder="admin@example.com" />
      </a-form-item>
      <a-form-item label="认证方式" name="authType">
        <a-radio-group v-model:value="form.authType">
          <a-radio-button value="apiToken">API Token</a-radio-button>
          <a-radio-button value="globalApiKey">Global API Key</a-radio-button>
        </a-radio-group>
      </a-form-item>
      <a-form-item
        v-if="form.authType === 'apiToken'"
        label="API Token"
        name="apiToken"
        :rules="[{ required: !currentAccount, message: '请输入 API Token' }]"
      >
        <a-input-password
          v-model:value="form.apiToken"
          placeholder="仅在创建或更新凭证时填写"
        />
      </a-form-item>
      <a-form-item
        v-else
        label="Global API Key"
        name="globalApiKey"
        :rules="[{ required: !currentAccount, message: '请输入 Global API Key' }]"
      >
        <a-input-password
          v-model:value="form.globalApiKey"
          placeholder="仅在创建或更新凭证时填写"
        />
      </a-form-item>
      <a-form-item label="备注" name="note">
        <a-textarea
          v-model:value="form.note"
          :auto-size="{ minRows: 3, maxRows: 5 }"
          placeholder="账户用途、环境说明等"
        />
      </a-form-item>
      <a-form-item label="账户状态" name="enabled">
        <a-switch v-model:checked="form.enabled" checked-children="启用" un-checked-children="停用" />
      </a-form-item>
      <div class="drawer-footer">
        <a-space>
          <a-button @click="emit('update:open', false)">取消</a-button>
          <a-button type="primary" html-type="submit" :loading="submitting">
            保存账户
          </a-button>
        </a-space>
      </div>
    </a-form>
  </a-drawer>
</template>
