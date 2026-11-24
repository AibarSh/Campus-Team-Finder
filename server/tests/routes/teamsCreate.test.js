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
    data: { email: 'owner@kbtu.kz', name: 'Owner', profileComplete: true },
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
    data: { email: 'other@kbtu.kz', name: 'Other', profileComplete: true },
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

test('editing a published team preserves role IDs, members and application history', async () => {
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
    data: { email: 'applicant@kbtu.kz', name: 'Applicant', profileComplete: true },
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
  const legacy = await request(createApp())
    .put(`/api/teams/${team.id}/roles`)
    .set('Cookie', [ownerCookie])
    .send({ roles: [{ roleId: newRole.id, slotsTotal: 1 }] });
  expect(legacy.status).toBe(409);

  const secondSet = await request(createApp())
    .patch(`/api/teams/${team.id}`)
    .set('Cookie', [ownerCookie])
    .send({
      description: 'Updated description',
      eventTarget: 'Updated event',
      roles: [
        { roleId: backendRole.id, slotsTotal: 3, requiredSkills: ['Python'] },
        { roleId: newRole.id, slotsTotal: 1 },
      ],
    });
  expect(secondSet.status).toBe(200);
  expect(secondSet.body).toMatchObject({ name: team.name, description: 'Updated description', eventTarget: 'Updated event' });
  expect(secondSet.body.openRoles).toHaveLength(3);

  const applicationsAfter = await prisma.application.findMany({ where: { teamId: team.id } });
  expect(applicationsAfter).toHaveLength(1);
  expect(applicationsAfter[0].id).toBe(applyRes.body.id);

  const backendAfter = await prisma.teamOpenRole.findUnique({ where: { id: backendOpenRole.id } });
  expect(backendAfter).not.toBeNull();
  expect(backendAfter.slotsFilled).toBe(1);
  expect(backendAfter.slotsTotal).toBe(3);

  const frontendAfter = await prisma.teamOpenRole.findFirst({ where: { teamId: team.id, roleId: frontendRole.id } });
  expect(frontendAfter).not.toBeNull();
  expect(secondSet.body.openRoles.find(({ id }) => id === backendOpenRole.id).requiredSkills)
    .toMatchObject([{ name: 'Python' }]);
});

test('rejects a published rename, editing a full role, or reducing slots below current members', async () => {
  const otherRole = await prisma.role.create({ data: { name: 'Other' } });
  const team = await prisma.team.create({ data: {
    name: 'Fixed title', creatorId: owner.id, status: 'PUBLISHED',
    openRoles: { create: [
      { roleId: backendRole.id, slotsTotal: 3, slotsFilled: 2 },
      { roleId: otherRole.id, slotsTotal: 1, slotsFilled: 1 },
    ] },
  } });
  const edit = (data) => request(createApp()).patch(`/api/teams/${team.id}`).set('Cookie', [ownerCookie]).send(data);
  expect((await edit({ name: 'New' })).status).toBe(409);
  expect((await edit({ roles: [{ roleId: backendRole.id, slotsTotal: 1 }] })).status).toBe(409);
  expect((await edit({ roles: [{ roleId: otherRole.id, slotsTotal: 2 }] })).status).toBe(409);
  expect((await edit({ description: 'No change', roles: [{ roleId: otherRole.id, slotsTotal: 1, requiredSkills: ['Java'] }] })).status).toBe(409);
  expect((await prisma.team.findUnique({ where: { id: team.id } })).description).toBeNull();
  expect((await edit({ roles: [{ roleId: backendRole.id, slotsTotal: 2 }] })).status).toBe(200);
});

test('GET /api/teams/mine lists teams created by the current user', async () => {
  await prisma.team.create({ data: { name: 'Team A', creatorId: owner.id } });
  const res = await request(createApp()).get('/api/teams/mine').set('Cookie', [ownerCookie]);
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].name).toBe('Team A');
});

test('Joined lists only the signed-in member’s accepted roles and groups them by team', async () => {
  const student = await prisma.user.create({
    data: { email: 'member@kbtu.kz', name: 'Member', profileComplete: true },
  });
  const other = await prisma.user.create({
    data: { email: 'othermember@kbtu.kz', name: 'Other Member', profileComplete: true },
  });
  const design = await prisma.role.create({ data: { name: 'Design' } });
  const make = (name, status) => prisma.team.create({
    data: {
      name, status, creatorId: owner.id,
      openRoles: { create: [
        { roleId: backendRole.id, slotsTotal: 1, slotsFilled: 1 },
        { roleId: design.id, slotsTotal: 1, slotsFilled: 1 },
      ] },
    },
    include: { openRoles: true },
  });
  const closed = await make('Closed team', 'CLOSED');
  const full = await make('Full team', 'PUBLISHED');
  const pending = await make('Pending team', 'PUBLISHED');
  const entry = (team, roleId, direction, status, userId = student.id) => ({
    teamId: team.id, teamOpenRoleId: team.openRoles.find((role) => role.roleId === roleId).id,
    userId, direction, status,
  });
  await prisma.application.createMany({ data: [
    entry(closed, backendRole.id, 'APPLICATION', 'ACCEPTED'),
    entry(closed, backendRole.id, 'INVITATION', 'ACCEPTED'),
    entry(closed, design.id, 'INVITATION', 'ACCEPTED'),
    entry(full, design.id, 'INVITATION', 'ACCEPTED'),
    entry(full, backendRole.id, 'INVITATION', 'ACCEPTED', other.id),
    entry(pending, backendRole.id, 'APPLICATION', 'VIEWED'),
    entry(pending, backendRole.id, 'INVITATION', 'SENT'),
    entry(pending, design.id, 'APPLICATION', 'DECLINED'),
    entry(pending, design.id, 'INVITATION', 'DECLINED'),
  ] });
  const api = request(createApp());
  expect((await api.get('/api/teams/joined')).status).toBe(401);
  const joined = await api.get('/api/teams/joined').set('Cookie', [`session=${signSessionToken(student.id)}`]);
  expect(joined.status).toBe(200);
  expect(joined.body).toHaveLength(2);
  expect(joined.body.find(({ id }) => id === closed.id).joinedRoles.map(({ role }) => role.name))
    .toEqual([backendRole.name, design.name]);
  expect(joined.body.find(({ id }) => id === full.id).joinedRoles.map(({ role }) => role.name))
    .toEqual([design.name]);
});

test('closes selected roles atomically with published team edits', async () => {
  const design = await prisma.role.create({ data: { name: 'Design' } });
  const team = await prisma.team.create({
    data: {
      name: 'Recruiting',
      creatorId: owner.id,
      status: 'PUBLISHED',
      openRoles: { create: [{ roleId: backendRole.id, slotsTotal: 2 }, { roleId: design.id, slotsTotal: 1 }] },
    },
    include: { openRoles: true },
  });
  const backend = team.openRoles.find(({ roleId }) => roleId === backendRole.id);
  const edit = (data) => request(createApp()).patch(`/api/teams/${team.id}`).set('Cookie', [ownerCookie]).send(data);
  const invalid = await edit({ closeRoleIds: [backend.id], roles: [{ roleId: 'missing', slotsTotal: 1 }] });
  expect(invalid.status).toBe(400);
  expect(await prisma.teamOpenRole.findUnique({ where: { id: backend.id } })).toMatchObject({ recruitmentClosed: false });
  expect((await edit({ closeRoleIds: ['missing'] })).status).toBe(404);
  const saved = await edit({
    description: 'Updated',
    closeRoleIds: [backend.id],
    roles: [{ roleId: backendRole.id, slotsTotal: 3 }],
  });
  expect(saved.status).toBe(200);
  expect(saved.body).toMatchObject({ status: 'PUBLISHED', description: 'Updated' });
  expect(saved.body.openRoles).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: backend.id, slotsTotal: 3, recruitmentClosed: true }),
    expect.objectContaining({ roleId: design.id, recruitmentClosed: false }),
  ]));
});

test('saves distinct skill requirements per role and keeps them on legacy updates', async () => {
  const team = await prisma.team.create({ data: { name: 'Requirements', creatorId: owner.id } });
  const frontendRole = await prisma.role.create({ data: { name: 'Frontend' } });
  const save = (requiredSkills) => request(createApp())
    .put(`/api/teams/${team.id}/roles`)
    .set('Cookie', [ownerCookie])
    .send({ roles: [
      { roleId: backendRole.id, slotsTotal: 1, requiredSkills },
      { roleId: frontendRole.id, slotsTotal: 1 },
    ] });

  expect((await save(['  '])).status).toBe(400);
  expect((await save([' Python ', 'python', 'Java', 'JavaScript'])).status).toBe(200);
  expect((await save(undefined)).status).toBe(200);
  const result = await request(createApp()).get(`/api/teams/${team.id}`).set('Cookie', [ownerCookie]);
  expect(result.body.openRoles.find((role) => role.roleId === backendRole.id).requiredSkills.map(({ name }) => name))
    .toEqual(['Java', 'JavaScript', 'Python']);
  expect(result.body.openRoles.find((role) => role.roleId === frontendRole.id).requiredSkills).toEqual([]);
  expect((await save([])).body.every((role) => role.requiredSkills.length === 0)).toBe(true);
});

test('PATCH /:id lets only the creator edit a draft team', async () => {
  const app = createApp();
  const team = (await request(app).post('/api/teams').set('Cookie', [ownerCookie]).send({ name: 'Old name' })).body;

  const res = await request(app)
    .patch(`/api/teams/${team.id}`)
    .set('Cookie', [ownerCookie])
    .send({ name: 'New name', eventTarget: 'HackKBTU', description: null });
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('New name');
  expect(res.body.eventTarget).toBe('HackKBTU');

  const blank = await request(app).patch(`/api/teams/${team.id}`).set('Cookie', [ownerCookie]).send({ name: '  ' });
  expect(blank.status).toBe(400);

  const other = await prisma.user.create({
    data: { email: 'intruder@kbtu.kz', name: 'Intruder', profileComplete: true },
  });
  const denied = await request(app)
    .patch(`/api/teams/${team.id}`)
    .set('Cookie', [`session=${signSessionToken(other.id)}`])
    .send({ name: 'Hijacked' });
  expect(denied.status).toBe(403);
});
