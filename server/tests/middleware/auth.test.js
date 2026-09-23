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
