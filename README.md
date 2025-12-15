# Homelab Travel Planner

Monorepo scaffold for the travel planning app described in the project README. The repository uses npm workspaces to manage the API, web client, and shared types.

## Workspace layout
- `apps/api`: Express + TypeScript server with a `/health` endpoint.
- `apps/web`: React + Vite + TypeScript client that pings the API health check.
- `packages/shared`: Shared Zod schemas and types.
- `infra`: Docker Compose definitions for development and production-like setups.

## Development
1. Install dependencies: `npm install` (from repository root).
2. Start API: `npm run dev:api`.
3. Start web: `npm run dev:web`.

Alternatively, use Docker Compose for a full stack dev environment:
```
docker compose -f infra/docker-compose.dev.yml up --build
```

## Environment
- API (`apps/api`): set `PORT`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECURE=false` (true when served over HTTPS), `APP_BASE_URL=http://localhost:5173`.
- Web (`apps/web`): set `VITE_API_BASE_URL=http://localhost:4000`.
- Dev compose already wires example values for the secrets above.

## Auth (Phase 2)
The API now supports JWT auth with access/refresh tokens stored in httpOnly cookies:
- `POST /auth/register` – create account and receive cookies
- `POST /auth/login` – sign in and receive cookies
- `POST /auth/refresh` – refresh cookies via refresh token
- `POST /auth/logout` – clear cookies
- `GET /auth/me` – return the current user (requires access token)

The web client includes register/login forms and protects the dashboard route, redirecting unauthenticated users to `/login`.

## Production-ish compose
Builds production images for the API and web client along with MongoDB:
```
docker compose -f infra/docker-compose.yml up --build
```
