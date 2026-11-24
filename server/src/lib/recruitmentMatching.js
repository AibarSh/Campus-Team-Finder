const preferredRoleFields = {
  preferredRoles: { select: { roleId: true } },
  customRoles: { select: { name: true } },
};

const requiredSkillFields = {
  select: { name: true, normalizedName: true },
  orderBy: { normalizedName: 'asc' },
};

const normalizeName = (name) => name.trim().toLowerCase();

function prefersRole(profile, openRole) {
  return profile.preferredRoles.some(({ roleId }) => roleId === openRole.roleId)
    || profile.customRoles.some(({ name }) => normalizeName(name) === normalizeName(openRole.role.name));
}

function skillNames({ skills, customSkills }) {
  return new Set([
    ...skills.map(({ skill }) => normalizeName(skill.name)),
    ...customSkills.map(({ name }) => normalizeName(name)),
  ]);
}

function countMatchingSkills(names, role) {
  return role.requiredSkills.filter(({ normalizedName }) => names.has(normalizedName)).length;
}

function scoreRole(profile, names, role) {
  const preferred = Number(prefersRole(profile, role));
  const hits = countMatchingSkills(names, role);
  const coverage = hits ? hits / role.requiredSkills.length : 0;
  const tier = coverage === 1 ? 3 : hits ? 2 : preferred;
  return { tier, preferred, coverage, hits };
}

function compareRoleScores(a, b) {
  return b.tier - a.tier || b.preferred - a.preferred || b.coverage - a.coverage || b.hits - a.hits;
}

module.exports = {
  preferredRoleFields, requiredSkillFields, normalizeName, prefersRole,
  skillNames, countMatchingSkills, scoreRole, compareRoleScores,
};
