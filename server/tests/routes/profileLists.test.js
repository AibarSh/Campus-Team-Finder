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
