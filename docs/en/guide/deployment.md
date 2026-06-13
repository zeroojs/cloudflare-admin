# Deploy to Cloudflare

This project uses a separated deployment model:

- frontend on Cloudflare Pages
- backend on Cloudflare Workers

## Production Addresses

- Frontend: `https://cfadmin.letssl.cn/`
- API: `https://cloudflare-admin-worker-api.letssl.cn`
- Docs: `https://cf-admin-doc.letssl.cn`

## 1. Deploy the Worker

Config file:

- `wrangler.worker.jsonc`

Deploy:

```bash
npm run deploy:worker
```

Dry run:

```bash
npm run deploy:worker:dry-run
```

## 2. Configure Worker Secrets

```bash
npx wrangler secret put MAIL_API_TOKEN --config wrangler.worker.jsonc
npx wrangler secret put MAIL_API_CUSTOM_AUTH --config wrangler.worker.jsonc
```

## 3. Deploy the Pages Frontend

Config file:

- `wrangler.jsonc`

Build first:

```bash
npm run build
```

Deploy next:

```bash
npm run deploy:pages
```

## 4. Deploy the Documentation Site

```bash
npm run deploy:docs
```

## 5. Configure Custom Domains

Recommended production domains:

- frontend: `https://cfadmin.letssl.cn/`
- API: `https://cloudflare-admin-worker-api.letssl.cn`
- docs: `https://cf-admin-doc.letssl.cn`

Make sure the frontend bootstrap API address and runtime API address are consistent.

## 6. Verify Production

At minimum, verify:

- `GET /api/health`
- login
- registration email flow
- password reset email flow
- DNS queries and edits
- user management
