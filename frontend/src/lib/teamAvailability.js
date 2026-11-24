export const spotsRemaining = (role) => Math.max(0, role.slotsTotal - role.slotsFilled);

export const hasVacancies = (role) => spotsRemaining(role) > 0;
