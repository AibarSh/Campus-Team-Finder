const { prisma } = require('../lib/prisma');
const { AppError } = require('../errors');

const PAGE_SIZE = 10;

const PUBLIC_USER_FIELDS = {
  id: true,
  name: true,
  firstName: true,
  lastName: true,
  email: true,
  faculty: true,
  studyYear: true,
  skills: { select: { proficiency: true, skill: { select: { id: true, name: true } } } },
  customSkills: { select: { name: true } },
};

async function searchUsers(req, res, next) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const requestedPage = req.query.page;
    const paginated = requestedPage !== undefined;
    const page = paginated ? Number(requestedPage) : 1;
    const skip = (page - 1) * PAGE_SIZE;
    if (paginated && (
      typeof requestedPage !== 'string' || !/^[1-9]\d*$/.test(requestedPage) || skip > 2147483647
    )) {
      throw new AppError(400, 'page must be a valid positive integer');
    }
    const contains = { contains: q.replace(/[\\%_]/g, '\\$&'), mode: 'insensitive' };
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
                { customSkills: { some: { name: contains } } },
              ],
            }
          : {}),
      },
      select: PUBLIC_USER_FIELDS,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: paginated ? PAGE_SIZE + 1 : 20,
    });
    res.json(paginated ? { users: users.slice(0, PAGE_SIZE), page, hasNext: users.length > PAGE_SIZE } : users);
  } catch (err) {
    next(err);
  }
}

module.exports = { searchUsers };
