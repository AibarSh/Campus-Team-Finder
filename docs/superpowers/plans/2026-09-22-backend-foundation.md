# Campus Team Finder Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Campus Team Finder backend — Express API, PostgreSQL schema via Prisma, and the core REST endpoints for auth, profile setup, find-a-team, and create-a-team — in a new `server/` directory, leaving the existing `Campus-Team-Finder/` frontend untouched.

**Architecture:** A single Express app (`server/src/index.js`) exposes REST routes under `/api/*`, backed by PostgreSQL via a Prisma client. Google Sign-In tokens are verified server-side and exchanged for an app-issued JWT stored in an `httpOnly` cookie; that cookie authenticates all subsequent requests via an `authRequired` middleware. Routes are thin and delegate to controller modules; controllers talk to Prisma directly (no repository layer — not warranted at this size).

**Tech Stack:** Node.js, Express, PostgreSQL, Prisma, `jsonwebtoken`, `google-auth-library`, `cookie-parser`, `cors`, Jest + Supertest for tests, Docker Compose for local Postgres.

**Spec:** `docs/superpowers/specs/2026-09-22-backend-foundation-design.md`

## Global Constraints

- Backend only — do not modify anything under `Campus-Team-Finder/` (the existing frontend).
- All API routes are mounted under `/api/*`.
- Auth: Google Sign-In only, restricted to emails ending in `@kbtu.kz`; app session is a JWT in an `httpOnly` cookie named `session`.
- Database: PostgreSQL, schema managed by Prisma (`server/prisma/schema.prisma`), no other ORM/migration tool.
- Error responses are always `{ "error": string }` with the status codes: 400 validation, 401 unauthenticated, 403 unauthorized/wrong domain, 404 not found, 409 conflict.
- Folder shape: `server/src/{routes,controllers,middleware,lib,prisma is at server/prisma}`.
- No file upload pipeline, no email notifications, no deployment config — out of scope per spec.

---

## Task 1: Project Scaffold & Health Check

**Files:**
- Create: `server/package.json`
- Create: `server/.env.example`
- Create: `server/docker-compose.yml`
- Create: `server/jest.config.js`
- Create: `server/.gitignore`
- Create: `server/src/index.js`
- Create: `server/src/server.js`
- Test: `server/tests/health.test.js`

**Interfaces:**
- Produces: `createApp()` from `server/src/index.js` — returns a configured Express app (no `listen()` call), used by every later test file via `require('../src/index').createApp`.

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "campus-team-finder-server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "node src/server.js",
    "test": "jest --runInBand",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "node prisma/seed.js"
  },
  "dependencies": {
    "@prisma/client": "^6.0.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "google-auth-library": "^9.14.0",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "prisma": "^6.0.0",
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd server && npm install`
Expected: installs succeed, `node_modules/` and `package-lock.json` are created.

- [ ] **Step 3: Create `server/docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: campus
      POSTGRES_PASSWORD: campus
      POSTGRES_DB: campus_team_finder
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

- [ ] **Step 4: Create `server/.env.example`**

```
DATABASE_URL="postgresql://campus:campus@localhost:5432/campus_team_finder"
JWT_SECRET="change-me"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
FRONTEND_ORIGIN="http://localhost:5173"
PORT=4000
```

Also create a local (untracked) `server/.env` with the same content for `npm run dev`, and `server/.env.test` pointing `DATABASE_URL` at a separate `campus_team_finder_test` database on the same Postgres instance, e.g. `postgresql://campus:campus@localhost:5432/campus_team_finder_test`.

- [ ] **Step 5: Create `server/.gitignore`**

```
node_modules/
.env
.env.test
```

- [ ] **Step 6: Create `server/jest.config.js`**

```js
require('dotenv').config({ path: '.env.test' });

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
};
```

- [ ] **Step 7: Write the failing test**

```js
// server/tests/health.test.js
const request = require('supertest');
const { createApp } = require('../src/index');

test('GET /api/health returns ok', async () => {
  const app = createApp();
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true });
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `cd server && npm test`
Expected: FAIL — `Cannot find module '../src/index'`

- [ ] **Step 9: Implement `server/src/index.js`**

```js
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

function createApp() {
  const app = express();
  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  return app;
}

module.exports = { createApp };
```

- [ ] **Step 10: Implement `server/src/server.js`**

```js
const { createApp } = require('./index');

const app = createApp();
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
```

- [ ] **Step 11: Run test to verify it passes**

Run: `cd server && npm test`
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add server/package.json server/package-lock.json server/.env.example server/docker-compose.yml server/.gitignore server/jest.config.js server/src/index.js server/src/server.js server/tests/health.test.js
git commit -m "feat(server): scaffold Express app with health check"
```

---

## Task 2: Prisma Schema, Migration & DB Test Helper

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/src/lib/prisma.js`
- Create: `server/tests/helpers/resetDb.js`
- Test: `server/tests/prisma.test.js`

**Interfaces:**
- Produces: `prisma` (PrismaClient singleton) from `server/src/lib/prisma.js` — used by every controller and test from here on.
- Produces: `resetDb()` (async function) from `server/tests/helpers/resetDb.js` — deletes all rows from every table in FK-safe order; called in `beforeEach` by every test file that touches the DB.
- Produces (via Prisma Client, generated from schema below): models `User`, `Skill`, `UserSkill`, `Interest`, `UserInterest`, `Role`, `UserPreferredRole`, `Team`, `TeamOpenRole`, `Application`, and enums `Faculty`, `Proficiency`, `TeamStatus`, `ApplicationDirection`, `ApplicationStatus`.

- [ ] **Step 1: Start local Postgres**

Run: `cd server && docker compose up -d`
Expected: `postgres` container running on port 5432.

- [ ] **Step 2: Create the two databases**

Run: `docker exec -it $(docker compose -f server/docker-compose.yml ps -q postgres) psql -U campus -c "CREATE DATABASE campus_team_finder_test;"`
Expected: `CREATE DATABASE` (the `campus_team_finder` dev DB already exists from the compose file's `POSTGRES_DB`).

- [ ] **Step 3: Create `server/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Faculty {
  FIT
  ISE
}

enum Proficiency {
  BEGINNER
  INTERMEDIATE
  ADVANCED
}

enum TeamStatus {
  DRAFT
  PUBLISHED
  CLOSED
}

enum ApplicationDirection {
  APPLICATION
  INVITATION
}

enum ApplicationStatus {
  SENT
  VIEWED
  ACCEPTED
  DECLINED
}

model User {
  id              String   @id @default(uuid())
  email           String   @unique
  googleId        String   @unique
  name            String
  avatarUrl       String?
  faculty         Faculty?
  studyYear       Int?
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

model Skill {
  id   String @id @default(uuid())
  name String @unique

  users UserSkill[]
}

model UserSkill {
  userId      String
  skillId     String
  proficiency Proficiency

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  skill Skill @relation(fields: [skillId], references: [id], onDelete: Cascade)

  @@id([userId, skillId])
}

model Interest {
  id   String @id @default(uuid())
  name String @unique

  users UserInterest[]
}

model UserInterest {
  userId     String
  interestId String

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  interest Interest @relation(fields: [interestId], references: [id], onDelete: Cascade)

  @@id([userId, interestId])
}

model Role {
  id   String @id @default(uuid())
  name String @unique

  preferredBy   UserPreferredRole[]
  teamOpenRoles TeamOpenRole[]
}

model UserPreferredRole {
  userId String
  roleId String

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
}

model Team {
  id          String     @id @default(uuid())
  name        String
  eventTarget String?
  description String?
  status      TeamStatus @default(DRAFT)
  creatorId   String
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  creator      User           @relation("TeamCreator", fields: [creatorId], references: [id], onDelete: Cascade)
  openRoles    TeamOpenRole[]
  applications Application[]
}

model TeamOpenRole {
  id          String @id @default(uuid())
  teamId      String
  roleId      String
  slotsTotal  Int
  slotsFilled Int    @default(0)

  team         Team          @relation(fields: [teamId], references: [id], onDelete: Cascade)
  role         Role          @relation(fields: [roleId], references: [id], onDelete: Cascade)
  applications Application[]

  @@unique([teamId, roleId])
}

model Application {
  id             String               @id @default(uuid())
  teamId         String
  teamOpenRoleId String
  userId         String
  direction      ApplicationDirection
  status         ApplicationStatus    @default(SENT)
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt

  team         Team         @relation(fields: [teamId], references: [id], onDelete: Cascade)
  teamOpenRole TeamOpenRole @relation(fields: [teamOpenRoleId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([teamOpenRoleId, userId, direction])
}
```

- [ ] **Step 4: Run the migration against the dev DB**

Run: `cd server && npx prisma migrate dev --name init`
Expected: migration files created under `server/prisma/migrations/`, Prisma Client generated, no errors.

- [ ] **Step 5: Create `server/src/lib/prisma.js`**

```js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = { prisma };
```

- [ ] **Step 6: Create `server/tests/helpers/resetDb.js`**

```js
const { prisma } = require('../../src/lib/prisma');

async function resetDb() {
  await prisma.application.deleteMany();
  await prisma.teamOpenRole.deleteMany();
  await prisma.team.deleteMany();
  await prisma.userPreferredRole.deleteMany();
  await prisma.userInterest.deleteMany();
  await prisma.userSkill.deleteMany();
  await prisma.role.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.user.deleteMany();
}

module.exports = { resetDb };
```

- [ ] **Step 7: Write the failing test**

```js
// server/tests/prisma.test.js
const { prisma } = require('../src/lib/prisma');
const { resetDb } = require('./helpers/resetDb');

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('can create and read a Skill row against the test database', async () => {
  await prisma.skill.create({ data: { name: 'React' } });
  const skills = await prisma.skill.findMany();
  expect(skills).toHaveLength(1);
  expect(skills[0].name).toBe('React');
});
```

- [ ] **Step 8: Apply the migration to the test DB and run the test**

Run: `cd server && DATABASE_URL="postgresql://campus:campus@localhost:5432/campus_team_finder_test" npx prisma migrate deploy && npm test`
Expected: PASS for both `health.test.js` and `prisma.test.js`.

- [ ] **Step 9: Commit**

```bash
git add server/prisma server/src/lib/prisma.js server/tests/helpers/resetDb.js server/tests/prisma.test.js
git commit -m "feat(server): add Prisma schema, migration, and DB test helper"
```

---

## Task 3: JWT Session Helper

**Files:**
- Create: `server/src/lib/jwt.js`
- Test: `server/tests/lib/jwt.test.js`

**Interfaces:**
- Produces: `signSessionToken(userId: string): string` and `verifySessionToken(token: string): string` (returns the `userId`, throws on invalid/expired token) — used by the auth middleware (Task 5) and the Google auth route (Task 7).

- [ ] **Step 1: Write the failing test**

```js
// server/tests/lib/jwt.test.js
const { signSessionToken, verifySessionToken } = require('../../src/lib/jwt');

test('signs and verifies a session token round-trip', () => {
  const token = signSessionToken('user-123');
  expect(verifySessionToken(token)).toBe('user-123');
});

test('throws on a tampered token', () => {
  const token = signSessionToken('user-123');
  expect(() => verifySessionToken(token + 'tampered')).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/lib/jwt.test.js`
Expected: FAIL — `Cannot find module '../../src/lib/jwt'`

- [ ] **Step 3: Implement `server/src/lib/jwt.js`**

```js
const jwt = require('jsonwebtoken');

function signSessionToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function verifySessionToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  return payload.sub;
}

module.exports = { signSessionToken, verifySessionToken };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test -- tests/lib/jwt.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/jwt.js server/tests/lib/jwt.test.js
git commit -m "feat(server): add JWT session sign/verify helper"
```

---

## Task 4: Error Type & Central Error Handler

**Files:**
- Create: `server/src/errors.js`
- Create: `server/src/middleware/errorHandler.js`
- Test: `server/tests/middleware/errorHandler.test.js`

**Interfaces:**
- Produces: `AppError` class (`new AppError(status: number, message: string)`) from `server/src/errors.js` — thrown by every controller from Task 7 onward.
- Produces: `errorHandler` Express error middleware from `server/src/middleware/errorHandler.js` — mounted last in `createApp()` (Task 5 wires this into `index.js`).

- [ ] **Step 1: Write the failing test**

```js
// server/tests/middleware/errorHandler.test.js
const express = require('express');
const request = require('supertest');
const { AppError } = require('../../src/errors');
const { errorHandler } = require('../../src/middleware/errorHandler');

function buildTestApp() {
  const app = express();
  app.get('/known', () => {
    throw new AppError(409, 'conflict happened');
  });
  app.get('/unknown', () => {
    throw new Error('boom');
  });
  app.use(errorHandler);
  return app;
}

test('AppError maps to its status and message', async () => {
  const res = await request(buildTestApp()).get('/known');
  expect(res.status).toBe(409);
  expect(res.body).toEqual({ error: 'conflict happened' });
});

test('unknown errors map to 500', async () => {
  const res = await request(buildTestApp()).get('/unknown');
  expect(res.status).toBe(500);
  expect(res.body).toEqual({ error: 'Internal server error' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/middleware/errorHandler.test.js`
Expected: FAIL — `Cannot find module '../../src/errors'`

- [ ] **Step 3: Implement `server/src/errors.js`**

```js
class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = { AppError };
```

- [ ] **Step 4: Implement `server/src/middleware/errorHandler.js`**

```js
const { AppError } = require('../errors');

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npm test -- tests/middleware/errorHandler.test.js`
Expected: PASS

- [ ] **Step 6: Wire `errorHandler` into the app**

In `server/src/index.js`, add near the top:

```js
const { errorHandler } = require('./middleware/errorHandler');
```

And just before `return app;`, add:

```js
  app.use(errorHandler);
```

- [ ] **Step 7: Run the full test suite**

Run: `cd server && npm test`
Expected: PASS (all existing tests still pass)

- [ ] **Step 8: Commit**

```bash
git add server/src/errors.js server/src/middleware/errorHandler.js server/tests/middleware/errorHandler.test.js server/src/index.js
git commit -m "feat(server): add AppError type and central error handler"
```

---

## Task 5: Auth Middleware (`authRequired`, `profileRequired`)

**Files:**
- Create: `server/src/middleware/auth.js`
- Test: `server/tests/middleware/auth.test.js`

**Interfaces:**
- Consumes: `signSessionToken`/`verifySessionToken` from `server/src/lib/jwt.js` (Task 3); `prisma` from `server/src/lib/prisma.js` (Task 2); `AppError` from `server/src/errors.js` (Task 4).
- Produces: `authRequired` (Express middleware, sets `req.user` to the full `User` row) and `profileRequired` (Express middleware, requires `req.user.profileComplete === true`) — used by every route from Task 7 onward.

- [ ] **Step 1: Write the failing test**

```js
// server/tests/middleware/auth.test.js
const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { authRequired, profileRequired } = require('../../src/middleware/auth');
const { errorHandler } = require('../../src/middleware/errorHandler');
const { resetDb } = require('../helpers/resetDb');

function buildTestApp() {
  const app = express();
  app.use(cookieParser());
  app.get('/whoami', authRequired, (req, res) => res.json({ id: req.user.id }));
  app.get('/needs-profile', authRequired, profileRequired, (req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('rejects requests with no session cookie', async () => {
  const res = await request(buildTestApp()).get('/whoami');
  expect(res.status).toBe(401);
});

test('accepts a valid session cookie and sets req.user', async () => {
  const user = await prisma.user.create({
    data: { email: 'a@kbtu.kz', googleId: 'g-1', name: 'A' },
  });
  const token = signSessionToken(user.id);
  const res = await request(buildTestApp()).get('/whoami').set('Cookie', [`session=${token}`]);
  expect(res.status).toBe(200);
  expect(res.body.id).toBe(user.id);
});

test('profileRequired blocks users with an incomplete profile', async () => {
  const user = await prisma.user.create({
    data: { email: 'b@kbtu.kz', googleId: 'g-2', name: 'B', profileComplete: false },
  });
  const token = signSessionToken(user.id);
  const res = await request(buildTestApp()).get('/needs-profile').set('Cookie', [`session=${token}`]);
  expect(res.status).toBe(403);
});

test('profileRequired allows users with a complete profile', async () => {
  const user = await prisma.user.create({
    data: { email: 'c@kbtu.kz', googleId: 'g-3', name: 'C', profileComplete: true },
  });
  const token = signSessionToken(user.id);
  const res = await request(buildTestApp()).get('/needs-profile').set('Cookie', [`session=${token}`]);
  expect(res.status).toBe(200);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/middleware/auth.test.js`
Expected: FAIL — `Cannot find module '../../src/middleware/auth'`

- [ ] **Step 3: Implement `server/src/middleware/auth.js`**

```js
const { verifySessionToken } = require('../lib/jwt');
const { prisma } = require('../lib/prisma');
const { AppError } = require('../errors');

async function authRequired(req, res, next) {
  try {
    const token = req.cookies && req.cookies.session;
    if (!token) throw new AppError(401, 'Not authenticated');

    let userId;
    try {
      userId = verifySessionToken(token);
    } catch {
      throw new AppError(401, 'Not authenticated');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(401, 'Not authenticated');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function profileRequired(req, res, next) {
  if (!req.user.profileComplete) {
    return next(new AppError(403, 'Profile setup required'));
  }
  next();
}

module.exports = { authRequired, profileRequired };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test -- tests/middleware/auth.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/middleware/auth.js server/tests/middleware/auth.test.js
git commit -m "feat(server): add authRequired and profileRequired middleware"
```

---

## Task 6: Google ID Token Verification Helper

**Files:**
- Create: `server/src/lib/googleAuth.js`
- Test: `server/tests/lib/googleAuth.test.js`

**Interfaces:**
- Produces: `verifyGoogleIdToken(idToken: string): Promise<{ googleId: string, email: string, name: string, avatarUrl: string|null }>` — used by the auth route (Task 7).

- [ ] **Step 1: Write the failing test**

```js
// server/tests/lib/googleAuth.test.js
const { OAuth2Client } = require('google-auth-library');
const { verifyGoogleIdToken } = require('../../src/lib/googleAuth');

test('verifyGoogleIdToken maps the Google payload to our profile shape', async () => {
  jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
    getPayload: () => ({
      sub: 'google-sub-1',
      email: 'student@kbtu.kz',
      name: 'Student Name',
      picture: 'https://example.com/pic.jpg',
    }),
  });

  const profile = await verifyGoogleIdToken('fake-id-token');

  expect(profile).toEqual({
    googleId: 'google-sub-1',
    email: 'student@kbtu.kz',
    name: 'Student Name',
    avatarUrl: 'https://example.com/pic.jpg',
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/lib/googleAuth.test.js`
Expected: FAIL — `Cannot find module '../../src/lib/googleAuth'`

- [ ] **Step 3: Implement `server/src/lib/googleAuth.js`**

```js
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleIdToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    avatarUrl: payload.picture || null,
  };
}

module.exports = { verifyGoogleIdToken };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test -- tests/lib/googleAuth.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/googleAuth.js server/tests/lib/googleAuth.test.js
git commit -m "feat(server): add Google ID token verification helper"
```

---

## Task 7: Auth Routes (`/api/auth/*`)

**Files:**
- Create: `server/src/controllers/authController.js`
- Create: `server/src/routes/auth.js`
- Modify: `server/src/index.js`
- Test: `server/tests/routes/auth.test.js`

**Interfaces:**
- Consumes: `verifyGoogleIdToken` (Task 6), `signSessionToken` (Task 3), `authRequired` (Task 5), `prisma` (Task 2), `AppError` (Task 4).
- Produces: Express router mounted at `/api/auth` exposing `POST /google`, `GET /me`, `POST /logout`.

- [ ] **Step 1: Write the failing test**

```js
// server/tests/routes/auth.test.js
const request = require('supertest');
const { OAuth2Client } = require('google-auth-library');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { resetDb } = require('../helpers/resetDb');

beforeEach(async () => {
  await resetDb();
  jest.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function mockGooglePayload(payload) {
  jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
    getPayload: () => payload,
  });
}

test('rejects non-kbtu.kz emails', async () => {
  mockGooglePayload({ sub: 'g-1', email: 'someone@gmail.com', name: 'Someone', picture: null });
  const res = await request(createApp()).post('/api/auth/google').send({ idToken: 'fake' });
  expect(res.status).toBe(403);
});

test('creates a new user on first login and sets a session cookie', async () => {
  mockGooglePayload({ sub: 'g-2', email: 'new@kbtu.kz', name: 'New Student', picture: null });
  const res = await request(createApp()).post('/api/auth/google').send({ idToken: 'fake' });

  expect(res.status).toBe(200);
  expect(res.body.isNewUser).toBe(true);
  expect(res.body.user.email).toBe('new@kbtu.kz');
  expect(res.headers['set-cookie'][0]).toMatch(/^session=/);

  const stored = await prisma.user.findUnique({ where: { googleId: 'g-2' } });
  expect(stored).not.toBeNull();
});

test('logs an existing user in without creating a duplicate', async () => {
  await prisma.user.create({ data: { email: 'existing@kbtu.kz', googleId: 'g-3', name: 'Existing' } });
  mockGooglePayload({ sub: 'g-3', email: 'existing@kbtu.kz', name: 'Existing', picture: null });

  const res = await request(createApp()).post('/api/auth/google').send({ idToken: 'fake' });

  expect(res.status).toBe(200);
  expect(res.body.isNewUser).toBe(false);
  const count = await prisma.user.count({ where: { googleId: 'g-3' } });
  expect(count).toBe(1);
});

test('GET /api/auth/me requires a session', async () => {
  const res = await request(createApp()).get('/api/auth/me');
  expect(res.status).toBe(401);
});

test('POST /api/auth/logout clears the session cookie', async () => {
  const res = await request(createApp()).post('/api/auth/logout');
  expect(res.status).toBe(200);
  expect(res.headers['set-cookie'][0]).toMatch(/^session=;/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/routes/auth.test.js`
Expected: FAIL — `Cannot find module '../../src/routes/auth'` (via `index.js` not yet requiring it) or 404s once route file is missing.

- [ ] **Step 3: Implement `server/src/controllers/authController.js`**

```js
const { prisma } = require('../lib/prisma');
const { verifyGoogleIdToken } = require('../lib/googleAuth');
const { signSessionToken } = require('../lib/jwt');
const { AppError } = require('../errors');

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function loginWithGoogle(req, res, next) {
  try {
    const { idToken } = req.body;
    if (!idToken) throw new AppError(400, 'idToken is required');

    const profile = await verifyGoogleIdToken(idToken);
    if (!profile.email.endsWith('@kbtu.kz')) {
      throw new AppError(403, 'Use your KBTU email to sign in');
    }

    const existing = await prisma.user.findUnique({ where: { googleId: profile.googleId } });
    const user = await prisma.user.upsert({
      where: { googleId: profile.googleId },
      update: { name: profile.name, avatarUrl: profile.avatarUrl },
      create: {
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      },
    });

    const token = signSessionToken(user.id);
    res.cookie('session', token, SESSION_COOKIE_OPTIONS);
    res.json({ user, isNewUser: !existing });
  } catch (err) {
    next(err);
  }
}

function me(req, res) {
  res.json({ user: req.user });
}

function logout(req, res) {
  res.clearCookie('session', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  res.json({ ok: true });
}

module.exports = { loginWithGoogle, me, logout };
```

- [ ] **Step 4: Implement `server/src/routes/auth.js`**

```js
const express = require('express');
const { authRequired } = require('../middleware/auth');
const { loginWithGoogle, me, logout } = require('../controllers/authController');

const router = express.Router();

router.post('/google', loginWithGoogle);
router.get('/me', authRequired, me);
router.post('/logout', logout);

module.exports = router;
```

- [ ] **Step 5: Mount the router in `server/src/index.js`**

Add near the other requires:

```js
const authRoutes = require('./routes/auth');
```

Add after `app.get('/api/health', ...)`:

```js
  app.use('/api/auth', authRoutes);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd server && npm test -- tests/routes/auth.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/authController.js server/src/routes/auth.js server/src/index.js server/tests/routes/auth.test.js
git commit -m "feat(server): add Google login, me, and logout auth routes"
```

---

## Task 8: Lookup Endpoints & Seed Script

**Files:**
- Create: `server/src/controllers/lookupsController.js`
- Create: `server/src/routes/lookups.js`
- Create: `server/prisma/seed.js`
- Modify: `server/src/index.js`
- Test: `server/tests/routes/lookups.test.js`

**Interfaces:**
- Produces: Express router mounted at `/api/lookups` exposing `GET /skills`, `GET /interests`, `GET /roles` (all `authRequired`, alphabetically sorted).

- [ ] **Step 1: Write the failing test**

```js
// server/tests/routes/lookups.test.js
const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let cookie;

beforeEach(async () => {
  await resetDb();
  const user = await prisma.user.create({ data: { email: 'a@kbtu.kz', googleId: 'g-1', name: 'A' } });
  cookie = `session=${signSessionToken(user.id)}`;
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('lists skills, interests, and roles sorted by name', async () => {
  await prisma.skill.createMany({ data: [{ name: 'React' }, { name: 'Go' }] });
  await prisma.interest.createMany({ data: [{ name: 'Web' }, { name: 'AI' }] });
  await prisma.role.createMany({ data: [{ name: 'PM' }, { name: 'Backend' }] });

  const app = createApp();
  const skills = await request(app).get('/api/lookups/skills').set('Cookie', [cookie]);
  const interests = await request(app).get('/api/lookups/interests').set('Cookie', [cookie]);
  const roles = await request(app).get('/api/lookups/roles').set('Cookie', [cookie]);

  expect(skills.body.map((s) => s.name)).toEqual(['Go', 'React']);
  expect(interests.body.map((i) => i.name)).toEqual(['AI', 'Web']);
  expect(roles.body.map((r) => r.name)).toEqual(['Backend', 'PM']);
});

test('requires authentication', async () => {
  const res = await request(createApp()).get('/api/lookups/skills');
  expect(res.status).toBe(401);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/routes/lookups.test.js`
Expected: FAIL — route not mounted (404s / module not found)

- [ ] **Step 3: Implement `server/src/controllers/lookupsController.js`**

```js
const { prisma } = require('../lib/prisma');

async function listSkills(req, res, next) {
  try {
    res.json(await prisma.skill.findMany({ orderBy: { name: 'asc' } }));
  } catch (err) {
    next(err);
  }
}

async function listInterests(req, res, next) {
  try {
    res.json(await prisma.interest.findMany({ orderBy: { name: 'asc' } }));
  } catch (err) {
    next(err);
  }
}

async function listRoles(req, res, next) {
  try {
    res.json(await prisma.role.findMany({ orderBy: { name: 'asc' } }));
  } catch (err) {
    next(err);
  }
}

module.exports = { listSkills, listInterests, listRoles };
```

- [ ] **Step 4: Implement `server/src/routes/lookups.js`**

```js
const express = require('express');
const { authRequired } = require('../middleware/auth');
const { listSkills, listInterests, listRoles } = require('../controllers/lookupsController');

const router = express.Router();

router.get('/skills', authRequired, listSkills);
router.get('/interests', authRequired, listInterests);
router.get('/roles', authRequired, listRoles);

module.exports = router;
```

- [ ] **Step 5: Mount the router in `server/src/index.js`**

Add near the other requires:

```js
const lookupsRoutes = require('./routes/lookups');
```

Add after the auth routes mount:

```js
  app.use('/api/lookups', lookupsRoutes);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd server && npm test -- tests/routes/lookups.test.js`
Expected: PASS

- [ ] **Step 7: Create the seed script `server/prisma/seed.js`**

```js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SKILLS = ['React', 'Node.js', 'Python', 'Figma', 'Flutter', 'Go'];
const INTERESTS = ['AI', 'Web', 'GameDev', 'Mobile', 'Data Science'];
const ROLES = ['Frontend', 'Backend', 'PM', 'UI/UX'];

async function main() {
  for (const name of SKILLS) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of INTERESTS) {
    await prisma.interest.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of ROLES) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 8: Run the seed script against the dev DB**

Run: `cd server && npm run prisma:seed`
Expected: script exits 0, `SELECT * FROM "Skill";` in the dev DB shows the 6 seeded rows.

- [ ] **Step 9: Commit**

```bash
git add server/src/controllers/lookupsController.js server/src/routes/lookups.js server/src/index.js server/tests/routes/lookups.test.js server/prisma/seed.js
git commit -m "feat(server): add lookup endpoints and seed script"
```

---

## Task 9: Profile Read & Partial Update (`GET/PATCH /api/profile`)

**Files:**
- Create: `server/src/controllers/profileController.js`
- Create: `server/src/routes/profile.js`
- Modify: `server/src/index.js`
- Test: `server/tests/routes/profile.test.js`

**Interfaces:**
- Produces: Express router mounted at `/api/profile` exposing `GET /` and `PATCH /` (this task); Task 10 adds more handlers to the same controller/router files.

- [ ] **Step 1: Write the failing test**

```js
// server/tests/routes/profile.test.js
const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let user;
let cookie;

beforeEach(async () => {
  await resetDb();
  user = await prisma.user.create({ data: { email: 'a@kbtu.kz', googleId: 'g-1', name: 'A' } });
  cookie = `session=${signSessionToken(user.id)}`;
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('GET /api/profile returns the current user with related lists', async () => {
  const res = await request(createApp()).get('/api/profile').set('Cookie', [cookie]);
  expect(res.status).toBe(200);
  expect(res.body.email).toBe('a@kbtu.kz');
  expect(res.body.skills).toEqual([]);
});

test('PATCH /api/profile updates only allowed fields', async () => {
  const res = await request(createApp())
    .patch('/api/profile')
    .set('Cookie', [cookie])
    .send({ name: 'Updated Name', faculty: 'FIT', studyYear: 2, weeklyHours: 10, isAdmin: true });

  expect(res.status).toBe(200);
  expect(res.body.name).toBe('Updated Name');
  expect(res.body.faculty).toBe('FIT');
  expect(res.body.studyYear).toBe(2);
  expect(res.body).not.toHaveProperty('isAdmin');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/routes/profile.test.js`
Expected: FAIL — route not mounted

- [ ] **Step 3: Implement `server/src/controllers/profileController.js`**

```js
const { prisma } = require('../lib/prisma');

const PATCHABLE_FIELDS = [
  'name',
  'avatarUrl',
  'faculty',
  'studyYear',
  'weeklyHours',
  'githubUrl',
  'linkedinUrl',
  'telegramHandle',
];

async function getProfile(req, res, next) {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        skills: { include: { skill: true } },
        interests: { include: { interest: true } },
        preferredRoles: { include: { role: true } },
      },
    });
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

async function patchProfile(req, res, next) {
  try {
    const data = {};
    for (const field of PATCHABLE_FIELDS) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }
    const updated = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, patchProfile, PATCHABLE_FIELDS };
```

- [ ] **Step 4: Implement `server/src/routes/profile.js`**

```js
const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getProfile, patchProfile } = require('../controllers/profileController');

const router = express.Router();

router.get('/', authRequired, getProfile);
router.patch('/', authRequired, patchProfile);

module.exports = router;
```

- [ ] **Step 5: Mount the router in `server/src/index.js`**

Add near the other requires:

```js
const profileRoutes = require('./routes/profile');
```

Add after the lookups routes mount:

```js
  app.use('/api/profile', profileRoutes);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd server && npm test -- tests/routes/profile.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/profileController.js server/src/routes/profile.js server/src/index.js server/tests/routes/profile.test.js
git commit -m "feat(server): add profile read and partial update endpoints"
```

---

## Task 10: Profile Skills/Interests/Preferred-Roles & Completion

**Files:**
- Modify: `server/src/controllers/profileController.js`
- Modify: `server/src/routes/profile.js`
- Test: `server/tests/routes/profileLists.test.js`

**Interfaces:**
- Consumes: `PATCHABLE_FIELDS` export is unaffected; adds new controller exports `putSkills`, `putInterests`, `putPreferredRoles`, `completeProfile` to the same module from Task 9.
- Produces: `PUT /api/profile/skills`, `PUT /api/profile/interests`, `PUT /api/profile/preferred-roles`, `POST /api/profile/complete`.

- [ ] **Step 1: Write the failing test**

```js
// server/tests/routes/profileLists.test.js
const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let user;
let cookie;
let reactSkill;
let aiInterest;
let backendRole;

beforeEach(async () => {
  await resetDb();
  user = await prisma.user.create({ data: { email: 'a@kbtu.kz', googleId: 'g-1', name: 'A' } });
  cookie = `session=${signSessionToken(user.id)}`;
  reactSkill = await prisma.skill.create({ data: { name: 'React' } });
  aiInterest = await prisma.interest.create({ data: { name: 'AI' } });
  backendRole = await prisma.role.create({ data: { name: 'Backend' } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('PUT /api/profile/skills replaces the skill set', async () => {
  const res = await request(createApp())
    .put('/api/profile/skills')
    .set('Cookie', [cookie])
    .send({ skills: [{ skillId: reactSkill.id, proficiency: 'ADVANCED' }] });

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].skill.name).toBe('React');
  expect(res.body[0].proficiency).toBe('ADVANCED');
});

test('PUT /api/profile/interests replaces the interest set', async () => {
  const res = await request(createApp())
    .put('/api/profile/interests')
    .set('Cookie', [cookie])
    .send({ interests: [aiInterest.id] });

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].interest.name).toBe('AI');
});

test('PUT /api/profile/preferred-roles replaces the preferred role set', async () => {
  const res = await request(createApp())
    .put('/api/profile/preferred-roles')
    .set('Cookie', [cookie])
    .send({ roles: [backendRole.id] });

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].role.name).toBe('Backend');
});

test('POST /api/profile/complete marks the profile complete', async () => {
  const res = await request(createApp()).post('/api/profile/complete').set('Cookie', [cookie]);
  expect(res.status).toBe(200);
  expect(res.body.profileComplete).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/routes/profileLists.test.js`
Expected: FAIL — 404s (routes not defined yet)

- [ ] **Step 3: Add handlers to `server/src/controllers/profileController.js`**

Append to the file (after `patchProfile`, before `module.exports`):

```js
async function putSkills(req, res, next) {
  try {
    const skills = req.body.skills;
    if (!Array.isArray(skills)) throw new AppError(400, 'skills must be an array of { skillId, proficiency }');

    await prisma.$transaction([
      prisma.userSkill.deleteMany({ where: { userId: req.user.id } }),
      prisma.userSkill.createMany({
        data: skills.map((s) => ({ userId: req.user.id, skillId: s.skillId, proficiency: s.proficiency })),
      }),
    ]);
    const updated = await prisma.userSkill.findMany({
      where: { userId: req.user.id },
      include: { skill: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function putInterests(req, res, next) {
  try {
    const interests = req.body.interests;
    if (!Array.isArray(interests)) throw new AppError(400, 'interests must be an array of interestId strings');

    await prisma.$transaction([
      prisma.userInterest.deleteMany({ where: { userId: req.user.id } }),
      prisma.userInterest.createMany({
        data: interests.map((interestId) => ({ userId: req.user.id, interestId })),
      }),
    ]);
    const updated = await prisma.userInterest.findMany({
      where: { userId: req.user.id },
      include: { interest: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function putPreferredRoles(req, res, next) {
  try {
    const roles = req.body.roles;
    if (!Array.isArray(roles)) throw new AppError(400, 'roles must be an array of roleId strings');

    await prisma.$transaction([
      prisma.userPreferredRole.deleteMany({ where: { userId: req.user.id } }),
      prisma.userPreferredRole.createMany({
        data: roles.map((roleId) => ({ userId: req.user.id, roleId })),
      }),
    ]);
    const updated = await prisma.userPreferredRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function completeProfile(req, res, next) {
  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { profileComplete: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}
```

Add this require at the top of the file:

```js
const { AppError } = require('../errors');
```

Update the `module.exports` line to:

```js
module.exports = {
  getProfile,
  patchProfile,
  putSkills,
  putInterests,
  putPreferredRoles,
  completeProfile,
  PATCHABLE_FIELDS,
};
```

- [ ] **Step 4: Update `server/src/routes/profile.js`**

Replace the file's contents with:

```js
const express = require('express');
const { authRequired } = require('../middleware/auth');
const {
  getProfile,
  patchProfile,
  putSkills,
  putInterests,
  putPreferredRoles,
  completeProfile,
} = require('../controllers/profileController');

const router = express.Router();

router.get('/', authRequired, getProfile);
router.patch('/', authRequired, patchProfile);
router.put('/skills', authRequired, putSkills);
router.put('/interests', authRequired, putInterests);
router.put('/preferred-roles', authRequired, putPreferredRoles);
router.post('/complete', authRequired, completeProfile);

module.exports = router;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npm test -- tests/routes/profileLists.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/profileController.js server/src/routes/profile.js server/tests/routes/profileLists.test.js
git commit -m "feat(server): add profile skills/interests/preferred-roles and completion endpoints"
```

---

## Task 11: Team Creation, Open Roles & Publishing

**Files:**
- Create: `server/src/controllers/teamsController.js`
- Create: `server/src/routes/teams.js`
- Modify: `server/src/index.js`
- Test: `server/tests/routes/teamsCreate.test.js`

**Interfaces:**
- Produces: `requireTeamOwner(teamId, userId)` (async helper, throws `AppError(404)`/`AppError(403)`, returns the `Team` row) exported from `teamsController.js` — reused by Task 14's invite handler.
- Produces: Express router mounted at `/api/teams` exposing `POST /`, `PUT /:id/roles`, `POST /:id/publish`, `GET /mine` (this task); Tasks 12 and 14 add more handlers to the same files.

- [ ] **Step 1: Write the failing test**

```js
// server/tests/routes/teamsCreate.test.js
const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let owner;
let ownerCookie;
let backendRole;

beforeEach(async () => {
  await resetDb();
  owner = await prisma.user.create({
    data: { email: 'owner@kbtu.kz', googleId: 'g-owner', name: 'Owner', profileComplete: true },
  });
  ownerCookie = `session=${signSessionToken(owner.id)}`;
  backendRole = await prisma.role.create({ data: { name: 'Backend' } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('creates a draft team', async () => {
  const res = await request(createApp())
    .post('/api/teams')
    .set('Cookie', [ownerCookie])
    .send({ name: 'Hack Squad', eventTarget: 'HackKBTU', description: 'Building cool stuff' });

  expect(res.status).toBe(201);
  expect(res.body.status).toBe('DRAFT');
  expect(res.body.creatorId).toBe(owner.id);
});

test('only the creator can set open roles, and publish requires at least one role', async () => {
  const team = await prisma.team.create({ data: { name: 'Hack Squad', creatorId: owner.id } });
  const otherUser = await prisma.user.create({
    data: { email: 'other@kbtu.kz', googleId: 'g-other', name: 'Other', profileComplete: true },
  });
  const otherCookie = `session=${signSessionToken(otherUser.id)}`;

  const forbidden = await request(createApp())
    .put(`/api/teams/${team.id}/roles`)
    .set('Cookie', [otherCookie])
    .send({ roles: [{ roleId: backendRole.id, slotsTotal: 2 }] });
  expect(forbidden.status).toBe(403);

  const publishTooEarly = await request(createApp())
    .post(`/api/teams/${team.id}/publish`)
    .set('Cookie', [ownerCookie]);
  expect(publishTooEarly.status).toBe(400);

  const setRoles = await request(createApp())
    .put(`/api/teams/${team.id}/roles`)
    .set('Cookie', [ownerCookie])
    .send({ roles: [{ roleId: backendRole.id, slotsTotal: 2 }] });
  expect(setRoles.status).toBe(200);
  expect(setRoles.body).toHaveLength(1);
  expect(setRoles.body[0].slotsTotal).toBe(2);

  const publish = await request(createApp()).post(`/api/teams/${team.id}/publish`).set('Cookie', [ownerCookie]);
  expect(publish.status).toBe(200);
  expect(publish.body.status).toBe('PUBLISHED');
});

test('GET /api/teams/mine lists teams created by the current user', async () => {
  await prisma.team.create({ data: { name: 'Team A', creatorId: owner.id } });
  const res = await request(createApp()).get('/api/teams/mine').set('Cookie', [ownerCookie]);
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].name).toBe('Team A');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/routes/teamsCreate.test.js`
Expected: FAIL — route not mounted

- [ ] **Step 3: Implement `server/src/controllers/teamsController.js`**

```js
const { prisma } = require('../lib/prisma');
const { AppError } = require('../errors');

async function requireTeamOwner(teamId, userId) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new AppError(404, 'Team not found');
  if (team.creatorId !== userId) throw new AppError(403, 'Only the team creator can do this');
  return team;
}

async function createTeam(req, res, next) {
  try {
    const { name, eventTarget, description } = req.body;
    if (!name) throw new AppError(400, 'name is required');

    const team = await prisma.team.create({
      data: { name, eventTarget, description, creatorId: req.user.id },
    });
    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
}

async function setOpenRoles(req, res, next) {
  try {
    const team = await requireTeamOwner(req.params.id, req.user.id);
    const roles = req.body.roles;
    if (!Array.isArray(roles) || roles.length === 0) {
      throw new AppError(400, 'roles must be a non-empty array of { roleId, slotsTotal }');
    }

    await prisma.$transaction([
      prisma.teamOpenRole.deleteMany({ where: { teamId: team.id } }),
      prisma.teamOpenRole.createMany({
        data: roles.map((r) => ({ teamId: team.id, roleId: r.roleId, slotsTotal: r.slotsTotal })),
      }),
    ]);

    const updated = await prisma.teamOpenRole.findMany({
      where: { teamId: team.id },
      include: { role: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function publishTeam(req, res, next) {
  try {
    const team = await requireTeamOwner(req.params.id, req.user.id);
    const openRoleCount = await prisma.teamOpenRole.count({ where: { teamId: team.id } });
    if (openRoleCount === 0) {
      throw new AppError(400, 'Add at least one open role before publishing');
    }
    const updated = await prisma.team.update({ where: { id: team.id }, data: { status: 'PUBLISHED' } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function listMyTeams(req, res, next) {
  try {
    const teams = await prisma.team.findMany({
      where: { creatorId: req.user.id },
      include: { openRoles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(teams);
  } catch (err) {
    next(err);
  }
}

module.exports = { requireTeamOwner, createTeam, setOpenRoles, publishTeam, listMyTeams };
```

- [ ] **Step 4: Implement `server/src/routes/teams.js`**

```js
const express = require('express');
const { authRequired, profileRequired } = require('../middleware/auth');
const { createTeam, setOpenRoles, publishTeam, listMyTeams } = require('../controllers/teamsController');

const router = express.Router();

router.post('/', authRequired, profileRequired, createTeam);
router.put('/:id/roles', authRequired, profileRequired, setOpenRoles);
router.post('/:id/publish', authRequired, profileRequired, publishTeam);
router.get('/mine', authRequired, listMyTeams);

module.exports = router;
```

- [ ] **Step 5: Mount the router in `server/src/index.js`**

Add near the other requires:

```js
const teamsRoutes = require('./routes/teams');
```

Add after the profile routes mount:

```js
  app.use('/api/teams', teamsRoutes);
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd server && npm test -- tests/routes/teamsCreate.test.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/teamsController.js server/src/routes/teams.js server/src/index.js server/tests/routes/teamsCreate.test.js
git commit -m "feat(server): add team creation, open roles, publish, and my-teams endpoints"
```

---

## Task 12: Team Search & Details (`GET /api/teams`, `GET /api/teams/:id`)

**Files:**
- Modify: `server/src/controllers/teamsController.js`
- Modify: `server/src/routes/teams.js`
- Test: `server/tests/routes/teamsSearch.test.js`

**Interfaces:**
- Adds `listTeams`, `getTeam` to `teamsController.js`'s exports.
- Note: the flow diagram mentions filtering by "skills, faculty, format," but the approved schema (spec, Task 2) has no `format` field on `Team`. This implements the two filters the schema actually supports — `skill` (matches an open role's `Role.name`, case-insensitive) and `faculty` (matches `creator.faculty`) — and omits `format` as a known gap between the flow diagram and the data model.

- [ ] **Step 1: Write the failing test**

```js
// server/tests/routes/teamsSearch.test.js
const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let cookie;
let backendRole;
let frontendRole;

beforeEach(async () => {
  await resetDb();
  const user = await prisma.user.create({
    data: { email: 'a@kbtu.kz', googleId: 'g-1', name: 'A', profileComplete: true },
  });
  cookie = `session=${signSessionToken(user.id)}`;
  backendRole = await prisma.role.create({ data: { name: 'Backend' } });
  frontendRole = await prisma.role.create({ data: { name: 'Frontend' } });

  const fitCreator = await prisma.user.create({
    data: { email: 'fit@kbtu.kz', googleId: 'g-fit', name: 'FIT Creator', faculty: 'FIT' },
  });
  const iseCreator = await prisma.user.create({
    data: { email: 'ise@kbtu.kz', googleId: 'g-ise', name: 'ISE Creator', faculty: 'ISE' },
  });

  const published = await prisma.team.create({
    data: { name: 'Published FIT Backend Team', creatorId: fitCreator.id, status: 'PUBLISHED' },
  });
  await prisma.teamOpenRole.create({ data: { teamId: published.id, roleId: backendRole.id, slotsTotal: 2 } });

  const draft = await prisma.team.create({
    data: { name: 'Draft Team', creatorId: fitCreator.id, status: 'DRAFT' },
  });
  await prisma.teamOpenRole.create({ data: { teamId: draft.id, roleId: backendRole.id, slotsTotal: 1 } });

  const otherPublished = await prisma.team.create({
    data: { name: 'Published ISE Frontend Team', creatorId: iseCreator.id, status: 'PUBLISHED' },
  });
  await prisma.teamOpenRole.create({ data: { teamId: otherPublished.id, roleId: frontendRole.id, slotsTotal: 1 } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('lists only published teams by default', async () => {
  const res = await request(createApp()).get('/api/teams').set('Cookie', [cookie]);
  expect(res.status).toBe(200);
  expect(res.body.map((t) => t.name).sort()).toEqual(['Published FIT Backend Team', 'Published ISE Frontend Team']);
});

test('filters by faculty', async () => {
  const res = await request(createApp()).get('/api/teams?faculty=FIT').set('Cookie', [cookie]);
  expect(res.status).toBe(200);
  expect(res.body.map((t) => t.name)).toEqual(['Published FIT Backend Team']);
});

test('filters by skill (matches open role name)', async () => {
  const res = await request(createApp()).get('/api/teams?skill=front').set('Cookie', [cookie]);
  expect(res.status).toBe(200);
  expect(res.body.map((t) => t.name)).toEqual(['Published ISE Frontend Team']);
});

test('GET /api/teams/:id returns team details with open roles', async () => {
  const list = await request(createApp()).get('/api/teams?faculty=FIT').set('Cookie', [cookie]);
  const teamId = list.body[0].id;
  const res = await request(createApp()).get(`/api/teams/${teamId}`).set('Cookie', [cookie]);
  expect(res.status).toBe(200);
  expect(res.body.openRoles).toHaveLength(1);
  expect(res.body.openRoles[0].role.name).toBe('Backend');
});

test('GET /api/teams/:id 404s for a missing team', async () => {
  const res = await request(createApp()).get('/api/teams/00000000-0000-0000-0000-000000000000').set('Cookie', [cookie]);
  expect(res.status).toBe(404);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/routes/teamsSearch.test.js`
Expected: FAIL — routes not defined

- [ ] **Step 3: Add handlers to `server/src/controllers/teamsController.js`**

Append before `module.exports`:

```js
async function listTeams(req, res, next) {
  try {
    const { skill, faculty } = req.query;
    const teams = await prisma.team.findMany({
      where: {
        status: 'PUBLISHED',
        ...(faculty ? { creator: { faculty } } : {}),
        ...(skill
          ? { openRoles: { some: { role: { name: { contains: skill, mode: 'insensitive' } } } } }
          : {}),
      },
      include: { creator: true, openRoles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(teams);
  } catch (err) {
    next(err);
  }
}

async function getTeam(req, res, next) {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: { creator: true, openRoles: { include: { role: true } } },
    });
    if (!team) throw new AppError(404, 'Team not found');
    res.json(team);
  } catch (err) {
    next(err);
  }
}
```

Update `module.exports` to:

```js
module.exports = {
  requireTeamOwner,
  createTeam,
  setOpenRoles,
  publishTeam,
  listMyTeams,
  listTeams,
  getTeam,
};
```

- [ ] **Step 4: Update `server/src/routes/teams.js`**

Replace the file's contents with:

```js
const express = require('express');
const { authRequired, profileRequired } = require('../middleware/auth');
const {
  createTeam,
  setOpenRoles,
  publishTeam,
  listMyTeams,
  listTeams,
  getTeam,
} = require('../controllers/teamsController');

const router = express.Router();

router.post('/', authRequired, profileRequired, createTeam);
router.get('/', authRequired, profileRequired, listTeams);
router.get('/mine', authRequired, listMyTeams);
router.get('/:id', authRequired, profileRequired, getTeam);
router.put('/:id/roles', authRequired, profileRequired, setOpenRoles);
router.post('/:id/publish', authRequired, profileRequired, publishTeam);

module.exports = router;
```

Note the reordering: `/mine` must be registered before `/:id` or Express will match `mine` as an `:id` param.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npm test -- tests/routes/teamsSearch.test.js tests/routes/teamsCreate.test.js`
Expected: PASS (both files — confirms the route reordering didn't break Task 11's tests)

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/teamsController.js server/src/routes/teams.js server/tests/routes/teamsSearch.test.js
git commit -m "feat(server): add team search and team details endpoints"
```

---

## Task 13: Applying to a Role & Tracking My Applications

**Files:**
- Create: `server/src/controllers/applicationsController.js`
- Create: `server/src/routes/applications.js`
- Modify: `server/src/controllers/teamsController.js`
- Modify: `server/src/routes/teams.js`
- Modify: `server/src/index.js`
- Test: `server/tests/routes/applications.test.js`

**Interfaces:**
- Adds `applyToRole` to `teamsController.js` (mounted under `/api/teams/:id/roles/:roleId/apply` since it's nested under a team path).
- Produces: `server/src/controllers/applicationsController.js` with `listMyApplications` (this task) and `respondToApplication` (Task 15 adds it to the same file).
- Produces: Express router mounted at `/api/applications` exposing `GET /mine` (this task).

- [ ] **Step 1: Write the failing test**

```js
// server/tests/routes/applications.test.js
const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let applicant;
let applicantCookie;
let team;
let teamOpenRole;

beforeEach(async () => {
  await resetDb();
  const owner = await prisma.user.create({
    data: { email: 'owner@kbtu.kz', googleId: 'g-owner', name: 'Owner' },
  });
  applicant = await prisma.user.create({
    data: { email: 'applicant@kbtu.kz', googleId: 'g-applicant', name: 'Applicant', profileComplete: true },
  });
  applicantCookie = `session=${signSessionToken(applicant.id)}`;

  const role = await prisma.role.create({ data: { name: 'Backend' } });
  team = await prisma.team.create({ data: { name: 'Team A', creatorId: owner.id, status: 'PUBLISHED' } });
  teamOpenRole = await prisma.teamOpenRole.create({ data: { teamId: team.id, roleId: role.id, slotsTotal: 2 } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('applies to an open role and shows up in my applications', async () => {
  const applyRes = await request(createApp())
    .post(`/api/teams/${team.id}/roles/${teamOpenRole.id}/apply`)
    .set('Cookie', [applicantCookie]);

  expect(applyRes.status).toBe(201);
  expect(applyRes.body.status).toBe('SENT');
  expect(applyRes.body.direction).toBe('APPLICATION');

  const mineRes = await request(createApp()).get('/api/applications/mine').set('Cookie', [applicantCookie]);
  expect(mineRes.status).toBe(200);
  expect(mineRes.body).toHaveLength(1);
  expect(mineRes.body[0].team.name).toBe('Team A');
});

test('rejects a duplicate application to the same role', async () => {
  await request(createApp()).post(`/api/teams/${team.id}/roles/${teamOpenRole.id}/apply`).set('Cookie', [applicantCookie]);
  const res = await request(createApp())
    .post(`/api/teams/${team.id}/roles/${teamOpenRole.id}/apply`)
    .set('Cookie', [applicantCookie]);
  expect(res.status).toBe(409);
});

test('404s when the role does not belong to the team', async () => {
  const otherTeam = await prisma.team.create({ data: { name: 'Team B', creatorId: applicant.id } });
  const res = await request(createApp())
    .post(`/api/teams/${otherTeam.id}/roles/${teamOpenRole.id}/apply`)
    .set('Cookie', [applicantCookie]);
  expect(res.status).toBe(404);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/routes/applications.test.js`
Expected: FAIL — routes not defined

- [ ] **Step 3: Add `applyToRole` to `server/src/controllers/teamsController.js`**

Append before `module.exports`:

```js
async function applyToRole(req, res, next) {
  try {
    const teamOpenRole = await prisma.teamOpenRole.findFirst({
      where: { id: req.params.roleId, teamId: req.params.id },
    });
    if (!teamOpenRole) throw new AppError(404, 'Role not found on this team');

    const application = await prisma.application.create({
      data: {
        teamId: req.params.id,
        teamOpenRoleId: teamOpenRole.id,
        userId: req.user.id,
        direction: 'APPLICATION',
        status: 'SENT',
      },
    });
    res.status(201).json(application);
  } catch (err) {
    if (err.code === 'P2002') return next(new AppError(409, 'You already applied to this role'));
    next(err);
  }
}
```

Update `module.exports` to add `applyToRole`:

```js
module.exports = {
  requireTeamOwner,
  createTeam,
  setOpenRoles,
  publishTeam,
  listMyTeams,
  listTeams,
  getTeam,
  applyToRole,
};
```

- [ ] **Step 4: Add the route to `server/src/routes/teams.js`**

Add this import to the destructured require:

```js
  applyToRole,
```

Add this route registration (after the `GET /:id` route):

```js
router.post('/:id/roles/:roleId/apply', authRequired, profileRequired, applyToRole);
```

- [ ] **Step 5: Implement `server/src/controllers/applicationsController.js`**

```js
const { prisma } = require('../lib/prisma');

async function listMyApplications(req, res, next) {
  try {
    const applications = await prisma.application.findMany({
      where: { userId: req.user.id, direction: 'APPLICATION' },
      include: { team: true, teamOpenRole: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(applications);
  } catch (err) {
    next(err);
  }
}

module.exports = { listMyApplications };
```

- [ ] **Step 6: Implement `server/src/routes/applications.js`**

```js
const express = require('express');
const { authRequired } = require('../middleware/auth');
const { listMyApplications } = require('../controllers/applicationsController');

const router = express.Router();

router.get('/mine', authRequired, listMyApplications);

module.exports = router;
```

- [ ] **Step 7: Mount the router in `server/src/index.js`**

Add near the other requires:

```js
const applicationsRoutes = require('./routes/applications');
```

Add after the teams routes mount:

```js
  app.use('/api/applications', applicationsRoutes);
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd server && npm test -- tests/routes/applications.test.js`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add server/src/controllers/teamsController.js server/src/routes/teams.js server/src/controllers/applicationsController.js server/src/routes/applications.js server/src/index.js server/tests/routes/applications.test.js
git commit -m "feat(server): add apply-to-role and my-applications endpoints"
```

---

## Task 14: Receiving Applications & Sending Invitations

**Files:**
- Modify: `server/src/controllers/teamsController.js`
- Modify: `server/src/routes/teams.js`
- Test: `server/tests/routes/teamsApplications.test.js`

**Interfaces:**
- Adds `listTeamApplications`, `inviteUser` to `teamsController.js`'s exports.
- Consumes: `requireTeamOwner` (already in this file, Task 11).

- [ ] **Step 1: Write the failing test**

```js
// server/tests/routes/teamsApplications.test.js
const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let owner;
let ownerCookie;
let applicant;
let team;
let teamOpenRole;

beforeEach(async () => {
  await resetDb();
  owner = await prisma.user.create({
    data: { email: 'owner@kbtu.kz', googleId: 'g-owner', name: 'Owner', profileComplete: true },
  });
  ownerCookie = `session=${signSessionToken(owner.id)}`;
  applicant = await prisma.user.create({
    data: { email: 'applicant@kbtu.kz', googleId: 'g-applicant', name: 'Applicant', profileComplete: true },
  });

  const role = await prisma.role.create({ data: { name: 'Backend' } });
  team = await prisma.team.create({ data: { name: 'Team A', creatorId: owner.id, status: 'PUBLISHED' } });
  teamOpenRole = await prisma.teamOpenRole.create({ data: { teamId: team.id, roleId: role.id, slotsTotal: 2 } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('team creator sees applications received for their team', async () => {
  await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'APPLICATION' },
  });

  const res = await request(createApp()).get(`/api/teams/${team.id}/applications`).set('Cookie', [ownerCookie]);
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].user.email).toBe('applicant@kbtu.kz');
});

test('a non-creator cannot see applications for the team', async () => {
  const applicantCookie = `session=${signSessionToken(applicant.id)}`;
  const res = await request(createApp()).get(`/api/teams/${team.id}/applications`).set('Cookie', [applicantCookie]);
  expect(res.status).toBe(403);
});

test('team creator can invite a user to an open role', async () => {
  const res = await request(createApp())
    .post(`/api/teams/${team.id}/invite`)
    .set('Cookie', [ownerCookie])
    .send({ userId: applicant.id, teamOpenRoleId: teamOpenRole.id });

  expect(res.status).toBe(201);
  expect(res.body.direction).toBe('INVITATION');
  expect(res.body.userId).toBe(applicant.id);
});

test('a non-creator cannot invite users to the team', async () => {
  const applicantCookie = `session=${signSessionToken(applicant.id)}`;
  const res = await request(createApp())
    .post(`/api/teams/${team.id}/invite`)
    .set('Cookie', [applicantCookie])
    .send({ userId: applicant.id, teamOpenRoleId: teamOpenRole.id });
  expect(res.status).toBe(403);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/routes/teamsApplications.test.js`
Expected: FAIL — routes not defined

- [ ] **Step 3: Add handlers to `server/src/controllers/teamsController.js`**

Append before `module.exports`:

```js
async function listTeamApplications(req, res, next) {
  try {
    await requireTeamOwner(req.params.id, req.user.id);
    const applications = await prisma.application.findMany({
      where: { teamId: req.params.id, direction: 'APPLICATION' },
      include: { user: true, teamOpenRole: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(applications);
  } catch (err) {
    next(err);
  }
}

async function inviteUser(req, res, next) {
  try {
    const { userId, teamOpenRoleId } = req.body;
    if (!userId || !teamOpenRoleId) throw new AppError(400, 'userId and teamOpenRoleId are required');

    const team = await requireTeamOwner(req.params.id, req.user.id);
    const teamOpenRole = await prisma.teamOpenRole.findFirst({
      where: { id: teamOpenRoleId, teamId: team.id },
    });
    if (!teamOpenRole) throw new AppError(404, 'Role not found on this team');

    const application = await prisma.application.create({
      data: {
        teamId: team.id,
        teamOpenRoleId: teamOpenRole.id,
        userId,
        direction: 'INVITATION',
        status: 'SENT',
      },
    });
    res.status(201).json(application);
  } catch (err) {
    if (err.code === 'P2002') return next(new AppError(409, 'This user was already invited to this role'));
    next(err);
  }
}
```

Update `module.exports` to add `listTeamApplications` and `inviteUser`:

```js
module.exports = {
  requireTeamOwner,
  createTeam,
  setOpenRoles,
  publishTeam,
  listMyTeams,
  listTeams,
  getTeam,
  applyToRole,
  listTeamApplications,
  inviteUser,
};
```

- [ ] **Step 4: Add routes to `server/src/routes/teams.js`**

Add to the destructured require:

```js
  listTeamApplications,
  inviteUser,
```

Add these route registrations (after the apply route):

```js
router.get('/:id/applications', authRequired, listTeamApplications);
router.post('/:id/invite', authRequired, profileRequired, inviteUser);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npm test -- tests/routes/teamsApplications.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/teamsController.js server/src/routes/teams.js server/tests/routes/teamsApplications.test.js
git commit -m "feat(server): add receive-applications and invite-user endpoints"
```

---

## Task 15: Accepting/Declining Applications & Invitations

**Files:**
- Modify: `server/src/controllers/applicationsController.js`
- Modify: `server/src/routes/applications.js`
- Test: `server/tests/routes/applicationsRespond.test.js`

**Interfaces:**
- Adds `respondToApplication` to `applicationsController.js`'s exports.
- Produces: `PATCH /api/applications/:id`.

- [ ] **Step 1: Write the failing test**

```js
// server/tests/routes/applicationsRespond.test.js
const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let owner;
let ownerCookie;
let applicant;
let applicantCookie;
let team;
let teamOpenRole;

beforeEach(async () => {
  await resetDb();
  owner = await prisma.user.create({
    data: { email: 'owner@kbtu.kz', googleId: 'g-owner', name: 'Owner', profileComplete: true },
  });
  ownerCookie = `session=${signSessionToken(owner.id)}`;
  applicant = await prisma.user.create({
    data: { email: 'applicant@kbtu.kz', googleId: 'g-applicant', name: 'Applicant', profileComplete: true },
  });
  applicantCookie = `session=${signSessionToken(applicant.id)}`;

  const role = await prisma.role.create({ data: { name: 'Backend' } });
  team = await prisma.team.create({ data: { name: 'Team A', creatorId: owner.id, status: 'PUBLISHED' } });
  teamOpenRole = await prisma.teamOpenRole.create({ data: { teamId: team.id, roleId: role.id, slotsTotal: 1 } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('team creator accepts an application, filling the slot', async () => {
  const application = await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'APPLICATION' },
  });

  const res = await request(createApp())
    .patch(`/api/applications/${application.id}`)
    .set('Cookie', [ownerCookie])
    .send({ status: 'ACCEPTED' });

  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ACCEPTED');

  const role = await prisma.teamOpenRole.findUnique({ where: { id: teamOpenRole.id } });
  expect(role.slotsFilled).toBe(1);
});

test('rejects accepting once the role has no slots left', async () => {
  const otherApplicant = await prisma.user.create({
    data: { email: 'other@kbtu.kz', googleId: 'g-other', name: 'Other', profileComplete: true },
  });
  const firstApp = await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'APPLICATION' },
  });
  const secondApp = await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: otherApplicant.id, direction: 'APPLICATION' },
  });

  await request(createApp()).patch(`/api/applications/${firstApp.id}`).set('Cookie', [ownerCookie]).send({ status: 'ACCEPTED' });
  const res = await request(createApp())
    .patch(`/api/applications/${secondApp.id}`)
    .set('Cookie', [ownerCookie])
    .send({ status: 'ACCEPTED' });

  expect(res.status).toBe(409);
});

test('only the team creator can decide on an APPLICATION', async () => {
  const application = await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'APPLICATION' },
  });
  const res = await request(createApp())
    .patch(`/api/applications/${application.id}`)
    .set('Cookie', [applicantCookie])
    .send({ status: 'ACCEPTED' });
  expect(res.status).toBe(403);
});

test('only the invited user can respond to an INVITATION', async () => {
  const invitation = await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'INVITATION' },
  });

  const forbidden = await request(createApp())
    .patch(`/api/applications/${invitation.id}`)
    .set('Cookie', [ownerCookie])
    .send({ status: 'ACCEPTED' });
  expect(forbidden.status).toBe(403);

  const allowed = await request(createApp())
    .patch(`/api/applications/${invitation.id}`)
    .set('Cookie', [applicantCookie])
    .send({ status: 'ACCEPTED' });
  expect(allowed.status).toBe(200);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- tests/routes/applicationsRespond.test.js`
Expected: FAIL — route not defined

- [ ] **Step 3: Add `respondToApplication` to `server/src/controllers/applicationsController.js`**

Replace the file's contents with:

```js
const { prisma } = require('../lib/prisma');
const { AppError } = require('../errors');

async function listMyApplications(req, res, next) {
  try {
    const applications = await prisma.application.findMany({
      where: { userId: req.user.id, direction: 'APPLICATION' },
      include: { team: true, teamOpenRole: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(applications);
  } catch (err) {
    next(err);
  }
}

async function respondToApplication(req, res, next) {
  try {
    const { status } = req.body;
    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      throw new AppError(400, 'status must be ACCEPTED or DECLINED');
    }

    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { team: true },
    });
    if (!application) throw new AppError(404, 'Application not found');

    const isTeamOwner = application.team.creatorId === req.user.id;
    const isTargetUser = application.userId === req.user.id;
    if (application.direction === 'APPLICATION' && !isTeamOwner) {
      throw new AppError(403, 'Only the team creator can decide on this application');
    }
    if (application.direction === 'INVITATION' && !isTargetUser) {
      throw new AppError(403, 'Only the invited user can respond to this invitation');
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (status === 'ACCEPTED') {
        const role = await tx.teamOpenRole.findUnique({ where: { id: application.teamOpenRoleId } });
        if (role.slotsFilled >= role.slotsTotal) {
          throw new AppError(409, 'This role has no open slots left');
        }
        await tx.teamOpenRole.update({ where: { id: role.id }, data: { slotsFilled: { increment: 1 } } });
      }
      return tx.application.update({ where: { id: application.id }, data: { status } });
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = { listMyApplications, respondToApplication };
```

- [ ] **Step 4: Update `server/src/routes/applications.js`**

Replace the file's contents with:

```js
const express = require('express');
const { authRequired } = require('../middleware/auth');
const { listMyApplications, respondToApplication } = require('../controllers/applicationsController');

const router = express.Router();

router.get('/mine', authRequired, listMyApplications);
router.patch('/:id', authRequired, respondToApplication);

module.exports = router;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npm test -- tests/routes/applicationsRespond.test.js`
Expected: PASS

- [ ] **Step 6: Run the full test suite**

Run: `cd server && npm test`
Expected: PASS — every test file from Tasks 1–15 passes.

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/applicationsController.js server/src/routes/applications.js server/tests/routes/applicationsRespond.test.js
git commit -m "feat(server): add accept/decline endpoint for applications and invitations"
```
