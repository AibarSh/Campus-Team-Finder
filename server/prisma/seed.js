const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SKILLS = ['React', 'Node.js', 'Python', 'Figma', 'Flutter', 'Go'];
const INTERESTS = ['AI', 'Web', 'GameDev', 'Mobile', 'Data Science'];
const ROLES = ['Frontend', 'Backend', 'PM', 'UI/UX'];

async function main() {
  for (const name of SKILLS) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of INTERESTS) {
    await prisma.interest.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of ROLES) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
