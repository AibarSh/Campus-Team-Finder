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
