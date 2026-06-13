<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, reactive, ref, watch } from 'vue'

import { resetUserPassword } from '@/services/users'

const props = defineProps<{
  userId: string
  userEmail: string
}>()

const open = defineModel<boolean>('open', { required: true })
const submitting = ref(false)
const form = reactive({
  newPassword: '',
  confirmPassword: '',
})

const passwordMatched = computed(
  () => !form.confirmPassword || form.newPassword === form.confirmPassword,
)

function resetForm() {
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
    await resetUserPassword(props.userId, {
      newPassword: form.newPassword,
    })
    message.success(`已重置 ${props.userEmail} 的密码`)
    open.value = false
    resetForm()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '重置密码失败')
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
    :title="`重置密码：${userEmail}`"
    ok-text="确认重置"
    cancel-text="取消"
    :confirm-loading="submitting"
    @ok="handleSubmit"
  >
    <a-alert
      type="warning"
      show-icon
      message="管理员重置密码无需邮箱验证，请确认后再执行。"
      class="mb-4"
    />
    <a-form layout="vertical">
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
