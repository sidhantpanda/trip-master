# README — Homelab Travel Planner (Express + React/Vite + shadcn/ui + MongoDB)

This document is meant to be given to a coding LLM/agent to start building the app in **phases**, with **run/test checkpoints** after each phase.

**Stack constraints (must follow):**

* Backend: **Node.js + TypeScript + Express**
* Frontend: **React + Vite + TypeScript + shadcn/ui**
* DB: **MongoDB**
* Deployment: **Docker Compose for everything**
* Dev: **dev docker compose also spins up MongoDB** (and runs web/api in dev mode with hot reload)

---

## 0) Product Summary

A collaborative travel planning web app where users can:

* Register/login securely
* Create trips and generate day-by-day itineraries from natural language using an LLM provider (OpenAI, Anthropic, Gemini) configured per user
* Enrich itinerary with places + booking links
* Show daily routes on Google Maps (driving / transit / walking)
* Invite/join trips for collaboration (owner/editor/viewer)
* Use **offline mode for non-LLM features** (view/edit cached trips; no generation offline)

---

## 1) Repo Layout (Monorepo)

```
/apps
  /api              # Express + TS
  /web              # React + Vite + TS + shadcn/ui
/packages
  /shared           # zod schemas, shared types, utils
/infra
  docker-compose.yml        # production-ish
  docker-compose.dev.yml    # development (mongodb + api + web dev servers)
  caddy/ or nginx/          # optional reverse proxy configs
```

---

## 2) Key Technologies

### Backend (apps/api)

* Express + TypeScript
* Router: express.Router
* Validation: **zod**
* Auth: **JWT (access + refresh)** OR cookie-based sessions (recommended: JWT + httpOnly cookies)
* DB access: **Mongoose** (recommended for MongoDB with Express)
* Encryption: Node `crypto` (AES-256-GCM) for API keys at rest
* Rate limiting: `express-rate-limit`
* Logging: `pino` or `winston`

### Frontend (apps/web)

* React + Vite + TypeScript
* UI: **shadcn/ui** components
* Data fetching: TanStack Query
* Routing: React Router (or Vite + router)
* Offline: PWA via `vite-plugin-pwa` + IndexedDB (Dexie or idb)

### Maps

* Google Maps JavaScript API for display
* Directions API + Places API (backend) for route + place resolution

---

## 3) Required Environment Variables

### API (apps/api/.env)

* `PORT=4000`
* `MONGODB_URI=mongodb://mongodb:27017/travelplanner`
* `JWT_ACCESS_SECRET=...`
* `JWT_REFRESH_SECRET=...`
* `COOKIE_SECURE=false` (true behind HTTPS)
* `ENCRYPTION_KEY_BASE64=...` (32 bytes base64)
* `GOOGLE_MAPS_API_KEY=...`
* `APP_BASE_URL=http://localhost:5173`

### Web (apps/web/.env)

* `VITE_API_BASE_URL=http://localhost:4000`
* `VITE_GOOGLE_MAPS_API_KEY=...` (frontend key restricted by referrer)

> Note: Keep Maps backend key separate from frontend key if possible (IP restricted vs referrer restricted).

---

## 4) Data Model (MongoDB / Mongoose)

### User

* `email` (unique)
* `passwordHash`
* `name`
* `settings`:

  * `llmProvider` (`openai|anthropic|gemini`)
  * `llmModel` (string)
  * `encryptedApiKeys`: { openai?, anthropic?, gemini? }
  * `prefs`: pace/budget/interests/diet/mobility
  * `defaultTransportMode` (`driving|transit|walking`)
* timestamps

### Trip

* `title`, `destination`, `startDate`, `endDate`, `timezone`
* `ownerUserId`
* `collaborators`: [{ userId, role: owner|editor|viewer, invitedAt, acceptedAt }]
* `days`: [
  {
  `dayIndex`, `date`,
  `items`: [
  {
  `title`, `description`, `category`,
  `startTime`, `endTime`,
  `location`: { name, address, placeId, lat, lng },
  `links`: [{ label, url }],
  `notes`
  }
  ],
  `routes`: {
  `mode`, `polyline`, `distanceMeters`, `durationSeconds`
  }
  }
  ]
* `version` (number) for offline sync
* timestamps

### Invite (optional)

* `tripId`
* `invitedEmail` or `invitedUserId`
* `tokenHash`, `expiresAt`, `role`
* timestamps

---

## 5) API Design (v1)

### Auth

* `POST /auth/register` { email, password, name }
* `POST /auth/login` { email, password }
* `POST /auth/refresh`
* `POST /auth/logout`
* `GET /me`

### Settings

* `GET /settings`
* `PUT /settings` (provider, model, encrypted key updates, prefs)

### Trips CRUD

* `POST /trips`
* `GET /trips`
* `GET /trips/:id`
* `PUT /trips/:id`
* `DELETE /trips/:id`

### Collaboration

* `POST /trips/:id/invite` { email, role } OR { userId, role }
* `POST /invites/:token/accept`
* `DELETE /trips/:id/collaborators/:userId`
* `PUT /trips/:id/collaborators/:userId` { role }

### LLM / Planning

* `POST /trips/:id/generate-itinerary` { prompt, regenerateDays?: number[] }

### Maps / Enrichment

* `POST /trips/:id/enrich` (resolve places + add links)
* `POST /trips/:id/route` { dayIndex, mode } OR { mode } to compute all days

### Offline Sync (later)

* `POST /sync/push` (client ops)
* `GET /sync/pull?since=...`

---

## 6) LLM Layer (No LangChain Required)

Implement a clean provider adapter interface:

```ts
interface LLMProvider {
  generateItinerary(input: { prompt: string; schema: object; model: string }): Promise<string>;
}
```

Adapters:

* OpenAI Adapter
* Anthropic Adapter
* Gemini Adapter

**Hard requirement:** force **structured JSON output** and validate with Zod.
If invalid: retry up to N times with “fix to schema” prompt, then fail gracefully.

---

## 7) Google Maps Integration

### Backend

* Places API: resolve `locationQuery` → `placeId`, lat/lng, address
* Directions API: compute daily route with `mode` (driving/transit/walking)
* Store polyline + duration + distance in Trip.days[].routes

### Frontend

* Map component shows:

  * Markers for each stop
  * Polyline for route
  * Mode toggle triggers recompute call and redraw

---

## 8) Offline Requirements (Front-End Focus)

* Use PWA caching for app shell
* Cache trips in IndexedDB
* Allow editing cached trips offline
* Disable LLM generate button offline
* On reconnect, sync changes (Phase 6)

---

# Development Plan (Phased) — With Checkpoints

## Phase 1 — Scaffolding + Docker Compose (Dev + Prod)

**Goal:** repo builds + dev compose starts MongoDB + runs web/api with hot reload.

### Tasks

* Create monorepo folders (`apps/api`, `apps/web`, `packages/shared`, `infra`)
* Setup:

  * `apps/api`: Express + TS + ts-node-dev/nodemon
  * `apps/web`: Vite + React + TS + shadcn/ui initialized
  * `packages/shared`: Zod schemas + shared TS types
* Create Dockerfiles:

  * `apps/api/Dockerfile` (dev + prod targets)
  * `apps/web/Dockerfile` (dev + prod targets)
* Create compose files:

  * `infra/docker-compose.dev.yml`: mongodb + api(dev) + web(dev)
  * `infra/docker-compose.yml`: mongodb + api(prod) + web(static via nginx or node) (+ optional reverse proxy)
* Implement `GET /health` in API

### Checkpoint 1 (Run/Test)

1. `docker compose -f infra/docker-compose.dev.yml up --build`
2. Open `http://localhost:5173` → React app loads
3. Open `http://localhost:4000/health` → `{ ok: true }`
4. Confirm MongoDB container is running and reachable from API

---

## Phase 2 — Auth + Basic Layout

**Goal:** users can register/login/logout; web has auth screens and protected routes.

### Tasks (API)

* Mongoose User model
* Password hashing (bcrypt)
* JWT auth (access + refresh stored in httpOnly cookies)
* Endpoints: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/me`
* Middleware: `requireAuth`

### Tasks (Web)

* Auth pages (shadcn/ui forms)
* Store session state (React Query + `/me`)
* Protected routes: redirect to login

### Checkpoint 2

* Register 2 users
* Login and see dashboard page
* Logout invalidates session
* Restart dev compose; login still works

---

## Phase 3 — Trips CRUD + Collaboration (Manual Editing)

**Goal:** create trips, edit itinerary items manually, invite collaborator, permissions enforced.

### Tasks (API)

* Mongoose Trip model
* Trips CRUD endpoints
* Collaboration:

  * MVP approach: invite by email to existing user (no email sending)
  * Add collaborator role (owner/editor/viewer)
* Authorization rules:

  * owner/editor can edit
  * viewer read-only
  * non-members 403

### Tasks (Web)

* Trips list page
* Trip detail page:

  * Day tabs
  * Itinerary item editor (add/edit/delete)
* Share modal: invite user by email + role

### Checkpoint 3

* User A creates trip
* User A invites User B as editor
* User B edits itinerary
* User C can’t access (403)

---

## Phase 4 — LLM Generation (Structured JSON → Stored Itinerary)

**Goal:** generate itinerary from natural language using user’s configured provider + key.

### Tasks (API)

* Settings endpoints:

  * `GET/PUT /settings`
  * encrypt/decrypt API keys at rest
* LLM adapters (OpenAI/Anthropic/Gemini)
* Planner endpoint `POST /trips/:id/generate-itinerary`

  * Build prompt using trip details + user prefs
  * Validate JSON with Zod
  * Write itinerary into `Trip.days[].items`
  * Store provider/model metadata

### Tasks (Web)

* Settings page (provider/model/key)
* “Generate itinerary” modal:

  * prompt textarea
  * progress spinner
  * error state

### Checkpoint 4

* Set provider + API key
* Create a trip
* Generate itinerary populates days/items
* Refresh page → itinerary persists

---

## Phase 5 — Enrichment + Maps Routes

**Goal:** resolve locations, add links, compute routes, display map per day.

### Tasks (API)

* Enrichment endpoint:

  * Resolve `locationQuery` to place details (Places API)
  * Add booking/search links if missing
* Routing endpoint:

  * Compute daily directions (Directions API)
  * Save encoded polyline, duration, distance

### Tasks (Web)

* Map panel on trip day view:

  * markers from items
  * polyline
  * mode toggle (driving/transit/walking)
* Button: “Enrich places” + “Compute routes”

### Checkpoint 5

* Enrich a generated itinerary → see addresses/coords filled
* Compute route for a day → polyline appears on map
* Toggle travel mode → route updates

---

## Phase 6 — Offline Mode (PWA) + Basic Sync

**Goal:** view/edit trips offline; queue edits; sync on reconnect.

### Tasks (Web)

* Add PWA plugin for Vite
* Cache app shell
* Cache trip data in IndexedDB
* Offline UI:

  * banner “Offline”
  * disable LLM generate/enrich/route buttons
* Offline edits:

  * store ops locally (add/edit/delete item)
  * apply optimistically in UI

### Tasks (API)

* Minimal sync endpoints:

  * `POST /sync/push` (batch ops)
  * `GET /sync/pull?since=...`
* Versioning:

  * Trip `version` increments on each server write
  * MVP conflict strategy: last-write-wins + server returns latest

### Checkpoint 6

* Open trip online
* Go offline (devtools)
* Refresh → trip still available
* Edit itinerary item offline
* Go online → changes sync to server

---

## Phase 7 — Rich UX Enhancements (Optional)

* Drag-and-drop reorder items
* Auto-recompute routes on reorder
* Calendar view, printable itinerary export, etc.

### Checkpoint 7

* Reorder stops, see route update, collaborators see changes after refresh (or via polling)

---

# Docker Compose Details

## infra/docker-compose.dev.yml (required)

Services:

* `mongodb`: official mongo image, volume persisted
* `api`: mounts `apps/api` source; runs `npm run dev` (hot reload)
* `web`: mounts `apps/web` source; runs `npm run dev` (Vite)

Ports:

* web: `5173:5173`
* api: `4000:4000`
* mongo: `27017:27017` (optional to expose; useful for dev tools)

Volumes:

* `mongodb_data` for DB persistence

Networks:

* single `appnet`

## infra/docker-compose.yml (prod-ish)

Services:

* `mongodb` with persistent volume
* `api` built with `npm run build` + `node dist`
* `web` built static served by nginx OR node static server
* optional `caddy` for HTTPS + reverse proxy

---

# Coding Agent Implementation Rules

1. Keep backend cleanly layered:

   * `routes/` → controllers
   * `services/` → business logic
   * `integrations/` → LLM + Google APIs
   * `models/` → Mongoose schemas
2. Validate all incoming requests with Zod.
3. Never store plaintext LLM keys. Encrypt with AES-GCM using `ENCRYPTION_KEY_BASE64`.
4. No LangChain in MVP. Use provider adapters + tool/function output enforcement.
5. All endpoints require auth except `/health` and auth endpoints.
6. Use role-based checks on trips.

---

# Acceptance Criteria (MVP “done”)

* Multi-user auth works
* Trip CRUD works
* Collaboration works (invite + editor role)
* Generate itinerary works with at least 1 provider (OpenAI) and structure validated
* Maps show daily route with mode toggle
* Offline view/edit works for trips (no generation offline)

---
