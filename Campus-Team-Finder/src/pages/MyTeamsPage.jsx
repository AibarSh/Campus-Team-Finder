import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { teamManagementApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { ErrorBox, Spinner } from '../components/Feedback';

const heading = { fontFamily: 'Outfit, sans-serif' };

// openRoles[].applications mixes applications and invitations
const pendingApplicants = (team) =>
  team.openRoles
    .flatMap((r) => r.applications)
    .filter((a) => a.direction === 'APPLICATION' && ['SENT', 'VIEWED'].includes(a.status)).length;

const primaryBtn =
  'px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200';
const secondaryBtn =
  'px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors';

export default function MyTeamsPage() {
  const [teams, setTeams] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    teamManagementApi.getMyCreatedTeams().then(setTeams).catch((err) => setError(err.message));
  }, []);

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-slate-900 text-2xl font-bold" style={heading}>
              My Teams
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Teams you created.</p>
          </div>
          <Link to="/teams/new" className={`flex items-center gap-2 ${primaryBtn}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Team
          </Link>
        </div>

        <ErrorBox message={error} />
        {!teams && !error && <Spinner />}
        {teams && teams.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <div className="text-4xl mb-3">🚀</div>
            <div className="text-slate-700 font-semibold mb-1">You haven't created a team yet</div>
            <div className="text-slate-400 text-sm mb-4">Start a team and invite students to join.</div>
            <Link to="/teams/new" className={`inline-block ${primaryBtn}`}>
              Create your first team
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {teams?.map((team) => {
            const pending = pendingApplicants(team);
            return (
              <div
                key={team.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {team.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-slate-900 font-semibold text-sm leading-tight truncate" style={heading}>
                        {team.name}
                      </h3>
                      {team.eventTarget && <p className="text-xs text-slate-400 mt-0.5 truncate">{team.eventTarget}</p>}
                    </div>
                  </div>
                  <StatusBadge status={team.status} />
                </div>

                <div className="flex flex-wrap gap-1 flex-1 content-start">
                  {team.openRoles.map((r) => (
                    <span
                      key={r.id}
                      className="text-xs px-2.5 py-1 bg-slate-50 text-slate-600 rounded-full border border-slate-100 font-medium"
                    >
                      {r.role.name} · {r.slotsFilled}/{r.slotsTotal}
                    </span>
                  ))}
                  {team.openRoles.length === 0 && <span className="text-xs text-slate-400">No open roles yet</span>}
                </div>

                {team.status === 'PUBLISHED' && (
                  <p className="text-xs text-slate-500">
                    <span className="font-bold text-blue-600">{pending}</span> pending{' '}
                    {pending === 1 ? 'applicant' : 'applicants'}
                  </p>
                )}

                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  {team.status === 'DRAFT' ? (
                    <Link to={`/teams/new?team=${team.id}`} className={primaryBtn}>
                      Continue setup
                    </Link>
                  ) : (
                    <>
                      <Link to={`/teams/${team.id}/manage`} className={primaryBtn}>
                        Manage
                      </Link>
                      <Link to={`/teams/${team.id}`} className={secondaryBtn}>
                        View
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
