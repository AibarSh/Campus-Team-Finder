export function displayName(user) {
  if (!user) return '';
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || '';
}

export function initials(user) {
  const letters = displayName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
  return letters || '?';
}
