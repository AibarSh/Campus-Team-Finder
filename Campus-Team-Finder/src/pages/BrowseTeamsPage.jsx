import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { lookupApi, teamApi } from '../services/api';
import TeamCard from '../components/TeamCard';

export default function BrowseTeamsPage() {
  const [teams, setTeams] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get('role') || '';
  const setRole = (value) => setSearchParams(value ? { role: value } : {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    lookupApi.getRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');
    teamApi
      .getTeams({ role })
      .then(setTeams)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [role]);

  return (
    <main className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-950">Browse Teams</h1>
        <p className="text-sm text-gray-500 mt-0.5">{teams.length} open teams looking for members</p>
      </div>

      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="Filter by open role"
          className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white text-gray-700 cursor-pointer"
        >
          <option value="">All roles</option>
          {role && !roles.some((r) => r.name === role) && <option value={role}>“{role}”</option>}
          {roles.map((r) => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 font-medium">{teams.length} results</span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && teams.length === 0 && (
        <p className="text-sm text-gray-500">No teams match this filter.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </main>
  );
}
