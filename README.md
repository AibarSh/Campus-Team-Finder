# Campus-Team-Finder
Campus team finder is a web application, that allows students to find or create teams of interest.

## Structure

- `server/` — backend (Express + Prisma + PostgreSQL), runs on http://localhost:4000
- `Campus-Team-Finder/` — frontend (React + Vite), runs on http://localhost:5173

## Requirements

- Node.js 20+
- Docker (for PostgreSQL)

## Running locally

Use three terminals, starting from the repo root.

**1. Database**

```bash
cd server
docker compose up -d
```

**2. Backend**

```bash
cd server
cp .env.example .env      # first time only
npm install
npx prisma migrate dev    # create tables
npm run prisma:seed       # lookups + demo teams
npm run dev               # http://localhost:4000
```

**3. Frontend**

```bash
cd Campus-Team-Finder
npm install
npm run dev               # http://localhost:5173
```

The frontend calls `http://localhost:4000` by default. To point it somewhere else, set `VITE_API_BASE_URL`.

## Testing the app

1. Open http://localhost:5173.
2. Log in with any email, e.g. `test@kbtu.kz`. There is no password: this is a dev login, enabled by `DEV_LOGIN=true` in `server/.env` and always disabled in production.
3. Complete onboarding, browse the seeded teams, and apply to a role.
4. Log in with a second email to test invitations and accepting/declining applications.

## Backend tests

Tests use a separate database (`campus_team_finder_test`, configured in `server/.env.test`). Set it up once, then run the tests:

```bash
cd server
DATABASE_URL="postgresql://campus:campus@localhost:5432/campus_team_finder_test" npx prisma migrate deploy
npm test
```
