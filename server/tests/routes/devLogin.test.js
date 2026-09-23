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
