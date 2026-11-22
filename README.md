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

In dev the frontend calls `http://localhost:4000`. To point it somewhere else, set `VITE_API_BASE_URL`. A production build calls `/api` on its own origin.

## Testing the app

1. Open http://localhost:5173.
2. Click **Create an account** and sign up with any `@kbtu.kz` email and a password of at least 8 characters. Other email domains are rejected. There is no email confirmation or password reset yet.
3. Complete onboarding, browse the seeded teams, and apply to a role.
4. Create a second account (in a private window) to test invitations and accepting/declining applications.

## Backend tests

Tests use a separate database (`campus_team_finder_test`, configured in `server/.env.test`). Set it up once, then run the tests:

```bash
cd server
DATABASE_URL="postgresql://campus:campus@localhost:5432/campus_team_finder_test" npx prisma migrate deploy
npm test
```

## Deploying (Vercel + Neon, both free)

The repo root is one Vercel project: the frontend is served as static files and the Express API runs as a serverless function behind `/api` (see `vercel.json` and `api/index.js`). Every build applies database migrations and runs the seed.

1. Create a free PostgreSQL database at https://neon.tech and copy its connection string.
2. From the repo root run `npx vercel link`, then add two environment variables for Production:
   - `DATABASE_URL`: the Neon connection string (the pooled one, host contains `-pooler`)
   - `DATABASE_URL_UNPOOLED` (optional): Neon's direct connection string; migrations use it when set
   - `JWT_SECRET`: a long random string, e.g. from `openssl rand -hex 32`
3. Deploy with `npx vercel --prod`.
