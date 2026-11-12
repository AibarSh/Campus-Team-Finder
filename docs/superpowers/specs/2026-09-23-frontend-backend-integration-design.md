# Frontend ↔ Backend Integration — Design

Date: 2026-09-23
Status: Approved in brainstorming, pending spec review

## Goal

Make the React frontend (`Campus-Team-Finder/`) work end to end against the Express/Prisma backend (`server/`): log in, complete onboarding, see real data on Dashboard and Browse Teams.

## Context

A static review found the two sides do not connect:

1. Frontend defaults to `localhost:8080`; server listens on `4000`.
2. Login page is client-side only; no session cookie is ever set.
3. Skills/interests/roles bodies sent as bare arrays; server expects `{skills}`, `{interests}`, `{roles}`.
4. Wizard fields (`firstName`, `lastName`, `bio`, `availability`, `telegramUrl`) don't exist in the schema; `faculty`/`studyYear` types disagree.
5. Proficiency sent as `'Intermediate'` (schema: `INTERMEDIATE`); `skillId` falls back to the skill name.
6. Frontend reads `errorData.message`; server returns `{ error }`.
7. `inviteUser` omits required `teamOpenRoleId`.
8. `format` filter is sent but unsupported.
9. Dashboard and Browse Teams never call the API.

Also: frontend `node_modules` missing (`react-router-dom` was installed in the repo root).

## Decisions

- **Auth:** dev-only login for now. KBTU mail is Microsoft 365 (`kbtu-kz.mail.protection.outlook.com`), so Google Sign-In is the wrong fit for most students. Real auth (Microsoft sign-in or email OTP) is a later, separate decision. Existing Google code stays untouched.
- **Profile data:** backend adapts to the UI's fields.
- **Lookups:** API-driven. Seed matches the UI lists; the wizard fetches lookups and sends ids. Free-text custom skills are removed.
- **Scope:** wire existing pages only. Team details, apply, create team and application management are a separate follow-up spec.

## Out of scope

- Real authentication (Microsoft / email OTP).
- Photo/avatar upload.
- Team details, apply, create team, manage applications pages.
- Frontend test framework.
- Dashboard search box behavior.

## Section 1 — Backend

### Schema migration `add_profile_fields`

On `User`:

- Add `firstName String?`, `lastName String?`, `bio String?`, `availability String?`.
- `faculty`: `Faculty?` enum → `String?`. Drop the `Faculty` enum. Existing values cast to text (dev data only).
- `studyYear`: `Int?` → `String?`. Existing values cast to text.
- `weeklyHours` column stays (no data loss) but is no longer patchable.
- `name` stays required. On profile PATCH, if `firstName` or `lastName` is provided, the server sets `name = [firstName, lastName].filter(Boolean).join(' ')` using the merged (incoming ?? stored) values.

### `src/lib/profileOptions.js`

Single source of allowed values, exported for controller and tests:

- `FACULTIES`: the 7 strings in `Step2_AcademicInfo.jsx` `FACULTY_OPTIONS`.
- `STUDY_YEARS`: the 7 strings in `STUDY_YEAR_OPTIONS`.
- `AVAILABILITY`: `['less-5', '5-10', '10-20', '20-plus']`.

### Profile PATCH

- `PATCHABLE_FIELDS` = `name, avatarUrl, firstName, lastName, bio, faculty, studyYear, availability, githubUrl, linkedinUrl, telegramHandle`.
- `faculty`, `studyYear`, `availability`: if present and not in the allowed list → `400` with a message naming the field.
- String fields longer than a sane limit (bio 1000, others 200) → `400`.

### Seed

Replace lists with the UI's (upsert, idempotent):

- Skills (14): JavaScript, TypeScript, Python, React, Node.js, Java, C++, Kotlin, Figma, SQL, MongoDB, Docker, TensorFlow, Flutter.
- Interests (10): Artificial Intelligence, Web Development, Mobile Development, Game Development, Data Science, Blockchain / Web3, IoT & Embedded, Cybersecurity, UI/UX Design, Cloud Computing.
- Roles (10): Frontend Developer, Backend Developer, Full Stack Developer, UI/UX Designer, ML Engineer, Data Scientist, Mobile Developer, DevOps Engineer, Project Manager, QA Engineer.
- Demo data: one demo user (`demo@kbtu.kz`, `googleId: 'dev:demo@kbtu.kz'`, `profileComplete: true`) and 3 `PUBLISHED` teams with 1–3 open roles each. Created only if a team with the same name by the demo user doesn't exist.

Old seed rows (`Frontend`, `PM`, `AI`, `Go`, …) are left in place; dev DBs can be reset with `prisma migrate reset`.

### Dev login `POST /api/auth/dev-login`

- Registered only when `process.env.NODE_ENV !== 'production'` **and** `process.env.DEV_LOGIN === 'true'`. Otherwise the route doesn't exist (404).
- Body `{ email }`. Missing → `400`. Not ending in `@kbtu.kz` (case-insensitive) → `403`.
- Upserts user by `googleId = 'dev:' + email.toLowerCase()`; on create, `name` = local part of the email.
- Sets the same `session` cookie as Google login (reuse `SESSION_COOKIE_OPTIONS`), returns `{ user, isNewUser }`.
- `DEV_LOGIN=true` added to `server/.env.example` and `server/.env`.

### Backend tests (Jest)

- dev-login: sets a cookie that works for `/api/auth/me`; rejects non-KBTU email (403); route 404 when flag off.
- profile PATCH: saves `firstName/lastName/bio/availability`; rebuilds `name`; rejects unknown `faculty`, `studyYear`, `availability`; `weeklyHours` ignored.
- Existing 49 tests keep passing (update any that use `Faculty` enum values or numeric `studyYear`).

## Section 2 — Frontend

### Setup

- Add `react-router-dom` to `Campus-Team-Finder/package.json`; `npm install` there.
- Delete root `package.json`, `package-lock.json`, `node_modules` (confirm with user before deleting).

### `services/api.jsx`

- `API_BASE_URL` default → `http://localhost:4000`.
- Error: `throw new Error(errorData.error || errorData.message || \`Request failed with status ${status}\`)`.
- `updateSkills(skills)` → body `{ skills }`; `updateInterests(ids)` → `{ interests }`; `updatePreferredRoles(ids)` → `{ roles }`.
- Add `authApi.devLogin(email)` → `POST /api/auth/dev-login`.
- `inviteUser(teamId, userId, teamOpenRoleId)`.
- `getTeams({ role })` → `?skill=<role name>` (server filters open roles by name via `skill` param). Remove `format`.

### Login page

- Email-only form; password field removed. Keep `@kbtu.kz` check.
- Submit → `authApi.devLogin(email)` → `setUser(res.user)` → navigate to `/onboarding` if `!user.profileComplete`, else `/dashboard`. Server error shown in the existing alert.
- Small caption: "Development login".

### Onboarding wizard

- Step 1: first name, last name, bio. Photo upload removed; initials avatar shown instead.
- Step 2: faculty and study year dropdowns using the same strings as `profileOptions.js`.
- Step 3: fetch `lookupApi.getSkills()`; searchable pick-list (filter input + clickable options, no free text). Level select values `BEGINNER | INTERMEDIATE | ADVANCED`, labels Beginner / Intermediate / Advanced. Stored as `{ id, name, level }`.
- Step 4: fetch `lookupApi.getInterests()` and `getRoles()`; selections stored as ids.
- Step 5: availability stores option id (`less-5`, …); links map to `githubUrl`, `linkedinUrl`, `telegramHandle`.
- Submit order unchanged: PATCH profile → PUT skills → PUT interests → PUT roles → POST complete → `refreshUser()` → `/dashboard`. On failure, show server message and stay on step 5; retry is safe because PUTs replace sets.
- Lookup fetch failure in steps 3/4: inline error with a retry button.

### Shared state

- Remove `teams`/`applications` from `UserContext`. Pages fetch their own data with local `loading`/`error` state.

### Dashboard

- Greeting: `user.firstName` (fallback `user.name`).
- Stats: **Active Applications** = my applications with status `SENT` or `VIEWED`; **Teams Joined** = status `ACCEPTED`. Remove Profile Views and Skill Matches cards.
- "Recommended for you": first 2 teams from `teamApi.getTeams()`. Remove non-functional filter chips.

### Browse Teams

- Fetch `teamApi.getTeams({ role })`. Category tabs → a role `<select>` populated from `lookupApi.getRoles()` ("All roles" default). Result count from real data. Empty state message when no teams.

### TeamCard

Maps real team shape:

- Badge: first letter of `team.name`, fixed color.
- Subtitle: `team.eventTarget`.
- Description: `team.description`.
- Open roles: `role.name` with `slotsFilled/slotsTotal`.
- Footer: `team.creator.name` instead of members row.
- Removed: `category`, `daysLeft`, `prize`, `members`, `maxMembers`.
- "View Team" button kept, disabled (details page is next spec).

### Header

- Initials from `firstName`/`lastName` (fallback: first letters of `name`).

## Verification

1. `docker compose up -d` (server/), `prisma migrate dev`, `npm run prisma:seed`.
2. `npm test` in `server/` — all green.
3. Start server (`npm run dev`, port 4000) and frontend (`npm run dev`, port 5173).
4. In Chrome: dev login as a new `@kbtu.kz` email → redirected to onboarding → complete all 5 steps with lookup-driven options → dashboard shows the user's first name, stats of 0, and 2 demo teams → Browse Teams lists 3 demo teams; role filter narrows them → reload the page (session cookie persists, stays on dashboard) → clear cookies and dev-login with the same email again lands on dashboard (no logout button exists yet; out of scope).
5. No console errors or failed network requests during the walkthrough.
