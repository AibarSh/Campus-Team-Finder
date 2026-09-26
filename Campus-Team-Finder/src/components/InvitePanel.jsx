import { useEffect, useState } from 'react';
import { teamManagementApi, userApi } from '../services/api';
import { displayName } from '../lib/names';

export default function InvitePanel({ team, onInvited }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [roleByUser, setRoleByUser] = useState({});
  const [busyUserId, setBusyUserId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});

  useEffect(() => {
    const handle = setTimeout(() => {
      userApi
        .search(query)
        .then((users) => {
          setResults(users);
          setSearchError('');
        })
        .catch((err) => setSearchError(err.message));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  if (team.openRoles.length === 0) {
    return <p className="text-sm text-gray-500">Add open roles before inviting people.</p>;
  }

  const invite = async (u) => {
    const teamOpenRoleId = roleByUser[u.id] || team.openRoles[0].id;
    setBusyUserId(u.id);
    setRowErrors((prev) => ({ ...prev, [u.id]: '' }));
    try {
      const invitation = await teamManagementApi.inviteUser(team.id, u.id, teamOpenRoleId);
      onInvited({ ...invitation, user: u, teamOpenRole: team.openRoles.find((r) => r.id === teamOpenRoleId) });
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [u.id]: err.message }));
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-3">
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
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{displayName(u)}</p>
              <p className="text-xs text-gray-400 truncate">
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
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={roleByUser[u.id] || team.openRoles[0].id}
                onChange={(e) => setRoleByUser((prev) => ({ ...prev, [u.id]: e.target.value }))}
                aria-label="Role to invite for"
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs bg-white"
              >
                {team.openRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.role.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busyUserId === u.id}
                onClick={() => invite(u)}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                Invite
              </button>
            </div>
          </div>
          {rowErrors[u.id] && <p className="text-xs text-red-600">{rowErrors[u.id]}</p>}
        </div>
      ))}
    </div>
  );
}
