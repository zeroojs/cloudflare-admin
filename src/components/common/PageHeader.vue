<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <div class="page-header">
    <div>
      <p class="page-header__eyebrow">Cloudflare Admin</p>
      <h1 class="page-header__title">{{ title }}</h1>
      <p class="page-header__description">{{ description }}</p>
    </div>
    <div class="page-header__extra">
      <slot />
    </div>
  </div>
</template>
