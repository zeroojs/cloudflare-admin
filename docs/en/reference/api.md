# API Overview

This page lists the main API groups in the current project.

## Authentication

- `POST /api/auth/register-code`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/password-reset-code`
- `POST /api/auth/password-reset`
- `POST /api/auth/change-password`
- `GET /api/auth/me`
- `POST /api/auth/logout`

## User Management

- `GET /api/users`
- `PUT /api/users/:id/role`
- `PUT /api/users/:id/reset-password`

## Cloudflare Accounts

- `GET /api/accounts`
- `POST /api/accounts`
- `PUT /api/accounts/:id`
- `DELETE /api/accounts/:id`
- `POST /api/accounts/:id/verify`
- `GET /api/accounts/:id/zones`

## Zone Cache

- `GET /api/zones-cache`
- `POST /api/zones-cache/sync`

## DNS

- `GET /api/dns-records`
- `POST /api/dns-records`
- `PUT /api/dns-records/:id`
- `DELETE /api/dns-records/:id`
- `POST /api/dns-records/batch-delete`
- `POST /api/dns-records/batch-proxied`

## Runtime Configuration

- `GET /api/runtime-config`
- `PUT /api/runtime-config`

## Health Check

- `GET /api/health`
