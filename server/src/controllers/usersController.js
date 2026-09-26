const { prisma } = require('../lib/prisma');

const PUBLIC_USER_FIELDS = {
  id: true,
  name: true,
  firstName: true,
  lastName: true,
  email: true,
  faculty: true,
  studyYear: true,
  skills: { select: { proficiency: true, skill: { select: { id: true, name: true } } } },
};

async function searchUsers(req, res, next) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const contains = { contains: q, mode: 'insensitive' };
    const users = await prisma.user.findMany({
      where: {
        profileComplete: true,
        id: { not: req.user.id },
        ...(q
          ? {
              OR: [
                { firstName: contains },
                { lastName: contains },
                { name: contains },
                { email: contains },
                { skills: { some: { skill: { name: contains } } } },
              ],
            }
          : {}),
      },
      select: PUBLIC_USER_FIELDS,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

module.exports = { searchUsers };
