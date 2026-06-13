# 接口总览

本页汇总当前项目中的主要接口分类。

## 认证接口

- `POST /api/auth/register-code`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/password-reset-code`
- `POST /api/auth/password-reset`
- `POST /api/auth/change-password`
- `GET /api/auth/me`
- `POST /api/auth/logout`

## 用户管理接口

- `GET /api/users`
- `PUT /api/users/:id/role`
- `PUT /api/users/:id/reset-password`

## Cloudflare 账户接口

- `GET /api/accounts`
- `POST /api/accounts`
- `PUT /api/accounts/:id`
- `DELETE /api/accounts/:id`
- `POST /api/accounts/:id/verify`
- `GET /api/accounts/:id/zones`

## 域名缓存接口

- `GET /api/zones-cache`
- `POST /api/zones-cache/sync`

## DNS 接口

- `GET /api/dns-records`
- `POST /api/dns-records`
- `PUT /api/dns-records/:id`
- `DELETE /api/dns-records/:id`
- `POST /api/dns-records/batch-delete`
- `POST /api/dns-records/batch-proxied`

## 运行时配置接口

- `GET /api/runtime-config`
- `PUT /api/runtime-config`

## 健康检查接口

- `GET /api/health`
