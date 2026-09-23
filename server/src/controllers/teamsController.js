const { prisma } = require('../lib/prisma');
const { AppError } = require('../errors');

async function requireTeamOwner(teamId, userId) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new AppError(404, 'Team not found');
  if (team.creatorId !== userId) throw new AppError(403, 'Only the team creator can do this');
  return team;
}

async function createTeam(req, res, next) {
  try {
    const { name, eventTarget, description } = req.body;
    if (!name) throw new AppError(400, 'name is required');

    const team = await prisma.team.create({
      data: { name, eventTarget, description, creatorId: req.user.id },
    });
    res.status(201).json(team);
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

    await prisma.$transaction([
      prisma.teamOpenRole.deleteMany({ where: { teamId: team.id } }),
      prisma.teamOpenRole.createMany({
        data: roles.map((r) => ({ teamId: team.id, roleId: r.roleId, slotsTotal: r.slotsTotal })),
      }),
    ]);

    const updated = await prisma.teamOpenRole.findMany({
      where: { teamId: team.id },
      include: { role: true },
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
      include: { openRoles: { include: { role: true } } },
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
    const teams = await prisma.team.findMany({
      where: {
        status: 'PUBLISHED',
        ...(faculty ? { creator: { faculty } } : {}),
        ...(skill
          ? { openRoles: { some: { role: { name: { contains: skill, mode: 'insensitive' } } } } }
          : {}),
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
      include: { creator: true, openRoles: { include: { role: true } } },
    });
    if (!team) throw new AppError(404, 'Team not found');
    res.json(team);
  } catch (err) {
    next(err);
  }
}

async function applyToRole(req, res, next) {
  try {
    const teamOpenRole = await prisma.teamOpenRole.findFirst({
      where: { id: req.params.roleId, teamId: req.params.id },
    });
    if (!teamOpenRole) throw new AppError(404, 'Role not found on this team');

    const application = await prisma.application.create({
      data: {
        teamId: req.params.id,
        teamOpenRoleId: teamOpenRole.id,
        userId: req.user.id,
        direction: 'APPLICATION',
        status: 'SENT',
      },
    });
    res.status(201).json(application);
  } catch (err) {
    if (err.code === 'P2002') return next(new AppError(409, 'You already applied to this role'));
    next(err);
  }
}

module.exports = {
  requireTeamOwner,
  createTeam,
  setOpenRoles,
  publishTeam,
  listMyTeams,
  listTeams,
  getTeam,
  applyToRole,
};
