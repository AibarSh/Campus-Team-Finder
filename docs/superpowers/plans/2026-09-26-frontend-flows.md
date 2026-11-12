# Frontend User Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the remaining `User-Flow.pdf` screens (team details + apply, my applications/invitations, create team wizard, my teams, manage team with applicants + invites, profile view/edit) on top of the existing backend, plus two small backend additions.

**Architecture:** Backend gets `GET /api/users?q=` and a SENT→VIEWED transition when the owner lists applications. Frontend follows the existing pattern: one page per route in `src/pages/`, data via `src/services/api.jsx` inside `useEffect`, Tailwind classes matching the current cards/wizard. A few tiny shared components (`StatusBadge`, `Feedback`, `Tabs`, `DecisionButtons`) keep pages short.

**Tech Stack:** Express 4 + Prisma 6 + PostgreSQL + Jest/supertest (server); React 19 + react-router-dom + Vite + Tailwind v4 (frontend).

**Spec:** `docs/superpowers/specs/2026-09-26-frontend-flows-design.md`

## Global Constraints

- Branch: `frontend-flows` (already created off `test`, spec committed).
- No new npm dependencies in either package.
- Visual style: white cards `bg-white rounded-2xl border border-gray-100 shadow-sm`, primary buttons `bg-blue-600 text-white rounded-xl hover:bg-blue-700`, headings `text-2xl font-extrabold text-gray-950`, error box `p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium`, spinner `animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600`.
- Status badge colors: SENT gray, VIEWED amber, ACCEPTED green, DECLINED red, DRAFT gray, PUBLISHED blue, CLOSED gray.
- Dev login only accepts `@kbtu.kz` emails.
- Frontend lint baseline: `npm run lint` currently reports exactly 5 errors, all in `src/context/UserContext.jsx` and `vite.config.js`. Lint is "passing" for this plan when no error appears in any other file. Do not fix the baseline (out of scope).
- ESLint `react-hooks/set-state-in-effect` is on: never call `setState` synchronously in an effect body. Set state inside `.then/.catch`, in event handlers, or reset state in the handler that changes the effect's dependency.
- Every commit message ends with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  ```

## Review Focus

1. Owner opens their own team's details page → no Apply buttons anywhere; a "Manage team" button instead (Task 4 browser check).
2. Double-clicking Apply / Accept / Invite / Publish → only one request; buttons disabled while in flight (Tasks 4, 5, 6, 8 browser checks).
3. Non-owner opens `/teams/:id/manage` by URL → friendly "Only the team creator can manage this team" message, no crash, and no application gets marked VIEWED (Task 2 test + Task 8 check).
4. `/teams/new?team=<id>` for a team that is already published → redirects to its manage page instead of re-running the wizard; Back from step 2 never creates a second team (Task 6 check).
5. User search with whitespace-only or no-match query → whitespace treated as empty; no-match shows "No users found" (Task 1 test + Task 8 check).

---

## File Map

Server:
- Create `server/src/controllers/usersController.js` — `searchUsers`.
- Create `server/src/routes/users.js` — `GET /` → `searchUsers`.
- Modify `server/src/index.js` — mount `/api/users`.
- Modify `server/src/controllers/teamsController.js` — VIEWED transition in `listTeamApplications`.
- Create `server/tests/routes/users.test.js`; modify `server/tests/routes/teamsApplications.test.js`.

Frontend (`Campus-Team-Finder/src/`):
- Modify `services/api.jsx` — fixes + `userApi`.
- Create `components/StatusBadge.jsx`, `components/Feedback.jsx` (`Spinner`, `ErrorBox`), `components/Tabs.jsx`, `components/DecisionButtons.jsx`, `components/InvitePanel.jsx`.
- Create `lib/profileOptions.js` (availability labels), `lib/profileForm.js` (`profileToFormData`).
- Modify `App.jsx`, `components/Sidebar.jsx`, `components/Header.jsx`, `components/TeamCard.jsx`, `pages/DashboardPage.jsx`, `pages/BrowseTeamsPage.jsx`, `pages/Onboarding/OnboardingWizard.jsx`, `pages/Onboarding/Step5_Availability.jsx`.
- Create `pages/TeamDetailsPage.jsx`, `pages/MyApplicationsPage.jsx`, `pages/CreateTeamWizard.jsx`, `pages/MyTeamsPage.jsx`, `pages/ManageTeamPage.jsx`, `pages/ProfilePage.jsx`.

## How to run things

- Backend tests: Postgres up (`cd server && docker compose up -d`), test DB migrated once (`DATABASE_URL="postgresql://campus:campus@localhost:5432/campus_team_finder_test" npx prisma migrate deploy`), then `cd server && npm test`.
- Frontend checks: `cd Campus-Team-Finder && npm run build && npm run lint`.
- App: backend `cd server && npm run dev` (port 4000), frontend `cd Campus-Team-Finder && npm run dev` (port 5173).

---

### Task 1: Backend user search endpoint

**Files:**
- Create: `server/src/controllers/usersController.js`
- Create: `server/src/routes/users.js`
- Modify: `server/src/index.js`
- Test: `server/tests/routes/users.test.js`

**Interfaces:**
- Produces: `GET /api/users?q=<string>` → `200 [{ id, name, firstName, lastName, email, faculty, studyYear, skills: [{ proficiency, skill: { id, name } }] }]` (max 20, complete profiles only, excludes caller). 401 unauthenticated, 403 if caller's profile incomplete.

- [ ] **Step 1: Write the failing test** — `server/tests/routes/users.test.js`

```js
const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let me;
let meCookie;

beforeEach(async () => {
  await resetDb();
  me = await prisma.user.create({
    data: { email: 'me@kbtu.kz', googleId: 'g-me', name: 'Me', profileComplete: true },
  });
  meCookie = `session=${signSessionToken(me.id)}`;

  const react = await prisma.skill.create({ data: { name: 'React' } });
  const alice = await prisma.user.create({
    data: { email: 'alice@kbtu.kz', googleId: 'g-alice', name: 'alice', firstName: 'Alice', profileComplete: true },
  });
  await prisma.userSkill.create({ data: { userId: alice.id, skillId: react.id, proficiency: 'ADVANCED' } });
  await prisma.user.create({
    data: { email: 'bob@kbtu.kz', googleId: 'g-bob', name: 'Bob', profileComplete: true },
  });
  await prisma.user.create({
    data: { email: 'alina@kbtu.kz', googleId: 'g-alina', name: 'Alina', firstName: 'Alina', profileComplete: false },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

const search = (q, cookie = meCookie) => request(createApp()).get('/api/users').query({ q }).set('Cookie', [cookie]);

test('requires authentication', async () => {
  const res = await request(createApp()).get('/api/users');
  expect(res.status).toBe(401);
});

test('requires a completed profile', async () => {
  const incomplete = await prisma.user.findUnique({ where: { email: 'alina@kbtu.kz' } });
  const res = await search('', `session=${signSessionToken(incomplete.id)}`);
  expect(res.status).toBe(403);
});

test('empty query lists completed profiles except the caller', async () => {
  const res = await search('');
  expect(res.status).toBe(200);
  expect(res.body.map((u) => u.email).sort()).toEqual(['alice@kbtu.kz', 'bob@kbtu.kz']);
});

test('whitespace-only query is treated as empty', async () => {
  const res = await search('   ');
  expect(res.body).toHaveLength(2);
});

test('matches by name and skips incomplete profiles', async () => {
  const res = await search('ALI');
  expect(res.body.map((u) => u.email)).toEqual(['alice@kbtu.kz']);
});

test('matches by skill name and includes skills', async () => {
  const res = await search('react');
  expect(res.body).toHaveLength(1);
  expect(res.body[0].skills[0]).toEqual({ proficiency: 'ADVANCED', skill: { id: expect.any(String), name: 'React' } });
});

test('does not expose internal fields', async () => {
  const res = await search('bob');
  expect(res.body[0]).not.toHaveProperty('googleId');
  expect(res.body[0]).not.toHaveProperty('profileComplete');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/routes/users.test.js`
Expected: FAIL — requests return 404 (route not mounted).

- [ ] **Step 3: Implement** — `server/src/controllers/usersController.js`

```js
const { prisma } = require('../lib/prisma');

const PUBLIC_USER_FIELDS = {
  id: true,
  name: true,
  firstName: true,
  lastName: true,
  email: true,
  faculty: true,
  studyYear: true,
  skills: { select: { proficiency: true, skill: { select: { id: true, name: true } } } },
};

async function searchUsers(req, res, next) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const contains = { contains: q, mode: 'insensitive' };
    const users = await prisma.user.findMany({
      where: {
        profileComplete: true,
        id: { not: req.user.id },
        ...(q
          ? {
              OR: [
                { firstName: contains },
                { lastName: contains },
                { name: contains },
                { email: contains },
                { skills: { some: { skill: { name: contains } } } },
              ],
            }
          : {}),
      },
      select: PUBLIC_USER_FIELDS,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

module.exports = { searchUsers };
```

`server/src/routes/users.js`:

```js
const express = require('express');
const { authRequired, profileRequired } = require('../middleware/auth');
const { searchUsers } = require('../controllers/usersController');

const router = express.Router();

router.get('/', authRequired, profileRequired, searchUsers);

module.exports = router;
```

In `server/src/index.js` add `const usersRoutes = require('./routes/users');` after the `applicationsRoutes` require, and `app.use('/api/users', usersRoutes);` after the `/api/applications` line.

- [ ] **Step 4: Run tests**

Run: `cd server && npx jest tests/routes/users.test.js` → PASS (7 tests). Then `npm test` → all pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/usersController.js server/src/routes/users.js server/src/index.js server/tests/routes/users.test.js
git commit -m "feat(server): add user search endpoint for team invitations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Mark applications VIEWED when the owner lists them

**Files:**
- Modify: `server/src/controllers/teamsController.js` (`listTeamApplications`)
- Test: `server/tests/routes/teamsApplications.test.js`

**Interfaces:**
- Produces: `GET /api/teams/:id/applications` (direction APPLICATION, owner only) now flips `SENT` → `VIEWED` before responding. Invitations and decided applications unchanged.

- [ ] **Step 1: Write the failing tests** — append to `server/tests/routes/teamsApplications.test.js`

```js
test('owner listing applications marks SENT ones VIEWED and leaves the rest alone', async () => {
  const other = await prisma.user.create({
    data: { email: 'other@kbtu.kz', googleId: 'g-other', name: 'Other', profileComplete: true },
  });
  const invitee = await prisma.user.create({
    data: { email: 'invitee@kbtu.kz', googleId: 'g-invitee', name: 'Invitee', profileComplete: true },
  });
  await prisma.application.createMany({
    data: [
      { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'APPLICATION', status: 'SENT' },
      { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: other.id, direction: 'APPLICATION', status: 'DECLINED' },
      { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: invitee.id, direction: 'INVITATION', status: 'SENT' },
    ],
  });

  const res = await request(createApp()).get(`/api/teams/${team.id}/applications`).set('Cookie', [ownerCookie]);
  expect(res.status).toBe(200);
  const statusByEmail = Object.fromEntries(res.body.map((a) => [a.user.email, a.status]));
  expect(statusByEmail).toEqual({ 'applicant@kbtu.kz': 'VIEWED', 'other@kbtu.kz': 'DECLINED' });

  const invitation = await prisma.application.findFirst({ where: { direction: 'INVITATION' } });
  expect(invitation.status).toBe('SENT');
});

test('a non-creator request does not mark anything VIEWED', async () => {
  await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'APPLICATION' },
  });
  const applicantCookie = `session=${signSessionToken(applicant.id)}`;
  await request(createApp()).get(`/api/teams/${team.id}/applications`).set('Cookie', [applicantCookie]);

  const application = await prisma.application.findFirst();
  expect(application.status).toBe('SENT');
});
```

- [ ] **Step 2: Run to verify the first fails**

Run: `cd server && npx jest tests/routes/teamsApplications.test.js`
Expected: first new test FAILS (`applicant@kbtu.kz` is `SENT`); second passes already (guard test).

- [ ] **Step 3: Implement** — in `listTeamApplications`, replace the start of the `try` block so it reads:

```js
    await requireTeamOwner(req.params.id, req.user.id);
    const direction = req.query.direction === 'INVITATION' ? 'INVITATION' : 'APPLICATION';
    if (direction === 'APPLICATION') {
      await prisma.application.updateMany({
        where: { teamId: req.params.id, direction, status: 'SENT' },
        data: { status: 'VIEWED' },
      });
    }
    const applications = await prisma.application.findMany({
```

(the rest of the function is unchanged).

- [ ] **Step 4: Run tests** — `npx jest tests/routes/teamsApplications.test.js` → PASS; `npm test` → all pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/teamsController.js server/tests/routes/teamsApplications.test.js
git commit -m "feat(server): mark applications viewed when the team owner opens them

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Frontend foundation — API client, shared components, navigation

**Files:**
- Modify: `Campus-Team-Finder/src/services/api.jsx`
- Create: `Campus-Team-Finder/src/components/StatusBadge.jsx`, `Feedback.jsx`, `Tabs.jsx`, `DecisionButtons.jsx`
- Modify: `Campus-Team-Finder/src/App.jsx`, `components/Sidebar.jsx`, `components/Header.jsx`, `components/TeamCard.jsx`, `pages/DashboardPage.jsx`, `pages/BrowseTeamsPage.jsx`

**Interfaces (produced, used by Tasks 4–9):**
- `teamApi.getMyApplications(direction?: 'APPLICATION'|'INVITATION')`
- `teamManagementApi.getTeamApplications(teamId, direction?)`, `teamManagementApi.setOpenRoles(teamId, roles: [{ roleId, slotsTotal }])` (body `{ roles }`)
- `userApi.search(q: string)`
- `<StatusBadge status="SENT" />`, `<Spinner />`, `<ErrorBox message={string} />` (renders nothing when empty), `<Tabs tabs={[{id,label}]} active={id} onChange={fn} />`, `<DecisionButtons busy={bool} onDecide={(status) => ...} />`
- `App.jsx` helper `withLayout(element)`; later tasks add one `<Route>` line each.

- [ ] **Step 1: API client** — in `services/api.jsx`:

Replace `getMyApplications: () => apiFetch('/api/applications/mine'),` with:

```js
  getMyApplications: (direction) =>
    apiFetch(`/api/applications/mine${direction === 'INVITATION' ? '?direction=INVITATION' : ''}`),
```

Replace the `setOpenRoles` entry with:

```js
  setOpenRoles: (teamId, roles) =>
    apiFetch(`/api/teams/${teamId}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roles }), // [{ roleId, slotsTotal }]
    }),
```

Replace `getTeamApplications: (teamId) => apiFetch(`/api/teams/${teamId}/applications`),` with:

```js
  getTeamApplications: (teamId, direction) =>
    apiFetch(`/api/teams/${teamId}/applications${direction === 'INVITATION' ? '?direction=INVITATION' : ''}`),
```

Append at the end of the file:

```js

// Flow 4.5B — find users to invite
export const userApi = {
  search: (q) => apiFetch(`/api/users?q=${encodeURIComponent(q)}`),
};
```

- [ ] **Step 2: Shared components**

`components/StatusBadge.jsx`:

```jsx
const STYLES = {
  SENT: 'bg-gray-100 text-gray-600',
  VIEWED: 'bg-amber-50 text-amber-700',
  ACCEPTED: 'bg-green-50 text-green-700',
  DECLINED: 'bg-red-50 text-red-600',
  DRAFT: 'bg-gray-100 text-gray-600',
  PUBLISHED: 'bg-blue-50 text-blue-600',
  CLOSED: 'bg-gray-100 text-gray-500',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${STYLES[status] || STYLES.SENT}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
```

`components/Feedback.jsx`:

```jsx
export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">{message}</div>
  );
}
```

`components/Tabs.jsx`:

```jsx
export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-2 border-b border-gray-100">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
            active === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

`components/DecisionButtons.jsx`:

```jsx
export default function DecisionButtons({ busy, onDecide }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => onDecide('ACCEPTED')}
        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
      >
        Accept
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onDecide('DECLINED')}
        className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Routes** — replace `App.jsx` `export default function App()` and add the helper above it (keep `ProtectedRoute` as is):

```jsx
const withLayout = (element) => (
  <ProtectedRoute>
    <Layout>{element}</Layout>
  </ProtectedRoute>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute requireProfile={false}>
            <OnboardingWizard />
          </ProtectedRoute>
        }
      />
      <Route path="/dashboard" element={withLayout(<DashboardPage />)} />
      <Route path="/browse" element={withLayout(<BrowseTeamsPage />)} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Sidebar** — replace the `sidebarItems` array:

```jsx
const sidebarItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'home' },
  { path: '/browse', label: 'Browse Teams', icon: 'search' },
  { path: '/applications', label: 'My Applications', icon: 'document' },
  { path: '/my-teams', label: 'My Teams', icon: 'users' },
  { path: '/teams/new', label: 'Create Team', icon: 'add' },
  { path: '/profile', label: 'Profile', icon: 'user' },
];
```

Also add `end` to the `NavLink` (`<NavLink key={item.path} to={item.path} end ...>`) so `/teams/new` doesn't highlight other items. Delete the `{/* Settings at the bottom */}` comment.

- [ ] **Step 5: Header menu + logout** — in `components/Header.jsx`:

Change imports to:

```jsx
import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
```

In the component, replace `const { user } = useContext(UserContext);` with:

```jsx
  const { user, logout } = useContext(UserContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login');
  };
```

(keep the existing `profileOpen` `useState` line; put this block right after it). Replace the placeholder line `{profileOpen && <div ...>Profile Menu</div>}` with:

```jsx
              {profileOpen && (
                <div className="absolute right-0 top-12 py-2 bg-white shadow-xl border border-gray-100 rounded-2xl w-48">
                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </div>
              )}
```

- [ ] **Step 6: TeamCard link** — add `import { Link } from 'react-router-dom';` and replace the disabled `<button ...>View Team</button>` with:

```jsx
        <Link
          to={`/teams/${team.id}`}
          className="block text-center w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
        >
          View Team
        </Link>
```

- [ ] **Step 7: Dashboard search + CTA** — in `pages/DashboardPage.jsx` add imports `import { Link, useNavigate } from 'react-router-dom';`; inside the component add:

```jsx
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/browse?role=${encodeURIComponent(q)}` : '/browse');
  };
```

Replace the whole `<div className="flex items-center gap-3">…</div>` (the search box container) with:

```jsx
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search teams by role..."
                aria-label="Search teams by role"
                className="w-72 px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-600 bg-white"
              />
            </form>
            <Link
              to="/teams/new"
              className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm"
            >
              + Create Team
            </Link>
          </div>
```

- [ ] **Step 8: Browse reads `?role=`** — in `pages/BrowseTeamsPage.jsx`: add `import { useSearchParams } from 'react-router-dom';`, delete `const [role, setRole] = useState('');` and add:

```jsx
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get('role') || '';
  const setRole = (value) => setSearchParams(value ? { role: value } : {});
```

Inside the `<select>`, directly after `<option value="">All roles</option>`, add (so free-text searches from the dashboard still show as the active filter):

```jsx
          {role && !roles.some((r) => r.name === role) && <option value={role}>“{role}”</option>}
```

- [ ] **Step 9: Verify**

Run: `cd Campus-Team-Finder && npm run build && npm run lint`
Expected: build succeeds; lint shows only the 5 baseline errors.

Browser (both servers running, log in as any completed `@kbtu.kz` user): sidebar "Browse Teams" opens `/browse`; dashboard search "front" + Enter → `/browse?role=front` with the filter showing “front”; "View Team" navigates to `/teams/<id>` (redirects to dashboard for now — fine); avatar menu → Logout lands on `/login`.

- [ ] **Step 10: Commit**

```bash
git add Campus-Team-Finder/src
git commit -m "feat(web): shared UI pieces, fixed API client, working nav, search and logout

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Team details page with Apply (Flow 3.4–3.5)

**Files:**
- Create: `Campus-Team-Finder/src/pages/TeamDetailsPage.jsx`
- Modify: `Campus-Team-Finder/src/App.jsx`

**Interfaces:**
- Consumes: `teamApi.getTeamById`, `teamApi.getMyApplications()`, `teamApi.applyToRole(teamId, teamOpenRoleId)`, `StatusBadge`, `Spinner`, `ErrorBox`, `displayName`.
- Produces: route `/teams/:id`.

- [ ] **Step 1: Page** — `pages/TeamDetailsPage.jsx`

```jsx
import { useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { teamApi } from '../services/api';
import { displayName } from '../lib/names';
import StatusBadge from '../components/StatusBadge';
import { ErrorBox, Spinner } from '../components/Feedback';

export default function TeamDetailsPage() {
  const { id } = useParams();
  const { user } = useContext(UserContext);
  const [team, setTeam] = useState(null);
  const [myApplications, setMyApplications] = useState([]);
  const [error, setError] = useState('');
  const [busyRoleId, setBusyRoleId] = useState(null);
  const [roleErrors, setRoleErrors] = useState({});

  useEffect(() => {
    Promise.all([teamApi.getTeamById(id), teamApi.getMyApplications()])
      .then(([t, a]) => {
        setTeam(t);
        setMyApplications(a);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const apply = async (openRole) => {
    setBusyRoleId(openRole.id);
    setRoleErrors((prev) => ({ ...prev, [openRole.id]: '' }));
    try {
      const application = await teamApi.applyToRole(team.id, openRole.id);
      setMyApplications((prev) => [...prev, application]);
    } catch (err) {
      setRoleErrors((prev) => ({ ...prev, [openRole.id]: err.message }));
    } finally {
      setBusyRoleId(null);
    }
  };

  if (error) {
    return (
      <main className="p-8">
        <ErrorBox message={error} />
      </main>
    );
  }
  if (!team) return <Spinner />;

  const isOwner = team.creatorId === user.id;
  const statusFor = (openRoleId) => myApplications.find((a) => a.teamOpenRoleId === openRoleId)?.status;

  return (
    <main className="p-8 space-y-6 max-w-4xl">
      <Link to="/browse" className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to teams
      </Link>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xl">
              {team.name[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-950">{team.name}</h1>
              {team.eventTarget && <p className="text-sm text-gray-500">{team.eventTarget}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {team.status !== 'PUBLISHED' && <StatusBadge status={team.status} />}
            {isOwner && (
              <Link
                to={`/teams/${team.id}/manage`}
                className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
              >
                Manage team
              </Link>
            )}
          </div>
        </div>
        {team.description && <p className="text-sm text-gray-600 leading-relaxed">{team.description}</p>}
        <p className="text-xs text-gray-400">
          Created by <span className="font-semibold text-gray-700">{displayName(team.creator)}</span>
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-950">Open roles</h2>
        {team.openRoles.length === 0 && <p className="text-sm text-gray-500">This team has no open roles yet.</p>}
        {team.openRoles.map((openRole) => {
          const status = statusFor(openRole.id);
          const full = openRole.slotsFilled >= openRole.slotsTotal;
          return (
            <div key={openRole.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{openRole.role.name}</p>
                  <p className="text-xs text-gray-400">
                    {openRole.slotsFilled}/{openRole.slotsTotal} slots filled
                  </p>
                </div>
                {!isOwner &&
                  (status ? (
                    <StatusBadge status={status} />
                  ) : full ? (
                    <span className="px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-semibold rounded-lg">Full</span>
                  ) : (
                    <button
                      type="button"
                      disabled={busyRoleId === openRole.id}
                      onClick={() => apply(openRole)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {busyRoleId === openRole.id ? 'Applying...' : 'Apply'}
                    </button>
                  ))}
              </div>
              {roleErrors[openRole.id] && <p className="text-xs text-red-600">{roleErrors[openRole.id]}</p>}
            </div>
          );
        })}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Route** — in `App.jsx` add `import TeamDetailsPage from './pages/TeamDetailsPage';` and, above the `*` route:

```jsx
      <Route path="/teams/:id" element={withLayout(<TeamDetailsPage />)} />
```

- [ ] **Step 3: Verify** — `npm run build && npm run lint` (baseline only). Browser as user B on a seeded team: Apply → button shows "Applying..." then a "Sent" badge; reload keeps the badge; a full role shows "Full". As the team's owner: no Apply buttons, "Manage team" button visible (Review Focus 1). Double-click Apply → one application (Review Focus 2).

- [ ] **Step 4: Commit**

```bash
git add Campus-Team-Finder/src
git commit -m "feat(web): team details page with apply per role

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: My Applications page (status pipeline + received invitations)

**Files:**
- Create: `Campus-Team-Finder/src/pages/MyApplicationsPage.jsx`
- Modify: `Campus-Team-Finder/src/App.jsx`

**Interfaces:**
- Consumes: `teamApi.getMyApplications(direction)`, `teamManagementApi.respondToApplication(id, status)`, `Tabs`, `StatusBadge`, `DecisionButtons`, `Spinner`, `ErrorBox`.
- Produces: route `/applications`.

- [ ] **Step 1: Page** — `pages/MyApplicationsPage.jsx`

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { teamApi, teamManagementApi } from '../services/api';
import Tabs from '../components/Tabs';
import StatusBadge from '../components/StatusBadge';
import DecisionButtons from '../components/DecisionButtons';
import { ErrorBox, Spinner } from '../components/Feedback';

const TABS = [
  { id: 'APPLICATION', label: 'Sent applications' },
  { id: 'INVITATION', label: 'Invitations' },
];

export default function MyApplicationsPage() {
  const [tab, setTab] = useState('APPLICATION');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    teamApi
      .getMyApplications(tab)
      .then((data) => !cancelled && setItems(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const switchTab = (next) => {
    setTab(next);
    setItems(null);
    setError('');
  };

  const respond = async (item, status) => {
    setBusyId(item.id);
    setRowErrors((prev) => ({ ...prev, [item.id]: '' }));
    try {
      const updated = await teamManagementApi.respondToApplication(item.id, status);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: updated.status } : i)));
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [item.id]: err.message }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-950">My Applications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track where you applied and answer team invitations.</p>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={switchTab} />
      <ErrorBox message={error} />
      {!items && !error && <Spinner />}
      {items && items.length === 0 && (
        <p className="text-sm text-gray-500">
          {tab === 'APPLICATION' ? "You haven't applied to any team yet." : 'No invitations yet.'}
        </p>
      )}

      <div className="space-y-3">
        {items?.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Link to={`/teams/${item.teamId}`} className="font-semibold text-gray-900 hover:text-blue-600">
                  {item.team.name}
                </Link>
                <p className="text-xs text-gray-400">
                  {item.teamOpenRole.role.name} · {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={item.status} />
                {tab === 'INVITATION' && ['SENT', 'VIEWED'].includes(item.status) && (
                  <DecisionButtons busy={busyId === item.id} onDecide={(status) => respond(item, status)} />
                )}
              </div>
            </div>
            {rowErrors[item.id] && <p className="text-xs text-red-600">{rowErrors[item.id]}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Route** — `import MyApplicationsPage from './pages/MyApplicationsPage';` and `<Route path="/applications" element={withLayout(<MyApplicationsPage />)} />`.

- [ ] **Step 3: Verify** — build + lint (baseline only). Browser as the user from Task 4: Sent tab lists the application with "Sent"; Invitations tab shows "No invitations yet." (invitation accept is checked end to end in Task 10).

- [ ] **Step 4: Commit**

```bash
git add Campus-Team-Finder/src
git commit -m "feat(web): my applications page with invitation responses

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Create Team wizard (Flow 4.2–4.4)

**Files:**
- Create: `Campus-Team-Finder/src/pages/CreateTeamWizard.jsx`
- Modify: `Campus-Team-Finder/src/App.jsx`

**Interfaces:**
- Consumes: `lookupApi.getRoles`, `teamApi.getTeamById`, `teamManagementApi.createTeam`, `teamManagementApi.setOpenRoles(teamId, [{ roleId, slotsTotal }])`, `teamManagementApi.publishTeam`, `Spinner`, `ErrorBox`.
- Produces: route `/teams/new` and `/teams/new?team=<id>` (resume draft at step 2). After publish → `/teams/:id/manage` (route added in Task 8; until then it hits the `*` redirect).

Design notes: step 1 creates the DRAFT team, so there is no Back from step 2 to step 1 (the spec excludes editing team info; going back would create a second team). Back exists only from step 3 to step 2.

- [ ] **Step 1: Page** — `pages/CreateTeamWizard.jsx`

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { lookupApi, teamApi, teamManagementApi } from '../services/api';
import { ErrorBox, Spinner } from '../components/Feedback';

const STEPS = [
  { id: 1, title: 'Project Info', description: 'Name your team and the event or hackathon you are building for.' },
  { id: 2, title: 'Open Roles', description: 'Specify the roles you need and how many people for each.' },
  { id: 3, title: 'Review & Publish', description: 'Check everything, then publish to make your team visible to students.' },
];

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-600 bg-white';

export default function CreateTeamWizard() {
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get('team');
  const navigate = useNavigate();

  const [step, setStep] = useState(resumeId ? 2 : 1);
  const [team, setTeam] = useState(null);
  const [info, setInfo] = useState({ name: '', eventTarget: '', description: '' });
  const [rows, setRows] = useState([{ roleId: '', slotsTotal: 1 }]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    lookupApi.getRoles().then(setRoleOptions).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!resumeId) return;
    teamApi
      .getTeamById(resumeId)
      .then((t) => {
        if (t.status !== 'DRAFT') {
          navigate(`/teams/${t.id}/manage`, { replace: true });
          return;
        }
        setTeam(t);
        if (t.openRoles.length > 0) {
          setRows(t.openRoles.map((r) => ({ roleId: r.roleId, slotsTotal: r.slotsTotal })));
        }
      })
      .catch((err) => setError(err.message));
  }, [resumeId, navigate]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveInfo = () => {
    if (!info.name.trim()) {
      setError('Team name is required');
      return;
    }
    run(async () => {
      const created = await teamManagementApi.createTeam({
        name: info.name.trim(),
        eventTarget: info.eventTarget.trim() || null,
        description: info.description.trim() || null,
      });
      setTeam({ ...created, openRoles: [] });
      setStep(2);
    });
  };

  const saveRoles = () => {
    const chosen = rows.filter((r) => r.roleId);
    if (chosen.length === 0) return setError('Add at least one role');
    if (new Set(chosen.map((r) => r.roleId)).size !== chosen.length) return setError('Each role can only be added once');
    if (chosen.some((r) => !Number.isInteger(r.slotsTotal) || r.slotsTotal < 1)) return setError('Slots must be at least 1');
    run(async () => {
      const saved = await teamManagementApi.setOpenRoles(team.id, chosen);
      setTeam((t) => ({ ...t, openRoles: saved }));
      setStep(3);
    });
  };

  const publish = () =>
    run(async () => {
      await teamManagementApi.publishTeam(team.id);
      navigate(`/teams/${team.id}/manage`);
    });

  const updateRow = (index, patch) => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const meta = STEPS[step - 1];
  const waitingForDraft = step > 1 && !team;

  return (
    <main className="p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-2">
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 font-medium px-0.5">
            {STEPS.map((s) => (
              <span key={s.id} className={s.id <= step ? 'text-blue-600 font-bold' : ''}>
                {s.id}. {s.title}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">{meta.title}</h1>
            <p className="text-xs sm:text-sm text-gray-500">{meta.description}</p>
          </div>

          <ErrorBox message={error} />

          {waitingForDraft && !error && <Spinner />}

          {step === 1 && (
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">Team name *</span>
                <input
                  className={inputClass}
                  value={info.name}
                  onChange={(e) => setInfo({ ...info, name: e.target.value })}
                  placeholder="e.g. AI Study Buddy"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">Event / hackathon</span>
                <input
                  className={inputClass}
                  value={info.eventTarget}
                  onChange={(e) => setInfo({ ...info, eventTarget: e.target.value })}
                  placeholder="e.g. KBTU Hackathon 2026"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">Description</span>
                <textarea
                  className={`${inputClass} min-h-28`}
                  value={info.description}
                  onChange={(e) => setInfo({ ...info, description: e.target.value })}
                  placeholder="What are you building and who are you looking for?"
                />
              </label>
            </div>
          )}

          {step === 2 && team && (
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={index} className="flex items-center gap-3">
                  <select
                    className={inputClass}
                    value={row.roleId}
                    onChange={(e) => updateRow(index, { roleId: e.target.value })}
                    aria-label="Role"
                  >
                    <option value="">Select a role</option>
                    {roleOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className={`${inputClass} w-24`}
                    value={row.slotsTotal}
                    onChange={(e) => updateRow(index, { slotsTotal: parseInt(e.target.value, 10) || 0 })}
                    aria-label="Slots"
                  />
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                    disabled={rows.length === 1}
                    className="px-3 py-2 text-sm text-gray-400 hover:text-red-600 disabled:opacity-30"
                    aria-label="Remove role"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, { roleId: '', slotsTotal: 1 }])}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                + Add role
              </button>
            </div>
          )}

          {step === 3 && team && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Team</p>
                <p className="font-bold text-gray-900">{team.name}</p>
                {team.eventTarget && <p className="text-gray-500">{team.eventTarget}</p>}
              </div>
              {team.description && <p className="text-gray-600">{team.description}</p>}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Open roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {team.openRoles.map((r) => (
                    <span key={r.id} className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs rounded-lg">
                      {r.role.name} · {r.slotsTotal} {r.slotsTotal === 1 ? 'slot' : 'slots'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            {step === 3 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={busy}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-3">
              {step === 3 && (
                <button
                  type="button"
                  onClick={() => navigate('/my-teams')}
                  disabled={busy}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
                >
                  Save as draft
                </button>
              )}
              <button
                type="button"
                onClick={step === 1 ? saveInfo : step === 2 ? saveRoles : publish}
                disabled={busy || waitingForDraft}
                className="px-6 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
              >
                {busy ? 'Saving...' : step === 3 ? 'Publish team' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Route** — `import CreateTeamWizard from './pages/CreateTeamWizard';` and `<Route path="/teams/new" element={withLayout(<CreateTeamWizard />)} />` (React Router ranks the static `/teams/new` above `/teams/:id`).

- [ ] **Step 3: Verify** — build + lint (baseline only). Browser: empty name → "Team name is required"; step 2 with the same role twice → "Each role can only be added once"; publish → navigates to `/teams/<id>/manage` (redirects to dashboard until Task 8); `/browse` now lists the team. Open `/teams/new?team=<that id>` → redirected (published). Create another team, stop at step 2, open `/teams/new?team=<draft id>` → resumes at step 2 (Review Focus 4). Double-click "Publish team" → one request (Review Focus 2).

- [ ] **Step 4: Commit**

```bash
git add Campus-Team-Finder/src
git commit -m "feat(web): create team wizard with open roles and publish

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: My Teams page

**Files:**
- Create: `Campus-Team-Finder/src/pages/MyTeamsPage.jsx`
- Modify: `Campus-Team-Finder/src/App.jsx`

**Interfaces:**
- Consumes: `teamManagementApi.getMyCreatedTeams()` → teams with `openRoles[].role` and `openRoles[].applications` (both directions), `StatusBadge`, `Spinner`, `ErrorBox`.
- Produces: route `/my-teams`.

- [ ] **Step 1: Page** — `pages/MyTeamsPage.jsx`

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { teamManagementApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { ErrorBox, Spinner } from '../components/Feedback';

// openRoles[].applications mixes applications and invitations
const pendingApplicants = (team) =>
  team.openRoles
    .flatMap((r) => r.applications)
    .filter((a) => a.direction === 'APPLICATION' && ['SENT', 'VIEWED'].includes(a.status)).length;

const buttonClass = 'px-4 py-2 text-sm font-semibold rounded-xl transition';

export default function MyTeamsPage() {
  const [teams, setTeams] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    teamManagementApi.getMyCreatedTeams().then(setTeams).catch((err) => setError(err.message));
  }, []);

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-950">My Teams</h1>
          <p className="text-sm text-gray-500 mt-0.5">Teams you created.</p>
        </div>
        <Link to="/teams/new" className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700 shadow-sm`}>
          + Create Team
        </Link>
      </div>

      <ErrorBox message={error} />
      {!teams && !error && <Spinner />}
      {teams && teams.length === 0 && (
        <p className="text-sm text-gray-500">
          You haven't created a team yet.{' '}
          <Link to="/teams/new" className="text-blue-600 font-semibold">
            Create one
          </Link>
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams?.map((team) => {
          const pending = pendingApplicants(team);
          return (
            <div key={team.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-900">{team.name}</h3>
                  {team.eventTarget && <p className="text-xs text-gray-400">{team.eventTarget}</p>}
                </div>
                <StatusBadge status={team.status} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {team.openRoles.map((r) => (
                  <span key={r.id} className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs rounded-lg">
                    {r.role.name} · {r.slotsFilled}/{r.slotsTotal}
                  </span>
                ))}
                {team.openRoles.length === 0 && <span className="text-xs text-gray-400">No open roles yet</span>}
              </div>
              {team.status === 'PUBLISHED' && (
                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-900">{pending}</span> pending{' '}
                  {pending === 1 ? 'applicant' : 'applicants'}
                </p>
              )}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {team.status === 'DRAFT' ? (
                  <Link to={`/teams/new?team=${team.id}`} className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}>
                    Continue setup
                  </Link>
                ) : (
                  <>
                    <Link to={`/teams/${team.id}/manage`} className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}>
                      Manage
                    </Link>
                    <Link to={`/teams/${team.id}`} className={`${buttonClass} border border-gray-200 text-gray-600 hover:bg-gray-50`}>
                      View
                    </Link>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Route** — `import MyTeamsPage from './pages/MyTeamsPage';` and `<Route path="/my-teams" element={withLayout(<MyTeamsPage />)} />`.

- [ ] **Step 3: Verify** — build + lint (baseline only). Browser as the Task 6 user: published team shows "Published", "1 pending applicant" once someone applied (invitations not counted); draft shows "Continue setup" which resumes at step 2.

- [ ] **Step 4: Commit**

```bash
git add Campus-Team-Finder/src
git commit -m "feat(web): my teams page with drafts and pending applicant counts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Manage Team page — applicants and invitations (Flow 4.5A/B, 4.6A/B)

**Files:**
- Create: `Campus-Team-Finder/src/components/InvitePanel.jsx`
- Create: `Campus-Team-Finder/src/pages/ManageTeamPage.jsx`
- Modify: `Campus-Team-Finder/src/App.jsx`

**Interfaces:**
- Consumes: `teamApi.getTeamById`, `teamManagementApi.getTeamApplications(teamId, direction)`, `teamManagementApi.respondToApplication`, `teamManagementApi.inviteUser(teamId, userId, teamOpenRoleId)`, `userApi.search(q)`, `Tabs`, `StatusBadge`, `DecisionButtons`, `Spinner`, `ErrorBox`, `displayName`.
- Produces: route `/teams/:id/manage`; `<InvitePanel team={team} onInvited={(invitation) => ...} />` where `invitation` has `user` and `teamOpenRole.role` filled in for display.

- [ ] **Step 1: InvitePanel** — `components/InvitePanel.jsx`

```jsx
import { useEffect, useState } from 'react';
import { teamManagementApi, userApi } from '../services/api';
import { displayName } from '../lib/names';

export default function InvitePanel({ team, onInvited }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [roleByUser, setRoleByUser] = useState({});
  const [busyUserId, setBusyUserId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});

  useEffect(() => {
    const handle = setTimeout(() => {
      userApi
        .search(query)
        .then((users) => {
          setResults(users);
          setSearchError('');
        })
        .catch((err) => setSearchError(err.message));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  if (team.openRoles.length === 0) {
    return <p className="text-sm text-gray-500">Add open roles before inviting people.</p>;
  }

  const invite = async (u) => {
    const teamOpenRoleId = roleByUser[u.id] || team.openRoles[0].id;
    setBusyUserId(u.id);
    setRowErrors((prev) => ({ ...prev, [u.id]: '' }));
    try {
      const invitation = await teamManagementApi.inviteUser(team.id, u.id, teamOpenRoleId);
      onInvited({ ...invitation, user: u, teamOpenRole: team.openRoles.find((r) => r.id === teamOpenRoleId) });
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [u.id]: err.message }));
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search students by name, email or skill..."
        aria-label="Search students"
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-600 bg-white"
      />
      {searchError && <p className="text-xs text-red-600">{searchError}</p>}
      {results && results.length === 0 && <p className="text-sm text-gray-500">No users found.</p>}
      {results?.map((u) => (
        <div key={u.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{displayName(u)}</p>
              <p className="text-xs text-gray-400 truncate">
                {[u.faculty, u.studyYear].filter(Boolean).join(' · ') || u.email}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {u.skills.slice(0, 4).map((s) => (
                  <span key={s.skill.id} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-medium rounded-md">
                    {s.skill.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={roleByUser[u.id] || team.openRoles[0].id}
                onChange={(e) => setRoleByUser((prev) => ({ ...prev, [u.id]: e.target.value }))}
                aria-label="Role to invite for"
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
              >
                {team.openRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.role.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busyUserId === u.id}
                onClick={() => invite(u)}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                Invite
              </button>
            </div>
          </div>
          {rowErrors[u.id] && <p className="text-xs text-red-600">{rowErrors[u.id]}</p>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: ManageTeamPage** — `pages/ManageTeamPage.jsx`

```jsx
import { useCallback, useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { teamApi, teamManagementApi } from '../services/api';
import { displayName } from '../lib/names';
import Tabs from '../components/Tabs';
import StatusBadge from '../components/StatusBadge';
import DecisionButtons from '../components/DecisionButtons';
import InvitePanel from '../components/InvitePanel';
import { ErrorBox, Spinner } from '../components/Feedback';

const TABS = [
  { id: 'APPLICATION', label: 'Applicants' },
  { id: 'INVITATION', label: 'Invitations' },
];

function ProfileLinks({ user }) {
  const links = [
    user.githubUrl && { href: user.githubUrl, label: 'GitHub' },
    user.linkedinUrl && { href: user.linkedinUrl, label: 'LinkedIn' },
    user.telegramHandle && { href: `https://t.me/${user.telegramHandle.replace(/^@/, '')}`, label: 'Telegram' },
  ].filter(Boolean);
  return (
    <div className="flex gap-3">
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">
          {l.label}
        </a>
      ))}
    </div>
  );
}

export default function ManageTeamPage() {
  const { id } = useParams();
  const { user } = useContext(UserContext);
  const [team, setTeam] = useState(null);
  const [tab, setTab] = useState('APPLICATION');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});

  const loadTeam = useCallback(
    () => teamApi.getTeamById(id).then(setTeam).catch((err) => setError(err.message)),
    [id]
  );
  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const isOwner = team?.creatorId === user.id;

  useEffect(() => {
    if (!isOwner) return undefined;
    let cancelled = false;
    teamManagementApi
      .getTeamApplications(id, tab)
      .then((data) => !cancelled && setItems(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [id, tab, isOwner]);

  const switchTab = (next) => {
    setTab(next);
    setItems(null);
    setError('');
  };

  const respond = async (item, status) => {
    setBusyId(item.id);
    setRowErrors((prev) => ({ ...prev, [item.id]: '' }));
    try {
      const updated = await teamManagementApi.respondToApplication(item.id, status);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: updated.status } : i)));
      if (status === 'ACCEPTED') loadTeam();
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [item.id]: err.message }));
    } finally {
      setBusyId(null);
    }
  };

  if (!team) {
    return <main className="p-8">{error ? <ErrorBox message={error} /> : <Spinner />}</main>;
  }
  if (!isOwner) {
    return (
      <main className="p-8 space-y-4">
        <ErrorBox message="Only the team creator can manage this team." />
        <Link to={`/teams/${team.id}`} className="text-sm text-blue-600 font-semibold">
          View team
        </Link>
      </main>
    );
  }

  return (
    <main className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/my-teams" className="text-sm text-gray-500 hover:text-gray-700">
            ← My teams
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-950 mt-2">{team.name}</h1>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {team.openRoles.map((r) => (
              <span key={r.id} className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs rounded-lg">
                {r.role.name} · {r.slotsFilled}/{r.slotsTotal}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={team.status} />
          <Link to={`/teams/${team.id}`} className="text-sm font-semibold text-blue-600">
            View public page
          </Link>
        </div>
      </div>

      {team.status === 'DRAFT' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 text-sm flex items-center justify-between">
          <span>This team is a draft and not visible to other students yet.</span>
          <Link to={`/teams/new?team=${team.id}`} className="font-semibold underline">
            Finish setup
          </Link>
        </div>
      )}

      <Tabs tabs={TABS} active={tab} onChange={switchTab} />
      <ErrorBox message={error} />

      {tab === 'INVITATION' && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Invite students</h2>
          <InvitePanel team={team} onInvited={(invitation) => setItems((prev) => [invitation, ...(prev || [])])} />
        </section>
      )}

      <section className="space-y-3">
        {tab === 'INVITATION' && <h2 className="text-sm font-bold text-gray-900">Sent invitations</h2>}
        {!items && !error && <Spinner />}
        {items && items.length === 0 && (
          <p className="text-sm text-gray-500">
            {tab === 'APPLICATION' ? 'No applications yet.' : 'No invitations sent yet.'}
          </p>
        )}
        {items?.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-semibold text-gray-900">{displayName(item.user)}</p>
                <p className="text-xs text-gray-400">
                  {[item.teamOpenRole.role.name, item.user.faculty, item.user.studyYear].filter(Boolean).join(' · ')}
                </p>
                <ProfileLinks user={item.user} />
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={item.status} />
                {tab === 'APPLICATION' && ['SENT', 'VIEWED'].includes(item.status) && (
                  <DecisionButtons busy={busyId === item.id} onDecide={(status) => respond(item, status)} />
                )}
              </div>
            </div>
            {rowErrors[item.id] && <p className="text-xs text-red-600">{rowErrors[item.id]}</p>}
          </div>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Route** — `import ManageTeamPage from './pages/ManageTeamPage';` and `<Route path="/teams/:id/manage" element={withLayout(<ManageTeamPage />)} />`.

- [ ] **Step 4: Verify** — build + lint (baseline only). Browser, two accounts A (owner) and B:
  - A opens Manage → Applicants shows B with "Viewed" (fetch marked it); B's `/applications` shows "Viewed".
  - A Accept → badge "Accepted", header role chip slot count increments.
  - Invitations tab: search "   " lists students; search "zzzz" → "No users found." (Review Focus 5); invite B for a role → appears under Sent invitations as "Sent"; inviting B for the same role again → inline "already invited" error.
  - B opens `/teams/<A's team>/manage` by URL → "Only the team creator can manage this team." (Review Focus 3).

- [ ] **Step 5: Commit**

```bash
git add Campus-Team-Finder/src
git commit -m "feat(web): manage team page with applicant decisions and invitations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Profile page and profile edit

**Files:**
- Create: `Campus-Team-Finder/src/lib/profileOptions.js`, `Campus-Team-Finder/src/lib/profileForm.js`, `Campus-Team-Finder/src/pages/ProfilePage.jsx`
- Modify: `Campus-Team-Finder/src/pages/Onboarding/Step5_Availability.jsx`, `Campus-Team-Finder/src/pages/Onboarding/OnboardingWizard.jsx`, `Campus-Team-Finder/src/App.jsx`

**Interfaces:**
- Consumes: `profileApi.getProfile()` → user with `skills[].{proficiency, skill}`, `interests[].interest`, `preferredRoles[].role`.
- Produces: `AVAILABILITY_OPTIONS` (`lib/profileOptions.js`), `profileToFormData(profile)` (`lib/profileForm.js`), `<OnboardingWizard mode="edit" />`, routes `/profile`, `/profile/edit`.

- [ ] **Step 1: Shared availability options** — create `lib/profileOptions.js`:

```js
export const AVAILABILITY_OPTIONS = [
  { id: 'less-5', title: 'Less than 5 hrs/week', subtitle: 'Light commitment' },
  { id: '5-10', title: '5–10 hrs/week', subtitle: 'Part-time' },
  { id: '10-20', title: '10–20 hrs/week', subtitle: 'Dedicated' },
  { id: '20-plus', title: '20+ hrs/week', subtitle: 'Full-time hackathon' },
];
```

In `Step5_Availability.jsx`, delete the local `AVAILABILITY_OPTIONS` array and add `import { AVAILABILITY_OPTIONS } from '../../lib/profileOptions';`.

- [ ] **Step 2: Profile → form mapping** — create `lib/profileForm.js`:

```js
// Shape must match OnboardingWizard's formData
export function profileToFormData(profile) {
  return {
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    bio: profile.bio || '',
    faculty: profile.faculty || '',
    studyYear: profile.studyYear || '',
    skills: profile.skills.map((s) => ({ id: s.skill.id, name: s.skill.name, level: s.proficiency })),
    interests: profile.interests.map((i) => i.interest.id),
    roles: profile.preferredRoles.map((r) => r.role.id),
    availability: profile.availability || '',
    links: {
      github: profile.githubUrl || '',
      linkedin: profile.linkedinUrl || '',
      telegram: profile.telegramHandle || '',
    },
  };
}
```

- [ ] **Step 3: Wizard edit mode** — in `OnboardingWizard.jsx`:

Imports: change `import { useState, useContext } from 'react';` to `import { useState, useContext, useEffect } from 'react';`, change `import { useNavigate } from 'react-router-dom';` to `import { Link, useNavigate } from 'react-router-dom';`, and add `import { profileToFormData } from '../../lib/profileForm';`.

Signature: `export default function OnboardingWizard({ mode = 'create' }) {` and right after it:

```jsx
  const isEdit = mode === 'edit';
  const [loadingProfile, setLoadingProfile] = useState(isEdit);
```

After the `const navigate = useNavigate();` line add:

```jsx
  // Step components read their initial state once on mount, so render them only after this loads
  useEffect(() => {
    if (!isEdit) return;
    profileApi
      .getProfile()
      .then((profile) => setFormData(profileToFormData(profile)))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingProfile(false));
  }, [isEdit]);
```

In `handleComplete`, replace steps 5–6:

```jsx
      // 5. Mark profile complete flag on backend (first-time setup only)
      if (!isEdit) await profileApi.completeProfile();

      // 6. Refresh user session and leave the wizard
      await refreshUser();
      navigate(isEdit ? '/profile' : '/dashboard');
```

In the header, replace `<p className="text-xs text-gray-400">Profile Setup</p>` with `<p className="text-xs text-gray-400">{isEdit ? 'Edit Profile' : 'Profile Setup'}</p>`, and just before the `<span ...>Step {currentStep} of {STEPS.length}</span>` add (wrap both in `<div className="flex items-center gap-3">…</div>`):

```jsx
            {isEdit && (
              <Link to="/profile" className="text-xs font-semibold text-gray-500 hover:text-gray-700">
                Cancel
              </Link>
            )}
```

Replace `<div className="pt-2">{renderStepContent()}</div>` with:

```jsx
          <div className="pt-2">
            {loadingProfile ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : (
              renderStepContent()
            )}
          </div>
```

Replace the `'Complete Profile'` label with `isEdit ? 'Save changes' : 'Complete Profile'`. Add `disabled={loadingProfile}` to the Next button, and change the Complete button's `disabled={submitting}` to `disabled={submitting || loadingProfile}`.

- [ ] **Step 4: ProfilePage** — `pages/ProfilePage.jsx`

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { profileApi } from '../services/api';
import { displayName, initials } from '../lib/names';
import { AVAILABILITY_OPTIONS } from '../lib/profileOptions';
import { ErrorBox, Spinner } from '../components/Feedback';

function Chips({ items, className = 'bg-blue-50 text-blue-600' }) {
  if (items.length === 0) return <p className="text-sm text-gray-400">Not set</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className={`px-3 py-1 text-xs font-medium rounded-lg ${className}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    profileApi.getProfile().then(setProfile).catch((err) => setError(err.message));
  }, []);

  if (!profile) return <main className="p-8">{error ? <ErrorBox message={error} /> : <Spinner />}</main>;

  const availability = AVAILABILITY_OPTIONS.find((o) => o.id === profile.availability)?.title;
  const links = [
    profile.githubUrl && { href: profile.githubUrl, label: 'GitHub' },
    profile.linkedinUrl && { href: profile.linkedinUrl, label: 'LinkedIn' },
    profile.telegramHandle && { href: `https://t.me/${profile.telegramHandle.replace(/^@/, '')}`, label: 'Telegram' },
  ].filter(Boolean);

  return (
    <main className="p-8 max-w-3xl">
      <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-2xl">
              {initials(profile)}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-950">{displayName(profile)}</h1>
              <p className="text-sm text-gray-500">
                {[profile.faculty, profile.studyYear].filter(Boolean).join(' · ') || profile.email}
              </p>
            </div>
          </div>
          <Link
            to="/profile/edit"
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
          >
            Edit profile
          </Link>
        </div>

        {profile.bio && <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>}

        <Section title="Skills">
          <Chips items={profile.skills.map((s) => `${s.skill.name} · ${s.proficiency.toLowerCase()}`)} />
        </Section>
        <Section title="Interests">
          <Chips items={profile.interests.map((i) => i.interest.name)} className="bg-gray-50 border border-gray-200 text-gray-600" />
        </Section>
        <Section title="Preferred roles">
          <Chips items={profile.preferredRoles.map((r) => r.role.name)} className="bg-gray-50 border border-gray-200 text-gray-600" />
        </Section>
        <Section title="Availability">
          <p className="text-sm text-gray-700">{availability || 'Not set'}</p>
        </Section>
        <Section title="Links">
          {links.length === 0 ? (
            <p className="text-sm text-gray-400">Not set</p>
          ) : (
            <div className="flex gap-4">
              {links.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="text-sm font-semibold text-blue-600 hover:underline">
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </Section>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Routes** — `import ProfilePage from './pages/ProfilePage';` and:

```jsx
      <Route path="/profile" element={withLayout(<ProfilePage />)} />
      <Route
        path="/profile/edit"
        element={
          <ProtectedRoute>
            <OnboardingWizard mode="edit" />
          </ProtectedRoute>
        }
      />
```

- [ ] **Step 6: Verify** — build + lint (baseline only). Browser: `/profile` shows the onboarding data; Edit → wizard pre-filled on every step (name, faculty, skills with levels, selected interests/roles, availability, links); change bio + add a skill → "Save changes" → back on `/profile` with changes; Cancel returns without saving. First-time onboarding with a new `@kbtu.kz` user still ends on `/dashboard`.

- [ ] **Step 7: Commit**

```bash
git add Campus-Team-Finder/src
git commit -m "feat(web): profile page and edit mode for the profile wizard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: End-to-end verification

**Files:** none (fix-ups only if something fails, committed as `fix(web): ...`).

- [ ] **Step 1: Automated checks**

```bash
cd server && npm test
cd ../Campus-Team-Finder && npm run build && npm run lint
```

Expected: all Jest suites pass; build succeeds; lint shows only the 5 baseline errors.

- [ ] **Step 2: Browser run-through** (backend + frontend running, `npm run prisma:seed` done). Use two fresh accounts `e2e-a@kbtu.kz` (A) and `e2e-b@kbtu.kz` (B), completing onboarding for each:
  1. A: Dashboard "+ Create Team" → 3 steps (two roles, one with 1 slot) → Publish → lands on Manage.
  2. B: Dashboard search the role name → Browse shows A's team → View Team → Apply on role 1 → "Sent".
  3. A: Manage → Applicants shows B as "Viewed"; B: My Applications shows "Viewed".
  4. A: Accept → "Accepted"; role 1 chip shows 1/1; B's details page shows the role as "Accepted" and it's full for anyone else.
  5. A: Invitations → search B → invite for role 2 → "Sent". B: My Applications → Invitations → Accept → "Accepted".
  6. B: Profile → Edit → change bio → Save → new bio shown.
  7. B: avatar menu → Logout → `/login`; visiting `/dashboard` redirects to `/login`.
  8. Review Focus spot checks: B opens A's manage URL → owner-only message; `/teams/new?team=<A's published team>` as A → redirected to Manage.

- [ ] **Step 3: Record result** — if all pass, nothing to commit. If a fix was needed, commit it and re-run Steps 1–2.
