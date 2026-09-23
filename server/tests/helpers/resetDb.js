const { prisma } = require('../../src/lib/prisma');

async function resetDb() {
  if (!/_test$/.test(process.env.DATABASE_URL || '')) {
    throw new Error('refusing to reset a non-test database');
  }
  await prisma.application.deleteMany();
  await prisma.teamOpenRole.deleteMany();
  await prisma.team.deleteMany();
  await prisma.userPreferredRole.deleteMany();
  await prisma.userInterest.deleteMany();
  await prisma.userSkill.deleteMany();
  await prisma.role.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.user.deleteMany();
}

module.exports = { resetDb };
