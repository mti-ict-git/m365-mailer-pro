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
