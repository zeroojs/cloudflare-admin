# Mail and Security

The project already uses a unified HTML mail template for registration, password reset, and password security notifications.

## Current Email Scenarios

- registration verification code
- password reset verification code
- password reset success notification
- password change success notification
- admin password reset notification

## Mail Template Sources

The style is adapted from Cloudflare email design and customized for this system:

- `email-template/cloudflare邮件模板.html`
- `api/mail.ts`

## Delivery Method

The project currently uses an external mail API:

- endpoint: `https://tmapi.wxin.org/api/send_mail`
- auth headers:
  - `Authorization: Bearer <MAIL_API_TOKEN>`
  - `x-custom-auth: <MAIL_API_CUSTOM_AUTH>`

## Why Secrets Are Used

Mail credentials are sensitive, so they:

- must not live in the frontend
- must not be committed to a public repository
- should be injected through Worker Secrets or local `.dev.vars`

## Password and Security Design

- user passwords are hashed with PBKDF2
- Cloudflare account credentials are encrypted with AES-GCM
- session tokens are stored in KV
- super admin identity is controlled by environment variables

## Recommended Hardening

- narrow `ALLOWED_ORIGIN` from `*` to a whitelist
- add login anomaly notifications
- add audit logs
- enforce stricter request origin checks
