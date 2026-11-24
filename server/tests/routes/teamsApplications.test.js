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
    data: { email: 'owner@kbtu.kz', name: 'Owner', profileComplete: true },
  });
  ownerCookie = `session=${signSessionToken(owner.id)}`;
  applicant = await prisma.user.create({
    data: { email: 'applicant@kbtu.kz', name: 'Applicant', profileComplete: true },
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

test('role and team closure block new recruiting and preserve existing decisions', async () => {
  const api = request(createApp());
  const teamUrl = `/api/teams/${team.id}`;
  const as = (user) => [`session=${signSessionToken(user.id)}`];
  const people = await Promise.all(['accept', 'decline', 'stale'].map((name) => prisma.user.create({
    data: { name, email: `${name}@kbtu.kz`, profileComplete: true },
  })));
  const [invitee, declined, stale] = people;
  const other = await prisma.teamOpenRole.create({
    data: { team: { connect: { id: team.id } }, slotsTotal: 1, role: { create: { name: 'Design' } } },
  });
  await prisma.userPreferredRole.create({ data: { userId: stale.id, roleId: teamOpenRole.roleId } });
  const apply = (user, role = teamOpenRole) => api.post(`${teamUrl}/roles/${role.id}/apply`).set('Cookie', as(user));
  const invite = (user, role = teamOpenRole) => api.post(`${teamUrl}/invite`).set('Cookie', [ownerCookie])
    .send({ userId: user.id, teamOpenRoleId: role.id });
  const decide = (id, account, status) => api.patch(`/api/applications/${id}`).set('Cookie', as(account)).send({ status });
  const close = (account, role) => api.post(`${teamUrl}${role ? `/roles/${role.id}` : ''}/close-recruitment`).set('Cookie', as(account));

  const applied = await apply(applicant);
  const rejected = await apply(declined);
  const invited = await invite(invitee);
  const overflow = await invite(stale);
  expect([applied.status, rejected.status, invited.status, overflow.status]).toEqual([201, 201, 201, 201]);
  expect((await close(stale, teamOpenRole)).status).toBe(403);
  expect((await close(owner, teamOpenRole)).body.openRoles).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: teamOpenRole.id, recruitmentClosed: true }),
    expect.objectContaining({ id: other.id, recruitmentClosed: false }),
  ]));
  expect((await api.get(`${teamUrl}/roles/${teamOpenRole.id}/candidates`).set('Cookie', [ownerCookie])).status).toBe(409);
  expect((await apply(stale)).status).toBe(409);
  expect((await invite(declined)).status).toBe(409);
  expect((await apply(stale, other)).status).toBe(201);
  expect((await api.get('/api/teams').query({ skill: 'Backend' }).set('Cookie', as(stale))).body).toEqual([]);
  expect((await api.get('/api/teams/recommended').set('Cookie', as(stale))).body)
    .toMatchObject({ personalized: false, teams: [{ id: team.id }] });

  expect((await close(owner)).body.status).toBe('CLOSED');
  expect((await close(owner)).status).toBe(200);
  expect((await apply(declined, other)).status).toBe(409);
  expect((await invite(declined, other)).status).toBe(409);
  expect((await api.post(`${teamUrl}/publish`).set('Cookie', [ownerCookie])).status).toBe(409);
  expect((await api.get('/api/teams').set('Cookie', as(stale))).body).toEqual([]);
  expect((await api.get('/api/teams/recommended').set('Cookie', as(stale))).body.teams).toEqual([]);
  expect((await decide(applied.body.id, owner, 'ACCEPTED')).status).toBe(200);
  expect((await decide(rejected.body.id, owner, 'DECLINED')).status).toBe(200);
  expect((await decide(invited.body.id, invitee, 'ACCEPTED')).status).toBe(200);
  expect((await decide(overflow.body.id, stale, 'ACCEPTED')).status).toBe(409);
  expect((await api.get(teamUrl).set('Cookie', as(stale))).body).toMatchObject({ status: 'CLOSED' });
  const history = await api.get(`${teamUrl}/applications?direction=INVITATION`).set('Cookie', [ownerCookie]);
  expect(history.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: invited.body.id, status: 'ACCEPTED' })]));
});

test('rejects a new invitation after the last slot is accepted and keeps the team and history readable', async () => {
  await prisma.teamOpenRole.update({ where: { id: teamOpenRole.id }, data: { slotsTotal: 1 } });
  const other = await prisma.user.create({ data: { email: 'other@kbtu.kz', name: 'Other' } });
  const api = request(createApp());
  const invite = (userId) => api.post(`/api/teams/${team.id}/invite`).set('Cookie', [ownerCookie])
    .send({ userId, teamOpenRoleId: teamOpenRole.id });
  const sent = await invite(applicant.id);
  expect(sent.status).toBe(201);
  const accepted = await api.patch(`/api/applications/${sent.body.id}`)
    .set('Cookie', [`session=${signSessionToken(applicant.id)}`]).send({ status: 'ACCEPTED' });
  expect(accepted.status).toBe(200);
  const stale = await invite(other.id);
  expect(stale.status).toBe(409);
  expect(stale.body.error).toBe('This role has no open slots left');
  const catalog = await api.get('/api/teams').set('Cookie', [ownerCookie]);
  expect(catalog.body).toEqual([]);
  const details = await api.get(`/api/teams/${team.id}`).set('Cookie', [ownerCookie]);
  expect(details.body.openRoles).toMatchObject([{ slotsTotal: 1, slotsFilled: 1 }]);
  const history = await api.get(`/api/teams/${team.id}/applications?direction=INVITATION`).set('Cookie', [ownerCookie]);
  expect(history.body).toHaveLength(1);
  expect(history.body[0]).toMatchObject({ id: sent.body.id, status: 'ACCEPTED' });
});

test('owner listing applications marks SENT ones VIEWED and leaves the rest alone', async () => {
  const other = await prisma.user.create({
    data: { email: 'other@kbtu.kz', name: 'Other', profileComplete: true },
  });
  const invitee = await prisma.user.create({
    data: { email: 'invitee@kbtu.kz', name: 'Invitee', profileComplete: true },
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
