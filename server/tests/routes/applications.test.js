const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let applicant;
let applicantCookie;
let team;
let teamOpenRole;

beforeEach(async () => {
  await resetDb();
  const owner = await prisma.user.create({
    data: { email: 'owner@kbtu.kz', googleId: 'g-owner', name: 'Owner' },
  });
  applicant = await prisma.user.create({
    data: { email: 'applicant@kbtu.kz', googleId: 'g-applicant', name: 'Applicant', profileComplete: true },
  });
  applicantCookie = `session=${signSessionToken(applicant.id)}`;

  const role = await prisma.role.create({ data: { name: 'Backend' } });
  team = await prisma.team.create({ data: { name: 'Team A', creatorId: owner.id, status: 'PUBLISHED' } });
  teamOpenRole = await prisma.teamOpenRole.create({ data: { teamId: team.id, roleId: role.id, slotsTotal: 2 } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('applies to an open role and shows up in my applications', async () => {
  const applyRes = await request(createApp())
    .post(`/api/teams/${team.id}/roles/${teamOpenRole.id}/apply`)
    .set('Cookie', [applicantCookie]);

  expect(applyRes.status).toBe(201);
  expect(applyRes.body.status).toBe('SENT');
  expect(applyRes.body.direction).toBe('APPLICATION');

  const mineRes = await request(createApp()).get('/api/applications/mine').set('Cookie', [applicantCookie]);
  expect(mineRes.status).toBe(200);
  expect(mineRes.body).toHaveLength(1);
  expect(mineRes.body[0].team.name).toBe('Team A');
});

test('rejects a duplicate application to the same role', async () => {
  await request(createApp()).post(`/api/teams/${team.id}/roles/${teamOpenRole.id}/apply`).set('Cookie', [applicantCookie]);
  const res = await request(createApp())
    .post(`/api/teams/${team.id}/roles/${teamOpenRole.id}/apply`)
    .set('Cookie', [applicantCookie]);
  expect(res.status).toBe(409);
});

test('404s when the role does not belong to the team', async () => {
  const otherTeam = await prisma.team.create({ data: { name: 'Team B', creatorId: applicant.id } });
  const res = await request(createApp())
    .post(`/api/teams/${otherTeam.id}/roles/${teamOpenRole.id}/apply`)
    .set('Cookie', [applicantCookie]);
  expect(res.status).toBe(404);
});
