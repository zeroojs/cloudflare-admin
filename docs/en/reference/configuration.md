# Environment Variables and Secrets

This page summarizes the main configuration entries used by Cloudflare Admin.

## Worker Plain Variables

These values usually live in `wrangler.worker.jsonc` under `vars`:

| Variable | Description | Required |
| --- | --- | --- |
| `ADMIN_TOKEN` | Reserved admin token | No |
| `ENCRYPTION_SECRET` | Used for credential encryption and password-related security logic | Yes |
| `MAIL_API_URL` | Mail sending API endpoint | Yes |
| `MAIL_FROM_NAME` | Mail sender name | No |
| `SUPER_ADMIN_EMAIL` | Super admin email address | Yes |
| `MAIL_CODE_EXPIRE_MINUTES` | Verification code expiration time | No |
| `MAIL_CODE_RESEND_INTERVAL_SECONDS` | Cooldown for resending codes | No |
| `ALLOWED_ORIGIN` | Allowed CORS origin | Yes |
| `RATE_LIMIT_MAX` | Max requests per rate limit window | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window duration | No |

## Worker Secrets

| Variable | Description | Required |
| --- | --- | --- |
| `MAIL_API_TOKEN` | Mail API Bearer token | Yes |
| `MAIL_API_CUSTOM_AUTH` | Mail API `x-custom-auth` header value | Yes |

## Frontend and Runtime Configuration

| Item | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Bootstrap URL used by the frontend to fetch runtime config during startup |
| `apiBaseUrl` | Actual runtime business API URL stored in KV under `system:runtime-config` |

## Production Addresses

- Frontend: `https://cfadmin.letssl.cn/`
- API: `https://cloudflare-admin-worker-api.letssl.cn`
- Docs: `https://cf-admin-doc.letssl.cn`

## Local Development Files

- `wrangler.worker.jsonc`
- `wrangler.jsonc`
- `.dev.vars`
- `.dev.vars.example`
