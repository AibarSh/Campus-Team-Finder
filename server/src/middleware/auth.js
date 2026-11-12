const { verifySessionToken } = require('../lib/jwt');
const { prisma } = require('../lib/prisma');
const { AppError } = require('../errors');

async function authRequired(req, res, next) {
  try {
    const token = req.cookies && req.cookies.session;
    if (!token) throw new AppError(401, 'Not authenticated');

    let userId;
    try {
      userId = verifySessionToken(token);
    } catch {
      throw new AppError(401, 'Not authenticated');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(401, 'Not authenticated');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function profileRequired(req, res, next) {
  if (!req.user.profileComplete) {
    return next(new AppError(403, 'Profile setup required'));
  }
  next();
}

module.exports = { authRequired, profileRequired };
