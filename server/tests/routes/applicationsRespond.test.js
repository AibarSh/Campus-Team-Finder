const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let owner;
let ownerCookie;
let applicant;
let applicantCookie;
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
  applicantCookie = `session=${signSessionToken(applicant.id)}`;

  const role = await prisma.role.create({ data: { name: 'Backend' } });
  team = await prisma.team.create({ data: { name: 'Team A', creatorId: owner.id, status: 'PUBLISHED' } });
  teamOpenRole = await prisma.teamOpenRole.create({ data: { teamId: team.id, roleId: role.id, slotsTotal: 1 } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('team creator accepts an application, filling the slot', async () => {
  const application = await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'APPLICATION' },
  });

  const res = await request(createApp())
    .patch(`/api/applications/${application.id}`)
    .set('Cookie', [ownerCookie])
    .send({ status: 'ACCEPTED' });

  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ACCEPTED');

  const role = await prisma.teamOpenRole.findUnique({ where: { id: teamOpenRole.id } });
  expect(role.slotsFilled).toBe(1);
});

test('rejects accepting once the role has no slots left', async () => {
  const otherApplicant = await prisma.user.create({
    data: { email: 'other@kbtu.kz', googleId: 'g-other', name: 'Other', profileComplete: true },
  });
  const firstApp = await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'APPLICATION' },
  });
  const secondApp = await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: otherApplicant.id, direction: 'APPLICATION' },
  });

  await request(createApp()).patch(`/api/applications/${firstApp.id}`).set('Cookie', [ownerCookie]).send({ status: 'ACCEPTED' });
  const res = await request(createApp())
    .patch(`/api/applications/${secondApp.id}`)
    .set('Cookie', [ownerCookie])
    .send({ status: 'ACCEPTED' });

  expect(res.status).toBe(409);
});

test('only the team creator can decide on an APPLICATION', async () => {
  const application = await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'APPLICATION' },
  });
  const res = await request(createApp())
    .patch(`/api/applications/${application.id}`)
    .set('Cookie', [applicantCookie])
    .send({ status: 'ACCEPTED' });
  expect(res.status).toBe(403);
});

test('accepting an already-accepted application is idempotent (rejects re-accept, does not double-fill)', async () => {
  const application = await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'APPLICATION' },
  });

  const first = await request(createApp())
    .patch(`/api/applications/${application.id}`)
    .set('Cookie', [ownerCookie])
    .send({ status: 'ACCEPTED' });
  expect(first.status).toBe(200);

  let role = await prisma.teamOpenRole.findUnique({ where: { id: teamOpenRole.id } });
  expect(role.slotsFilled).toBe(1);

  const second = await request(createApp())
    .patch(`/api/applications/${application.id}`)
    .set('Cookie', [ownerCookie])
    .send({ status: 'ACCEPTED' });
  expect(second.status).toBe(409);

  role = await prisma.teamOpenRole.findUnique({ where: { id: teamOpenRole.id } });
  expect(role.slotsFilled).toBe(1);
});

test('rejects deciding on an already-declined application', async () => {
  const application = await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'APPLICATION' },
  });

  const decline = await request(createApp())
    .patch(`/api/applications/${application.id}`)
    .set('Cookie', [ownerCookie])
    .send({ status: 'DECLINED' });
  expect(decline.status).toBe(200);

  const again = await request(createApp())
    .patch(`/api/applications/${application.id}`)
    .set('Cookie', [ownerCookie])
    .send({ status: 'DECLINED' });
  expect(again.status).toBe(409);
});

test('GET /api/applications/mine?direction=INVITATION returns invitations targeting the current user', async () => {
  const invitation = await prisma.application.create({
    data: {
      teamId: team.id,
      teamOpenRoleId: teamOpenRole.id,
      userId: applicant.id,
      direction: 'INVITATION',
      status: 'SENT',
    },
  });

  const res = await request(createApp())
    .get('/api/applications/mine?direction=INVITATION')
    .set('Cookie', [applicantCookie]);

  expect(res.status).toBe(200);
  expect(res.body.map((a) => a.id)).toContain(invitation.id);
  expect(res.body.every((a) => a.direction === 'INVITATION')).toBe(true);
});

test('only the invited user can respond to an INVITATION', async () => {
  const invitation = await prisma.application.create({
    data: { teamId: team.id, teamOpenRoleId: teamOpenRole.id, userId: applicant.id, direction: 'INVITATION' },
  });

  const forbidden = await request(createApp())
    .patch(`/api/applications/${invitation.id}`)
    .set('Cookie', [ownerCookie])
    .send({ status: 'ACCEPTED' });
  expect(forbidden.status).toBe(403);

  const allowed = await request(createApp())
    .patch(`/api/applications/${invitation.id}`)
    .set('Cookie', [applicantCookie])
    .send({ status: 'ACCEPTED' });
  expect(allowed.status).toBe(200);
});
