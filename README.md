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
- `GET /api/auth/templates`

## Authentication Status Codes

- `200` login success.
- `401` invalid username/password.
- `503` LDAP service unavailable or backend LDAP configuration is incomplete.

## Environment Variables

Set LDAP and service configuration in `.env`:

- `LDAP_URL`
- `LDAP_BASE_DN`
- `BIND_DN` or `LDAP_USERNAME`
- `BIND_PW` or `LDAP_PASSWORD`
- `BACKEND_PORT` (optional, default `3001`)
- `CORS_ORIGIN` (optional, default `http://localhost:8080`)
- `POSTGRES_URL`
- `POSTGRES_DATABASE`

## Database Schema Source

- SQL source of truth: `backend/sql/schema.sql`
- Current tables: `app_users`, `login_audits`, `campaigns`, `recipients`

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
