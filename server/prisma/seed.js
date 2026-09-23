const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'Java',
  'C++', 'Kotlin', 'Figma', 'SQL', 'MongoDB', 'Docker',
  'TensorFlow', 'Flutter',
];
const INTERESTS = [
  'Artificial Intelligence', 'Web Development', 'Mobile Development', 'Game Development',
  'Data Science', 'Blockchain / Web3', 'IoT & Embedded', 'Cybersecurity',
  'UI/UX Design', 'Cloud Computing',
];
const ROLES = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'UI/UX Designer',
  'ML Engineer', 'Data Scientist', 'Mobile Developer', 'DevOps Engineer',
  'Project Manager', 'QA Engineer',
];

// ponytail: demo data so Browse Teams isn't empty until the Create Team page exists
const DEMO_TEAMS = [
  {
    name: 'AI Study Buddy',
    eventTarget: 'KBTU Hackathon 2026',
    description: 'An AI assistant that turns lecture notes into flashcards and quizzes.',
    roles: [['ML Engineer', 1], ['Frontend Developer', 1]],
  },
  {
    name: 'Campus Eats',
    eventTarget: 'Startup Weekend Almaty',
    description: 'Pre-order canteen food and skip the queue between classes.',
    roles: [['Mobile Developer', 2], ['Backend Developer', 1], ['UI/UX Designer', 1]],
  },
  {
    name: 'GreenGrid',
    eventTarget: 'Energy Hack',
    description: 'Dashboard for tracking dorm electricity usage and nudging savings.',
    roles: [['Data Scientist', 1]],
  },
];

async function upsertNames(model, names) {
  for (const name of names) {
    await model.upsert({ where: { name }, update: {}, create: { name } });
  }
}

async function seedDemoTeams() {
  const demo = await prisma.user.upsert({
    where: { googleId: 'dev:demo@kbtu.kz' },
    update: {},
    create: {
      googleId: 'dev:demo@kbtu.kz',
      email: 'demo@kbtu.kz',
      name: 'Demo Student',
      firstName: 'Demo',
      lastName: 'Student',
      profileComplete: true,
    },
  });

  for (const t of DEMO_TEAMS) {
    const exists = await prisma.team.findFirst({ where: { name: t.name, creatorId: demo.id } });
    if (exists) continue;
    const roles = await Promise.all(t.roles.map(([name]) => prisma.role.findUnique({ where: { name } })));
    await prisma.team.create({
      data: {
        name: t.name,
        eventTarget: t.eventTarget,
        description: t.description,
        status: 'PUBLISHED',
        creatorId: demo.id,
        openRoles: {
          create: t.roles.map(([, slotsTotal], i) => ({ roleId: roles[i].id, slotsTotal })),
        },
      },
    });
  }
}

async function main() {
  await upsertNames(prisma.skill, SKILLS);
  await upsertNames(prisma.interest, INTERESTS);
  await upsertNames(prisma.role, ROLES);
  await seedDemoTeams();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
