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
    data: { email: 'me@kbtu.kz', name: 'Me', profileComplete: true },
  });
  meCookie = `session=${signSessionToken(me.id)}`;

  const react = await prisma.skill.create({ data: { name: 'React' } });
  const alice = await prisma.user.create({
    data: { email: 'alice@kbtu.kz', name: 'alice', firstName: 'Alice', profileComplete: true },
  });
  await prisma.userSkill.create({ data: { userId: alice.id, skillId: react.id, proficiency: 'ADVANCED' } });
  await prisma.user.create({
    data: { email: 'bob@kbtu.kz', name: 'Bob', profileComplete: true },
  });
  await prisma.user.create({
    data: { email: 'alina@kbtu.kz', name: 'Alina', firstName: 'Alina', profileComplete: false },
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
  expect(res.body[0]).not.toHaveProperty('passwordHash');
  expect(res.body[0]).not.toHaveProperty('profileComplete');
});

test('paginates all candidates and finds a candidate from page two by custom skill, name or email', async () => {
  const target = await prisma.user.create({
    data: {
      email: 'secondpage@kbtu.kz', name: 'Second Page', profileComplete: true,
      customSkills: { create: { name: 'Lunar Cartography', normalizedName: 'lunar cartography', proficiency: 'INTERMEDIATE' } },
    },
  });
  await prisma.user.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      email: `newer-${i}@kbtu.kz`, name: `Candidate ${i}`, profileComplete: true,
      createdAt: new Date(target.createdAt.getTime() + 1000),
    })),
  });
  const getPage = (page, q = '') => request(createApp()).get('/api/users').query({ page, q }).set('Cookie', [meCookie]);
  const first = await getPage(1);
  expect(first.body).toMatchObject({ page: 1, hasNext: true });
  expect(first.body.users).toHaveLength(10);
  expect(first.body.users.map((user) => user.id)).not.toContain(target.id);
  const second = await getPage(2);
  expect(second.body).toMatchObject({ page: 2, hasNext: false });
  expect(second.body.users.map((user) => user.id)).toContain(target.id);
  for (const q of ['  CARTOGRAPHY  ', 'Second Page', 'secondpage@kbtu.kz']) {
    const filtered = await getPage(1, q);
    expect(filtered.body.users).toMatchObject([{ id: target.id, customSkills: [{ name: 'Lunar Cartography' }] }]);
  }
  expect((await getPage(0)).status).toBe(400);
});
