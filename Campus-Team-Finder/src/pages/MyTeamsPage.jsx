import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { teamManagementApi } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { ErrorBox, Spinner } from '../components/Feedback';

// openRoles[].applications mixes applications and invitations
const pendingApplicants = (team) =>
  team.openRoles
    .flatMap((r) => r.applications)
    .filter((a) => a.direction === 'APPLICATION' && ['SENT', 'VIEWED'].includes(a.status)).length;

const buttonClass = 'px-4 py-2 text-sm font-semibold rounded-xl transition';

export default function MyTeamsPage() {
  const [teams, setTeams] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    teamManagementApi.getMyCreatedTeams().then(setTeams).catch((err) => setError(err.message));
  }, []);

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-950">My Teams</h1>
          <p className="text-sm text-gray-500 mt-0.5">Teams you created.</p>
        </div>
        <Link to="/teams/new" className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700 shadow-sm`}>
          + Create Team
        </Link>
      </div>

      <ErrorBox message={error} />
      {!teams && !error && <Spinner />}
      {teams && teams.length === 0 && (
        <p className="text-sm text-gray-500">
          You haven't created a team yet.{' '}
          <Link to="/teams/new" className="text-blue-600 font-semibold">
            Create one
          </Link>
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams?.map((team) => {
          const pending = pendingApplicants(team);
          return (
            <div key={team.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-900">{team.name}</h3>
                  {team.eventTarget && <p className="text-xs text-gray-400">{team.eventTarget}</p>}
                </div>
                <StatusBadge status={team.status} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {team.openRoles.map((r) => (
                  <span key={r.id} className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs rounded-lg">
                    {r.role.name} · {r.slotsFilled}/{r.slotsTotal}
                  </span>
                ))}
                {team.openRoles.length === 0 && <span className="text-xs text-gray-400">No open roles yet</span>}
              </div>
              {team.status === 'PUBLISHED' && (
                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-900">{pending}</span> pending{' '}
                  {pending === 1 ? 'applicant' : 'applicants'}
                </p>
              )}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {team.status === 'DRAFT' ? (
                  <Link to={`/teams/new?team=${team.id}`} className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}>
                    Continue setup
                  </Link>
                ) : (
                  <>
                    <Link to={`/teams/${team.id}/manage`} className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}>
                      Manage
                    </Link>
                    <Link to={`/teams/${team.id}`} className={`${buttonClass} border border-gray-200 text-gray-600 hover:bg-gray-50`}>
                      View
                    </Link>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
