const { Proficiency } = require('@prisma/client');
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
const MAX_SKILL_NAME_LENGTH = 200;
const PROFICIENCIES = new Set(Object.values(Proficiency));
const PROFILE_SKILLS = {
  skills: { include: { skill: true } },
  customSkills: { select: { name: true, proficiency: true }, orderBy: { normalizedName: 'asc' } },
};

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
        ...PROFILE_SKILLS,
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
    const { skills, customSkills } = req.body;
    if (!Array.isArray(skills)) throw new AppError(400, 'skills must be an array of { skillId, proficiency }');
    if (customSkills !== undefined && !Array.isArray(customSkills)) {
      throw new AppError(400, 'customSkills must be an array of { name, proficiency }');
    }
    if (skills.some((item) => typeof item?.skillId !== 'string' || !PROFICIENCIES.has(item.proficiency))) {
      throw new AppError(400, 'Invalid skill or proficiency');
    }
    const customEntries = customSkills?.map((item) => {
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      if (!name || name.length > MAX_SKILL_NAME_LENGTH || name.includes('\0')) {
        throw new AppError(400, `Skill name must be 1 to ${MAX_SKILL_NAME_LENGTH} characters`);
      }
      if (!PROFICIENCIES.has(item.proficiency)) throw new AppError(400, 'Invalid skill proficiency');
      return { name, normalizedName: name.toLowerCase(), proficiency: item.proficiency };
    });

    const userId = req.user.id;
    const updated = await prisma.$transaction(async (tx) => {
      // Serialize replacements for the same profile, even when both lists are empty.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
      const catalog = await tx.skill.findMany({
        where: customEntries?.length ? undefined : { id: { in: skills.map((item) => item.skillId) } },
        select: { id: true, name: true },
      });
      const byId = new Map(catalog.map((skill) => [skill.id, skill]));
      const byName = new Map(catalog.map((skill) => [skill.name.trim().toLowerCase(), skill]));
      const seen = new Set();
      const claimName = (name) => {
        if (seen.has(name)) throw new AppError(409, 'You already added this skill');
        seen.add(name);
      };

      const catalogRows = skills.map(({ skillId, proficiency }) => {
        const skill = byId.get(skillId);
        if (!skill) throw new AppError(400, 'Referenced record does not exist');
        claimName(skill.name.trim().toLowerCase());
        return { userId, skillId, proficiency };
      });
      const customRows = [];
      const entries = customEntries ?? await tx.userCustomSkill.findMany({ where: { userId } });
      for (const { name, normalizedName, proficiency } of entries) {
        claimName(normalizedName);
        const skill = byName.get(normalizedName);
        if (skill) {
          catalogRows.push({ userId, skillId: skill.id, proficiency });
        } else {
          customRows.push({ userId, name, normalizedName, proficiency });
        }
      }

      await tx.userSkill.deleteMany({ where: { userId } });
      await tx.userSkill.createMany({ data: catalogRows });
      if (customEntries !== undefined) {
        await tx.userCustomSkill.deleteMany({ where: { userId } });
        await tx.userCustomSkill.createMany({ data: customRows });
      }
      return tx.user.findUniqueOrThrow({ where: { id: userId }, select: PROFILE_SKILLS });
    });
    res.json(customEntries === undefined ? updated.skills : updated);
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
