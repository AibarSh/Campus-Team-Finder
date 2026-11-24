export const statusLabel = (status) => status === 'RECRUITMENT_CLOSED'
  ? 'Recruitment closed'
  : status.charAt(0) + status.slice(1).toLowerCase();
