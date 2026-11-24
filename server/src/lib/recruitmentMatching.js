const preferredRoleFields = {
  preferredRoles: { select: { roleId: true } },
  customRoles: { select: { name: true } },
};

const normalizeName = (name) => name.trim().toLowerCase();

function prefersRole(profile, openRole) {
  return profile.preferredRoles.some(({ roleId }) => roleId === openRole.roleId)
    || profile.customRoles.some(({ name }) => normalizeName(name) === normalizeName(openRole.role.name));
}

module.exports = { preferredRoleFields, normalizeName, prefersRole };
