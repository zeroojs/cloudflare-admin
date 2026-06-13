<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { resetPasswordByEmail, sendPasswordResetCode } from '@/services/auth'

const router = useRouter()
const sendingCode = ref(false)
const submitting = ref(false)
const cooldownSeconds = ref(0)
let cooldownTimer: number | null = null

const form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  emailCode: '',
})

const passwordMatched = computed(
  () => !form.confirmPassword || form.password === form.confirmPassword,
)

function startCooldown(seconds: number) {
  cooldownSeconds.value = seconds

  if (cooldownTimer) {
    window.clearInterval(cooldownTimer)
  }

  cooldownTimer = window.setInterval(() => {
    if (cooldownSeconds.value <= 1) {
      cooldownSeconds.value = 0
      if (cooldownTimer) {
        window.clearInterval(cooldownTimer)
        cooldownTimer = null
      }
      return
    }

    cooldownSeconds.value -= 1
  }, 1000)
}

async function handleSendCode() {
  if (!form.email) {
    message.warning('请先输入登录邮箱')
    return
  }

  sendingCode.value = true
  try {
    const result = await sendPasswordResetCode({
      email: form.email,
    })
    startCooldown(result.retryAfterSeconds)
    message.success(`验证码已发送到 ${result.email}`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '验证码发送失败')
  } finally {
    sendingCode.value = false
  }
}

async function handleSubmit() {
  if (!passwordMatched.value) {
    message.warning('两次输入的新密码不一致')
    return
  }

  if (!form.emailCode) {
    message.warning('请输入邮箱验证码')
    return
  }

  submitting.value = true
  try {
    await resetPasswordByEmail({
      email: form.email,
      password: form.password,
      emailCode: form.emailCode,
    })
    message.success('密码重置成功，请使用新密码登录')
    await router.replace('/login')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '密码重置失败')
  } finally {
    submitting.value = false
  }
}

onUnmounted(() => {
  if (cooldownTimer) {
    window.clearInterval(cooldownTimer)
  }
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-card__header">
        <p class="auth-card__eyebrow">Cloudflare Admin</p>
        <h1 class="auth-card__title">忘记密码</h1>
        <p class="auth-card__description">通过邮箱验证码重置登录密码，重置完成后请重新登录。</p>
      </div>

      <a-form layout="vertical" :model="form" @finish="handleSubmit">
        <a-form-item
          label="登录邮箱"
          name="email"
          :rules="[
            { required: true, message: '请输入登录邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
          ]"
        >
          <a-input v-model:value="form.email" placeholder="admin@example.com" />
        </a-form-item>
        <a-form-item
          label="新密码"
          name="password"
          :rules="[
            { required: true, message: '请输入新密码' },
            { min: 8, message: '新密码长度至少为 8 位' },
          ]"
        >
          <a-input-password v-model:value="form.password" placeholder="请输入新密码" />
        </a-form-item>
        <a-form-item
          label="确认新密码"
          name="confirmPassword"
          :validate-status="passwordMatched ? '' : 'error'"
          :help="passwordMatched ? '' : '两次输入的新密码不一致'"
          :rules="[{ required: true, message: '请再次输入新密码' }]"
        >
          <a-input-password v-model:value="form.confirmPassword" placeholder="请再次输入新密码" />
        </a-form-item>
        <a-form-item
          label="邮箱验证码"
          name="emailCode"
          :rules="[{ required: true, message: '请输入邮箱验证码' }]"
        >
          <a-space-compact block>
            <a-input
              v-model:value="form.emailCode"
              placeholder="请输入 6 位邮箱验证码"
              maxlength="6"
            />
            <a-button
              :loading="sendingCode"
              :disabled="cooldownSeconds > 0"
              @click="handleSendCode"
            >
              {{ cooldownSeconds > 0 ? `${cooldownSeconds}s 后重发` : '发送验证码' }}
            </a-button>
          </a-space-compact>
        </a-form-item>
        <a-button type="primary" block html-type="submit" :loading="submitting">
          重置密码
        </a-button>
      </a-form>

      <div class="auth-card__footer">
        <span>想起密码了？</span>
        <RouterLink to="/login">返回登录</RouterLink>
      </div>
    </div>
  </div>
</template>
