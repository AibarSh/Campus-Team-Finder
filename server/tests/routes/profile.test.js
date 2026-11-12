const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');
const { FACULTIES, STUDY_YEARS } = require('../../src/lib/profileOptions');

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
    .send({
      firstName: 'Aisha',
      lastName: 'Bekova',
      bio: 'Hi',
      faculty: FACULTIES[0],
      studyYear: STUDY_YEARS[2],
      availability: '5-10',
      telegramHandle: '@aisha',
      weeklyHours: 10,
      isAdmin: true,
    });

  expect(res.status).toBe(200);
  expect(res.body.firstName).toBe('Aisha');
  expect(res.body.lastName).toBe('Bekova');
  expect(res.body.bio).toBe('Hi');
  expect(res.body.faculty).toBe(FACULTIES[0]);
  expect(res.body.studyYear).toBe(STUDY_YEARS[2]);
  expect(res.body.availability).toBe('5-10');
  expect(res.body.telegramHandle).toBe('@aisha');
  expect(res.body.weeklyHours).toBeNull();
  expect(res.body).not.toHaveProperty('isAdmin');
});

test('PATCH /api/profile rebuilds name from first/last name', async () => {
  await request(createApp()).patch('/api/profile').set('Cookie', [cookie]).send({ firstName: 'Aisha' });
  const res = await request(createApp()).patch('/api/profile').set('Cookie', [cookie]).send({ lastName: 'Bekova' });
  expect(res.body.name).toBe('Aisha Bekova');
});

test('PATCH /api/profile keeps name when first/last not sent', async () => {
  const res = await request(createApp()).patch('/api/profile').set('Cookie', [cookie]).send({ bio: 'x' });
  expect(res.body.name).toBe('A');
});

test.each([
  ['faculty', 'FIT'],
  ['studyYear', '2'],
  ['availability', '40-plus'],
])('PATCH /api/profile rejects unknown %s', async (field, value) => {
  const res = await request(createApp()).patch('/api/profile').set('Cookie', [cookie]).send({ [field]: value });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(field);
});

test('PATCH /api/profile rejects overlong bio', async () => {
  const res = await request(createApp())
    .patch('/api/profile')
    .set('Cookie', [cookie])
    .send({ bio: 'x'.repeat(1001) });
  expect(res.status).toBe(400);
  expect(res.body.error).toMatch('bio');
});

test('PATCH /api/profile allows clearing a field with null', async () => {
  await request(createApp()).patch('/api/profile').set('Cookie', [cookie]).send({ faculty: FACULTIES[0] });
  const res = await request(createApp()).patch('/api/profile').set('Cookie', [cookie]).send({ faculty: null });
  expect(res.status).toBe(200);
  expect(res.body.faculty).toBeNull();
});
