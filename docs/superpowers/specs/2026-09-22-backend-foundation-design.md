# Campus Team Finder — Backend Foundation Design

Date: 2026-09-22
Status: Approved for implementation planning

## Purpose

Build the backend structure, database schema, and core API endpoints for
Campus Team Finder, covering all four flows in `User-Flow.pdf`:

1. Authentication & Authorization (KBTU Google accounts only)
2. Student Profile Setup
3. Find a Team (search, browse, apply)
4. Create a Team (publish, receive applications, send invitations)

The existing frontend (`Campus-Team-Finder/`, a default Vite+React
scaffold) is out of scope for this design — this is backend-only.

## Architecture

```
React (Vite) frontend
        |  fetch, credentials: 'include'
        v
Express API  (Node.js)
        |  Prisma Client
        v
PostgreSQL
```

- Single Express app under a new `server/` directory, REST endpoints under
  `/api/*`.
- Auth: frontend uses Google Sign-In to obtain a Google ID token, POSTs it
  to `/api/auth/google`. Backend verifies the token with Google, enforces
  the email ends in `@kbtu.kz`, upserts a `User` row, and sets a signed
  JWT in an `httpOnly` cookie. All subsequent requests are authenticated
  via that cookie.
- No microservices, message queue, or cache layer — not warranted at this
  scale. (ponytail: single Express process; split out only if
  traffic/team size later demands it.)
- Folder shape: `server/src/{routes,controllers,middleware,prisma}`.
- DB access via Prisma (schema-as-code, typed client, auto-generated
  migrations).

## Database schema (PostgreSQL via Prisma)

**User** (Flow 1 & 2)
- `id`, `email` (unique, `@kbtu.kz`), `name`, `avatarUrl`, `googleId` (unique)
- `faculty` (enum: FIT, ISE, ...), `studyYear` (int)
- `weeklyHours` (int, availability)
- `githubUrl`, `linkedinUrl`, `telegramHandle`
- `profileComplete` (bool) — drives the "new user → Flow 2" redirect
- `createdAt`, `updatedAt`

**Skill** (lookup: "React", "Python", "Figma", ...)
- `id`, `name` (unique)

**UserSkill** (join table, skill + proficiency — Flow 2.3)
- `userId`, `skillId`, `proficiency` (enum: BEGINNER/INTERMEDIATE/ADVANCED)

**Interest** (lookup: AI, Web, GameDev, ... — Flow 2.4)
- `id`, `name` (unique)

**UserInterest** (join table)
- `userId`, `interestId`

**Role** (lookup: Frontend, Backend, PM, UI/UX — reused for both
"preferred roles" and "open roles", Flow 2.5 & 4.3)
- `id`, `name` (unique)

**UserPreferredRole** (join table, Flow 2.5)
- `userId`, `roleId`

**Team** (Flow 4.1–4.4)
- `id`, `name`, `eventTarget` (nullable), `description`
- `creatorId` (→ User)
- `status` (enum: DRAFT, PUBLISHED, CLOSED)
- `createdAt`, `updatedAt`

**TeamOpenRole** (Flow 4.3 — a role + slot count on a team)
- `id`, `teamId`, `roleId`, `slotsTotal`, `slotsFilled` (default 0)

**Application** (Flow 3.5, 4.5A/4.5B — covers both a user applying to a
team and a team inviting a user)
- `id`, `teamId`, `teamOpenRoleId`, `userId`
- `direction` (enum: APPLICATION [user → team], INVITATION [team → user])
- `status` (enum: SENT, VIEWED, ACCEPTED, DECLINED)
- `createdAt`, `updatedAt`
- unique constraint on `(teamOpenRoleId, userId, direction)`

One `Application` table with a `direction` flag covers both Flow 3's
Sent→Viewed→Accepted pipeline and Flow 4's receive-applications /
send-invitations / track-invites paths — it's the same state machine
initiated from either side, so a single table avoids duplicating it.

## API endpoints

**Flow 1 — Auth**
- `POST /api/auth/google` — `{ idToken }`. Verifies with Google, enforces
  `@kbtu.kz`, upserts `User`, sets JWT cookie. Returns `{ user, isNewUser }`.
- `POST /api/auth/logout` — clears cookie.
- `GET /api/auth/me` — current user from cookie (drives Home Hub vs.
  Profile Setup redirect on app load).

**Flow 2 — Profile Setup**
- `GET /api/profile` — full profile incl. skills/interests/roles.
- `PATCH /api/profile` — partial update, used across steps 2.1–2.7.
- `PUT /api/profile/skills` — replace skill set: `[{ skillId, proficiency }]`.
- `PUT /api/profile/interests` — replace interest set: `[interestId]`.
- `PUT /api/profile/preferred-roles` — replace preferred roles: `[roleId]`.
- `POST /api/profile/complete` — marks `profileComplete = true` (2.8).
- `GET /api/lookups/skills`, `GET /api/lookups/interests`,
  `GET /api/lookups/roles` — populate pickers in 2.3/2.4/2.5.

**Flow 3 — Find a Team**
- `GET /api/teams?skill=&faculty=&format=` — search/filter published teams
  (3.2/3.3).
- `GET /api/teams/:id` — team details incl. open roles (3.4).
- `POST /api/teams/:id/roles/:roleId/apply` — create an `Application`
  (direction=APPLICATION, status=SENT) (3.5).
- `GET /api/applications/mine` — current user's sent applications with
  status.

**Flow 4 — Create a Team**
- `POST /api/teams` — create team (4.2), status=DRAFT.
- `PUT /api/teams/:id/roles` — set open roles + slots (4.3):
  `[{ roleId, slotsTotal }]`.
- `POST /api/teams/:id/publish` — status → PUBLISHED (4.4).
- `GET /api/teams/:id/applications` — applications received for a team
  owned by the current user (4.5A).
- `POST /api/teams/:id/invite` — create an `Application`
  (direction=INVITATION, status=SENT) targeting a user (4.5B).
- `PATCH /api/applications/:id` — `{ status: ACCEPTED | DECLINED }` — used
  both for a creator approving/declining an application (4.6A) and for a
  user accepting/declining an invitation. Accepting increments
  `slotsFilled` on the `TeamOpenRole` in a transaction, rejecting if
  already full.
- `GET /api/teams/mine` — teams the current user created, for 4.6B invite
  tracking.

**Cross-cutting**
- `authRequired` middleware on every route except `/api/auth/google`.
- `profileRequired` middleware blocks Flow 3/4 routes until
  `profileComplete`.
- Ownership checks on team-mutation routes — only `creatorId` may
  publish/manage roles/view applications for their team.

## Error handling

- Standard JSON error shape: `{ error: string }` with appropriate HTTP
  status (400 validation, 401 unauthenticated, 403 unauthorized/wrong
  domain, 404 not found, 409 conflict e.g. duplicate application or full
  slot).
- Google token verification failures and non-`@kbtu.kz` emails both
  return 403 with a clear message (frontend shows "Use your KBTU email").

## Testing

- Prisma schema validated via `prisma migrate dev` against a local
  Postgres (or Dockerized Postgres) instance.
- Route-level tests (e.g. Supertest) covering: domain-restricted login,
  profile completion gating Flow 3/4 access, apply/invite creating an
  `Application`, accept incrementing `slotsFilled` and rejecting once full,
  duplicate-application conflict.

## Out of scope

- Frontend implementation/integration.
- Email notifications.
- File upload storage for avatar photos (endpoint accepts a URL for now;
  actual upload pipeline is a separate design).
- Deployment/hosting configuration.
