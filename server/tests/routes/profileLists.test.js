const request = require('supertest');
const { createApp } = require('../../src/index');
const { prisma } = require('../../src/lib/prisma');
const { signSessionToken } = require('../../src/lib/jwt');
const { resetDb } = require('../helpers/resetDb');

let user;
let cookie;
let reactSkill;
let aiInterest;
let backendRole;

beforeEach(async () => {
  await resetDb();
  user = await prisma.user.create({ data: { email: 'a@kbtu.kz', name: 'A' } });
  cookie = `session=${signSessionToken(user.id)}`;
  reactSkill = await prisma.skill.create({ data: { name: 'React' } });
  aiInterest = await prisma.interest.create({ data: { name: 'AI' } });
  backendRole = await prisma.role.create({ data: { name: 'Backend' } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('PUT /api/profile/skills replaces the skill set', async () => {
  const res = await request(createApp())
    .put('/api/profile/skills')
    .set('Cookie', [cookie])
    .send({ skills: [{ skillId: reactSkill.id, proficiency: 'ADVANCED' }] });

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].skill.name).toBe('React');
  expect(res.body[0].proficiency).toBe('ADVANCED');
});

test('profile skills save both types without changing the catalog and can be replaced independently', async () => {
  const api = request(createApp());
  const save = (data) => api.put('/api/profile/skills').set('Cookie', [cookie]).send(data);
  const getProfile = () => api.get('/api/profile').set('Cookie', [cookie]);

  const saved = await save({
    skills: [],
    customSkills: [
      { name: ' react ', proficiency: 'BEGINNER' },
      { name: '  Prompt Engineering  ', proficiency: 'INTERMEDIATE' },
    ],
  });
  expect(saved.status).toBe(200);
  expect(saved.body.skills).toMatchObject([{ skillId: reactSkill.id, proficiency: 'BEGINNER' }]);
  expect(saved.body.customSkills).toEqual([{ name: 'Prompt Engineering', proficiency: 'INTERMEDIATE' }]);
  const profile = await getProfile();
  expect(profile.body.skills).toMatchObject([{ skillId: reactSkill.id, proficiency: 'BEGINNER' }]);
  expect(profile.body.customSkills).toEqual([{ name: 'Prompt Engineering', proficiency: 'INTERMEDIATE' }]);

  const catalog = await api.get('/api/lookups/skills').set('Cookie', [cookie]);
  expect(catalog.body).toEqual([reactSkill]);

  const legacy = await save({ skills: [{ skillId: reactSkill.id, proficiency: 'ADVANCED' }] });
  expect(legacy.status).toBe(200);
  expect(legacy.body).toHaveLength(1);
  expect((await getProfile()).body.customSkills).toEqual(profile.body.customSkills);

  const edited = await save({
    skills: [],
    customSkills: [{ name: 'Prompt Engineering', proficiency: 'ADVANCED' }],
  });
  expect(edited.status).toBe(200);
  const after = await getProfile();
  expect(after.body.skills).toEqual([]);
  expect(after.body.customSkills).toEqual([{ name: 'Prompt Engineering', proficiency: 'ADVANCED' }]);
});

test('blank and duplicate skill names are rejected without replacing the saved profile', async () => {
  const api = request(createApp());
  const save = (data) => api.put('/api/profile/skills').set('Cookie', [cookie]).send(data);
  const catalogSkills = [{ skillId: reactSkill.id, proficiency: 'BEGINNER' }];
  expect((await save({ skills: catalogSkills })).status).toBe(200);

  expect((await save({ skills: [], customSkills: [{ name: '  ', proficiency: 'ADVANCED' }] })).status).toBe(400);
  const duplicateCatalog = await save({
    skills: catalogSkills,
    customSkills: [{ name: ' REACT ', proficiency: 'ADVANCED' }],
  });
  expect(duplicateCatalog.status).toBe(409);
  const duplicateCustom = await save({
    skills: [],
    customSkills: [
      { name: 'Prompt Engineering', proficiency: 'BEGINNER' },
      { name: ' prompt engineering ', proficiency: 'ADVANCED' },
    ],
  });
  expect(duplicateCustom.status).toBe(409);
  const unchanged = await api.get('/api/profile').set('Cookie', [cookie]);
  expect(unchanged.body.skills).toMatchObject(catalogSkills);
  expect(unchanged.body.customSkills).toEqual([]);
});

test('PUT /api/profile/interests replaces the interest set', async () => {
  const res = await request(createApp())
    .put('/api/profile/interests')
    .set('Cookie', [cookie])
    .send({ interests: [aiInterest.id] });

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].interest.name).toBe('AI');
});

test('PUT /api/profile/preferred-roles replaces the preferred role set', async () => {
  const res = await request(createApp())
    .put('/api/profile/preferred-roles')
    .set('Cookie', [cookie])
    .send({ roles: [backendRole.id] });

  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].role.name).toBe('Backend');
});

test.each([
  ['interests', 'interests', 'customInterests', 'interests', 'AI', 'Space Robotics'],
  ['preferred-roles', 'roles', 'customRoles', 'preferredRoles', 'Backend', 'Mission Planner'],
])('PUT /api/profile/%s persists custom and catalog values separately', async (path, catalogKey, customKey, profileKey, catalogName, customName) => {
  const api = request(createApp());
  const value = catalogKey === 'interests' ? aiInterest : backendRole;
  const save = (data) => api.put(`/api/profile/${path}`).set('Cookie', [cookie]).send(data);
  const profile = () => api.get('/api/profile').set('Cookie', [cookie]);
  const saved = await save({ [catalogKey]: [value.id], [customKey]: [`  ${customName}  `] });
  expect(saved.status).toBe(200);
  expect((await profile()).body[customKey]).toEqual([{ name: customName }]);
  expect((await profile()).body[profileKey]).toHaveLength(1);

  const catalog = await api.get(`/api/lookups/${catalogKey}`).set('Cookie', [cookie]);
  expect(catalog.body.map((row) => row.name)).toEqual([catalogName]);
  expect((await save({ [catalogKey]: [value.id] })).body).toHaveLength(1);
  expect((await profile()).body[customKey]).toEqual([{ name: customName }]);
  expect((await save({ [catalogKey]: [], [customKey]: [customName, customName.toLowerCase()] })).status).toBe(409);

  expect((await save({ [catalogKey]: [value.id], [customKey]: [] })).status).toBe(200);
  const after = (await profile()).body;
  expect(after[customKey]).toEqual([]);
  expect(after[profileKey]).toHaveLength(1);
});

test('POST /api/profile/complete marks the profile complete', async () => {
  const res = await request(createApp()).post('/api/profile/complete').set('Cookie', [cookie]);
  expect(res.status).toBe(200);
  expect(res.body.profileComplete).toBe(true);
});
