import { useEffect, useState } from 'react';
import { teamManagementApi, userApi } from '../services/api';
import { displayName } from '../lib/names';
import { hasVacancies } from '../lib/teamAvailability';

export default function InvitePanel({ team, onInvited, onAvailabilityChanged }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [roleByUser, setRoleByUser] = useState({});
  const [busyUserId, setBusyUserId] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const openRoles = team.openRoles.filter(hasVacancies);
  const canInvite = openRoles.length > 0;

  useEffect(() => {
    if (!canInvite) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      userApi
        .search(query)
        .then((users) => {
          if (cancelled) return;
          setResults(users);
          setSearchError('');
        })
        .catch((err) => {
          if (!cancelled) setSearchError(err.message);
        });
    }, 300);
    return () => {
      clearTimeout(handle);
      cancelled = true;
    };
  }, [query, canInvite]);

  const feedback = inviteError && <p role="alert" className="text-xs text-red-600">{inviteError}</p>;
  if (!canInvite) {
    return (
      <div className="space-y-2">
        {feedback}
        <p className="text-sm text-gray-500">No roles have open slots.</p>
      </div>
    );
  }

  const selectedRole = (userId) => openRoles.find((role) => role.id === roleByUser[userId]) ?? openRoles[0];

  const invite = async (u) => {
    const teamOpenRole = selectedRole(u.id);
    setBusyUserId(u.id);
    setInviteError('');
    try {
      const invitation = await teamManagementApi.inviteUser(team.id, u.id, teamOpenRole.id);
      onInvited({ ...invitation, user: u, teamOpenRole });
    } catch (err) {
      setInviteError(err.message);
      if (err.status === 409) await onAvailabilityChanged();
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-3">
      {feedback}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search students by name, email or skill..."
        aria-label="Search students"
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-600 bg-white"
      />
      {searchError && <p className="text-xs text-red-600">{searchError}</p>}
      {results && results.length === 0 && <p className="text-sm text-gray-500">No users found.</p>}
      {results?.map((u) => (
        <div key={u.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center lg:gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 wrap-anywhere">{displayName(u)}</p>
              <p className="text-xs text-gray-400 wrap-anywhere">
                {[u.faculty, u.studyYear].filter(Boolean).join(' · ') || u.email}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {u.skills.slice(0, 4).map((s) => (
                  <span key={s.skill.id} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-medium rounded-md">
                    {s.skill.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex max-w-full items-center gap-2 lg:shrink-0">
              <select
                value={selectedRole(u.id).id}
                onChange={(e) => setRoleByUser((prev) => ({ ...prev, [u.id]: e.target.value }))}
                aria-label="Role to invite for"
                className="min-w-0 px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
              >
                {openRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.role.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busyUserId !== null}
                onClick={() => invite(u)}
                className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {busyUserId === u.id ? 'Inviting…' : 'Invite'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
