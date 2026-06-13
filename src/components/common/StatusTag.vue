<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    status: 'success' | 'warning' | 'error' | 'processing' | 'default'
    text: string
  }>(),
  {
    status: 'default',
  },
)

const color = computed(() => {
  switch (props.status) {
    case 'success':
      return 'success'
    case 'warning':
      return 'warning'
    case 'error':
      return 'error'
    case 'processing':
      return 'processing'
    default:
      return 'default'
  }
})
</script>

<template>
  <a-tag :color="color">{{ text }}</a-tag>
</template>
