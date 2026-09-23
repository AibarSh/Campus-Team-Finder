const { prisma } = require('../lib/prisma');
const { AppError } = require('../errors');

async function listMyApplications(req, res, next) {
  try {
    const direction = req.query.direction === 'INVITATION' ? 'INVITATION' : 'APPLICATION';
    const applications = await prisma.application.findMany({
      where: { userId: req.user.id, direction },
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
      const current = await tx.application.findUnique({ where: { id: application.id } });
      if (!current || !['SENT', 'VIEWED'].includes(current.status)) {
        throw new AppError(409, 'This application has already been decided');
      }

      if (status === 'ACCEPTED') {
        const role = await tx.teamOpenRole.findUnique({ where: { id: application.teamOpenRoleId } });
        const claim = await tx.teamOpenRole.updateMany({
          where: { id: role.id, slotsFilled: { lt: role.slotsTotal } },
          data: { slotsFilled: { increment: 1 } },
        });
        if (claim.count === 0) {
          throw new AppError(409, 'This role has no open slots left');
        }
      }
      return tx.application.update({ where: { id: application.id }, data: { status } });
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = { listMyApplications, respondToApplication };
