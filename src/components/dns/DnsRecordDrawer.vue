<script setup lang="ts">
import type { DnsRecord, DnsRecordInput } from '@shared/types'

import { computed, reactive, watch } from 'vue'

import { dnsTypeOptions, getRecordContentLabel, ttlOptions } from '@/utils/dns'

const props = defineProps<{
  open: boolean
  currentRecord?: DnsRecord | null
  submitting: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [value: DnsRecordInput]
}>()

const form = reactive<DnsRecordInput>({
  type: 'A',
  name: '',
  content: '',
  ttl: 1,
  proxied: false,
  priority: 10,
  comment: '',
})

const title = computed(() =>
  props.currentRecord ? '编辑 DNS 记录' : '新增 DNS 记录',
)
const contentLabel = computed(() => getRecordContentLabel(form.type))
const showPriority = computed(() => form.type === 'MX')
const allowProxy = computed(() => form.type === 'A' || form.type === 'AAAA' || form.type === 'CNAME')

function resetForm() {
  form.type = props.currentRecord?.type ?? 'A'
  form.name = props.currentRecord?.name ?? ''
  form.content = props.currentRecord?.content ?? ''
  form.ttl = props.currentRecord?.ttl ?? 1
  form.proxied = props.currentRecord?.proxied ?? false
  form.priority = props.currentRecord?.priority ?? 10
  form.comment = props.currentRecord?.comment ?? ''
}

watch(
  () => [props.open, props.currentRecord],
  () => {
    resetForm()
  },
  { immediate: true },
)

watch(
  () => form.type,
  (nextType) => {
    if (nextType !== 'MX') {
      form.priority = undefined
    }

    if (!allowProxy.value) {
      form.proxied = false
    }
  },
)

function handleSubmit() {
  emit('submit', {
    ...form,
    priority: showPriority.value ? form.priority : undefined,
    proxied: allowProxy.value ? form.proxied : false,
  })
}
</script>

<template>
  <a-drawer
    :open="open"
    :title="title"
    width="500"
    destroy-on-close
    @close="emit('update:open', false)"
  >
    <a-form layout="vertical" :model="form" @finish="handleSubmit">
      <a-form-item label="记录类型" name="type">
        <a-select v-model:value="form.type" :options="dnsTypeOptions" />
      </a-form-item>
      <a-form-item
        label="主机记录"
        name="name"
        :rules="[{ required: true, message: '请输入主机记录' }]"
      >
        <a-input v-model:value="form.name" placeholder="www / @ / api" />
      </a-form-item>
      <a-form-item
        :label="contentLabel"
        name="content"
        :rules="[{ required: true, message: `请输入${contentLabel}` }]"
      >
        <a-input v-model:value="form.content" placeholder="输入记录值" />
      </a-form-item>
      <a-form-item label="TTL" name="ttl">
        <a-select v-model:value="form.ttl" :options="ttlOptions" />
      </a-form-item>
      <a-form-item v-if="showPriority" label="优先级" name="priority">
        <a-input-number v-model:value="form.priority" :min="0" class="w-full" />
      </a-form-item>
      <a-form-item v-if="allowProxy" label="代理状态" name="proxied">
        <a-switch v-model:checked="form.proxied" checked-children="开启" un-checked-children="关闭" />
      </a-form-item>
      <a-form-item label="备注" name="comment">
        <a-textarea
          v-model:value="form.comment"
          :auto-size="{ minRows: 2, maxRows: 4 }"
          placeholder="可选备注信息"
        />
      </a-form-item>
      <div class="drawer-footer">
        <a-space>
          <a-button @click="emit('update:open', false)">取消</a-button>
          <a-button type="primary" html-type="submit" :loading="submitting">
            保存记录
          </a-button>
        </a-space>
      </div>
    </a-form>
  </a-drawer>
</template>
