const { prisma } = require('../lib/prisma');
const { AppError } = require('../errors');

async function listMyApplications(req, res, next) {
  try {
    const applications = await prisma.application.findMany({
      where: { userId: req.user.id, direction: 'APPLICATION' },
      include: { team: true, teamOpenRole: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(applications);
  } catch (err) {
    next(err);
  }
}

async function respondToApplication(req, res, next) {
  try {
    const { status } = req.body;
    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      throw new AppError(400, 'status must be ACCEPTED or DECLINED');
    }

    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { team: true },
    });
    if (!application) throw new AppError(404, 'Application not found');

    const isTeamOwner = application.team.creatorId === req.user.id;
    const isTargetUser = application.userId === req.user.id;
    if (application.direction === 'APPLICATION' && !isTeamOwner) {
      throw new AppError(403, 'Only the team creator can decide on this application');
    }
    if (application.direction === 'INVITATION' && !isTargetUser) {
      throw new AppError(403, 'Only the invited user can respond to this invitation');
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (status === 'ACCEPTED') {
        const role = await tx.teamOpenRole.findUnique({ where: { id: application.teamOpenRoleId } });
        if (role.slotsFilled >= role.slotsTotal) {
          throw new AppError(409, 'This role has no open slots left');
        }
        await tx.teamOpenRole.update({ where: { id: role.id }, data: { slotsFilled: { increment: 1 } } });
      }
      return tx.application.update({ where: { id: application.id }, data: { status } });
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = { listMyApplications, respondToApplication };
