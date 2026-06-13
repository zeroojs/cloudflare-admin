<script setup lang="ts">
import type { LoginInput } from '@shared/types'

import { message } from 'ant-design-vue'
import { reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const form = reactive<LoginInput>({
  email: '',
  password: '',
})

async function handleSubmit() {
  try {
    await authStore.login(form)
    message.success('登录成功')
    const redirect =
      typeof route.query.redirect === 'string' && route.query.redirect
        ? route.query.redirect
        : '/dashboard'
    await router.replace(redirect)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '登录失败')
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-card__header">
        <p class="auth-card__eyebrow">Cloudflare Admin</p>
        <h1 class="auth-card__title">邮箱登录</h1>
        <p class="auth-card__description">登录后即可查看并管理当前账号下绑定的 Cloudflare 账户与域名数据。</p>
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
          :rules="[{ required: true, message: '请输入登录密码' }]"
        >
          <a-input-password v-model:value="form.password" placeholder="请输入登录密码" />
        </a-form-item>
        <a-button type="primary" block html-type="submit" :loading="authStore.loading">
          登录
        </a-button>
      </a-form>

      <div class="auth-card__helper">
        <RouterLink to="/forgot-password">忘记密码？</RouterLink>
      </div>

      <div class="auth-card__footer">
        <span>还没有账号？</span>
        <RouterLink to="/register">立即注册</RouterLink>
      </div>
    </div>
  </div>
</template>
