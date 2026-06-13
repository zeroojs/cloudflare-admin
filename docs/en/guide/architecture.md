# Architecture

Cloudflare Admin uses a separated frontend/backend architecture composed of a Vue console, a Cloudflare Worker API, Cloudflare KV, and the official Cloudflare APIs.

## Overview

```text
Vue 3 admin console
    ↓
Cloudflare Worker API gateway
    ↓
Cloudflare KV / Cloudflare APIs / external mail API
```

## Frontend Responsibilities

The frontend lives in `src/` and is responsible for:

- page rendering and layout
- form interaction and state management
- route guards
- HTTP request wrappers
- theme switching

Primary technologies:

- Vue 3
- TypeScript
- Vite
- Ant Design Vue
- Pinia
- Vue Router

## Backend Responsibilities

The backend lives in `api/` and runs on Cloudflare Workers. It handles:

- user authentication
- role and permission checks
- rate limiting
- input validation
- Cloudflare API proxying and normalization
- KV reads and writes
- email delivery

## KV Persistence Model

The `ACCOUNT_STORE` KV namespace stores:

- user profiles
- email indexes
- session tokens
- registration codes
- password reset codes
- Cloudflare accounts and encrypted credentials
- zone cache
- runtime configuration

Common prefixes:

- `auth-user:*`
- `auth-session:*`
- `auth-register-code:*`
- `auth-password-reset-code:*`
- `cf-account:*`
- `cf-zone-cache:*`
- `system:runtime-config`

## Runtime API Base URL

At startup the frontend loads:

- endpoint: `GET /api/runtime-config`
- storage key: `system:runtime-config`
- field: `apiBaseUrl`

This allows the real API base URL to change without rebuilding the frontend.

## Why Workers

- native fit for the Cloudflare platform
- good for API gateways and lightweight services
- direct access to KV, Cron, and Secrets
- fast and low-cost deployments
