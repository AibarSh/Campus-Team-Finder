const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

const api = request(createApp());
const as = (user) => [`session=${signSessionToken(user.id)}`];
const user = (name, data = {}) => prisma.user.create({
  data: { name, email: `${name}@kbtu.kz`, profileComplete: true, ...data },
});
const customSkill = (name) => ({ name, normalizedName: name.trim().toLowerCase(), proficiency: 'INTERMEDIATE' });
const roleWith = (roleId, names, slotsFilled = 0) => ({
  roleId,
  slotsTotal: 1,
  slotsFilled,
  requiredSkills: { create: names.map((name) => ({ name, normalizedName: name.toLowerCase() })) },
});
const team = (owner, name, roles, data = {}) => prisma.team.create({
  data: { name, creatorId: owner.id, status: 'PUBLISHED', openRoles: { create: roles }, ...data },
  include: { openRoles: true },
});

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

test('recommends by best vacant role before limiting and falls back to recent eligible teams', async () => {
  const owner = await user('Owner');
  const backend = await prisma.role.create({ data: { name: 'Backend' } });
  const frontend = await prisma.role.create({ data: { name: 'Frontend' } });
  const dev = await user('Dev', {
    customSkills: { create: [customSkill(' python '), customSkill('Java')] },
    customRoles: { create: { name: ' BACKEND ', normalizedName: 'backend' } },
  });
  const empty = await user('Empty');
  const fullMatch = await team(owner, 'Full match', [roleWith(frontend.id, ['Python'])], { createdAt: new Date(1) });
  const partial = await team(owner, 'Partial', [roleWith(backend.id, ['Python', 'JavaScript'])], { createdAt: new Date(2) });
  const preferred = await team(owner, 'Preferred', [roleWith(backend.id, ['JavaScript'])], { createdAt: new Date(3) });
  const mixed = await team(owner, 'Mixed', [roleWith(backend.id, ['Python'], 1), roleWith(frontend.id, [])], { createdAt: new Date(4) });
  await team(owner, 'Filled', [roleWith(backend.id, ['Python'], 1)]);
  await team(owner, 'Draft', [roleWith(backend.id, ['Python'])], { status: 'DRAFT' });
  await team(dev, 'Own', [roleWith(backend.id, ['Python'])], { createdAt: new Date(0) });
  const recommend = (student) => api.get('/api/teams/recommended').set('Cookie', as(student));
  expect((await recommend(dev)).body).toMatchObject({ personalized: true, teams: [{ id: fullMatch.id }, { id: partial.id }] });
  await prisma.teamOpenRole.update({ where: { id: fullMatch.openRoles[0].id }, data: { slotsFilled: 1 } });
  expect((await recommend(dev)).body).toMatchObject({ personalized: true, teams: [{ id: partial.id }, { id: preferred.id }] });
  expect((await recommend(empty)).body).toMatchObject({ personalized: false, teams: [{ id: mixed.id }, { id: preferred.id }] });
  await prisma.userPreferredRole.create({ data: { userId: empty.id, roleId: frontend.id } });
  expect((await recommend(empty)).body).toMatchObject({ personalized: true, teams: [{ id: mixed.id }] });
});

test('orders all searched candidates by exact skills then preferred role before paging', async () => {
  const owner = await user('Owner');
  const backend = await prisma.role.create({ data: { name: 'Backend' } });
  const python = await prisma.skill.create({ data: { name: 'Python' } });
  const old = await user('GroupExact', {
    createdAt: new Date(1),
    skills: { create: { skillId: python.id, proficiency: 'BEGINNER' } },
    customSkills: { create: [customSkill(' PYTHON '), customSkill('Java')] },
  });
  const preferred = await user('GroupPreferred', {
    createdAt: new Date(2),
    customSkills: { create: [customSkill('Python'), customSkill('JavaScript')] },
    preferredRoles: { create: { roleId: backend.id } },
  });
  await Promise.all(Array.from({ length: 10 }, (_, i) => user(`GroupNew${i}`)));
  const target = await team(owner, 'Target', [roleWith(backend.id, ['Python', 'Java'])]);
  const roleId = target.openRoles[0].id;
  const candidates = (student, q, page = 1) =>
    api.get(`/api/teams/${target.id}/roles/${roleId}/candidates`).query({ q, page }).set('Cookie', as(student));
  const first = await candidates(owner, 'Group');
  expect(first.body).toMatchObject({ page: 1, hasNext: true });
  expect(first.body.users.slice(0, 2).map(({ id }) => id)).toEqual([old.id, preferred.id]);
  expect(first.body.users[0]).not.toHaveProperty('preferredRoles');
  expect((await candidates(owner, 'java')).body.users.map(({ id }) => id)).toEqual([old.id, preferred.id]);
  expect((await candidates(old, 'Group')).status).toBe(403);
  await prisma.teamOpenRoleRequiredSkill.deleteMany({ where: { teamOpenRoleId: roleId } });
  expect((await candidates(owner, 'Group')).body.users[0].id).toBe(preferred.id);
  expect((await candidates(owner, 'Group', 2)).body.users.map(({ id }) => id)).toContain(old.id);
  await prisma.teamOpenRole.update({ where: { id: roleId }, data: { slotsFilled: 1 } });
  expect((await candidates(owner, 'Group')).status).toBe(409);
});
