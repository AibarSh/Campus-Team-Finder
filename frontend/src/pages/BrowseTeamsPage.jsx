import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { lookupApi, teamApi } from '../services/api';
import { useFocusRefresh } from '../lib/useFocusRefresh';
import TeamCard from '../components/TeamCard';

const heading = { fontFamily: 'Outfit, sans-serif' };

export default function BrowseTeamsPage() {
  const [result, setResult] = useState(null);
  const [roles, setRoles] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const refresh = useFocusRefresh();
  const query = searchParams.get('q') || '';
  const q = query.trim();
  const role = searchParams.get('role') || '';
  const updateFilters = (filters, options) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    setSearchParams(params, options);
  };

  useEffect(() => {
    lookupApi.getRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      teamApi.getTeams({ q, role })
        .then((teams) => {
          if (active) setResult({ q, role, teams });
        })
        .catch((err) => {
          if (active) setResult({ q, role, error: err.message });
        });
    }, q ? 200 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q, role, refresh]);

  const loading = result?.q !== q || result?.role !== role;
  const teams = loading ? [] : result.teams ?? [];
  const error = loading ? '' : result.error;
  const count = `${teams.length} ${teams.length === 1 ? 'result' : 'results'}`;

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 p-4 sm:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="text-slate-900 text-2xl font-bold" style={heading}>
            Browse Teams
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {loading ? 'Loading teams…' : `${teams.length} open ${teams.length === 1 ? 'team' : 'teams'} looking for members`}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm px-4 sm:px-5 py-3">
          <div className="min-w-0 w-full sm:w-auto sm:flex-1">
            <label htmlFor="teamSearch" className="sr-only">Search by team name or description</label>
            <input
              id="teamSearch"
              type="search"
              value={query}
              onChange={(e) => updateFilters({ q: e.target.value }, { replace: true })}
              placeholder="Search by team name or description…"
              className="h-9 w-full px-3 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
            />
          </div>
          <div className="flex min-w-0 max-w-full items-center gap-3">
            <label htmlFor="roleFilter" className="shrink-0 text-sm font-medium text-slate-700">
              Open role
            </label>
            <select
              id="roleFilter"
              value={role}
              onChange={(e) => updateFilters({ role: e.target.value })}
              className="min-w-0 h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all cursor-pointer"
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
          {(query || role) && (
            <button type="button" onClick={() => updateFilters({ q: '', role: '' })} className="text-sm font-medium text-blue-700 hover:underline">
              Clear filters
            </button>
          )}
          <span className="text-xs text-slate-400 font-medium">{loading ? '' : count}</span>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && teams.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-slate-700 font-semibold mb-1">No teams match this filter</div>
            <div className="text-slate-400 text-sm">Try another search or role.</div>
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
