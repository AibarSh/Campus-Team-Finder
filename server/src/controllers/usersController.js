const { prisma } = require('../lib/prisma');
const { AppError } = require('../errors');
const { requireTeamOwner } = require('./teamsController');
const { preferredRoleFields, prefersRole } = require('../lib/recruitmentMatching');

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
    let openRole;
    if (req.params.roleId !== undefined) {
      await requireTeamOwner(req.params.id, req.user.id);
      openRole = await prisma.teamOpenRole.findUnique({
        where: { id: req.params.roleId, teamId: req.params.id },
        include: { role: true },
      });
      if (!openRole) throw new AppError(404, 'Role not found on this team');
      if (openRole.slotsFilled >= openRole.slotsTotal) throw new AppError(409, 'This role has no open slots left');
    }
    const limit = paginated ? PAGE_SIZE + 1 : 20;
    let users = await prisma.user.findMany({
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
      select: openRole ? { ...PUBLIC_USER_FIELDS, ...preferredRoleFields } : PUBLIC_USER_FIELDS,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(openRole ? {} : { skip, take: limit }),
    });
    if (openRole) {
      users = users
        .map((user) => ({ user, preferred: prefersRole(user, openRole) }))
        .sort((a, b) => Number(b.preferred) - Number(a.preferred))
        .slice(skip, skip + limit)
        .map(({ user: { preferredRoles, customRoles, ...user } }) => user);
    }
    res.json(paginated ? { users: users.slice(0, PAGE_SIZE), page, hasNext: users.length > PAGE_SIZE } : users);
  } catch (err) {
    next(err);
  }
}

module.exports = { searchUsers };
