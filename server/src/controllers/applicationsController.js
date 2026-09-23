const { prisma } = require('../lib/prisma');

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

module.exports = { listMyApplications };
