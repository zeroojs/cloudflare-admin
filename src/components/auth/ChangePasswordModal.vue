<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'

import { changePassword } from '@/services/auth'

const open = defineModel<boolean>('open', { required: true })
const submitting = ref(false)
const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const passwordMatched = computed(
  () => !form.confirmPassword || form.newPassword === form.confirmPassword,
)

function resetForm() {
  form.currentPassword = ''
  form.newPassword = ''
  form.confirmPassword = ''
}

async function handleSubmit() {
  if (!passwordMatched.value) {
    message.warning('两次输入的新密码不一致')
    return
  }

  submitting.value = true
  try {
    await changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    })
    message.success('密码修改成功')
    open.value = false
    resetForm()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '密码修改失败')
  } finally {
    submitting.value = false
  }
}

watch(open, (value) => {
  if (!value) {
    resetForm()
  }
})
</script>

<template>
  <a-modal
    v-model:open="open"
    title="修改密码"
    ok-text="确认修改"
    cancel-text="取消"
    :confirm-loading="submitting"
    @ok="handleSubmit"
  >
    <a-form layout="vertical">
      <a-form-item label="当前密码" required>
        <a-input-password v-model:value="form.currentPassword" placeholder="请输入当前密码" />
      </a-form-item>
      <a-form-item label="新密码" required extra="密码长度至少为 8 位">
        <a-input-password v-model:value="form.newPassword" placeholder="请输入新密码" />
      </a-form-item>
      <a-form-item
        label="确认新密码"
        required
        :validate-status="passwordMatched ? '' : 'error'"
        :help="passwordMatched ? '' : '两次输入的新密码不一致'"
      >
        <a-input-password v-model:value="form.confirmPassword" placeholder="请再次输入新密码" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
