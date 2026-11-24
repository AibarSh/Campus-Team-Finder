const { prisma } = require('../lib/prisma');
const { AppError } = require('../errors');
const { FACULTIES } = require('../lib/profileOptions');
const {
  preferredRoleFields, requiredSkillFields, normalizeName, skillNames, scoreRole, compareRoleScores,
} = require('../lib/recruitmentMatching');

const roleDetails = { role: true, requiredSkills: requiredSkillFields };
const recruitingRoles = () => ({
  recruitmentClosed: false,
  slotsFilled: { lt: prisma.teamOpenRole.fields.slotsTotal },
});

function assertTeamRecruiting(status) {
  if (status === 'CLOSED') throw new AppError(409, 'Recruitment is closed for this team');
  if (status !== 'PUBLISHED') throw new AppError(409, 'Publish the team before recruiting');
}

function assertRoleRecruiting(role) {
  if (role.recruitmentClosed) throw new AppError(409, 'Recruitment is closed for this role');
  if (role.slotsFilled >= role.slotsTotal) throw new AppError(409, 'This role has no open slots left');
}

async function requireTeamOwner(teamId, userId, db = prisma) {
  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team) throw new AppError(404, 'Team not found');
  if (team.creatorId !== userId) throw new AppError(403, 'Only the team creator can do this');
  return team;
}

async function lockTeam(tx, teamId) {
  await tx.$queryRaw`SELECT "id" FROM "Team" WHERE "id" = ${teamId} FOR UPDATE`;
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
    const { id } = req.params;
    const { name, eventTarget, description, roles } = req.body;
    for (const value of [eventTarget, description]) {
      if (value !== undefined && value !== null && typeof value !== 'string') {
        throw new AppError(400, 'Event and description must be text or null');
      }
    }
    const updates = roles === undefined ? [] : parseRoles(roles);
    const team = await prisma.$transaction(async (tx) => {
      await lockTeam(tx, id);
      const current = await requireTeamOwner(id, req.user.id, tx);
      const data = { eventTarget, description };
      if (current.status === 'DRAFT') {
        if (typeof name !== 'string' || !name.trim()) throw new AppError(400, 'name is required');
        data.name = name;
      } else if (current.status === 'PUBLISHED') {
        if (name !== undefined && name !== current.name) throw new AppError(409, 'The published team name cannot be changed');
        if (updates.length) await updatePublishedRoles(tx, id, updates);
      } else {
        throw new AppError(409, 'This team cannot be edited');
      }
      return tx.team.update({
        where: { id },
        data,
        include: { creator: true, openRoles: { include: roleDetails } },
      });
    });
    res.json(team);
  } catch (err) {
    next(err);
  }
}

function parseRoles(roles) {
  if (!Array.isArray(roles)) throw new AppError(400, 'roles must be an array');
  const seenRoleIds = new Set();
  return roles.map((r) => {
    if (!r || typeof r.roleId !== 'string' || !r.roleId) {
      throw new AppError(400, 'roleId is required');
    }
    if (!Number.isInteger(r.slotsTotal) || r.slotsTotal <= 0 || r.slotsTotal > 2147483647) {
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
}

async function saveRole(tx, teamId, role) {
  const { roleId, slotsTotal, requiredSkills } = role;
  const openRole = await tx.teamOpenRole.upsert({
    where: { teamId_roleId: { teamId, roleId } },
    update: { slotsTotal },
    create: { teamId, roleId, slotsTotal },
  });
  if (requiredSkills === undefined) return;
  await tx.teamOpenRoleRequiredSkill.deleteMany({ where: { teamOpenRoleId: openRole.id } });
  if (requiredSkills.length) {
    await tx.teamOpenRoleRequiredSkill.createMany({
      data: requiredSkills.map((skill) => ({ ...skill, teamOpenRoleId: openRole.id })),
    });
  }
}

async function updatePublishedRoles(tx, teamId, updates) {
  // Seat claims also write these rows, so a stale edit reads the latest occupancy.
  await tx.$queryRaw`SELECT "id" FROM "TeamOpenRole" WHERE "teamId" = ${teamId} ORDER BY "id" FOR UPDATE`;
  const existing = await tx.teamOpenRole.findMany({ where: { teamId }, include: roleDetails });
  const byRoleId = new Map(existing.map((role) => [role.roleId, role]));
  const roleIds = updates.map(({ roleId }) => roleId);
  if (await tx.role.count({ where: { id: { in: roleIds } } }) !== roleIds.length) {
    throw new AppError(400, 'Select a valid role');
  }
  for (const update of updates) {
    const current = byRoleId.get(update.roleId);
    if (current && current.slotsFilled >= current.slotsTotal) {
      const sameSkills = update.requiredSkills === undefined || (
        update.requiredSkills.length === current.requiredSkills.length
        && update.requiredSkills.every((skill) => current.requiredSkills.some(({ name }) => name === skill.name))
      );
      if (update.slotsTotal !== current.slotsTotal || !sameSkills) {
        throw new AppError(409, `${current.role.name} is full and cannot be edited`);
      }
      continue;
    }
    if (current && update.slotsTotal < current.slotsFilled) {
      throw new AppError(409, `${current.role.name} needs at least ${current.slotsFilled} slots for its current members`);
    }
    await saveRole(tx, teamId, update);
  }
}

async function setOpenRoles(req, res, next) {
  try {
    const id = req.params.id;
    const updates = parseRoles(req.body.roles);
    if (!updates.length) throw new AppError(400, 'Add at least one role');
    const updated = await prisma.$transaction(async (tx) => {
      await lockTeam(tx, id);
      const team = await requireTeamOwner(id, req.user.id, tx);
      if (team.status !== 'DRAFT') throw new AppError(409, 'Use Edit Team to manage published roles');
      await tx.teamOpenRole.deleteMany({
        where: { teamId: id, roleId: { notIn: updates.map(({ roleId }) => roleId) } },
      });

      for (const role of updates) await saveRole(tx, id, role);
      return tx.teamOpenRole.findMany({ where: { teamId: id }, include: roleDetails });
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function publishTeam(req, res, next) {
  try {
    const id = req.params.id;
    const updated = await prisma.$transaction(async (tx) => {
      await lockTeam(tx, id);
      const team = await requireTeamOwner(id, req.user.id, tx);
      if (team.status === 'PUBLISHED') return team;
      if (team.status !== 'DRAFT') throw new AppError(409, 'Only draft teams can be published');
      const openRoleCount = await tx.teamOpenRole.count({ where: { teamId: id } });
      if (!openRoleCount) throw new AppError(400, 'Add at least one open role before publishing');
      return tx.team.update({ where: { id }, data: { status: 'PUBLISHED' } });
    });
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
            ...recruitingRoles(),
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
        where: { status: 'PUBLISHED', creatorId: { not: req.user.id }, openRoles: { some: recruitingRoles() } },
        include: { creator: true, openRoles: { include: roleDetails } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
    const names = skillNames(profile);
    const matches = teams
      .map((team) => {
        const eligibleRoles = team.openRoles.filter((role) => !role.recruitmentClosed && role.slotsFilled < role.slotsTotal);
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

async function requireRecruitingRole(tx, teamId, roleId) {
  // Hold the team and role locks through submission so neither can close between the check and insert.
  const [team] = await tx.$queryRaw`SELECT "status" FROM "Team" WHERE "id" = ${teamId} FOR SHARE`;
  if (!team) throw new AppError(404, 'Team not found');
  const [role] = await tx.$queryRaw`
    SELECT "slotsFilled", "slotsTotal", "recruitmentClosed" FROM "TeamOpenRole"
    WHERE "id" = ${roleId} AND "teamId" = ${teamId}
    FOR UPDATE
  `;
  if (!role) throw new AppError(404, 'Role not found on this team');
  assertTeamRecruiting(team.status);
  assertRoleRecruiting(role);
}

async function closeRecruitment(req, res, next) {
  try {
    const { id, roleId } = req.params;
    const updated = await prisma.$transaction(async (tx) => {
      await lockTeam(tx, id);
      const team = await requireTeamOwner(id, req.user.id, tx);
      if (roleId) {
        const role = await tx.teamOpenRole.findUnique({ where: { id: roleId, teamId: id } });
        if (!role) throw new AppError(404, 'Role not found on this team');
        if (team.status !== 'CLOSED' && !role.recruitmentClosed) {
          assertTeamRecruiting(team.status);
          const closed = await tx.teamOpenRole.updateMany({
            where: { id: roleId, slotsFilled: { lt: tx.teamOpenRole.fields.slotsTotal } },
            data: { recruitmentClosed: true },
          });
          if (!closed.count) throw new AppError(409, 'This role has no open slots left');
        }
      } else if (team.status !== 'CLOSED') {
        assertTeamRecruiting(team.status);
        await tx.team.update({ where: { id }, data: { status: 'CLOSED' } });
      }
      return tx.team.findUnique({ where: { id }, include: { creator: true, openRoles: { include: roleDetails } } });
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function applyToRole(req, res, next) {
  try {
    const { id: teamId, roleId: teamOpenRoleId } = req.params;
    const userId = req.user.id;
    const application = await prisma.$transaction(async (tx) => {
      await requireRecruitingRole(tx, teamId, teamOpenRoleId);
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
      await requireRecruitingRole(tx, team.id, teamOpenRoleId);
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
  assertTeamRecruiting,
  assertRoleRecruiting,
  createTeam,
  updateTeam,
  setOpenRoles,
  publishTeam,
  listMyTeams,
  listTeams,
  recommendTeams,
  closeRecruitment,
  getTeam,
  applyToRole,
  listTeamApplications,
  inviteUser,
};
