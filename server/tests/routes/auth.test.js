const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { resetDb } = require('../helpers/resetDb');

beforeEach(resetDb);

afterAll(async () => {
  await prisma.$disconnect();
});

const register = (body) => request(createApp()).post('/api/auth/register').send(body);
const login = (body) => request(createApp()).post('/api/auth/login').send(body);

test('register creates a user, sets a session cookie that works for /me, and never returns the hash', async () => {
  const res = await register({ email: 'New.Student@KBTU.kz', password: 'correct horse' });
  expect(res.status).toBe(201);
  expect(res.body.user.email).toBe('new.student@kbtu.kz');
  expect(res.body.user.name).toBe('new.student');
  expect(res.body.user).not.toHaveProperty('passwordHash');

  const cookie = res.headers['set-cookie'][0].split(';')[0];
  expect(cookie).toMatch(/^session=/);
  const me = await request(createApp()).get('/api/auth/me').set('Cookie', [cookie]);
  expect(me.status).toBe(200);
  expect(me.body.user.email).toBe('new.student@kbtu.kz');
  expect(me.body.user).not.toHaveProperty('passwordHash');
});

test('register stores a salted hash, not the password', async () => {
  await register({ email: 'a@kbtu.kz', password: 'correct horse' });
  await register({ email: 'b@kbtu.kz', password: 'correct horse' });
  const rows = await prisma.user.findMany({ omit: { passwordHash: false } });
  expect(rows).toHaveLength(2);
  for (const r of rows) expect(r.passwordHash).not.toContain('correct horse');
  expect(rows[0].passwordHash).not.toBe(rows[1].passwordHash);
});

test('register rejects non-kbtu emails with 403', async () => {
  for (const email of ['a@gmail.com', 'a@kbtu.kz.evil.com', 'a@notkbtu.kz', '@kbtu.kz', 'a b@kbtu.kz']) {
    const res = await register({ email, password: 'correct horse' });
    expect(res.status).toBe(403);
  }
  expect(await prisma.user.count()).toBe(0);
});

test('register rejects missing email and short or missing passwords with 400', async () => {
  expect((await register({ password: 'correct horse' })).status).toBe(400);
  expect((await register({ email: 'a@kbtu.kz' })).status).toBe(400);
  expect((await register({ email: 'a@kbtu.kz', password: 'short' })).status).toBe(400);
  expect((await register({ email: 'a@kbtu.kz', password: 12345678 })).status).toBe(400);
});

test('register rejects an already registered email with 409', async () => {
  await register({ email: 'a@kbtu.kz', password: 'correct horse' });
  const res = await register({ email: 'A@kbtu.kz', password: 'another password' });
  expect(res.status).toBe(409);
  expect(await prisma.user.count()).toBe(1);
});

test('login succeeds with the right password and sets a session cookie', async () => {
  await register({ email: 'a@kbtu.kz', password: 'correct horse' });
  const res = await login({ email: ' A@kbtu.kz ', password: 'correct horse' });
  expect(res.status).toBe(200);
  expect(res.body.user.email).toBe('a@kbtu.kz');
  expect(res.body.user).not.toHaveProperty('passwordHash');
  expect(res.headers['set-cookie'][0]).toMatch(/^session=/);
});

test('login fails with 401 and the same message for a wrong password and an unknown email', async () => {
  await register({ email: 'a@kbtu.kz', password: 'correct horse' });
  const wrong = await login({ email: 'a@kbtu.kz', password: 'wrong password' });
  const unknown = await login({ email: 'nobody@kbtu.kz', password: 'correct horse' });
  expect(wrong.status).toBe(401);
  expect(unknown.status).toBe(401);
  expect(wrong.body).toEqual(unknown.body);
  expect(wrong.headers['set-cookie']).toBeUndefined();
});

test('an account without a password cannot be logged into', async () => {
  await prisma.user.create({ data: { email: 'demo@kbtu.kz', name: 'Demo' } });
  for (const password of ['', 'null', 'undefined', 'correct horse']) {
    expect((await login({ email: 'demo@kbtu.kz', password })).status).toBe(401);
  }
  expect((await login({ email: 'demo@kbtu.kz' })).status).toBe(401);
});

test('the old Google and dev-login endpoints are gone', async () => {
  expect((await request(createApp()).post('/api/auth/google').send({ idToken: 'x' })).status).toBe(404);
  expect((await request(createApp()).post('/api/auth/dev-login').send({ email: 'a@kbtu.kz' })).status).toBe(404);
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
