import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { lookupApi, teamApi } from '../services/api';
import TeamCard from '../components/TeamCard';

const heading = { fontFamily: 'Outfit, sans-serif' };

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

  const count = `${teams.length} ${teams.length === 1 ? 'result' : 'results'}`;

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="text-slate-900 text-2xl font-bold" style={heading}>
            Browse Teams
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {loading ? 'Loading teams…' : `${teams.length} open ${teams.length === 1 ? 'team' : 'teams'} looking for members`}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3">
          <div className="flex items-center gap-3">
            <label htmlFor="roleFilter" className="text-sm font-medium text-slate-700">
              Open role
            </label>
            <select
              id="roleFilter"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all cursor-pointer"
            >
              <option value="">All roles</option>
              {role && !roles.some((r) => r.name === role) && <option value={role}>“{role}”</option>}
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs text-slate-400 font-medium">{loading ? '' : count}</span>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && teams.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-slate-700 font-semibold mb-1">No teams match this filter</div>
            <div className="text-slate-400 text-sm">Try another role, or clear the filter.</div>
            {role && (
              <button
                type="button"
                onClick={() => setRole('')}
                className="mt-4 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              >
                Show all roles
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      </div>
    </main>
  );
}
