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

## Production-ish compose
Builds production images for the API and web client along with MongoDB:
```
docker compose -f infra/docker-compose.yml up --build
```
