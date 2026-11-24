const { prisma } = require('../lib/prisma');
const { AppError } = require('../errors');
const { FACULTIES } = require('../lib/profileOptions');
const {
  preferredRoleFields, requiredSkillFields, normalizeName, skillNames, scoreRole, compareRoleScores,
} = require('../lib/recruitmentMatching');

const roleDetails = { role: true, requiredSkills: requiredSkillFields };

async function requireTeamOwner(teamId, userId) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new AppError(404, 'Team not found');
  if (team.creatorId !== userId) throw new AppError(403, 'Only the team creator can do this');
  return team;
}

async function createTeam(req, res, next) {
  try {
    const { name, eventTarget, description } = req.body;
    if (!name || !name.trim()) throw new AppError(400, 'name is required');

    const team = await prisma.team.create({
      data: { name, eventTarget, description, creatorId: req.user.id },
    });
    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
}

async function updateTeam(req, res, next) {
  try {
    await requireTeamOwner(req.params.id, req.user.id);
    const { name, eventTarget, description } = req.body;
    if (!name || !name.trim()) throw new AppError(400, 'name is required');

    const team = await prisma.team.update({
      where: { id: req.params.id },
      data: { name, eventTarget, description },
    });
    res.json(team);
  } catch (err) {
    next(err);
  }
}

async function setOpenRoles(req, res, next) {
  try {
    const team = await requireTeamOwner(req.params.id, req.user.id);
    const roles = req.body.roles;
    if (!Array.isArray(roles) || roles.length === 0) {
      throw new AppError(400, 'roles must be a non-empty array of { roleId, slotsTotal }');
    }

    const seenRoleIds = new Set();
    const updates = roles.map((r) => {
      if (!r || typeof r.roleId !== 'string' || !r.roleId) {
        throw new AppError(400, 'roleId is required');
      }
      if (!Number.isInteger(r.slotsTotal) || r.slotsTotal <= 0) {
        throw new AppError(400, 'slotsTotal must be a positive integer');
      }
      if (seenRoleIds.has(r.roleId)) {
        throw new AppError(400, 'duplicate roleId in roles array');
      }
      seenRoleIds.add(r.roleId);
      if (r.requiredSkills === undefined) return r;
      if (!Array.isArray(r.requiredSkills)) throw new AppError(400, 'requiredSkills must be an array of names');
      const requiredSkills = new Map();
      for (const value of r.requiredSkills) {
        if (typeof value !== 'string' || !value.trim() || value.trim().length > 200) {
          throw new AppError(400, 'Each required skill must have a name between 1 and 200 characters');
        }
        const name = value.trim();
        const normalizedName = normalizeName(name);
        if (!requiredSkills.has(normalizedName)) requiredSkills.set(normalizedName, { name, normalizedName });
      }
      return { ...r, requiredSkills: [...requiredSkills.values()] };
    });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.teamOpenRole.deleteMany({
        where: { teamId: team.id, roleId: { notIn: [...seenRoleIds] } },
      });

      for (const r of updates) {
        const openRole = await tx.teamOpenRole.upsert({
          where: { teamId_roleId: { teamId: team.id, roleId: r.roleId } },
          update: { slotsTotal: r.slotsTotal },
          create: { teamId: team.id, roleId: r.roleId, slotsTotal: r.slotsTotal },
        });
        if (r.requiredSkills !== undefined) {
          await tx.teamOpenRoleRequiredSkill.deleteMany({ where: { teamOpenRoleId: openRole.id } });
          if (r.requiredSkills.length) {
            await tx.teamOpenRoleRequiredSkill.createMany({
              data: r.requiredSkills.map((skill) => ({ ...skill, teamOpenRoleId: openRole.id })),
            });
          }
        }
      }
      return tx.teamOpenRole.findMany({ where: { teamId: team.id }, include: roleDetails });
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function publishTeam(req, res, next) {
  try {
    const team = await requireTeamOwner(req.params.id, req.user.id);
    const openRoleCount = await prisma.teamOpenRole.count({ where: { teamId: team.id } });
    if (openRoleCount === 0) {
      throw new AppError(400, 'Add at least one open role before publishing');
    }
    const updated = await prisma.team.update({ where: { id: team.id }, data: { status: 'PUBLISHED' } });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function listMyTeams(req, res, next) {
  try {
    const teams = await prisma.team.findMany({
      where: { creatorId: req.user.id },
      include: { openRoles: { include: { role: true, applications: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(teams);
  } catch (err) {
    next(err);
  }
}

async function listTeams(req, res, next) {
  try {
    const { skill, faculty } = req.query;
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const textMatch = { contains: query.replace(/[\\%_]/g, '\\$&'), mode: 'insensitive' };
    if (faculty && !FACULTIES.includes(faculty)) throw new AppError(400, 'faculty is not an allowed value');
    const teams = await prisma.team.findMany({
      where: {
        status: 'PUBLISHED',
        ...(faculty ? { creator: { faculty } } : {}),
        ...(query ? { OR: [{ name: textMatch }, { description: textMatch }] } : {}),
        openRoles: {
          some: {
            slotsFilled: { lt: prisma.teamOpenRole.fields.slotsTotal },
            ...(skill ? { role: { name: { contains: skill, mode: 'insensitive' } } } : {}),
          },
        },
      },
      include: { creator: true, openRoles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(teams);
  } catch (err) {
    next(err);
  }
}

async function getTeam(req, res, next) {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: { creator: true, openRoles: { include: roleDetails } },
    });
    if (!team) throw new AppError(404, 'Team not found');
    res.json(team);
  } catch (err) {
    next(err);
  }
}

async function recommendTeams(req, res, next) {
  try {
    const vacancies = { slotsFilled: { lt: prisma.teamOpenRole.fields.slotsTotal } };
    const [profile, teams] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: req.user.id },
        select: {
          ...preferredRoleFields,
          skills: { select: { skill: { select: { name: true } } } },
          customSkills: { select: { name: true } },
        },
      }),
      prisma.team.findMany({
        where: { status: 'PUBLISHED', creatorId: { not: req.user.id }, openRoles: { some: vacancies } },
        include: { creator: true, openRoles: { include: roleDetails } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
    const names = skillNames(profile);
    const matches = teams
      .map((team) => {
        const eligibleRoles = team.openRoles.filter((role) => role.slotsFilled < role.slotsTotal);
        const best = eligibleRoles.map((role) => scoreRole(profile, names, role)).sort(compareRoleScores)[0];
        return { team, best };
      })
      .filter(({ best }) => best?.tier > 0)
      .sort((a, b) => compareRoleScores(a.best, b.best));
    const recommended = matches.length ? matches.slice(0, 2).map(({ team }) => team) : teams.slice(0, 2);
    res.json({ personalized: matches.length > 0, teams: recommended });
  } catch (err) {
    next(err);
  }
}

async function requireVacantRole(tx, teamId, roleId) {
  // Serialize the availability check with claims of the same role's seats.
  const [role] = await tx.$queryRaw`
    SELECT "slotsFilled", "slotsTotal" FROM "TeamOpenRole"
    WHERE "id" = ${roleId} AND "teamId" = ${teamId}
    FOR UPDATE
  `;
  if (!role) throw new AppError(404, 'Role not found on this team');
  if (role.slotsFilled >= role.slotsTotal) throw new AppError(409, 'This role has no open slots left');
}

async function applyToRole(req, res, next) {
  try {
    const { id: teamId, roleId: teamOpenRoleId } = req.params;
    const userId = req.user.id;
    const application = await prisma.$transaction(async (tx) => {
      await requireVacantRole(tx, teamId, teamOpenRoleId);
      const declinedInvite = await tx.application.findFirst({
        where: { teamOpenRoleId, userId, direction: 'INVITATION', status: 'DECLINED' },
        select: { id: true },
      });
      if (declinedInvite) throw new AppError(409, 'You already declined an invitation to this role');

      return tx.application.create({ data: { teamId, teamOpenRoleId, userId, direction: 'APPLICATION' } });
    });
    res.status(201).json(application);
  } catch (err) {
    if (err.code === 'P2002') return next(new AppError(409, 'You already applied to this role'));
    next(err);
  }
}

async function listTeamApplications(req, res, next) {
  try {
    await requireTeamOwner(req.params.id, req.user.id);
    const direction = req.query.direction === 'INVITATION' ? 'INVITATION' : 'APPLICATION';
    if (direction === 'APPLICATION') {
      await prisma.application.updateMany({
        where: { teamId: req.params.id, direction, status: 'SENT' },
        data: { status: 'VIEWED' },
      });
    }
    const applications = await prisma.application.findMany({
      where: { teamId: req.params.id, direction },
      include: { user: true, teamOpenRole: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(applications);
  } catch (err) {
    next(err);
  }
}

async function inviteUser(req, res, next) {
  try {
    const { userId, teamOpenRoleId } = req.body;
    if (typeof userId !== 'string' || !userId || typeof teamOpenRoleId !== 'string' || !teamOpenRoleId) {
      throw new AppError(400, 'userId and teamOpenRoleId are required');
    }

    const team = await requireTeamOwner(req.params.id, req.user.id);
    const application = await prisma.$transaction(async (tx) => {
      await requireVacantRole(tx, team.id, teamOpenRoleId);
      return tx.application.create({
        data: { teamId: team.id, teamOpenRoleId, userId, direction: 'INVITATION' },
      });
    });
    res.status(201).json(application);
  } catch (err) {
    if (err.code === 'P2002') return next(new AppError(409, 'This user was already invited to this role'));
    next(err);
  }
}

module.exports = {
  requireTeamOwner,
  createTeam,
  updateTeam,
  setOpenRoles,
  publishTeam,
  listMyTeams,
  listTeams,
  recommendTeams,
  getTeam,
  applyToRole,
  listTeamApplications,
  inviteUser,
};
