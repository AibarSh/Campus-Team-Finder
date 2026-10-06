import { useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { teamApi } from '../services/api';
import { displayName } from '../lib/names';
import StatusBadge from '../components/StatusBadge';
import { ErrorBox, Spinner } from '../components/Feedback';

const heading = { fontFamily: 'Outfit, sans-serif' };

function Chevron() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

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
      <main className="p-8 bg-slate-50 min-h-screen">
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

  const totalSlots = team.openRoles.reduce((n, r) => n + r.slotsTotal, 0);
  const filledSlots = team.openRoles.reduce((n, r) => n + r.slotsFilled, 0);
  const spotsOpen = totalSlots - filledSlots;
  const creatorName = displayName(team.creator);

  return (
    <main className="bg-slate-50 min-h-screen">
      {/* Breadcrumb bar */}
      <div className="bg-white border-b border-slate-100 h-14 flex items-center px-8 gap-4">
        <Link
          to="/browse"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          Back to Browse
        </Link>
        <div className="h-4 w-px bg-slate-200" />
        <nav className="flex items-center gap-1 text-xs text-slate-400" aria-label="Breadcrumb">
          <Link to="/dashboard" className="hover:text-slate-600 transition-colors">Dashboard</Link>
          <Chevron />
          <Link to="/browse" className="hover:text-slate-600 transition-colors">Browse Teams</Link>
          <Chevron />
          <span className="text-slate-700 font-medium">{team.name}</span>
        </nav>
      </div>

      {/* Hero */}
      <div
        className="relative px-8 py-10 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #2563eb18 0%, #2563eb08 100%)' }}
      >
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 80% 50%, #2563eb12 0%, transparent 60%)' }}
        />
        <div className="relative max-w-5xl flex items-start gap-5">
          <div
            className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-black flex-shrink-0 shadow-lg shadow-blue-200"
            style={heading}
          >
            {team.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              {team.eventTarget && (
                <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                  {team.eventTarget}
                </span>
              )}
              {team.status !== 'PUBLISHED' && <StatusBadge status={team.status} />}
            </div>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-slate-900 text-3xl font-bold mb-1" style={heading}>
                {team.name}
              </h1>
              {isOwner && (
                <Link
                  to={`/teams/${team.id}/manage`}
                  className="flex-shrink-0 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
                >
                  Manage team
                </Link>
              )}
            </div>
            {team.description && <p className="text-slate-500 text-base max-w-2xl">{team.description}</p>}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-sm text-slate-500">
              <div>
                <span className="font-semibold text-slate-800">{team.openRoles.length}</span> open roles
              </div>
              <div>
                <span className="font-semibold text-slate-800">{spotsOpen}</span> spots left
              </div>
              <div>
                Created by <span className="font-semibold text-slate-800">{creatorName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Open positions */}
        <section className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <h2 className="text-slate-900 font-bold" style={heading}>
              Open Positions
              <span className="ml-2 text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {team.openRoles.length} {team.openRoles.length === 1 ? 'role' : 'roles'}
              </span>
            </h2>

            {team.openRoles.length === 0 && <p className="text-sm text-slate-500">This team has no open roles yet.</p>}
            {!isOwner && team.status !== 'PUBLISHED' && (
              <p className="text-sm text-slate-500">This team is not accepting applications yet.</p>
            )}

            <div className="space-y-3">
              {team.openRoles.map((openRole) => {
                const entry = entryFor(openRole.id);
                const status = entry?.status;
                const isPendingInvitation =
                  entry?.direction === 'INVITATION' && (status === 'SENT' || status === 'VIEWED');
                const full = openRole.slotsFilled >= openRole.slotsTotal;
                const pct = openRole.slotsTotal ? (openRole.slotsFilled / openRole.slotsTotal) * 100 : 0;

                return (
                  <div
                    key={openRole.id}
                    className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 hover:shadow-sm transition-shadow space-y-2"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {openRole.role.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{openRole.role.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-20 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-500">
                              {openRole.slotsFilled}/{openRole.slotsTotal} slots filled
                            </span>
                          </div>
                        </div>
                      </div>

                      {!isOwner && (
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {status ? (
                            <StatusBadge status={status} />
                          ) : team.status === 'PUBLISHED' ? (
                            full ? (
                              <span className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-lg">
                                Full
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={busyRoleId === openRole.id}
                                onClick={() => apply(openRole)}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                              >
                                {busyRoleId === openRole.id ? 'Applying...' : 'Apply for Role'}
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
                    {roleErrors[openRole.id] && <p className="text-xs text-red-500">{roleErrors[openRole.id]}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-slate-900 font-bold text-sm mb-3" style={heading}>Team Lead</h3>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {creatorName?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">{creatorName}</div>
                <div className="text-xs text-slate-500">{isOwner ? 'You' : 'Created this team'}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-slate-900 font-bold text-sm mb-3" style={heading}>Team Capacity</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${totalSlots ? (filledSlots / totalSlots) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-bold text-blue-700">
                {filledSlots}/{totalSlots}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {spotsOpen} {spotsOpen === 1 ? 'spot' : 'spots'} still open across {team.openRoles.length}{' '}
              {team.openRoles.length === 1 ? 'role' : 'roles'}.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
