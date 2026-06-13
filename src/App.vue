<script setup lang="ts">
import { computed } from 'vue'
import { theme as antdTheme } from 'ant-design-vue'

import { useTheme } from '@/composables/useTheme'

const { resolvedTheme } = useTheme()

const antdConfig = computed(() => ({
  algorithm:
    resolvedTheme.value === 'dark'
      ? antdTheme.darkAlgorithm
      : antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#f6821f',
    colorLink: '#f6821f',
    colorInfo: '#f6821f',
    borderRadius: 6,
    colorBgBase: resolvedTheme.value === 'dark' ? 'oklch(10% 0 0)' : '#fcfcfc',
    colorTextBase: resolvedTheme.value === 'dark' ? '#ffffff' : '#13233e',
    colorBorderSecondary:
      resolvedTheme.value === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#f2c7a4',
  },
}))
</script>

<template>
  <a-config-provider :theme="antdConfig">
    <router-view />
  </a-config-provider>
</template>
