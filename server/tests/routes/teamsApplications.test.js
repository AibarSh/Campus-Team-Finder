const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let owner;
let ownerCookie;
let applicant;
let team;
let teamOpenRole;

beforeEach(async () => {
  await resetDb();
  owner = await prisma.user.create({
    data: { email: 'owner@kbtu.kz', googleId: 'g-owner', name: 'Owner', profileComplete: true },
  });
  ownerCookie = `session=${signSessionToken(owner.id)}`;
  applicant = await prisma.user.create({
    data: { email: 'applicant@kbtu.kz', googleId: 'g-applicant', name: 'Applicant', profileComplete: true },
  });

  const role = await prisma.role.create({ data: { name: 'Backend' } });
  team = await prisma.team.create({ data: { name: 'Team A', creatorId: owner.id, status: 'PUBLISHED' } });
  teamOpenRole = await prisma.teamOpenRole.create({ data: { teamId: team.id, roleId: role.id, slotsTotal: 2 } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('team creator sees applications received for their team', async () => {
  await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'APPLICATION' },
  });

  const res = await request(createApp()).get(`/api/teams/${team.id}/applications`).set('Cookie', [ownerCookie]);
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].user.email).toBe('applicant@kbtu.kz');
});

test('a non-creator cannot see applications for the team', async () => {
  const applicantCookie = `session=${signSessionToken(applicant.id)}`;
  const res = await request(createApp()).get(`/api/teams/${team.id}/applications`).set('Cookie', [applicantCookie]);
  expect(res.status).toBe(403);
});

test('team creator can invite a user to an open role', async () => {
  const res = await request(createApp())
    .post(`/api/teams/${team.id}/invite`)
    .set('Cookie', [ownerCookie])
    .send({ userId: applicant.id, teamOpenRoleId: teamOpenRole.id });

  expect(res.status).toBe(201);
  expect(res.body.direction).toBe('INVITATION');
  expect(res.body.userId).toBe(applicant.id);
});

test('a non-creator cannot invite users to the team', async () => {
  const applicantCookie = `session=${signSessionToken(applicant.id)}`;
  const res = await request(createApp())
    .post(`/api/teams/${team.id}/invite`)
    .set('Cookie', [applicantCookie])
    .send({ userId: applicant.id, teamOpenRoleId: teamOpenRole.id });
  expect(res.status).toBe(403);
});
