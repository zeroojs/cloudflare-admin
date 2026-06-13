# DNS Management

The DNS module is the core business feature of this project.

## Supported Operations

- query DNS records
- filter by record type
- filter by keyword
- create records
- edit records
- delete a single record
- batch delete
- batch toggle proxy status

## Supported Record Types

- `A`
- `AAAA`
- `CNAME`
- `MX`
- `TXT`

## Read Flow

1. The frontend selects an account and a zone.
2. The frontend calls `GET /api/dns-records`.
3. The Worker validates permissions and parameters.
4. The Worker reads the target account credentials.
5. The Worker calls the Cloudflare DNS API.
6. The Worker returns a normalized paginated response.

## Write Flow

Create, update, delete, and batch actions follow the same pattern:

1. The frontend submits action parameters.
2. The Worker validates input.
3. The Worker checks access to the target account.
4. The Worker calls the official Cloudflare API.
5. Errors are mapped into a frontend-friendly structure.
6. The frontend refreshes the list and shows feedback.

## Why All Traffic Goes Through the Worker

- Cloudflare credentials stay off the client
- permission checks stay centralized
- rate limiting stays centralized
- parameter validation stays centralized
- error formatting stays centralized

## Implementation Locations

Frontend:

- page: `src/pages/DnsPage.vue`
- composable: `src/composables/useDnsManagement.ts`
- service: `src/services/cloudflare.ts`

Backend:

- route entry: `api/index.ts`
- Cloudflare API wrapper: `api/cloudflare.ts`
- validators: `api/validators.ts`
