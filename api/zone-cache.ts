import type { SyncedZoneRecord, ZoneCacheSnapshot } from '@shared/types'

import { listZones } from './cloudflare'
import {
  getZoneCache,
  getAccountCredential,
  listAccounts,
  listUsers,
  saveZoneCache,
  type EnvBindings,
} from './store'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '域名同步失败'
}

export async function syncZoneCache(
  env: EnvBindings,
  userId: string,
): Promise<ZoneCacheSnapshot> {
  const accounts = await listAccounts(env, userId)
  const syncedAt = new Date().toISOString()

  const results = await Promise.all(
    accounts.map(async (account) => {
      try {
        const { credential } = await getAccountCredential(env, userId, account.id)
        const zones = await listZones(account, credential)
        const items: SyncedZoneRecord[] = zones.map((zone) => ({
          ...zone,
          accountId: account.id,
          accountName: account.name,
          accountEmail: account.email,
          syncedAt,
        }))

        return {
          items,
          failedAccount: null,
        }
      } catch (error) {
        return {
          items: [] as SyncedZoneRecord[],
          failedAccount: {
            accountId: account.id,
            accountEmail: account.email,
            message: getErrorMessage(error),
          },
        }
      }
    }),
  )

  const items = results
    .flatMap((item) => item.items)
    .sort((left, right) => left.name.localeCompare(right.name))
  const failedAccounts = results
    .map((item) => item.failedAccount)
    .filter(
      (
        item,
      ): item is {
        accountId: string
        accountEmail: string
        message: string
      } => Boolean(item),
    )

  const snapshot: ZoneCacheSnapshot = {
    items,
    syncedAt,
    totalAccounts: accounts.length,
    totalZones: items.length,
    failedAccounts,
  }

  await saveZoneCache(env, userId, snapshot)
  return snapshot
}

export async function syncAccountZoneCache(
  env: EnvBindings,
  userId: string,
  accountId: string,
): Promise<ZoneCacheSnapshot> {
  const syncedAt = new Date().toISOString()
  const accounts = await listAccounts(env, userId)
  const current = await getZoneCache(env, userId)
  const nextFailedAccounts = current.failedAccounts.filter((item) => item.accountId !== accountId)

  try {
    const { account, credential } = await getAccountCredential(env, userId, accountId)
    const zones = await listZones(account, credential)
    const accountItems: SyncedZoneRecord[] = zones.map((zone) => ({
      ...zone,
      accountId: account.id,
      accountName: account.name,
      accountEmail: account.email,
      syncedAt,
    }))

    const items = current.items
      .filter((item) => item.accountId !== accountId)
      .concat(accountItems)
      .sort((left, right) => left.name.localeCompare(right.name))

    const snapshot: ZoneCacheSnapshot = {
      items,
      syncedAt,
      totalAccounts: accounts.length,
      totalZones: items.length,
      failedAccounts: nextFailedAccounts,
    }

    await saveZoneCache(env, userId, snapshot)
    return snapshot
  } catch (error) {
    const snapshot: ZoneCacheSnapshot = {
      items: current.items
        .filter((item) => item.accountId !== accountId)
        .sort((left, right) => left.name.localeCompare(right.name)),
      syncedAt,
      totalAccounts: accounts.length,
      totalZones: current.items.filter((item) => item.accountId !== accountId).length,
      failedAccounts: [
        ...nextFailedAccounts,
        {
          accountId,
          accountEmail:
            accounts.find((account) => account.id === accountId)?.email ?? '',
          message: getErrorMessage(error),
        },
      ],
    }

    await saveZoneCache(env, userId, snapshot)
    return snapshot
  }
}

export async function syncAllZoneCaches(env: EnvBindings): Promise<void> {
  const users = await listUsers(env)

  await Promise.all(
    users.map(async (user) => {
      try {
        await syncZoneCache(env, user.id)
      } catch {
        await saveZoneCache(env, user.id, {
          items: [],
          syncedAt: new Date().toISOString(),
          totalAccounts: 0,
          totalZones: 0,
          failedAccounts: [],
        })
      }
    }),
  )
}
