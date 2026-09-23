const { prisma } = require('../lib/prisma');
const { AppError } = require('../errors');
const { FACULTIES, STUDY_YEARS, AVAILABILITY } = require('../lib/profileOptions');

const PATCHABLE_FIELDS = [
  'name',
  'avatarUrl',
  'firstName',
  'lastName',
  'bio',
  'faculty',
  'studyYear',
  'availability',
  'githubUrl',
  'linkedinUrl',
  'telegramHandle',
];

const ALLOWED_VALUES = { faculty: FACULTIES, studyYear: STUDY_YEARS, availability: AVAILABILITY };

function validateField(field, value) {
  if (value === null) return;
  if (typeof value !== 'string') throw new AppError(400, `${field} must be a string`);
  const max = field === 'bio' ? 1000 : 200;
  if (value.length > max) throw new AppError(400, `${field} must be at most ${max} characters`);
  if (ALLOWED_VALUES[field] && !ALLOWED_VALUES[field].includes(value)) {
    throw new AppError(400, `${field} is not an allowed value`);
  }
}

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
      if (req.body[field] !== undefined) {
        if (field === 'name' && !req.body.name) throw new AppError(400, 'name cannot be empty');
        validateField(field, req.body[field]);
        data[field] = req.body[field];
      }
    }
    if (data.firstName !== undefined || data.lastName !== undefined) {
      const first = data.firstName !== undefined ? data.firstName : req.user.firstName;
      const last = data.lastName !== undefined ? data.lastName : req.user.lastName;
      const full = [first, last].filter(Boolean).join(' ').trim();
      if (full) data.name = full;
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
