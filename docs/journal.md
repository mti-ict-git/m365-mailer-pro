# Journal

## 2026-03-19 20:43:53 WITA

- Added a new Express backend under `backend/` with LDAP login using `sAMAccountName`.
- Added LDAP authentication endpoint `POST /api/auth/login`.
- Added backend configuration endpoints `GET /api/auth/settings` and `GET /api/auth/templates`.
- Added JSON configuration sources under `data/settings.json` and `data/templates.json`.
- Updated frontend auth flow to use backend login API.
- Updated login UX text to explicitly use `sAMAccountName`.
- Updated campaign builder to load templates from backend configuration.
- Updated settings page to load backend settings data.
- Added Vite dev proxy for `/api` to backend service.
- Added root scripts for backend run commands.

## 2026-03-19 20:49:15 WITA

- Added `npm run dev:full` to run frontend and backend together.
- Added `concurrently` as a dev dependency for parallel local development.
- Updated README with the new combined development command.

## 2026-03-19 21:13:54 WITA

- Added PostgreSQL database bootstrap using `POSTGRES_URL` and `POSTGRES_DATABASE`.
- Added SQL schema source at `backend/sql/schema.sql` for reproducible deployments.
- Added `npm run db:init` command to create database and apply schema automatically.
- Added login audit persistence to `login_audits` table.
- Updated LDAP login error behavior to return `503` when LDAP service is unavailable.
- Ran database initialization successfully with the current environment configuration.

## 2026-03-19 21:21:15 WITA

- Added PostgreSQL credential override support via `POSTGRES_USERNAME` and `POSTGRES_PASSWORD`.
- Added PostgreSQL SSL environment options for remote database compatibility.
- Verified schema application by listing created tables in `emailBlasterDB`.
- Updated README with the expanded PostgreSQL environment variable list.

## 2026-03-19 21:32:05 WITA

- Investigated repeated `401` login failures for `widji.santoso`.
- Added LDAP fallback flow across `ldap://` and `ldaps://` connection attempts.
- Added fallback TLS strategy for internal/self-signed certificate environments.
- Added domain-assisted user lookup and UPN bind fallback during authentication.
- Preserved raw LDAP failure details in login audit records for troubleshooting.
- Verified successful login response for `widji.santoso` through `/api/auth/login`.

## 2026-03-19 21:43:34 WITA

- Wired `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_SECRET`, and `MS_GRAPH_SCOPE` into backend environment config.
- Updated settings API payload to include Microsoft Graph tenant/client/scope values from `.env`.
- Added `hasClientSecret` flag in settings payload to avoid exposing secret values to frontend.
- Updated settings page data binding to populate Tenant ID and Client ID from backend settings API.
- Updated README environment variable documentation for Microsoft Graph settings.

## 2026-03-19 21:51:04 WITA

- Added `app_settings` table into SQL schema source for persistent settings storage.
- Implemented backend settings persistence in PostgreSQL with singleton `app_settings` record.
- Added `POST /api/auth/settings` endpoint to save settings into database.
- Updated `GET /api/auth/settings` to read from database first, then `.env`, then `data/settings.json`.
- Kept Microsoft Graph client secret hidden from frontend response using `hasClientSecret` flag.
- Updated frontend Settings page Save action to persist values through backend API.
- Updated README with settings persistence order and new API endpoint.

## 2026-03-19 21:57:40 WITA

- Added backend service to send Microsoft Graph test emails from saved settings.
- Added `POST /api/auth/settings/test-email` endpoint for test email dispatch.
- Added Settings page test recipient input and `Send Test Email` button.
- Verified validation path with invalid email request returning `400`.
- Verified successful test send response using the backend endpoint.

## 2026-03-19 22:27:43 WITA

- Replaced frontend mock campaign and log usage with live API-based data loading.
- Added backend campaign APIs: `GET /api/campaigns`, `GET /api/campaigns/:id`, and `POST /api/campaigns`.
- Added backend delivery log API: `GET /api/logs`.
- Added PostgreSQL-backed campaign creation with recipient persistence and scheduled status.
- Added CSV upload parsing in campaign builder to replace placeholder upload behavior.
- Removed deprecated `src/lib/mock-data.ts` and replaced status color mapping with real component-local mapping.
- Replaced placeholder `Index` page with real app redirect behavior.
- Updated README with new campaign API documentation and live data usage.

## 2026-03-19 22:40:51 WITA

- Added campaign attachment support in backend create API and PostgreSQL schema (`attachments_json`).
- Added attachment validation with limits: max 5 files, max 3MB per file, max 10MB total.
- Extended test email service to optionally send attachments through Microsoft Graph.
- Added campaign builder attachment upload UI and payload submission.
- Added attachment display in campaign detail page.
- Updated README with campaign/test-email attachment payload documentation.

## 2026-03-19 22:49:48 WITA

- Added asynchronous campaign dispatcher to send scheduled campaigns automatically after creation.
- Added `POST /api/campaigns/:id/dispatch` endpoint for manual retry of pending campaigns.
- Added Microsoft Graph shared mail utilities for token and mail sending.
- Updated campaign delivery flow to mark recipients as `sent` or `failed` and finalize campaign status.
- Verified pending campaign can be retried and transitions to completed with sent logs.
