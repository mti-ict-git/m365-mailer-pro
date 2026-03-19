# M365 Mailer Pro

M365 Mailer Pro is a hybrid-ready web dashboard for campaign delivery through Microsoft 365 with LDAP authentication.

## Stack

- Frontend: Vite, React, TypeScript, TailwindCSS, Shadcn UI
- Backend: Node.js, Express, ldapts
- Config data: JSON files in `data/`

## Directory Overview

- `src/` frontend application
- `backend/` API server for authentication and configuration APIs
- `data/` reusable configuration data and email templates

## LDAP Login

The login flow uses LDAP with `sAMAccountName` as the username attribute.
The backend also accepts UPN format and domain-assisted lookup fallback.

API endpoint:

- `POST /api/auth/login`

Request body:

```json
{
  "username": "john.doe",
  "password": "your-password",
  "domain": "mti.local"
}
```

Response body:

```json
{
  "user": {
    "username": "john.doe",
    "displayName": "John Doe",
    "email": "john.doe@company.com",
    "domain": "mti.local",
    "department": "IT",
    "title": "Engineer",
    "distinguishedName": "CN=John Doe,OU=Users,DC=example,DC=com"
  }
}
```

## Backend Configuration APIs

- `GET /api/health`
- `GET /api/auth/settings`
- `POST /api/auth/settings`
- `POST /api/auth/settings/test-email`
- `GET /api/auth/templates`

## Campaign APIs

- `GET /api/campaigns`
- `GET /api/campaigns/:id`
- `POST /api/campaigns`
- `PUT /api/campaigns/:id`
- `DELETE /api/campaigns/:id`
- `POST /api/campaigns/:id/dispatch`
- `GET /api/logs`

`Dashboard`, `Campaigns`, `Campaign Detail`, `Logs`, and `New Campaign` pages now use live backend APIs and PostgreSQL data.

Campaign create supports optional attachments:

- `POST /api/campaigns`
- Request body can include `attachments` array:
  - `name` (string)
  - `contentType` (string)
  - `contentBytes` (base64 string)
- Limits: max 5 files, max 3MB per file, max 10MB total.
- Campaigns are dispatched asynchronously after creation; status transitions from `scheduled`/`sending` to `completed` or `failed`.
- `GET /api/campaigns/:id` also returns `recipients` for edit flow prefill.

## Authentication Status Codes

- `200` login success.
- `401` invalid username/password.
- `503` LDAP service unavailable, certificate issue, or backend LDAP configuration is incomplete.

## Environment Variables

Set LDAP and service configuration in `.env`:

- `LDAP_URL`
- `LDAP_BASE_DN`
- `BIND_DN` or `LDAP_USERNAME`
- `BIND_PW` or `LDAP_PASSWORD`
- `BACKEND_PORT` (optional, default `3001`)
- `CORS_ORIGIN` (optional, default `http://localhost:8080`)
- `POSTGRES_URL`
- `POSTGRES_USERNAME` (optional override for URL username)
- `POSTGRES_PASSWORD` (optional override for URL password)
- `POSTGRES_DATABASE`
- `POSTGRES_SSL` (optional, `true` or `false`)
- `POSTGRES_SSL_REJECT_UNAUTHORIZED` (optional, `true` or `false`)
- `MS_GRAPH_CLIENT_ID`
- `MS_GRAPH_TENANT_ID`
- `MS_GRAPH_CLIENT_SECRET`
- `MS_GRAPH_SCOPE` (optional, default `https://graph.microsoft.com/.default`)

`GET /api/auth/settings` reads Microsoft Graph tenant/client values from environment variables and does not expose the client secret value.

Settings persistence order:

- Database (`app_settings`) as the primary source
- `.env` as fallback for Microsoft Graph credentials
- `data/settings.json` as static defaults

Test email endpoint:

- `POST /api/auth/settings/test-email`
- Request body: `{ "to": "recipient@company.com" }`
- Uses current saved Microsoft Graph settings and default sender.
- Also supports optional `attachments` with same payload shape and limits as campaign create.

## Database Schema Source

- SQL source of truth: `backend/sql/schema.sql`
- Current tables: `app_users`, `login_audits`, `campaigns`, `recipients`, `app_settings`

## Run Locally

Install dependencies:

```bash
npm install
npm --prefix backend install
```

Create database and apply schema:

```bash
npm run db:init
```

Run frontend:

```bash
npm run dev
```

Run backend:

```bash
npm run dev:backend
```

Run frontend and backend together:

```bash
npm run dev:full
```

Vite proxies `/api` calls to `http://localhost:3001` in development.

## Docker

Run full stack with Docker Compose:

```bash
docker compose up --build
```

Custom host ports:

```bash
export FRONTEND_PORT=8090
export BACKEND_PORT=3002
export CORS_ORIGIN=http://localhost:8090
docker compose up --build
```

Services:

- Frontend: `http://localhost:${FRONTEND_PORT}` (default `8080`)
- Backend API: `http://localhost:${BACKEND_PORT}` (default `3001`)

Compose provisions:

- frontend container using `Dockerfile` + Nginx reverse proxy for `/api`
- backend container using `backend/Dockerfile`
- external PostgreSQL connection via `POSTGRES_URL`

Backend container runs schema initialization (`npm --prefix backend run db:init`) on startup.

If your PostgreSQL server is outside Docker, set:

```bash
export POSTGRES_URL=postgresql://<user>:<password>@host.docker.internal:5432/<db_name>
export POSTGRES_SSL=false
export POSTGRES_SSL_REJECT_UNAUTHORIZED=false
```

If your PostgreSQL server requires TLS, set:

```bash
export POSTGRES_SSL=true
export POSTGRES_SSL_REJECT_UNAUTHORIZED=false
```

When you change frontend or backend code and want image-based production containers, rebuild:

```bash
docker compose up --build
```

For live development without rebuilding on every change:

```bash
docker compose -f docker-compose.dev.yml up
```

Live development with custom ports:

```bash
export FRONTEND_PORT=8090
export BACKEND_PORT=3002
export CORS_ORIGIN=http://localhost:8090
docker compose -f docker-compose.dev.yml up
```

Development services:

- frontend-dev with Vite hot reload
- backend-dev with Node watch mode
- both mounted from local source with live sync
