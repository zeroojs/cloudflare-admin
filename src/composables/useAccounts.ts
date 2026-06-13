import type {
  AccountZoneSummary,
  CloudflareAccount,
  CloudflareAccountInput,
  CloudflareZone,
  SyncedZoneRecord,
  ZoneCacheSnapshot,
} from '@shared/types'

import { message } from 'ant-design-vue'
import { ref } from 'vue'

import {
  createAccount,
  listAccounts,
  listSyncedZones,
  listZones,
  removeAccount,
  syncZonesCache,
  updateAccount,
  verifyAccount,
} from '@/services/cloudflare'
import { useWorkspaceStore } from '@/stores/workspace'

export function useAccounts() {
  const workspace = useWorkspaceStore()
  const loadingAccounts = ref(false)
  const loadingZones = ref(false)
  const syncingZones = ref(false)
  const testingAccountId = ref('')
  const zoneSnapshot = ref<ZoneCacheSnapshot | null>(null)

  async function fetchAccounts() {
    loadingAccounts.value = true
    try {
      const accounts = await listAccounts()
      workspace.setAccounts(accounts)
      return accounts
    } finally {
      loadingAccounts.value = false
    }
  }

  async function fetchSyncedZones() {
    const snapshot = await listSyncedZones()
    zoneSnapshot.value = snapshot
    workspace.setSyncedZones(snapshot.items)

    return snapshot.items
  }

  async function saveAccount(
    payload: CloudflareAccountInput,
    current?: CloudflareAccount | null,
  ) {
    if (current) {
      await updateAccount(current.id, payload)
      message.success('账户已更新')
    } else {
      await createAccount(payload)
      message.success('账户已创建')
    }

    await fetchAccounts()
    await fetchAllZones()
    await fetchSyncedZones()
  }

  async function deleteAccountById(accountId: string) {
    await removeAccount(accountId)
    message.success('账户已删除')
    await fetchAccounts()
    await fetchAllZones()
    await fetchSyncedZones()
  }

  async function verifyAccountById(accountId: string) {
    testingAccountId.value = accountId
    try {
      const result = await verifyAccount(accountId)
      message.success(`连接测试成功，当前可访问域名 ${result.zoneCount} 个`)
      await fetchAccounts()
      await fetchAllZones()
      await fetchSyncedZones()
      return result
    } finally {
      testingAccountId.value = ''
    }
  }

  async function fetchZones(accountId: string): Promise<CloudflareZone[]> {
    if (!accountId) {
      workspace.setZones('', [])
      return []
    }

    loadingZones.value = true
    try {
      const zones = await listZones(accountId)
      workspace.setZones(accountId, zones)
      return zones
    } finally {
      loadingZones.value = false
    }
  }

  async function fetchAllZones(): Promise<AccountZoneSummary[]> {
    const availableAccounts =
      workspace.accounts.length > 0 ? workspace.accounts : await fetchAccounts()

    loadingZones.value = true
    try {
      const results = await Promise.all(
        availableAccounts.map(async (account) => {
          try {
            const zones = await listZones(account.id)
            workspace.setZones(account.id, zones)
            return zones.map((zone) => ({
              ...zone,
              accountId: account.id,
              accountName: account.name,
              accountEmail: account.email,
            }))
          } catch {
            workspace.setZones(account.id, [])
            return []
          }
        }),
      )

      if (workspace.selectedAccountId) {
        workspace.setSelectedAccount(workspace.selectedAccountId)
      }

      return results.flat()
    } finally {
      loadingZones.value = false
    }
  }

  async function syncAllZones() {
    syncingZones.value = true
    try {
      const snapshot = await syncZonesCache()
      zoneSnapshot.value = snapshot
      workspace.setSyncedZones(snapshot.items)
      message.success(`域名同步完成，共同步 ${snapshot.totalZones} 个域名`)
      return snapshot
    } finally {
      syncingZones.value = false
    }
  }

  function getZoneOptions(accountId?: string): SyncedZoneRecord[] {
    if (!accountId) {
      return workspace.syncedZones
    }

    return workspace.syncedZones.filter((item) => item.accountId === accountId)
  }

  return {
    loadingAccounts,
    loadingZones,
    syncingZones,
    testingAccountId,
    zoneSnapshot,
    workspace,
    fetchAccounts,
    fetchSyncedZones,
    fetchAllZones,
    fetchZones,
    getZoneOptions,
    saveAccount,
    deleteAccountById,
    verifyAccountById,
    syncAllZones,
  }
}
