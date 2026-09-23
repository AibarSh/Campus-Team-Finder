# Frontend ↔ Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the React frontend work end to end against the Express/Prisma backend: dev login, onboarding, real data on Dashboard and Browse Teams.

**Architecture:** Backend adapts its `User` schema to the wizard's fields, adds a flag-gated dev login, and seeds lookups matching the UI. Frontend fixes its API client contract, replaces the fake login, drives onboarding from lookup APIs, and maps real team data into existing components.

**Tech Stack:** Express 4, Prisma 6 (PostgreSQL 16 via docker-compose), Jest + supertest; React 19, Vite 8, react-router-dom 7, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-09-23-frontend-backend-integration-design.md`

## Global Constraints

- Paths: repo root = `Campus-Team-Finder/` (git root). Backend = `server/`. Frontend = `Campus-Team-Finder/` (nested dir of same name).
- Server port `4000`; frontend dev origin `http://localhost:5173`.
- Server error body shape is `{ error: string }` (unchanged).
- Dev login route exists only when `NODE_ENV !== 'production'` AND `DEV_LOGIN === 'true'`.
- Emails must end in `@kbtu.kz` (case-insensitive).
- Proficiency values: `BEGINNER | INTERMEDIATE | ADVANCED`.
- Availability ids: `less-5 | 5-10 | 10-20 | 20-plus`.
- Do not modify Google login code (`authController.loginWithGoogle`, `lib/googleAuth.js`).
- Backend tests run against the `_test` DB (`server/.env.test`); `resetDb` refuses other DBs.
- Frontend has no test framework; do not add one. Frontend tasks verify with `npm run build` + `npm run lint` and the final browser walkthrough.
- Prerequisite for all backend tasks: Docker running and `docker compose up -d` in `server/`.

## File Map

Backend (`server/`):
- `prisma/schema.prisma` — User fields, drop `Faculty` enum
- `prisma/migrations/<ts>_add_profile_fields/migration.sql` — generated
- `src/lib/profileOptions.js` — **new**, allowed faculty/studyYear/availability values
- `src/controllers/profileController.js` — patchable fields, validation, name rebuild
- `src/controllers/teamsController.js` — validate `faculty` query filter
- `src/controllers/authController.js` — add `devLogin`
- `src/routes/auth.js` — register dev-login behind flag
- `prisma/seed.js` — UI lookup lists + demo teams
- `.env.example`, `.env` — `DEV_LOGIN=true`
- Tests: `tests/routes/profile.test.js`, `tests/routes/teamsSearch.test.js`, `tests/routes/devLogin.test.js` (**new**)

Frontend (`Campus-Team-Finder/src/`):
- `services/api.jsx` — contract fixes
- `lib/names.js` — **new**, `initials(user)` / `displayName(user)`
- `pages/LoginPage.jsx` — dev login
- `pages/Onboarding/OnboardingWizard.jsx`, `Step1..Step5` — schema-aligned
- `context/UserContext.jsx` — drop teams/applications
- `components/TeamCard.jsx`, `components/Header.jsx`, `components/UserProfileSidebar.jsx`
- `pages/DashboardPage.jsx`, `pages/BrowseTeamsPage.jsx`

---

### Task 1: Repo setup — frontend dependencies, remove stray root package

**Files:**
- Modify: `Campus-Team-Finder/package.json`
- Delete (git): root `package.json`, root `package-lock.json`, root `node_modules/` (currently committed to git)
- Create: root `.gitignore`

**Interfaces:**
- Produces: working `npm run build` in `Campus-Team-Finder/` (build may still fail on code issues fixed later; must not fail on missing modules).

- [ ] **Step 1: Confirm root package only holds react-router-dom**

Run: `cat package.json` (repo root)
Expected: only `"react-router-dom"` in dependencies. If anything else is there, stop and ask.

- [ ] **Step 2: Add react-router-dom to the frontend and install**

```bash
cd Campus-Team-Finder && npm install react-router-dom@^7.18.4
```
Expected: `package.json` dependencies now include `"react-router-dom": "^7.18.4"`; `Campus-Team-Finder/node_modules/react-router-dom` exists.

- [ ] **Step 3: Remove root package files from git and disk**

```bash
cd .. && git rm -r -q --cached node_modules package.json package-lock.json && rm -rf node_modules package.json package-lock.json
```

- [ ] **Step 4: Add root `.gitignore`**

```gitignore
node_modules/
.DS_Store
```

- [ ] **Step 5: Verify build resolves modules**

Run: `cd Campus-Team-Finder && npx vite build`
Expected: no `ERR_MODULE_NOT_FOUND` / "Module not found" for `react-router-dom`, `react`, `@vitejs/plugin-react`. (Build may succeed outright — fine.)

- [ ] **Step 6: Commit**

```bash
git add .gitignore Campus-Team-Finder/package.json Campus-Team-Finder/package-lock.json
git commit -m "chore: move react-router-dom into frontend, drop stray root package"
```

---

### Task 2: Schema migration + profile options + profile PATCH validation

**Files:**
- Modify: `server/prisma/schema.prisma` (enum `Faculty` lines 10-13; `User` model lines 39-60)
- Create: `server/src/lib/profileOptions.js`
- Modify: `server/src/controllers/profileController.js`
- Modify: `server/src/controllers/teamsController.js` (`listTeams`)
- Test: `server/tests/routes/profile.test.js`, `server/tests/routes/teamsSearch.test.js`

**Interfaces:**
- Produces: `require('../lib/profileOptions')` → `{ FACULTIES: string[], STUDY_YEARS: string[], AVAILABILITY: string[] }`.
- Produces: `User` has `firstName, lastName, bio, availability, faculty, studyYear` as `String?`.
- Produces: PATCH `/api/profile` accepts `name, avatarUrl, firstName, lastName, bio, faculty, studyYear, availability, githubUrl, linkedinUrl, telegramHandle`.

- [ ] **Step 1: Write failing profile tests**

Replace the `PATCH /api/profile updates only allowed fields` test in `server/tests/routes/profile.test.js` and append new tests:

```js
const { FACULTIES, STUDY_YEARS } = require('../../src/lib/profileOptions');

test('PATCH /api/profile updates only allowed fields', async () => {
  const res = await request(createApp())
    .patch('/api/profile')
    .set('Cookie', [cookie])
    .send({
      firstName: 'Aisha',
      lastName: 'Bekova',
      bio: 'Hi',
      faculty: FACULTIES[0],
      studyYear: STUDY_YEARS[2],
      availability: '5-10',
      telegramHandle: '@aisha',
      weeklyHours: 10,
      isAdmin: true,
    });

  expect(res.status).toBe(200);
  expect(res.body.firstName).toBe('Aisha');
  expect(res.body.lastName).toBe('Bekova');
  expect(res.body.bio).toBe('Hi');
  expect(res.body.faculty).toBe(FACULTIES[0]);
  expect(res.body.studyYear).toBe(STUDY_YEARS[2]);
  expect(res.body.availability).toBe('5-10');
  expect(res.body.telegramHandle).toBe('@aisha');
  expect(res.body.weeklyHours).toBeNull();
  expect(res.body).not.toHaveProperty('isAdmin');
});

test('PATCH /api/profile rebuilds name from first/last name', async () => {
  await request(createApp()).patch('/api/profile').set('Cookie', [cookie]).send({ firstName: 'Aisha' });
  const res = await request(createApp()).patch('/api/profile').set('Cookie', [cookie]).send({ lastName: 'Bekova' });
  expect(res.body.name).toBe('Aisha Bekova');
});

test('PATCH /api/profile keeps name when first/last not sent', async () => {
  const res = await request(createApp()).patch('/api/profile').set('Cookie', [cookie]).send({ bio: 'x' });
  expect(res.body.name).toBe('A');
});

test.each([
  ['faculty', 'FIT'],
  ['studyYear', '2'],
  ['availability', '40-plus'],
])('PATCH /api/profile rejects unknown %s', async (field, value) => {
  const res = await request(createApp()).patch('/api/profile').set('Cookie', [cookie]).send({ [field]: value });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(field);
});

test('PATCH /api/profile rejects overlong bio', async () => {
  const res = await request(createApp())
    .patch('/api/profile')
    .set('Cookie', [cookie])
    .send({ bio: 'x'.repeat(1001) });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch('bio');
});

test('PATCH /api/profile allows clearing a field with null', async () => {
  await request(createApp()).patch('/api/profile').set('Cookie', [cookie]).send({ faculty: FACULTIES[0] });
  const res = await request(createApp()).patch('/api/profile').set('Cookie', [cookie]).send({ faculty: null });
  expect(res.status).toBe(200);
  expect(res.body.faculty).toBeNull();
});
```

- [ ] **Step 2: Update teamsSearch fixtures**

In `server/tests/routes/teamsSearch.test.js`:
- Add at top: `const { FACULTIES } = require('../../src/lib/profileOptions');`
- Line 21: `faculty: 'FIT'` → `faculty: FACULTIES[0]`
- Line 24: `faculty: 'ISE'` → `faculty: FACULTIES[3]`
- Lines 54 and 66: `'/api/teams?faculty=FIT'` → `` `/api/teams?faculty=${encodeURIComponent(FACULTIES[0])}` ``
- Rename test at line 74 to `'rejects an unknown faculty value with 400'` (body unchanged).

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd server && npx jest tests/routes/profile.test.js tests/routes/teamsSearch.test.js`
Expected: FAIL — `Cannot find module '../../src/lib/profileOptions'`.

- [ ] **Step 4: Create `server/src/lib/profileOptions.js`**

Strings copied verbatim from `Campus-Team-Finder/src/pages/Onboarding/Step2_AcademicInfo.jsx` and `Step5_Availability.jsx`:

```js
const FACULTIES = [
  'School of Information Technology and Engineering (SITE)',
  'School of Energy and Petroleum Industry (SEPI)',
  'Business School (BS)',
  'International School of Economics (ISE)',
  'Maritime Academy (KMA)',
  'School of Applied Mathematics (SAM)',
  'School of Chemical Engineering (SCE)',
];

const STUDY_YEARS = [
  '1st year (Bachelor)',
  '2nd year (Bachelor)',
  '3rd year (Bachelor)',
  '4th year (Bachelor)',
  '1st year (Master)',
  '2nd year (Master)',
  'PhD',
];

const AVAILABILITY = ['less-5', '5-10', '10-20', '20-plus'];

module.exports = { FACULTIES, STUDY_YEARS, AVAILABILITY };
```

- [ ] **Step 5: Update schema**

In `server/prisma/schema.prisma`, delete the `enum Faculty { FIT ISE }` block and change the `User` model's fields:

```prisma
model User {
  id              String   @id @default(uuid())
  email           String   @unique
  googleId        String   @unique
  name            String
  firstName       String?
  lastName        String?
  bio             String?
  avatarUrl       String?
  faculty         String?
  studyYear       String?
  availability    String?
  weeklyHours     Int?
  githubUrl       String?
  linkedinUrl     String?
  telegramHandle  String?
  profileComplete Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  skills         UserSkill[]
  interests      UserInterest[]
  preferredRoles UserPreferredRole[]
  teamsCreated   Team[]              @relation("TeamCreator")
  applications   Application[]
}
```

- [ ] **Step 6: Generate the migration, then hand-edit it to cast instead of drop**

```bash
cd server && npx prisma migrate dev --create-only --name add_profile_fields
```

Prisma will generate drop-and-add for `faculty`/`studyYear` (data loss). Replace the generated `migration.sql` contents with:

```sql
ALTER TABLE "User" ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "bio" TEXT,
ADD COLUMN "availability" TEXT;

ALTER TABLE "User" ALTER COLUMN "faculty" TYPE TEXT USING "faculty"::TEXT;
ALTER TABLE "User" ALTER COLUMN "studyYear" TYPE TEXT USING "studyYear"::TEXT;

DROP TYPE "Faculty";
```

Apply to dev and test DBs:

```bash
npx prisma migrate dev
DATABASE_URL="$(grep DATABASE_URL .env.test | cut -d= -f2- | tr -d '"')" npx prisma migrate deploy
```
Expected: both report the migration applied; `npx prisma migrate status` says "Database schema is up to date!".

- [ ] **Step 7: Update `profileController.js`**

Replace the top of the file through `patchProfile` with:

```js
const { prisma } = require('../lib/prisma');
const { AppError } = require('../errors');
const { FACULTIES, STUDY_YEARS, AVAILABILITY } = require('../lib/profileOptions');

const PATCHABLE_FIELDS = [
  'name',
  'avatarUrl',
  'firstName',
  'lastName',
  'bio',
  'faculty',
  'studyYear',
  'availability',
  'githubUrl',
  'linkedinUrl',
  'telegramHandle',
];

const ALLOWED_VALUES = { faculty: FACULTIES, studyYear: STUDY_YEARS, availability: AVAILABILITY };

function validateField(field, value) {
  if (value === null) return;
  if (typeof value !== 'string') throw new AppError(400, `${field} must be a string`);
  const max = field === 'bio' ? 1000 : 200;
  if (value.length > max) throw new AppError(400, `${field} must be at most ${max} characters`);
  if (ALLOWED_VALUES[field] && !ALLOWED_VALUES[field].includes(value)) {
    throw new AppError(400, `${field} is not an allowed value`);
  }
}
```

(Keep `getProfile` unchanged.) Replace `patchProfile` with:

```js
async function patchProfile(req, res, next) {
  try {
    const data = {};
    for (const field of PATCHABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        if (field === 'name' && !req.body.name) throw new AppError(400, 'name cannot be empty');
        validateField(field, req.body[field]);
        data[field] = req.body[field];
      }
    }
    if (data.firstName !== undefined || data.lastName !== undefined) {
      const first = data.firstName !== undefined ? data.firstName : req.user.firstName;
      const last = data.lastName !== undefined ? data.lastName : req.user.lastName;
      const full = [first, last].filter(Boolean).join(' ').trim();
      if (full) data.name = full;
    }
    const updated = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}
```

(`name` is non-nullable in the schema, hence the explicit empty-name guard.)

- [ ] **Step 8: Validate faculty filter in `listTeams`**

In `server/src/controllers/teamsController.js`, add at top:

```js
const { FACULTIES } = require('../lib/profileOptions');
```

In `listTeams`, right after `const { skill, faculty } = req.query;`:

```js
    if (faculty && !FACULTIES.includes(faculty)) throw new AppError(400, 'faculty is not an allowed value');
```

- [ ] **Step 9: Run full server suite**

Run: `cd server && npm test`
Expected: PASS, all suites. If any other test used `studyYear` as a number or `faculty: 'FIT'`/`'ISE'`, update it to use `STUDY_YEARS[n]` / `FACULTIES[n]` and re-run.

- [ ] **Step 10: Commit**

```bash
git add server/prisma server/src/lib/profileOptions.js server/src/controllers/profileController.js server/src/controllers/teamsController.js server/tests
git commit -m "feat(server): add profile fields matching onboarding UI, string faculty/studyYear"
```

---

### Task 3: Dev login endpoint

**Files:**
- Modify: `server/src/controllers/authController.js`
- Modify: `server/src/routes/auth.js`
- Modify: `server/.env.example`, `server/.env`
- Create: `server/tests/routes/devLogin.test.js`

**Interfaces:**
- Produces: `POST /api/auth/dev-login` body `{ email: string }` → `200 { user, isNewUser: boolean }` + `session` cookie; `400` missing email; `403` non-KBTU; `404` when disabled.
- Note: the route is registered when `createApp()` → `require('./routes/auth')` runs. Router modules are cached by Node, so the flag is read **at request time** inside a small guard middleware, not at module load, so tests can toggle `process.env.DEV_LOGIN`.

- [ ] **Step 1: Write failing tests**

Create `server/tests/routes/devLogin.test.js`:

```js
const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { resetDb } = require('../helpers/resetDb');

const ORIGINAL_FLAG = process.env.DEV_LOGIN;

beforeEach(async () => {
  await resetDb();
  process.env.DEV_LOGIN = 'true';
});

afterAll(async () => {
  process.env.DEV_LOGIN = ORIGINAL_FLAG;
  await prisma.$disconnect();
});

test('creates a user and sets a session cookie that works for /me', async () => {
  const res = await request(createApp()).post('/api/auth/dev-login').send({ email: 'New.Student@KBTU.kz' });
  expect(res.status).toBe(200);
  expect(res.body.isNewUser).toBe(true);
  expect(res.body.user.email).toBe('new.student@kbtu.kz');
  expect(res.body.user.name).toBe('new.student');

  const cookie = res.headers['set-cookie'][0].split(';')[0];
  const me = await request(createApp()).get('/api/auth/me').set('Cookie', [cookie]);
  expect(me.status).toBe(200);
  expect(me.body.user.email).toBe('new.student@kbtu.kz');
});

test('logs in the same user again without duplicating', async () => {
  await request(createApp()).post('/api/auth/dev-login').send({ email: 'x@kbtu.kz' });
  const res = await request(createApp()).post('/api/auth/dev-login').send({ email: 'x@kbtu.kz' });
  expect(res.body.isNewUser).toBe(false);
  expect(await prisma.user.count()).toBe(1);
});

test('rejects non-kbtu emails with 403', async () => {
  const res = await request(createApp()).post('/api/auth/dev-login').send({ email: 'a@gmail.com' });
  expect(res.status).toBe(403);
});

test('rejects missing email with 400', async () => {
  const res = await request(createApp()).post('/api/auth/dev-login').send({});
  expect(res.status).toBe(400);
});

test('returns 404 when DEV_LOGIN is not "true"', async () => {
  process.env.DEV_LOGIN = 'false';
  const res = await request(createApp()).post('/api/auth/dev-login').send({ email: 'x@kbtu.kz' });
  expect(res.status).toBe(404);
});

test('returns 404 in production even with the flag on', async () => {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const res = await request(createApp()).post('/api/auth/dev-login').send({ email: 'x@kbtu.kz' });
    expect(res.status).toBe(404);
  } finally {
    process.env.NODE_ENV = original;
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd server && npx jest tests/routes/devLogin.test.js`
Expected: FAIL — first test gets 404.

- [ ] **Step 3: Add `devLogin` to `authController.js`**

Add before `function me`:

```js
async function devLogin(req, res, next) {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) throw new AppError(400, 'email is required');
    if (!email.endsWith('@kbtu.kz')) throw new AppError(403, 'Use your KBTU email to sign in');

    const googleId = `dev:${email}`;
    const existing = await prisma.user.findUnique({ where: { googleId } });
    const user =
      existing ||
      (await prisma.user.create({ data: { googleId, email, name: email.split('@')[0] } }));

    res.cookie('session', signSessionToken(user.id), SESSION_COOKIE_OPTIONS);
    res.json({ user, isNewUser: !existing });
  } catch (err) {
    next(err);
  }
}
```

Update exports: `module.exports = { loginWithGoogle, devLogin, me, logout };`

- [ ] **Step 4: Register the route behind the flag in `routes/auth.js`**

```js
const express = require('express');
const { authRequired } = require('../middleware/auth');
const { loginWithGoogle, devLogin, me, logout } = require('../controllers/authController');

const router = express.Router();

function devLoginEnabled(req, res, next) {
  if (process.env.NODE_ENV === 'production' || process.env.DEV_LOGIN !== 'true') return next('router');
  next();
}

router.post('/google', loginWithGoogle);
router.post('/dev-login', devLoginEnabled, devLogin);
router.get('/me', authRequired, me);
router.post('/logout', logout);

module.exports = router;
```

`next('router')` exits this router; with no later match Express returns its default 404.

- [ ] **Step 5: Env files**

Append to both `server/.env.example` and `server/.env`:

```
DEV_LOGIN=true
```

- [ ] **Step 6: Run full suite**

Run: `cd server && npm test`
Expected: PASS, all suites including 6 new dev-login tests.

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/authController.js server/src/routes/auth.js server/.env.example server/tests/routes/devLogin.test.js
git commit -m "feat(server): add flag-gated dev login endpoint"
```

(`server/.env` is gitignored — verify with `git check-ignore server/.env`; if it prints nothing, do not add it.)

---

### Task 4: Seed — UI lookup lists and demo teams

**Files:**
- Modify: `server/prisma/seed.js`

**Interfaces:**
- Produces: lookups with the exact names below; demo user `demo@kbtu.kz` with 3 `PUBLISHED` teams.

- [ ] **Step 1: Replace `server/prisma/seed.js`**

```js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'Java',
  'C++', 'Kotlin', 'Figma', 'SQL', 'MongoDB', 'Docker',
  'TensorFlow', 'Flutter',
];
const INTERESTS = [
  'Artificial Intelligence', 'Web Development', 'Mobile Development', 'Game Development',
  'Data Science', 'Blockchain / Web3', 'IoT & Embedded', 'Cybersecurity',
  'UI/UX Design', 'Cloud Computing',
];
const ROLES = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'UI/UX Designer',
  'ML Engineer', 'Data Scientist', 'Mobile Developer', 'DevOps Engineer',
  'Project Manager', 'QA Engineer',
];

// ponytail: demo data so Browse Teams isn't empty until the Create Team page exists
const DEMO_TEAMS = [
  {
    name: 'AI Study Buddy',
    eventTarget: 'KBTU Hackathon 2026',
    description: 'An AI assistant that turns lecture notes into flashcards and quizzes.',
    roles: [['ML Engineer', 1], ['Frontend Developer', 1]],
  },
  {
    name: 'Campus Eats',
    eventTarget: 'Startup Weekend Almaty',
    description: 'Pre-order canteen food and skip the queue between classes.',
    roles: [['Mobile Developer', 2], ['Backend Developer', 1], ['UI/UX Designer', 1]],
  },
  {
    name: 'GreenGrid',
    eventTarget: 'Energy Hack',
    description: 'Dashboard for tracking dorm electricity usage and nudging savings.',
    roles: [['Data Scientist', 1]],
  },
];

async function upsertNames(model, names) {
  for (const name of names) {
    await model.upsert({ where: { name }, update: {}, create: { name } });
  }
}

async function seedDemoTeams() {
  const demo = await prisma.user.upsert({
    where: { googleId: 'dev:demo@kbtu.kz' },
    update: {},
    create: {
      googleId: 'dev:demo@kbtu.kz',
      email: 'demo@kbtu.kz',
      name: 'Demo Student',
      firstName: 'Demo',
      lastName: 'Student',
      profileComplete: true,
    },
  });

  for (const t of DEMO_TEAMS) {
    const exists = await prisma.team.findFirst({ where: { name: t.name, creatorId: demo.id } });
    if (exists) continue;
    const roles = await Promise.all(t.roles.map(([name]) => prisma.role.findUnique({ where: { name } })));
    await prisma.team.create({
      data: {
        name: t.name,
        eventTarget: t.eventTarget,
        description: t.description,
        status: 'PUBLISHED',
        creatorId: demo.id,
        openRoles: {
          create: t.roles.map(([, slotsTotal], i) => ({ roleId: roles[i].id, slotsTotal })),
        },
      },
    });
  }
}

async function main() {
  await upsertNames(prisma.skill, SKILLS);
  await upsertNames(prisma.interest, INTERESTS);
  await upsertNames(prisma.role, ROLES);
  await seedDemoTeams();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 2: Reset dev DB and seed twice (idempotency)**

```bash
cd server && npx prisma migrate reset --force --skip-seed && npm run prisma:seed && npm run prisma:seed
```

Then verify counts:

```bash
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();Promise.all([p.skill.count(),p.interest.count(),p.role.count(),p.team.count({where:{status:'PUBLISHED'}})]).then(c=>{console.log(c);return p.\$disconnect()})"
```
Expected: `[ 14, 10, 10, 3 ]`

- [ ] **Step 3: Commit**

```bash
git add server/prisma/seed.js
git commit -m "feat(server): seed lookups matching onboarding UI and demo teams"
```

---

### Task 5: Frontend API client, name helpers, dev login page

**Files:**
- Modify: `Campus-Team-Finder/src/services/api.jsx`
- Create: `Campus-Team-Finder/src/lib/names.js`
- Modify: `Campus-Team-Finder/src/pages/LoginPage.jsx`
- Modify: `Campus-Team-Finder/src/context/UserContext.jsx`

**Interfaces:**
- Produces (api.jsx):
  - `authApi.devLogin(email: string) → Promise<{ user, isNewUser }>`
  - `profileApi.updateSkills(skills: {skillId, proficiency}[])`, `updateInterests(ids: string[])`, `updatePreferredRoles(ids: string[])`
  - `teamApi.getTeams({ role?: string, faculty?: string }) → Promise<Team[]>` where `Team = { id, name, eventTarget, description, creator: User, openRoles: { id, slotsTotal, slotsFilled, role: { id, name } }[] }`
  - `teamApi.getMyApplications() → Promise<{ id, status: 'SENT'|'VIEWED'|'ACCEPTED'|'DECLINED', team, teamOpenRole }[]>`
  - `teamManagementApi.inviteUser(teamId, userId, teamOpenRoleId)`
- Produces (names.js): `displayName(user) → string`, `initials(user) → string` (1–2 uppercase letters, `'?'` if nothing).
- Produces (UserContext): value `{ user, setUser, loading, refreshUser, logout }` — `teams`, `setTeams`, `applications`, `setApplications` removed.

- [ ] **Step 1: Fix `services/api.jsx`**

Apply these exact changes:

Line 1:
```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
```

Error throw in `apiFetch`:
```js
    throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
```

In `authApi`, add after `loginWithGoogle`:
```js
  devLogin: (email) =>
    apiFetch('/api/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
```

In `profileApi`, change bodies:
```js
      body: JSON.stringify({ skills }), // [{ skillId, proficiency }]
```
```js
      body: JSON.stringify({ interests: interestIds }),
```
```js
      body: JSON.stringify({ roles: roleIds }),
```

Replace `getTeams`:
```js
  // server's `skill` param matches open role names
  getTeams: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.role) params.append('skill', filters.role);
    if (filters.faculty) params.append('faculty', filters.faculty);
    const queryString = params.toString();
    return apiFetch(`/api/teams${queryString ? `?${queryString}` : ''}`);
  },
```

Replace `inviteUser`:
```js
  inviteUser: (teamId, userId, teamOpenRoleId) =>
    apiFetch(`/api/teams/${teamId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ userId, teamOpenRoleId }),
    }),
```

- [ ] **Step 2: Create `src/lib/names.js`**

```js
export function displayName(user) {
  if (!user) return '';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || '';
}

export function initials(user) {
  const letters = displayName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  return letters || '?';
}
```

- [ ] **Step 3: Slim `UserContext.jsx`**

Remove the `teams`/`applications` state and their four entries from the provider value. Remove the unused `profileApi` import. Resulting value:

```jsx
      value={{
        user,
        setUser,
        loading,
        refreshUser,
        logout,
      }}
```

- [ ] **Step 4: Rewrite `LoginPage.jsx` logic and form**

Replace the component's state/handler section (top of file through `handleSubmit`) with:

```jsx
import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { authApi } from '../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email');
      return;
    }

    if (!email.toLowerCase().endsWith('@kbtu.kz')) {
      setError('Please use your official @kbtu.kz email address');
      return;
    }

    setSubmitting(true);
    try {
      const { user } = await authApi.devLogin(email);
      setUser(user);
      navigate(user.profileComplete ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
```

In the JSX:
- Delete the whole Password `<div className="space-y-1.5">…</div>` block.
- Submit button: add `disabled={submitting}` and label `{submitting ? 'Signing in...' : 'Sign In'}`.
- Replace the footer "First time here? Create your profile" block with:

```jsx
        <p className="text-center text-[11px] text-gray-400">
          Development login — no password required
        </p>
```

- [ ] **Step 5: Build and lint**

Run: `cd Campus-Team-Finder && npm run build && npx eslint src/services src/lib src/pages/LoginPage.jsx src/context`
Expected: build succeeds; no lint errors in these files. (Build may fail elsewhere only if pages still reference removed context fields — Dashboard/Browse read `teams` from context but destructuring a missing key yields `undefined`, which does not fail the build.)

- [ ] **Step 6: Commit**

```bash
git add Campus-Team-Finder/src/services/api.jsx Campus-Team-Finder/src/lib/names.js Campus-Team-Finder/src/pages/LoginPage.jsx Campus-Team-Finder/src/context/UserContext.jsx
git commit -m "feat(web): fix API client contract and use dev login"
```

---

### Task 6: Onboarding wizard aligned to schema and lookups

**Files:**
- Modify: `Campus-Team-Finder/src/pages/Onboarding/OnboardingWizard.jsx`
- Modify: `Campus-Team-Finder/src/pages/Onboarding/Step1_PersonalInfo.jsx`
- Modify: `Campus-Team-Finder/src/pages/Onboarding/Step3_Skills.jsx`
- Modify: `Campus-Team-Finder/src/pages/Onboarding/Step4_Interests.jsx`
- Step2 and Step5: unchanged (their values already match `profileOptions.js`).

**Interfaces:**
- Consumes: `lookupApi.getSkills|getInterests|getRoles() → Promise<{ id, name }[]>`; `profileApi.*` from Task 5; `initials` from `lib/names.js`.
- Form state shape: `skills: { id, name, level: 'BEGINNER'|'INTERMEDIATE'|'ADVANCED' }[]`, `interests: string[]` (ids), `roles: string[]` (ids).

- [ ] **Step 1: Step 1 — drop photo upload, show initials**

In `Step1_PersonalInfo.jsx`:
- Add `import { initials } from '../../lib/names';`
- Delete `photoPreview` state, `handlePhotoUpload`, `handleRemovePhoto`, and remove `photoPreview` from every `update({...})` call.
- Replace the "Profile Photo Upload Section" block with:

```jsx
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-blue-100/70 text-blue-600 flex items-center justify-center font-bold text-2xl border border-blue-200 shrink-0">
          {initials({ firstName, lastName })}
        </div>
        <p className="text-xs text-gray-400">Your initials are shown to other students.</p>
      </div>
```

In `OnboardingWizard.jsx` remove `photoPreview: null` from the initial `formData`.

- [ ] **Step 2: Step 3 — lookup-driven pick-list**

Replace `Step3_Skills.jsx` entirely:

```jsx
import { useEffect, useState } from 'react';
import { lookupApi } from '../../services/api';

const LEVELS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];
const levelLabel = (value) => LEVELS.find((l) => l.value === value)?.label || value;

export default function Step3_Skills({ data = [], update }) {
  const [skills, setSkills] = useState(data);
  const [options, setOptions] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('INTERMEDIATE');

  const load = () => {
    setLoadError('');
    lookupApi.getSkills().then(setOptions).catch((err) => setLoadError(err.message));
  };
  useEffect(load, []);

  const change = (next) => {
    setSkills(next);
    if (update) update(next);
  };

  const addSkill = (option) => {
    if (skills.some((s) => s.id === option.id)) return;
    change([...skills, { id: option.id, name: option.name, level }]);
    setQuery('');
  };

  const removeSkill = (id) => change(skills.filter((s) => s.id !== id));

  const available = options.filter(
    (o) => !skills.some((s) => s.id === o.id) && o.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">Add a skill</label>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search skills..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-grow px-4 py-3 rounded-2xl border border-gray-200 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
          />
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            aria-label="Proficiency"
            className="px-4 py-3 rounded-2xl border border-gray-200 text-sm bg-white outline-none text-gray-700 cursor-pointer"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loadError ? (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center justify-between">
          <span>Couldn't load skills: {loadError}</span>
          <button type="button" onClick={load} className="font-semibold underline">Retry</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => addSkill(option)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition"
            >
              + {option.name}
            </button>
          ))}
        </div>
      )}

      {skills.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center space-y-2 my-4">
          <div className="text-amber-500 text-xl font-bold">⚡</div>
          <p className="text-sm text-gray-500 font-medium">Add at least 2 skills to help teams find you</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5 pt-4">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-semibold text-blue-700"
            >
              <span>{skill.name}</span>
              <span className="text-blue-400 font-normal">({levelLabel(skill.level)})</span>
              <button type="button" onClick={() => removeSkill(skill.id)} className="hover:text-red-500 ml-1" aria-label={`Remove ${skill.name}`}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

(This also fixes the old bug where `useState(data.skills)` ignored the array passed as `data`, losing skills when navigating back.)

- [ ] **Step 3: Step 4 — lookup-driven chips storing ids**

In `Step4_Interests.jsx`:
- Delete `INTEREST_OPTIONS` and `ROLE_OPTIONS`.
- Add imports: `import { useEffect, useState } from 'react';` and `import { lookupApi } from '../../services/api';`
- Add state and loader inside the component, after the two selection states:

```jsx
  const [interestOptions, setInterestOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [loadError, setLoadError] = useState('');

  const load = () => {
    setLoadError('');
    Promise.all([lookupApi.getInterests(), lookupApi.getRoles()])
      .then(([interests, roles]) => {
        setInterestOptions(interests);
        setRoleOptions(roles);
      })
      .catch((err) => setLoadError(err.message));
  };
  useEffect(load, []);
```

- `toggleInterest`/`toggleRole` stay as-is but are called with `item.id`.
- Map over `interestOptions` / `roleOptions` instead of the constants:

```jsx
          {interestOptions.map((item) => {
            const isSelected = selectedInterests.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleInterest(item.id)}
                className={/* unchanged */}
              >
                {item.name}
              </button>
            );
          })}
```

(same pattern for `roleOptions` with `toggleRole` / `selectedRoles`; keep the existing `className` template literal exactly.)

- Directly under the outer `<div className="space-y-8">`, add:

```jsx
      {loadError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center justify-between">
          <span>Couldn't load options: {loadError}</span>
          <button type="button" onClick={load} className="font-semibold underline">Retry</button>
        </div>
      )}
```

- [ ] **Step 4: Wizard submit payload**

In `OnboardingWizard.jsx` `handleComplete`, replace step 1 and 2 of the try block:

```jsx
      await profileApi.updateProfile({
        firstName: formData.firstName || null,
        lastName: formData.lastName || null,
        bio: formData.bio || null,
        faculty: formData.faculty || null,
        studyYear: formData.studyYear || null,
        availability: formData.availability || null,
        githubUrl: formData.links?.github || null,
        linkedinUrl: formData.links?.linkedin || null,
        telegramHandle: formData.links?.telegram || null,
      });

      await profileApi.updateSkills(
        formData.skills.map((s) => ({ skillId: s.id, proficiency: s.level }))
      );
      await profileApi.updateInterests(formData.interests);
      await profileApi.updatePreferredRoles(formData.roles);
```

Remove the `if (formData.*?.length > 0)` guards (PUT with `[]` is valid and makes retries/edits consistent). Keep `completeProfile`, `refreshUser`, `navigate('/dashboard')` as-is.

- [ ] **Step 5: Build and lint**

Run: `cd Campus-Team-Finder && npm run build && npx eslint src/pages/Onboarding src/lib`
Expected: build succeeds, no lint errors in these files. If `react-hooks/exhaustive-deps` warns on `useEffect(load, [])`, change to `// eslint-disable-next-line react-hooks/exhaustive-deps` above that line — load-once is intended.

- [ ] **Step 6: Commit**

```bash
git add Campus-Team-Finder/src/pages/Onboarding
git commit -m "feat(web): drive onboarding from lookup APIs and send schema-aligned profile"
```

---

### Task 7: Real data on Dashboard, Browse Teams, TeamCard, Header, sidebar

**Files:**
- Modify: `Campus-Team-Finder/src/components/TeamCard.jsx`
- Modify: `Campus-Team-Finder/src/components/Header.jsx`
- Modify: `Campus-Team-Finder/src/components/UserProfileSidebar.jsx`
- Modify: `Campus-Team-Finder/src/pages/DashboardPage.jsx`
- Modify: `Campus-Team-Finder/src/pages/BrowseTeamsPage.jsx`

**Interfaces:**
- Consumes: `teamApi.getTeams`, `teamApi.getMyApplications`, `lookupApi.getRoles`, `profileApi.getProfile` (returns user with `skills: { proficiency, skill: { id, name } }[]`), `displayName`, `initials`.

- [ ] **Step 1: Rewrite `TeamCard.jsx`**

```jsx
import { displayName } from '../lib/names';

export default function TeamCard({ team }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-lg">
            {team.name[0]?.toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{team.name}</h3>
            {team.eventTarget && <p className="text-xs text-gray-400">{team.eventTarget}</p>}
          </div>
        </div>

        {team.description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{team.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5 pt-2">
          {team.openRoles.map((openRole) => (
            <span key={openRole.id} className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs rounded-lg">
              {openRole.role.name} · {openRole.slotsFilled}/{openRole.slotsTotal}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 space-y-3">
        <p className="text-xs text-gray-400">
          Created by <span className="font-semibold text-gray-700">{displayName(team.creator)}</span>
        </p>
        <button
          disabled
          title="Team details coming soon"
          className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl opacity-50 cursor-not-allowed"
        >
          View Team
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Header reads user from context**

In `Header.jsx`:
- Imports: add `useContext`, `UserContext` (`'../context/UserContext'`), `initials` (`'../lib/names'`).
- Signature: `function Header({ showProgress = false, progressStep = 0 })` and first line in body `const { user } = useContext(UserContext);`
- Replace `{user.initials || "AB"}` with `{initials(user)}`.
- Replace the `else` branch (Make a copy / Share buttons) with `null`.

- [ ] **Step 3: UserProfileSidebar with real fields**

Replace `UserProfileSidebar.jsx`:

```jsx
import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../context/UserContext';
import { profileApi } from '../services/api';
import { displayName, initials } from '../lib/names';

export default function UserProfileSidebar() {
  const { user } = useContext(UserContext);
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    profileApi
      .getProfile()
      .then((profile) => setSkills(profile.skills.map((s) => s.skill.name)))
      .catch(() => setSkills([]));
  }, []);

  return (
    <aside className="w-80 border-l border-gray-100 p-6 space-y-6 bg-white shrink-0 hidden xl:block">
      <div className="bg-gray-50/70 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-lg">
            {initials(user)}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">{displayName(user)}</h3>
            <p className="text-xs text-gray-400">
              {[user?.faculty, user?.studyYear].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Top skills</h4>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">
              {skill}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
```

(Removed: fake completion %, Edit button with no target, hardcoded "2" invitations.)

- [ ] **Step 4: Dashboard with real data**

In `DashboardPage.jsx`:
- Imports: `useContext, useEffect, useState` from react; `teamApi` from `'../services/api'`.
- Replace `const { user, teams } = useContext(UserContext);` with:

```jsx
  const { user } = useContext(UserContext);
  const [teams, setTeams] = useState([]);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([teamApi.getTeams(), teamApi.getMyApplications()])
      .then(([t, a]) => {
        setTeams(t);
        setApplications(a);
      })
      .catch((err) => setError(err.message));
  }, []);

  const activeCount = applications.filter((a) => a.status === 'SENT' || a.status === 'VIEWED').length;
  const joinedCount = applications.filter((a) => a.status === 'ACCEPTED').length;
```

- Greeting: `{user?.firstName || user?.name}`.
- Delete the `+ Create Team` button (no page yet).
- Stats grid: change to `grid-cols-1 sm:grid-cols-2 gap-4` with only:

```jsx
          <StatCard number={activeCount} label="Active Applications" />
          <StatCard number={joinedCount} label="Teams Joined" />
```

- Delete the filter-chips `<div className="flex gap-1.5">…</div>`.
- Above the teams grid add:

```jsx
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!error && teams.length === 0 && <p className="text-sm text-gray-500">No open teams yet.</p>}
```

- [ ] **Step 5: Browse Teams with role filter**

Replace `BrowseTeamsPage.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { lookupApi, teamApi } from '../services/api';
import TeamCard from '../components/TeamCard';

export default function BrowseTeamsPage() {
  const [teams, setTeams] = useState([]);
  const [roles, setRoles] = useState([]);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    lookupApi.getRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    teamApi
      .getTeams({ role })
      .then(setTeams)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [role]);

  return (
    <main className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-950">Browse Teams</h1>
        <p className="text-sm text-gray-500 mt-0.5">{teams.length} open teams looking for members</p>
      </div>

      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="Filter by open role"
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 cursor-pointer"
        >
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 font-medium">{teams.length} results</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && teams.length === 0 && (
        <p className="text-sm text-gray-500">No teams match this filter.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Build and lint the whole frontend**

Run: `cd Campus-Team-Finder && npm run build && npm run lint`
Expected: build succeeds. Lint: no errors in files touched by this plan (pre-existing errors in untouched files are reported but not fixed here — list them in the task report).

- [ ] **Step 7: Commit**

```bash
git add Campus-Team-Finder/src/components Campus-Team-Finder/src/pages/DashboardPage.jsx Campus-Team-Finder/src/pages/BrowseTeamsPage.jsx
git commit -m "feat(web): show real teams, applications, and profile data"
```

---

### Task 8: End-to-end verification in the browser

**Files:** none (fix-forward in the relevant earlier file if something fails, with its own commit).

- [ ] **Step 1: Bring everything up**

```bash
cd server && docker compose up -d && npx prisma migrate deploy && npm run prisma:seed && npm test
```
Expected: all tests PASS.

Start servers (background): `cd server && npm run dev` (port 4000) and `cd Campus-Team-Finder && npm run dev` (port 5173).

- [ ] **Step 2: Walkthrough in Chrome (claude-in-chrome tools)**

1. Open `http://localhost:5173` → redirected to `/login`.
2. Enter `gmail` address → inline error, no request.
3. Enter `e2e.student@kbtu.kz` → lands on `/onboarding`.
4. Step 1: first `E2E`, last `Student`, bio. Avatar shows `ES`.
5. Step 2: pick first faculty and `2nd year (Bachelor)`.
6. Step 3: search `rea` → only React shown; add React (Advanced) and Python (Beginner). Go Back to step 2 and forward — skills still listed.
7. Step 4: pick 2 interests, 1 role.
8. Step 5: pick `5–10 hrs/week`, telegram `@e2e`. Complete Profile → `/dashboard`.
9. Dashboard: greeting "E2E", stats 0 / 0, 2 demo team cards with roles like `ML Engineer · 0/1` and "Created by Demo Student"; header avatar `ES`; sidebar shows name, faculty · year, skills React, Python.
10. `/teams`: 3 teams; filter `Data Scientist` → only GreenGrid; `All roles` → 3.
11. Reload → still on page (cookie persists).
12. Clear cookies, dev-login again as `e2e.student@kbtu.kz` → lands on `/dashboard` (not onboarding).

- [ ] **Step 3: Check console and network**

Use `read_console_messages` (pattern `error|Error|warn`) and `read_network_requests` — expect no failed `/api/*` requests and no React errors.

- [ ] **Step 4: Report**

Record pass/fail per walkthrough item. Any failure: fix in the owning task's files, re-run that task's build/tests, commit `fix(web|server): …`, re-run the walkthrough item.
