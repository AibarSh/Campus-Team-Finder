const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Central fetch wrapper enforcing JSON & cookie delivery
async function apiFetch(endpoint, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    // CRITICAL: Required for sending and receiving HTTP-only cookies
    credentials: 'include',
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  // Return empty object for 204 No Content
  if (response.status === 204) return {};
  return response.json();
}

// Flow 1 — Auth API
export const authApi = {
  loginWithGoogle: (idToken) =>
    apiFetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  logout: () =>
    apiFetch('/api/auth/logout', {
      method: 'POST',
    }),

  getCurrentUser: () => apiFetch('/api/auth/me'),
};

// Flow 2 — Profile Setup API
export const profileApi = {
  getProfile: () => apiFetch('/api/profile'),

  updateProfile: (data) =>
    apiFetch('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateSkills: (skills) =>
    apiFetch('/api/profile/skills', {
      method: 'PUT',
      body: JSON.stringify(skills), // [{ skillId, proficiency }]
    }),

  updateInterests: (interestIds) =>
    apiFetch('/api/profile/interests', {
      method: 'PUT',
      body: JSON.stringify(interestIds), // [interestId]
    }),

  updatePreferredRoles: (roleIds) =>
    apiFetch('/api/profile/preferred-roles', {
      method: 'PUT',
      body: JSON.stringify(roleIds), // [roleId]
    }),

  completeProfile: () =>
    apiFetch('/api/profile/complete', {
      method: 'POST',
    }),
};

// Flow 2 (Lookups) API
export const lookupApi = {
  getSkills: () => apiFetch('/api/lookups/skills'),
  getInterests: () => apiFetch('/api/lookups/interests'),
  getRoles: () => apiFetch('/api/lookups/roles'),
};

// Flow 3 — Find a Team API
export const teamApi = {
  getTeams: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.skill) params.append('skill', filters.skill);
    if (filters.faculty) params.append('faculty', filters.faculty);
    if (filters.format) params.append('format', filters.format);
    const queryString = params.toString();
    return apiFetch(`/api/teams${queryString ? `?${queryString}` : ''}`);
  },

  getTeamById: (id) => apiFetch(`/api/teams/${id}`),

  applyToRole: (teamId, roleId) =>
    apiFetch(`/api/teams/${teamId}/roles/${roleId}/apply`, {
      method: 'POST',
    }),

  getMyApplications: () => apiFetch('/api/applications/mine'),
};

// Flow 4 — Create & Manage Team API
export const teamManagementApi = {
  createTeam: (teamData) =>
    apiFetch('/api/teams', {
      method: 'POST',
      body: JSON.stringify(teamData),
    }),

  setOpenRoles: (teamId, roles) =>
    apiFetch(`/api/teams/${teamId}/roles`, {
      method: 'PUT',
      body: JSON.stringify(roles), // [{ roleId, slotsTotal }]
    }),

  publishTeam: (teamId) =>
    apiFetch(`/api/teams/${teamId}/publish`, {
      method: 'POST',
    }),

  getTeamApplications: (teamId) => apiFetch(`/api/teams/${teamId}/applications`),

  inviteUser: (teamId, userId) =>
    apiFetch(`/api/teams/${teamId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  respondToApplication: (applicationId, status) =>
    apiFetch(`/api/applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }), // ACCEPTED | DECLINED
    }),

  getMyCreatedTeams: () => apiFetch('/api/teams/mine'),
};