const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let owner;
let ownerCookie;
let backendRole;

beforeEach(async () => {
  await resetDb();
  owner = await prisma.user.create({
    data: { email: 'owner@kbtu.kz', googleId: 'g-owner', name: 'Owner', profileComplete: true },
  });
  ownerCookie = `session=${signSessionToken(owner.id)}`;
  backendRole = await prisma.role.create({ data: { name: 'Backend' } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('creates a draft team', async () => {
  const res = await request(createApp())
    .post('/api/teams')
    .set('Cookie', [ownerCookie])
    .send({ name: 'Hack Squad', eventTarget: 'HackKBTU', description: 'Building cool stuff' });

  expect(res.status).toBe(201);
  expect(res.body.status).toBe('DRAFT');
  expect(res.body.creatorId).toBe(owner.id);
});

test('only the creator can set open roles, and publish requires at least one role', async () => {
  const team = await prisma.team.create({ data: { name: 'Hack Squad', creatorId: owner.id } });
  const otherUser = await prisma.user.create({
    data: { email: 'other@kbtu.kz', googleId: 'g-other', name: 'Other', profileComplete: true },
  });
  const otherCookie = `session=${signSessionToken(otherUser.id)}`;

  const forbidden = await request(createApp())
    .put(`/api/teams/${team.id}/roles`)
    .set('Cookie', [otherCookie])
    .send({ roles: [{ roleId: backendRole.id, slotsTotal: 2 }] });
  expect(forbidden.status).toBe(403);

  const publishTooEarly = await request(createApp())
    .post(`/api/teams/${team.id}/publish`)
    .set('Cookie', [ownerCookie]);
  expect(publishTooEarly.status).toBe(400);

  const setRoles = await request(createApp())
    .put(`/api/teams/${team.id}/roles`)
    .set('Cookie', [ownerCookie])
    .send({ roles: [{ roleId: backendRole.id, slotsTotal: 2 }] });
  expect(setRoles.status).toBe(200);
  expect(setRoles.body).toHaveLength(1);
  expect(setRoles.body[0].slotsTotal).toBe(2);

  const publish = await request(createApp()).post(`/api/teams/${team.id}/publish`).set('Cookie', [ownerCookie]);
  expect(publish.status).toBe(200);
  expect(publish.body.status).toBe('PUBLISHED');
});

test('PUT /:id/roles preserves existing Application rows and slotsFilled for unchanged roles', async () => {
  const frontendRole = await prisma.role.create({ data: { name: 'Frontend' } });
  const team = await prisma.team.create({ data: { name: 'Hack Squad', creatorId: owner.id } });

  const setRoles = await request(createApp())
    .put(`/api/teams/${team.id}/roles`)
    .set('Cookie', [ownerCookie])
    .send({
      roles: [
        { roleId: backendRole.id, slotsTotal: 2 },
        { roleId: frontendRole.id, slotsTotal: 1 },
      ],
    });
  expect(setRoles.status).toBe(200);
  const backendOpenRole = setRoles.body.find((r) => r.roleId === backendRole.id);

  const applicant = await prisma.user.create({
    data: { email: 'applicant@kbtu.kz', googleId: 'g-applicant', name: 'Applicant', profileComplete: true },
  });
  const applicantCookie = `session=${signSessionToken(applicant.id)}`;

  await prisma.team.update({ where: { id: team.id }, data: { status: 'PUBLISHED' } });
  const applyRes = await request(createApp())
    .post(`/api/teams/${team.id}/roles/${backendOpenRole.id}/apply`)
    .set('Cookie', [applicantCookie]);
  expect(applyRes.status).toBe(201);

  const acceptRes = await request(createApp())
    .patch(`/api/applications/${applyRes.body.id}`)
    .set('Cookie', [ownerCookie])
    .send({ status: 'ACCEPTED' });
  expect(acceptRes.status).toBe(200);

  const newRole = await prisma.role.create({ data: { name: 'Design' } });
  const secondSet = await request(createApp())
    .put(`/api/teams/${team.id}/roles`)
    .set('Cookie', [ownerCookie])
    .send({
      roles: [
        { roleId: backendRole.id, slotsTotal: 3 },
        { roleId: newRole.id, slotsTotal: 1 },
      ],
    });
  expect(secondSet.status).toBe(200);

  const applicationsAfter = await prisma.application.findMany({ where: { teamId: team.id } });
  expect(applicationsAfter).toHaveLength(1);
  expect(applicationsAfter[0].id).toBe(applyRes.body.id);

  const backendAfter = await prisma.teamOpenRole.findUnique({ where: { id: backendOpenRole.id } });
  expect(backendAfter).not.toBeNull();
  expect(backendAfter.slotsFilled).toBe(1);
  expect(backendAfter.slotsTotal).toBe(3);

  const frontendAfter = await prisma.teamOpenRole.findFirst({ where: { teamId: team.id, roleId: frontendRole.id } });
  expect(frontendAfter).toBeNull();
});

test('GET /api/teams/mine lists teams created by the current user', async () => {
  await prisma.team.create({ data: { name: 'Team A', creatorId: owner.id } });
  const res = await request(createApp()).get('/api/teams/mine').set('Cookie', [ownerCookie]);
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].name).toBe('Team A');
});
