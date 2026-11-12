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

test('owner listing applications marks SENT ones VIEWED and leaves the rest alone', async () => {
  const other = await prisma.user.create({
    data: { email: 'other@kbtu.kz', googleId: 'g-other', name: 'Other', profileComplete: true },
  });
  const invitee = await prisma.user.create({
    data: { email: 'invitee@kbtu.kz', googleId: 'g-invitee', name: 'Invitee', profileComplete: true },
  });
  await prisma.application.createMany({
    data: [
      { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'APPLICATION', status: 'SENT' },
      { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: other.id, direction: 'APPLICATION', status: 'DECLINED' },
      { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: invitee.id, direction: 'INVITATION', status: 'SENT' },
    ],
  });

  const res = await request(createApp()).get(`/api/teams/${team.id}/applications`).set('Cookie', [ownerCookie]);
  expect(res.status).toBe(200);
  const statusByEmail = Object.fromEntries(res.body.map((a) => [a.user.email, a.status]));
  expect(statusByEmail).toEqual({ 'applicant@kbtu.kz': 'VIEWED', 'other@kbtu.kz': 'DECLINED' });

  const invitation = await prisma.application.findFirst({ where: { direction: 'INVITATION' } });
  expect(invitation.status).toBe('SENT');
});

test('a non-creator request does not mark anything VIEWED', async () => {
  await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'APPLICATION' },
  });
  const applicantCookie = `session=${signSessionToken(applicant.id)}`;
  await request(createApp()).get(`/api/teams/${team.id}/applications`).set('Cookie', [applicantCookie]);

  const application = await prisma.application.findFirst();
  expect(application.status).toBe('SENT');
});
