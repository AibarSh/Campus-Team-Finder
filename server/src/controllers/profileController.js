const { prisma } = require('../lib/prisma');
const { AppError } = require('../errors');

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

async function putSkills(req, res, next) {
  try {
    const skills = req.body.skills;
    if (!Array.isArray(skills)) throw new AppError(400, 'skills must be an array of { skillId, proficiency }');

    await prisma.$transaction([
      prisma.userSkill.deleteMany({ where: { userId: req.user.id } }),
      prisma.userSkill.createMany({
        data: skills.map((s) => ({ userId: req.user.id, skillId: s.skillId, proficiency: s.proficiency })),
      }),
    ]);
    const updated = await prisma.userSkill.findMany({
      where: { userId: req.user.id },
      include: { skill: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function putInterests(req, res, next) {
  try {
    const interests = req.body.interests;
    if (!Array.isArray(interests)) throw new AppError(400, 'interests must be an array of interestId strings');

    await prisma.$transaction([
      prisma.userInterest.deleteMany({ where: { userId: req.user.id } }),
      prisma.userInterest.createMany({
        data: interests.map((interestId) => ({ userId: req.user.id, interestId })),
      }),
    ]);
    const updated = await prisma.userInterest.findMany({
      where: { userId: req.user.id },
      include: { interest: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function putPreferredRoles(req, res, next) {
  try {
    const roles = req.body.roles;
    if (!Array.isArray(roles)) throw new AppError(400, 'roles must be an array of roleId strings');

    await prisma.$transaction([
      prisma.userPreferredRole.deleteMany({ where: { userId: req.user.id } }),
      prisma.userPreferredRole.createMany({
        data: roles.map((roleId) => ({ userId: req.user.id, roleId })),
      }),
    ]);
    const updated = await prisma.userPreferredRole.findMany({
      where: { userId: req.user.id },
      include: { role: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function completeProfile(req, res, next) {
  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { profileComplete: true },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  patchProfile,
  putSkills,
  putInterests,
  putPreferredRoles,
  completeProfile,
  PATCHABLE_FIELDS,
};
