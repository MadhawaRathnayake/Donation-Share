# Member 3 — Backend Core, Domain 1 (User Profiles and Donations)

**Scope:** Epic 3.1 (User Profile API, location services) and Epic 3.2 (complete Donation module), as assigned in [`TEAM_WORK_BREAKDOWN.md`](TEAM_WORK_BREAKDOWN.md).

---

## What this branch delivers

### Epic 3.1 — User Profile API

- `POST /api/users/profile` creates the FoodShare account and its role-specific profile in one transaction.
- `GET /api/users/profile/me` returns the caller's own profile, or `404 NOT_FOUND` when onboarding is incomplete.
- `PUT /api/users/profile/me` updates contact, address and role-specific details.
- Address is geocoded to latitude/longitude on save, through a pluggable provider that degrades safely when none is configured.

### Epic 3.2 — Donation module

- `POST /api/donations` accepts `multipart/form-data` with an optional food photo, validates the submission strictly, and publishes `DonationPosted`.
- `GET /api/donations/me` returns the donor's own history, newest first, paginated.
- `PUT /api/donations/:id/cancel` cancels an unclaimed donation and publishes `DonationCancelled`.
- `GET /api/donations` lists currently available donations. **Member 4 extends this** with search and filtering; the response envelope will not change.

### Shared foundations added along the way

These sit under `backend/src/lib` and `backend/src/middleware` and are meant for the whole team to build on:

| File | Purpose |
|---|---|
| `lib/env.ts` | One typed place for every environment variable, with safe defaults. |
| `lib/errors.ts` | `AppError` plus the central handler producing `{ code, message, fieldErrors? }`. |
| `lib/pagination.ts` | `{ items, page, pageSize, total }` envelope and query parsing. |
| `lib/events.ts` | The shared domain-event name list and envelope shape. |
| `lib/rabbitmq.ts` | Durable, fail-soft publisher. |
| `lib/upload.ts` | Multer configuration and storage URL helper. |
| `lib/geocode.ts` | Address to coordinates, provider-agnostic. |
| `lib/keycloakAdmin.ts` | Server-side realm-role assignment after onboarding. |
| `middleware/auth.middleware.ts` | Keycloak RS256 verification against JWKS, plus `requireRole`. |
| `middleware/user.middleware.ts` | Resolves the account from the Keycloak subject. |

---

## Three defects in the scaffolding that this branch fixes

**1. Tokens were decoded, not verified.** The previous middleware called `jwt.decode()`, which reads a token without checking its signature. Any caller could have hand-written a token containing `"realm_access": {"roles": ["Admin"]}` and been believed. Verification now runs against the realm's published JWKS, which is what ADR-005 in the architecture report describes. `src/tests/auth.test.ts` proves a token signed with the wrong key is rejected.

**2. The donor lookup could never succeed.** `donation.controller.ts` searched for a donor profile using the Keycloak `sub` as `userId`, but `User.id` is a separate database UUID. Every attempt to post a donation would have failed. Users are now resolved by `sub` against `User.keycloakId`, which is the contract Member 2 documented in `frontend/README.md`.

**3. The schema could not hold what the onboarding form submits.** `phone`, `taxId`, `operatingHours` and the entire volunteer profile had nowhere to be stored. They have been added, along with a `VolunteerProfile` model.

---

## Requirements used

### Development environment

- Node.js 20 or newer (developed against 22).
- Docker Desktop and Docker Compose for PostgreSQL, Keycloak and RabbitMQ.
- npm for dependency installation and project scripts.

### Backend technologies

| Requirement | Usage |
|---|---|
| Node.js and Express 5 | REST API and middleware pipeline. Express 5 forwards rejected promises to the error handler, so controllers carry no try/catch. |
| TypeScript | Strict typing across modules, services and mappers. |
| Prisma with PostgreSQL | Schema, migrations and type-safe queries. |
| Zod | Request validation and the field-level error messages the UI renders. |
| jsonwebtoken and jwks-rsa | Keycloak RS256 access-token verification. |
| Multer | Donation photo upload with type and size limits. |
| amqplib | Durable publishing to the notification queue. |
| Vitest | Unit and integration tests. |

---

## Setup

### 1. Start the infrastructure

From the repository root:

```powershell
docker compose up -d
```

### 2. Configure the backend

```powershell
cd backend
npm ci
npm approve-scripts esbuild
npm approve-scripts prisma
npm approve-scripts @prisma/engines
npx prisma generate
Copy-Item .env.example .env
```

Recent npm versions block package install scripts by default. Prisma's install
script is what generates the database client, so if it is skipped the build
reports dozens of "has no exported member" errors and `npm run dev` fails with
`Cannot find module '.prisma/client/default'`.

Every setting is documented inside `.env.example`. The defaults match the
`docker-compose.yml` services, so for local development no edit is required.
`.env` is gitignored — never commit it.

### 3. Create the database tables

```powershell
docker exec foodshare-db psql -U foodshare -d foodshare_db -c "CREATE SCHEMA IF NOT EXISTS foodshare;"
npx prisma db push
```

The application uses its own `foodshare` schema rather than `public`. Keycloak
keeps its tables in the same database, and `prisma db push` deletes any table in
its schema that the Prisma file does not describe — which, in a shared `public`
schema, means all 31 of Keycloak's tables along with the realm, its users and
its roles. Report Section 4.3 already specifies separate schemas; this makes the
application side match. The complete fix is `KC_DB_SCHEMA: keycloak` in
`docker-compose.yml`, which is Member 1's file.

This is additive for anyone with existing local data: every column added by this
branch is nullable at the database level, with requiredness enforced by Zod at
the API boundary instead.

### 4. Run the API

```powershell
npm run dev
```

`http://localhost:3000/health` reports service status and whether the broker is
connected.

## Verification

```powershell
npm run typecheck
npm run build
npm test
```

The suite covers profile and donation validation rules, pagination, both
mappers, and the authentication middleware. The authentication tests start a
local JWKS server and check that a genuine token is accepted while forged,
expired, wrong-issuer and unsigned tokens are all rejected.

---

## Notes for the rest of the team

**Member 1 (DevOps and Admin):**
- `KEYCLOAK_ADMIN_USER` / `KEYCLOAK_ADMIN_PASSWORD` currently point at the
  docker-compose admin account so onboarding works locally. Replace them with a
  dedicated Keycloak service account before any deployment, and move them into
  the platform's secret store.
- `REQUIRE_DONOR_APPROVAL=true` switches on the stricter FR2 reading, where new
  donor accounts also wait for administrator approval before they may post.
- `uploads/` is local disk. Swapping to object storage means replacing
  `lib/upload.ts` only; nothing downstream sees anything but `imageUrl`.
- `npm test` and `npm run typecheck` are ready for the CI workflow.

**Member 4 (Claims and Search):**
- `GET /api/donations` is yours to extend. Keep returning
  `paginated(...)` from `lib/pagination.ts` so the response envelope stays
  stable for the UI.
- `DonorProfile.latitude` / `longitude` and `RecipientProfile.latitude` /
  `longitude` are populated when geocoding is enabled, ready for a
  bounding-box filter.
- The indexes `FoodDonation(status, expiryTime)` and
  `FoodDonation(donorId, createdAt)` already exist.
- Cancellation uses a single conditional `UPDATE ... WHERE status = 'Posted'`
  rather than read-then-write, so it cannot race your claim transaction.
- Publish `DomainEvent.DonationClaimed` from `lib/events.ts` via
  `publishNotificationEvent`.

**Member 5 (Events and Logistics):**
- `notification_queue` is declared durable, and messages are published
  persistent. Two event types arrive from this branch: `DonationPosted` and
  `DonationCancelled`.
- Every message uses the envelope in `lib/events.ts`:
  `{ eventType, eventId, occurredAt, message, payload }`. `eventId` is unique
  per publication, so the worker can detect a redelivery and stay idempotent.
- `payload.donorUserId` is the FoodShare `User.id`, ready to write a
  `Notification` row against.

**Member 2 (Frontend):**
- Every response matches `frontend/src/types/domain.ts` as written; no changes
  are needed on the frontend for these endpoints.
- Errors arrive as `{ code, message, fieldErrors? }`, and the `fieldErrors`
  keys match the form field names, with the same message wording as the
  client-side schema.