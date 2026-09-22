const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let user;
let cookie;

beforeEach(async () => {
  await resetDb();
  user = await prisma.user.create({ data: { email: 'a@kbtu.kz', googleId: 'g-1', name: 'A' } });
  cookie = `session=${signSessionToken(user.id)}`;
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('GET /api/profile returns the current user with related lists', async () => {
  const res = await request(createApp()).get('/api/profile').set('Cookie', [cookie]);
  expect(res.status).toBe(200);
  expect(res.body.email).toBe('a@kbtu.kz');
  expect(res.body.skills).toEqual([]);
});

test('PATCH /api/profile updates only allowed fields', async () => {
  const res = await request(createApp())
    .patch('/api/profile')
    .set('Cookie', [cookie])
    .send({ name: 'Updated Name', faculty: 'FIT', studyYear: 2, weeklyHours: 10, isAdmin: true });

  expect(res.status).toBe(200);
  expect(res.body.name).toBe('Updated Name');
  expect(res.body.faculty).toBe('FIT');
  expect(res.body.studyYear).toBe(2);
  expect(res.body).not.toHaveProperty('isAdmin');
});
