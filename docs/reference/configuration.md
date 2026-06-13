# 环境变量与 Secret

本页汇总 Cloudflare Admin 当前使用到的关键配置项。

## Worker 普通变量

以下变量通常写在 `wrangler.worker.jsonc` 的 `vars` 中：

| 变量名 | 说明 | 是否必填 |
| --- | --- | --- |
| `ADMIN_TOKEN` | 预留管理令牌 | 否 |
| `ENCRYPTION_SECRET` | 账户凭据加密与密码相关安全逻辑使用的密钥 | 是 |
| `MAIL_API_URL` | 邮件发送 API 地址 | 是 |
| `MAIL_FROM_NAME` | 邮件发件人名称 | 否 |
| `SUPER_ADMIN_EMAIL` | 超级管理员邮箱 | 是 |
| `MAIL_CODE_EXPIRE_MINUTES` | 验证码有效期 | 否 |
| `MAIL_CODE_RESEND_INTERVAL_SECONDS` | 验证码重发间隔秒数 | 否 |
| `ALLOWED_ORIGIN` | CORS 允许来源 | 是 |
| `RATE_LIMIT_MAX` | 限流窗口内最大请求数 | 否 |
| `RATE_LIMIT_WINDOW_MS` | 限流窗口时长 | 否 |

## Worker Secrets

| 变量名 | 说明 | 是否必填 |
| --- | --- | --- |
| `MAIL_API_TOKEN` | 邮件 API Bearer Token | 是 |
| `MAIL_API_CUSTOM_AUTH` | 邮件 API `x-custom-auth` 请求头 | 是 |

## 前端与运行时配置

| 配置项 | 说明 |
| --- | --- |
| `VITE_API_BASE_URL` | 前端冷启动时拉取运行时配置用的引导地址 |
| `apiBaseUrl` | 运行时真实业务 API 地址，存储在 KV 的 `system:runtime-config` |

## 当前正式地址

- 前端站点：`https://cfadmin.letssl.cn/`
- API 地址：`https://cloudflare-admin-worker-api.letssl.cn`
- 文档站点：`https://cf-admin-doc.letssl.cn`

## 本地开发文件

- `wrangler.worker.jsonc`
- `wrangler.jsonc`
- `.dev.vars`
- `.dev.vars.example`
