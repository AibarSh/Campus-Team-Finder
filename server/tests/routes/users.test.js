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
