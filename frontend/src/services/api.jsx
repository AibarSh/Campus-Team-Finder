// Local dev talks to the API on port 4000; the deployed build calls /api on its own origin.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:4000' : '');

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
    const error = new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  // Return empty object for 204 No Content
  if (response.status === 204) return {};
  return response.json();
}

// Flow 1 — Auth API
export const authApi = {
  register: (email, password) =>
    apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email, password) =>
    apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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

  updateSkills: (skills, customSkills) =>
    apiFetch('/api/profile/skills', {
      method: 'PUT',
      body: JSON.stringify({ skills, customSkills }),
    }),

  updateInterests: (interestIds, customInterests) =>
    apiFetch('/api/profile/interests', {
      method: 'PUT',
      body: JSON.stringify({ interests: interestIds, customInterests }),
    }),

  updatePreferredRoles: (roleIds, customRoles) =>
    apiFetch('/api/profile/preferred-roles', {
      method: 'PUT',
      body: JSON.stringify({ roles: roleIds, customRoles }),
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
  // server's `skill` param matches open role names
  getTeams: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.q) params.append('q', filters.q);
    if (filters.role) params.append('skill', filters.role);
    if (filters.faculty) params.append('faculty', filters.faculty);
    const queryString = params.toString();
    return apiFetch(`/api/teams${queryString ? `?${queryString}` : ''}`);
  },

  getTeamById: (id) => apiFetch(`/api/teams/${id}`),
  getRecommendations: () => apiFetch('/api/teams/recommended'),

  applyToRole: (teamId, roleId) =>
    apiFetch(`/api/teams/${teamId}/roles/${roleId}/apply`, {
      method: 'POST',
    }),

  getMyApplications: (direction) =>
    apiFetch(`/api/applications/mine${direction === 'INVITATION' ? '?direction=INVITATION' : ''}`),
};

// Flow 4 — Create & Manage Team API
export const teamManagementApi = {
  createTeam: (teamData) =>
    apiFetch('/api/teams', {
      method: 'POST',
      body: JSON.stringify(teamData),
    }),

  updateTeam: (teamId, teamData) =>
    apiFetch(`/api/teams/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify(teamData),
    }),

  setOpenRoles: (teamId, roles) =>
    apiFetch(`/api/teams/${teamId}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roles }),
    }),

  publishTeam: (teamId) =>
    apiFetch(`/api/teams/${teamId}/publish`, {
      method: 'POST',
    }),

  closeRecruitment: (teamId, roleId) =>
    apiFetch(`/api/teams/${teamId}${roleId ? `/roles/${roleId}` : ''}/close-recruitment`, { method: 'POST' }),

  getTeamApplications: (teamId, direction) =>
    apiFetch(`/api/teams/${teamId}/applications${direction === 'INVITATION' ? '?direction=INVITATION' : ''}`),

  inviteUser: (teamId, userId, teamOpenRoleId) =>
    apiFetch(`/api/teams/${teamId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ userId, teamOpenRoleId }),
    }),

  respondToApplication: (applicationId, status) =>
    apiFetch(`/api/applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }), // ACCEPTED | DECLINED
    }),

  getMyCreatedTeams: () => apiFetch('/api/teams/mine'),

  getCandidates: (teamId, roleId, q, page) =>
    apiFetch(`/api/teams/${teamId}/roles/${roleId}/candidates?${new URLSearchParams({ q, page })}`),
};
