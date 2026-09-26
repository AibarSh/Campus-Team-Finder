# Frontend User Flows — Design

Date: 2026-09-26
Status: Approved in brainstorming, pending spec review
Branch: `frontend-flows` (off `test`)

## Goal

Build the remaining frontend screens from `User-Flow.pdf` so every existing backend feature is usable in the browser, in the current visual style. Success = a two-account demo (dev login) runs end to end: create → publish → apply → viewed → accept → invite → accept invite, plus profile view/edit.

## Context

Already working: dev login, onboarding (Flow 1–2), Dashboard, Browse Teams list.

Backend features with no UI: team details, applying, my applications/invitations, create team, open roles, publish, my teams, team applicants, invite, accept/decline.

Existing defects fixed as part of this work:

1. Sidebar links to `/browse` and `/applications`; routes don't exist (`/teams` is Browse).
2. `teamManagementApi.setOpenRoles` sends a bare array; server expects `{ roles: [...] }`.
3. `TeamCard` "View Team" button is disabled.
4. Nothing sets application status `VIEWED`, though the PDF pipeline is Sent → Viewed → Accepted.
5. Invite requires a `userId`, but there is no way to find users.
6. Header profile menu is a placeholder.

## Decisions

- **Approach:** follow the existing pattern — one page per route, `useEffect` + `services/api.jsx`, Tailwind in the current style (white cards, `rounded-2xl`, `border-gray-100`, `blue-600` accents, same spinner and red error box as `OnboardingWizard`). No new frontend dependencies.
- **Invites:** add a small backend user-search endpoint.
- **Viewed:** owner loading team applications marks `SENT` applications `VIEWED`.
- **Extras in scope:** profile page (view + edit), working dashboard search, header menu with logout.
- **Out of scope:** browse faculty filter, viewing another user's full profile page, team editing after publish, closing teams, notifications (bell stays decorative), real auth.

## Backend changes

### 1. `GET /api/users?q=` (new `routes/users.js`, `controllers/usersController.js`)

- Middleware: `authRequired, profileRequired`.
- Returns up to 20 users where `profileComplete = true` and `id != req.user.id`.
- If `q` is non-empty (trimmed), match case-insensitive `contains` on any of: `firstName`, `lastName`, `name`, `email`, or a skill name (`skills.some.skill.name`). Empty `q` → first 20 by `createdAt desc`.
- Response fields only: `id, name, firstName, lastName, email, faculty, studyYear, skills: [{ skill: { id, name }, proficiency }]`. No `googleId` or other internals.
- Mounted at `/api/users` in `src/index.js`.

### 2. VIEWED transition in `listTeamApplications`

After `requireTeamOwner`, when `direction === 'APPLICATION'`, run `application.updateMany({ where: { teamId, direction: 'APPLICATION', status: 'SENT' }, data: { status: 'VIEWED' } })` before the `findMany`, so the response already shows `VIEWED`. Invitations are unaffected.

### Tests (Jest, `server/tests/routes/`)

- `users.test.js`: requires auth (401); requires profile (403); excludes self and incomplete profiles; matches by name and by skill; omits `googleId`.
- Extend team applications test: owner fetch turns `SENT` → `VIEWED`; `ACCEPTED`/`DECLINED` untouched; invitations stay `SENT`.

## Frontend changes

### API client (`services/api.jsx`)

- `setOpenRoles(teamId, roles)` → body `{ roles }`.
- `getMyApplications(direction)` and `getTeamApplications(teamId, direction)` append `?direction=INVITATION` when asked.
- New `userApi.search(q)` → `GET /api/users?q=`.

### Routes (`App.jsx`) — all under `ProtectedRoute` + `Layout` unless noted

| Route | Page | PDF | API |
|---|---|---|---|
| `/dashboard` | existing; search box submits to `/browse?role=<q>`; "Create Team" CTA button | 3.1, 4.1 | — |
| `/browse` | `BrowseTeamsPage` (renamed from `/teams`); role filter initialised from and synced to `?role=` | 3.2–3.3 | `GET /teams?skill=` |
| `/teams/new` | `CreateTeamWizard`; `?team=<id>` resumes a draft at step 2 | 4.2–4.4 | `POST /teams`, `PUT /teams/:id/roles`, `POST /teams/:id/publish` |
| `/teams/:id` | `TeamDetailsPage` | 3.4–3.5 | `GET /teams/:id`, `GET /applications/mine`, `POST /teams/:id/roles/:roleId/apply` |
| `/teams/:id/manage` | `ManageTeamPage` (owner only) | 4.5A/B, 4.6A/B | `GET /teams/:id`, `GET /teams/:id/applications[?direction=INVITATION]`, `PATCH /applications/:id`, `POST /teams/:id/invite`, `GET /users?q=` |
| `/my-teams` | `MyTeamsPage` | 4.x hub | `GET /teams/mine` |
| `/applications` | `MyApplicationsPage` | 3.x pipeline, 4.6B invitee side | `GET /applications/mine[?direction=INVITATION]`, `PATCH /applications/:id` |
| `/profile` | `ProfilePage` | 2.8 | `GET /profile` |
| `/profile/edit` | `OnboardingWizard mode="edit"` (no `Layout`, like onboarding) | 2.1–2.7 | `GET /profile`, `PATCH /profile`, `PUT /profile/*` |

`*` still redirects to `/dashboard`. `/teams/new` must be declared so it isn't captured by `/teams/:id`.

### Pages

**TeamDetailsPage** — header (initial avatar, name, event, status badge if not published), description, "Created by". Open roles list: role name, `slotsFilled/slotsTotal`, and one action:
- viewer is owner → no per-role action; page-level "Manage team" button to `/teams/:id/manage`;
- viewer has an `APPLICATION` for this `teamOpenRoleId` → `StatusBadge`;
- role full → disabled "Full";
- else → "Apply" button; on success, show `SENT` badge; on error (e.g. 409) show message inline under that role.

**MyApplicationsPage** — two tabs: *Sent* (my applications: team name linking to `/teams/:teamId`, role, date, badge) and *Invitations* (received invites: team, role, badge; `SENT`/`VIEWED` rows get Accept/Decline). Row updates in place after PATCH; per-row inline error.

**CreateTeamWizard** — same shell as `OnboardingWizard` but inside `Layout` (progress bar, step card, Back/Next).
1. *Project info*: name (required), event/hackathon target, description → `POST /teams` (DRAFT). If `?team=` is present, skip to step 2.
2. *Open roles*: add rows of role (select from `lookupApi.getRoles`) + slots (number ≥ 1); no duplicate roles; at least one row → `PUT /teams/:id/roles`.
3. *Review & publish*: summary → "Publish" → `POST /teams/:id/publish` → navigate `/teams/:id/manage`. Secondary "Save as draft" → `/my-teams`.

**MyTeamsPage** — cards for owned teams: name, event, status badge, roles with slots, count of pending applicants (`direction === 'APPLICATION'` and status `SENT`/`VIEWED`) from included `openRoles[].applications` (which also contains invitations). Draft → "Continue setup" (`/teams/new?team=<id>`); published → "Manage" (`/teams/:id/manage`) and "View" (`/teams/:id`). Empty state links to Create Team.

**ManageTeamPage** — loads team; if `creatorId !== user.id` show the 403 message. Draft teams show a banner with "Finish setup". Two tabs:
- *Applicants*: rows with applicant name, faculty, study year, GitHub/LinkedIn/Telegram links (when present), role, badge; `SENT`/`VIEWED` rows get Accept/Decline. After an accept, refetch the team so slot counts update.
- *Invitations*: search input (debounced ~300 ms) → `userApi.search`; each result shows name, faculty, top skills, a role select (team's open roles) and "Invite". Below: sent invitations list with badges. 409 duplicates shown inline.

**ProfilePage** — from `GET /profile`: avatar initials, name, faculty · year, bio, skills with proficiency, interests, preferred roles, availability, links. "Edit profile" → `/profile/edit`.

**OnboardingWizard `mode="edit"`** — on mount loads `GET /profile` and maps into `formData` (skills → `{ id, name, level }`, interests/roles → id arrays, links from `githubUrl/linkedinUrl/telegramHandle`). Submit runs the same PATCH/PUT calls, skips `completeProfile`, then `refreshUser()` and navigates to `/profile`. Button label "Save changes". Step components receive pre-filled data unchanged.

### Shared components

- `StatusBadge({ status })` — one pill: SENT gray, VIEWED amber, ACCEPTED green, DECLINED red, DRAFT gray, PUBLISHED blue, CLOSED gray.
- `TeamCard` — "View Team" becomes a `Link` to `/teams/:id`.
- `Sidebar` — Dashboard, Browse Teams, My Applications, My Teams, Create Team, Profile.
- `Header` — avatar menu with "Profile" link and "Logout" (calls `logout()` then navigates to `/login`).

## Error handling

- Page-load failures: red box with the server's `error` text (same classes as the onboarding wizard).
- Action failures (apply, accept/decline, invite, publish): inline message next to the triggering control; other rows stay usable.
- Buttons disable while their request is in flight.

## Testing

- Backend: new/extended Jest tests above; full `npm test` passes.
- Frontend: no test framework added. `npm run build` and `npm run lint` pass. Browser run-through with accounts A and B (`@kbtu.kz`):
  1. A creates a team (3 steps) and publishes.
  2. B finds it via dashboard search → Browse → details → applies; badge shows Sent.
  3. A opens Manage → applicant listed; B's My Applications shows Viewed.
  4. A accepts → slot count increments on details page.
  5. A invites B to another role → B sees it under Invitations → accepts.
  6. B edits profile, saves, sees changes on `/profile`.
  7. Logout returns to `/login`.
