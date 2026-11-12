const { prisma } = require('../lib/prisma');

async function listSkills(req, res, next) {
  try {
    res.json(await prisma.skill.findMany({ orderBy: { name: 'asc' } }));
  } catch (err) {
    next(err);
  }
}

async function listInterests(req, res, next) {
  try {
    res.json(await prisma.interest.findMany({ orderBy: { name: 'asc' } }));
  } catch (err) {
    next(err);
  }
}

async function listRoles(req, res, next) {
  try {
    res.json(await prisma.role.findMany({ orderBy: { name: 'asc' } }));
  } catch (err) {
    next(err);
  }
}

module.exports = { listSkills, listInterests, listRoles };
