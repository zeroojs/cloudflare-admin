# Accounts and Zone Cache

One of the key values of Cloudflare Admin is aggregating multiple Cloudflare accounts into a single console.

## Account Management

The project supports:

- creating accounts
- editing accounts
- deleting accounts
- verifying credentials
- enabling and disabling accounts

Supported auth modes:

- `apiToken`
- `globalApiKey`

## How Credentials Are Stored

- the frontend never persists Cloudflare credentials
- credentials are only submitted to the Worker
- the Worker encrypts them with `ENCRYPTION_SECRET`
- encrypted values are then written into `ACCOUNT_STORE`

## Why Zone Cache Exists

Cloudflare zone lists are distributed by account. Loading every account on every page view would cause:

- more API requests
- slower account switching
- worse global zone search

Because of that, the project caches zone lists in KV and uses them as a global lookup source.

## Sync Modes

Two sync modes are supported:

- manual sync
- scheduled sync

The Worker cron is:

```text
0 19 * * *
```

This maps to 03:00 in Beijing time.

## Global vs Personal Views

- regular users read only their own accounts and cached zones
- admins and super admins read all accounts and the aggregated zone cache
