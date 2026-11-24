export const isRoleFull = (role) => role.slotsFilled >= role.slotsTotal;

export function roleAvailabilityStatus(role, teamStatus) {
  if (isRoleFull(role)) return 'FULL';
  if (role.recruitmentClosed || teamStatus === 'CLOSED') return 'RECRUITMENT_CLOSED';
  return null;
}

export const spotsRemaining = (role, teamStatus) =>
  roleAvailabilityStatus(role, teamStatus) ? 0 : role.slotsTotal - role.slotsFilled;

export const hasVacancies = (role, teamStatus) => spotsRemaining(role, teamStatus) > 0;
