# Open Source

Cloudflare Admin is maintained as an open-source project, so the documentation is written for users, contributors, and maintainers.

## Repository

- GitHub: `https://github.com/zeroojs/cloudflare-admin.git`

Clone the project locally:

```bash
git clone https://github.com/zeroojs/cloudflare-admin.git
cd cloudflare-admin
npm install
```

## Repository Layout

```text
src/                 Frontend pages, components, stores, and composables
api/                 Cloudflare Worker backend
shared/              Shared frontend/backend types
docs/                VitePress guides and reference docs
email-template/      Email template reference files
.trae/documents/     Product and technical design documents
```

## Recommended Maintenance Rules

- Update `README.md` and `docs/` when adding visible features
- Keep environment variables and secrets documented
- Add focused tests for important user-facing behavior
- Update guides whenever APIs, permissions, or deployment change

## Good Contribution Areas

- Login alert emails
- Custom domains and multi-environment setup
- Audit logs and operation history pages
- Documentation internationalization
- More complete API examples and error code docs

## Docs and Source Code

- `README.md` gives the project overview
- `docs/` holds the structured guides and references
- `api/` and `src/` contain the implementation

For open-source maintenance, `README.md + VitePress docs + code comments` works much better than relying on a single document.
