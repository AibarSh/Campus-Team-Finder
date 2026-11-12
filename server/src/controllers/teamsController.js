const { prisma } = require('../lib/prisma');
const { AppError } = require('../errors');
const { FACULTIES } = require('../lib/profileOptions');

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

async function setOpenRoles(req, res, next) {
  try {
    const team = await requireTeamOwner(req.params.id, req.user.id);
    const roles = req.body.roles;
    if (!Array.isArray(roles) || roles.length === 0) {
      throw new AppError(400, 'roles must be a non-empty array of { roleId, slotsTotal }');
    }

    const seenRoleIds = new Set();
    for (const r of roles) {
      if (!Number.isInteger(r.slotsTotal) || r.slotsTotal <= 0) {
        throw new AppError(400, 'slotsTotal must be a positive integer');
      }
      if (seenRoleIds.has(r.roleId)) {
        throw new AppError(400, 'duplicate roleId in roles array');
      }
      seenRoleIds.add(r.roleId);
    }

    await prisma.$transaction(async (tx) => {
      await tx.teamOpenRole.deleteMany({
        where: { teamId: team.id, roleId: { notIn: [...seenRoleIds] } },
      });

      for (const r of roles) {
        await tx.teamOpenRole.upsert({
          where: { teamId_roleId: { teamId: team.id, roleId: r.roleId } },
          update: { slotsTotal: r.slotsTotal },
          create: { teamId: team.id, roleId: r.roleId, slotsTotal: r.slotsTotal },
        });
      }
    });

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
    if (faculty && !FACULTIES.includes(faculty)) throw new AppError(400, 'faculty is not an allowed value');
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
    if (!userId || !teamOpenRoleId) throw new AppError(400, 'userId and teamOpenRoleId are required');

    const team = await requireTeamOwner(req.params.id, req.user.id);
    const teamOpenRole = await prisma.teamOpenRole.findFirst({
      where: { id: teamOpenRoleId, teamId: team.id },
    });
    if (!teamOpenRole) throw new AppError(404, 'Role not found on this team');

    const application = await prisma.application.create({
      data: {
        teamId: team.id,
        teamOpenRoleId: teamOpenRole.id,
        userId,
        direction: 'INVITATION',
        status: 'SENT',
      },
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
  setOpenRoles,
  publishTeam,
  listMyTeams,
  listTeams,
  getTeam,
  applyToRole,
  listTeamApplications,
  inviteUser,
};
