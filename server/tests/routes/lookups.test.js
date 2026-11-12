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
