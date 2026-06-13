# Quick Start

This page shows the shortest path to run Cloudflare Admin locally.

## Requirements

- Node.js 18 or newer
- npm
- A Cloudflare account
- Available credentials for the mail sending API

## 1. Clone the Repository and Install Dependencies

```bash
git clone https://github.com/zeroojs/cloudflare-admin.git
cd cloudflare-admin
npm install
```

## 2. Prepare Worker Configuration

Regular variables are already defined in `wrangler.worker.jsonc`. Put local secrets in `.dev.vars`:

```txt
MAIL_API_TOKEN=replace-with-local-mail-api-token
MAIL_API_CUSTOM_AUTH=replace-with-local-mail-api-custom-auth
```

You can also adjust `SUPER_ADMIN_EMAIL`, `MAIL_API_URL`, or rate limit settings in `wrangler.worker.jsonc`.

## 3. Start the Frontend

```bash
npm run dev
```

## 4. Start the Worker

```bash
npm run dev:worker
```

## 5. Start the Documentation Site

```bash
npm run docs:dev
```

## 6. Optional Checks

```bash
npm run check
npm run test:run
```

## Recommended Terminal Setup

1. `npm run dev`
2. `npm run dev:worker`
3. `npm run docs:dev`

## Production Addresses

- Frontend: `https://cfadmin.letssl.cn/`
- API: `https://cloudflare-admin-worker-api.letssl.cn`

## Next

- Read [Architecture](/en/guide/architecture)
- Continue to [Deploy to Cloudflare](/en/guide/deployment)
