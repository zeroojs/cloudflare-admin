import type {
  AccountZoneSummary,
  CloudflareAccount,
  CloudflareZone,
  SyncedZoneRecord,
} from '@shared/types'

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useWorkspaceStore = defineStore('workspace', () => {
  const accounts = ref<CloudflareAccount[]>([])
  const zones = ref<CloudflareZone[]>([])
  const zonesByAccount = ref<Record<string, CloudflareZone[]>>({})
  const syncedZones = ref<SyncedZoneRecord[]>([])
  const selectedAccountId = ref('')
  const selectedZoneId = ref('')

  const selectedAccount = computed(
    () => accounts.value.find((item) => item.id === selectedAccountId.value) ?? null,
  )
  const selectedZone = computed(
    () =>
      syncedZones.value.find((item) => item.id === selectedZoneId.value) ??
      zones.value.find((item) => item.id === selectedZoneId.value) ??
      null,
  )
  const allZones = computed<AccountZoneSummary[]>(() =>
    accounts.value.flatMap((account) =>
      (zonesByAccount.value[account.id] ?? []).map((zone) => ({
        ...zone,
        accountId: account.id,
        accountName: account.name,
        accountEmail: account.email,
      })),
    ),
  )

  function setAccounts(nextAccounts: CloudflareAccount[]) {
    accounts.value = nextAccounts
    if (
      selectedAccountId.value &&
      !nextAccounts.some((item) => item.id === selectedAccountId.value)
    ) {
      selectedAccountId.value = nextAccounts[0]?.id ?? ''
    }
  }

  function setZones(accountId: string, nextZones: CloudflareZone[]) {
    if (accountId) {
      zonesByAccount.value = {
        ...zonesByAccount.value,
        [accountId]: nextZones,
      }
    }

    zones.value = nextZones

    if (selectedZoneId.value && !nextZones.some((item) => item.id === selectedZoneId.value)) {
      selectedZoneId.value = nextZones[0]?.id ?? ''
    }
  }

  function setSyncedZones(nextZones: SyncedZoneRecord[]) {
    syncedZones.value = nextZones

    if (selectedZoneId.value && !nextZones.some((item) => item.id === selectedZoneId.value)) {
      selectedZoneId.value = nextZones[0]?.id ?? ''
    }
  }

  function setSelectedAccount(accountId: string) {
    selectedAccountId.value = accountId
    zones.value = zonesByAccount.value[accountId] ?? []
    if (
      selectedZoneId.value &&
      !zones.value.some((item) => item.id === selectedZoneId.value)
    ) {
      selectedZoneId.value = zones.value[0]?.id ?? ''
    }
  }

  function setSelectedZone(zoneId: string) {
    selectedZoneId.value = zoneId
  }

  function reset() {
    accounts.value = []
    zones.value = []
    zonesByAccount.value = {}
    syncedZones.value = []
    selectedAccountId.value = ''
    selectedZoneId.value = ''
  }

  return {
    accounts,
    zones,
    zonesByAccount,
    syncedZones,
    allZones,
    selectedAccount,
    selectedAccountId,
    selectedZone,
    selectedZoneId,
    setAccounts,
    setZones,
    setSyncedZones,
    setSelectedAccount,
    setSelectedZone,
    reset,
  }
})
