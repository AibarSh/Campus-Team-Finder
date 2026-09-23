const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let cookie;
let backendRole;
let frontendRole;

beforeEach(async () => {
  await resetDb();
  const user = await prisma.user.create({
    data: { email: 'a@kbtu.kz', googleId: 'g-1', name: 'A', profileComplete: true },
  });
  cookie = `session=${signSessionToken(user.id)}`;
  backendRole = await prisma.role.create({ data: { name: 'Backend' } });
  frontendRole = await prisma.role.create({ data: { name: 'Frontend' } });

  const fitCreator = await prisma.user.create({
    data: { email: 'fit@kbtu.kz', googleId: 'g-fit', name: 'FIT Creator', faculty: 'FIT' },
  });
  const iseCreator = await prisma.user.create({
    data: { email: 'ise@kbtu.kz', googleId: 'g-ise', name: 'ISE Creator', faculty: 'ISE' },
  });

  const published = await prisma.team.create({
    data: { name: 'Published FIT Backend Team', creatorId: fitCreator.id, status: 'PUBLISHED' },
  });
  await prisma.teamOpenRole.create({ data: { teamId: published.id, roleId: backendRole.id, slotsTotal: 2 } });

  const draft = await prisma.team.create({
    data: { name: 'Draft Team', creatorId: fitCreator.id, status: 'DRAFT' },
  });
  await prisma.teamOpenRole.create({ data: { teamId: draft.id, roleId: backendRole.id, slotsTotal: 1 } });

  const otherPublished = await prisma.team.create({
    data: { name: 'Published ISE Frontend Team', creatorId: iseCreator.id, status: 'PUBLISHED' },
  });
  await prisma.teamOpenRole.create({ data: { teamId: otherPublished.id, roleId: frontendRole.id, slotsTotal: 1 } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('lists only published teams by default', async () => {
  const res = await request(createApp()).get('/api/teams').set('Cookie', [cookie]);
  expect(res.status).toBe(200);
  expect(res.body.map((t) => t.name).sort()).toEqual(['Published FIT Backend Team', 'Published ISE Frontend Team']);
});

test('filters by faculty', async () => {
  const res = await request(createApp()).get('/api/teams?faculty=FIT').set('Cookie', [cookie]);
  expect(res.status).toBe(200);
  expect(res.body.map((t) => t.name)).toEqual(['Published FIT Backend Team']);
});

test('filters by skill (matches open role name)', async () => {
  const res = await request(createApp()).get('/api/teams?skill=front').set('Cookie', [cookie]);
  expect(res.status).toBe(200);
  expect(res.body.map((t) => t.name)).toEqual(['Published ISE Frontend Team']);
});

test('GET /api/teams/:id returns team details with open roles', async () => {
  const list = await request(createApp()).get('/api/teams?faculty=FIT').set('Cookie', [cookie]);
  const teamId = list.body[0].id;
  const res = await request(createApp()).get(`/api/teams/${teamId}`).set('Cookie', [cookie]);
  expect(res.status).toBe(200);
  expect(res.body.openRoles).toHaveLength(1);
  expect(res.body.openRoles[0].role.name).toBe('Backend');
});

test('GET /api/teams/:id 404s for a missing team', async () => {
  const res = await request(createApp()).get('/api/teams/00000000-0000-0000-0000-000000000000').set('Cookie', [cookie]);
  expect(res.status).toBe(404);
});
