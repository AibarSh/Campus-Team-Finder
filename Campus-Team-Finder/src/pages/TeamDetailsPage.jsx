import { useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { teamApi } from '../services/api';
import { displayName } from '../lib/names';
import StatusBadge from '../components/StatusBadge';
import { ErrorBox, Spinner } from '../components/Feedback';

export default function TeamDetailsPage() {
  const { id } = useParams();
  const { user } = useContext(UserContext);
  const [team, setTeam] = useState(null);
  const [myApplications, setMyApplications] = useState([]);
  const [myInvitations, setMyInvitations] = useState([]);
  const [error, setError] = useState('');
  const [busyRoleId, setBusyRoleId] = useState(null);
  const [roleErrors, setRoleErrors] = useState({});

  useEffect(() => {
    Promise.all([teamApi.getTeamById(id), teamApi.getMyApplications(), teamApi.getMyApplications('INVITATION')])
      .then(([t, a, i]) => {
        setTeam(t);
        setMyApplications(a);
        setMyInvitations(i);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const apply = async (openRole) => {
    setBusyRoleId(openRole.id);
    setRoleErrors((prev) => ({ ...prev, [openRole.id]: '' }));
    try {
      const application = await teamApi.applyToRole(team.id, openRole.id);
      setMyApplications((prev) => [...prev, application]);
    } catch (err) {
      setRoleErrors((prev) => ({ ...prev, [openRole.id]: err.message }));
    } finally {
      setBusyRoleId(null);
    }
  };

  if (error) {
    return (
      <main className="p-8">
        <ErrorBox message={error} />
      </main>
    );
  }
  if (!team) return <Spinner />;

  const isOwner = team.creatorId === user.id;
  const entryFor = (openRoleId) => {
    const matches = [...myApplications, ...myInvitations].filter((a) => a.teamOpenRoleId === openRoleId);
    return (
      matches.find((a) => a.status === 'ACCEPTED') ||
      matches.find((a) => a.status === 'SENT' || a.status === 'VIEWED') ||
      matches.find((a) => a.status === 'DECLINED')
    );
  };

  return (
    <main className="p-8 space-y-6 max-w-4xl">
      <Link to="/browse" className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to teams
      </Link>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xl">
              {team.name[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-950">{team.name}</h1>
              {team.eventTarget && <p className="text-sm text-gray-500">{team.eventTarget}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {team.status !== 'PUBLISHED' && <StatusBadge status={team.status} />}
            {isOwner && (
              <Link
                to={`/teams/${team.id}/manage`}
                className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
              >
                Manage team
              </Link>
            )}
          </div>
        </div>
        {team.description && <p className="text-sm text-gray-600 leading-relaxed">{team.description}</p>}
        <p className="text-xs text-gray-400">
          Created by <span className="font-semibold text-gray-700">{displayName(team.creator)}</span>
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-950">Open roles</h2>
        {team.openRoles.length === 0 && <p className="text-sm text-gray-500">This team has no open roles yet.</p>}
        {!isOwner && team.status !== 'PUBLISHED' && (
          <p className="text-sm text-gray-500">This team is not accepting applications yet.</p>
        )}
        {team.openRoles.map((openRole) => {
          const entry = entryFor(openRole.id);
          const status = entry?.status;
          const isPendingInvitation =
            entry?.direction === 'INVITATION' && (status === 'SENT' || status === 'VIEWED');
          const full = openRole.slotsFilled >= openRole.slotsTotal;
          return (
            <div key={openRole.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{openRole.role.name}</p>
                  <p className="text-xs text-gray-400">
                    {openRole.slotsFilled}/{openRole.slotsTotal} slots filled
                  </p>
                </div>
                {!isOwner && (
                  <div className="flex flex-col items-end gap-1">
                    {status ? (
                      <StatusBadge status={status} />
                    ) : team.status === 'PUBLISHED' ? (
                      full ? (
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-semibold rounded-lg">Full</span>
                      ) : (
                        <button
                          type="button"
                          disabled={busyRoleId === openRole.id}
                          onClick={() => apply(openRole)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          {busyRoleId === openRole.id ? 'Applying...' : 'Apply'}
                        </button>
                      )
                    ) : null}
                    {isPendingInvitation && (
                      <Link to="/applications" className="text-xs font-semibold text-blue-600 hover:underline">
                        Respond in My Applications
                      </Link>
                    )}
                  </div>
                )}
              </div>
              {roleErrors[openRole.id] && <p className="text-xs text-red-600">{roleErrors[openRole.id]}</p>}
            </div>
          );
        })}
      </section>
    </main>
  );
}
