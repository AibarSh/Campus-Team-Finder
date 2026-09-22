const { prisma } = require('../lib/prisma');

const PATCHABLE_FIELDS = [
  'name',
  'avatarUrl',
  'faculty',
  'studyYear',
  'weeklyHours',
  'githubUrl',
  'linkedinUrl',
  'telegramHandle',
];

async function getProfile(req, res, next) {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        skills: { include: { skill: true } },
        interests: { include: { interest: true } },
        preferredRoles: { include: { role: true } },
      },
    });
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

async function patchProfile(req, res, next) {
  try {
    const data = {};
    for (const field of PATCHABLE_FIELDS) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }
    const updated = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, patchProfile, PATCHABLE_FIELDS };
