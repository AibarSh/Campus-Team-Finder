const { prisma } = require('../src/lib/prisma');
const { resetDb } = require('./helpers/resetDb');

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test('can create and read a Skill row against the test database', async () => {
  await prisma.skill.create({ data: { name: 'React' } });
  const skills = await prisma.skill.findMany();
  expect(skills).toHaveLength(1);
  expect(skills[0].name).toBe('React');
});
