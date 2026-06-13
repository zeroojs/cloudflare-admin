<script setup lang="ts">
import { message } from 'ant-design-vue'
import { computed, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { sendRegisterCode } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const sendingCode = ref(false)
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
    const result = await sendRegisterCode({
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
    message.warning('两次输入的密码不一致')
    return
  }

  if (!form.emailCode) {
    message.warning('请输入邮箱验证码')
    return
  }

  try {
    await authStore.register({
      email: form.email,
      password: form.password,
      emailCode: form.emailCode,
    })
    message.success('注册成功')
    const redirect =
      typeof route.query.redirect === 'string' && route.query.redirect
        ? route.query.redirect
        : '/dashboard'
    await router.replace(redirect)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '注册失败')
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
        <h1 class="auth-card__title">邮箱注册</h1>
        <p class="auth-card__description">创建独立账号后，后续添加的 Cloudflare 账户、域名缓存与 DNS 操作都会绑定到当前登录用户。</p>
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
          label="登录密码"
          name="password"
          :rules="[
            { required: true, message: '请输入登录密码' },
            { min: 8, message: '密码长度至少为 8 位' },
          ]"
        >
          <a-input-password v-model:value="form.password" placeholder="请设置登录密码" />
        </a-form-item>
        <a-form-item
          label="确认密码"
          name="confirmPassword"
          :validate-status="passwordMatched ? '' : 'error'"
          :help="passwordMatched ? '' : '两次输入的密码不一致'"
          :rules="[{ required: true, message: '请再次输入登录密码' }]"
        >
          <a-input-password
            v-model:value="form.confirmPassword"
            placeholder="请再次输入登录密码"
          />
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
        <a-button type="primary" block html-type="submit" :loading="authStore.loading">
          注册并登录
        </a-button>
      </a-form>

      <div class="auth-card__footer">
        <span>已有账号？</span>
        <RouterLink to="/login">返回登录</RouterLink>
      </div>
    </div>
  </div>
</template>
