# FAQ

## 1. Why are the frontend and API on different domains?

This makes it easier to deploy Pages and Workers independently, bind production domains, add gateway logic, and support multiple environments later.

## 2. Why does the frontend still need runtime API configuration?

Open-source projects often run in multiple environments. By storing the real API URL in KV, the backend target can change without rebuilding the frontend.

## 3. Why can't Cloudflare credentials stay in the frontend?

Cloudflare API Tokens and Global API Keys are highly sensitive. Storing them in the browser would expose them directly to clients.

## 4. Why use Cloudflare KV?

The current project prioritizes simplicity, lightweight deployment, and native integration with Workers, so KV stores users, sessions, verification codes, account data, and cached zones.

## 5. Why use an external mail API?

An existing external mail API made it faster to complete registration, password reset, and notification flows.

## 6. Is the project ready for direct commercial production use?

The current version already includes a strong functional baseline, but for production you should still add:

- audit logs
- a stricter CORS whitelist
- login anomaly alerts
- more granular permission controls
- better monitoring and alerting
