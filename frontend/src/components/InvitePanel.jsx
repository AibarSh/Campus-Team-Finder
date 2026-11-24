import { useEffect, useState } from 'react';
import { teamManagementApi } from '../services/api';
import { displayName } from '../lib/names';
import { hasVacancies } from '../lib/teamAvailability';

export default function InvitePanel({ team, onInvited, onAvailabilityChanged }) {
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState({ roleId: '', page: 1 });
  const [search, setSearch] = useState(null);
  const [busyUserId, setBusyUserId] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const openRoles = team.openRoles.filter(hasVacancies);
  const selectedRole = openRoles.find((role) => role.id === selection.roleId) ?? openRoles[0];
  const teamId = team.id;
  const roleId = selectedRole?.id;
  const page = selection.roleId === roleId ? selection.page : 1;
  const currentSearch = search?.query === query && search?.page === page && search?.roleId === roleId ? search : null;
  const setPage = (nextPage) => setSelection({ roleId, page: nextPage });

  useEffect(() => {
    if (!roleId) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      teamManagementApi
        .getCandidates(teamId, roleId, query, page)
        .then(({ users, hasNext }) => {
          if (!cancelled) setSearch({ query, page, roleId, users, hasNext });
        })
        .catch((err) => {
          if (cancelled) return;
          setSearch({ query, page, roleId, error: err.message });
          if (err.status === 409) onAvailabilityChanged();
        });
    }, 300);
    return () => {
      clearTimeout(handle);
      cancelled = true;
    };
  }, [teamId, roleId, query, page, onAvailabilityChanged]);

  const feedback = inviteError && <p role="alert" className="text-xs text-red-600">{inviteError}</p>;
  if (!selectedRole) {
    return (
      <div className="space-y-2">
        {feedback}
        <p className="text-sm text-gray-500">No roles have open slots.</p>
      </div>
    );
  }

  const invite = async (u) => {
    const teamOpenRole = selectedRole;
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
      <label className="block text-sm font-medium text-slate-700">
        Role to invite for
        <select
          value={roleId}
          disabled={busyUserId !== null}
          onChange={(e) => {
            setSelection({ roleId: e.target.value, page: 1 });
            setInviteError('');
          }}
          className="mt-1 block w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm sm:max-w-xs"
        >
          {openRoles.map((role) => (
            <option key={role.id} value={role.id}>{role.role.name}</option>
          ))}
        </select>
      </label>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder="Search students by name, email or skill..."
        aria-label="Search students"
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-600 bg-white"
      />
      {!currentSearch && <p role="status" className="text-sm text-gray-500">Loading students…</p>}
      {currentSearch?.error && <p role="alert" className="text-xs text-red-600">{currentSearch.error}</p>}
      {currentSearch?.users?.length === 0 && <p className="text-sm text-gray-500">No users found.</p>}
      {(page > 1 || currentSearch?.hasNext) && (
        <nav aria-label="Candidate pages" className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <button
            type="button"
            disabled={page === 1 || !currentSearch}
            onClick={() => setPage(page - 1)}
            className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-50"
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            type="button"
            disabled={!currentSearch?.hasNext}
            onClick={() => setPage(page + 1)}
            className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      )}
      {currentSearch?.users?.map((u) => (
        <div key={u.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
          <div className="flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-center lg:gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 wrap-anywhere">{displayName(u)}</p>
              <p className="text-xs text-gray-400 wrap-anywhere">
                {[u.faculty, u.studyYear].filter(Boolean).join(' · ') || u.email}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {[...new Set([
                  ...u.skills.map((entry) => entry.skill.name),
                  ...u.customSkills.map((entry) => entry.name),
                ])].slice(0, 4).map((name) => (
                  <span key={name} className="max-w-full wrap-anywhere px-2 py-0.5 bg-blue-50 text-blue-600 text-[11px] font-medium rounded-md">
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex max-w-full items-center gap-2 lg:shrink-0">
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
