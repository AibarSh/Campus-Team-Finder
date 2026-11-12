import { useCallback, useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { teamApi, teamManagementApi } from '../services/api';
import { displayName, initials } from '../lib/names';
import Tabs from '../components/Tabs';
import StatusBadge from '../components/StatusBadge';
import DecisionButtons from '../components/DecisionButtons';
import InvitePanel from '../components/InvitePanel';
import { ErrorBox, Spinner } from '../components/Feedback';

const heading = { fontFamily: 'Outfit, sans-serif' };

const TABS = [
  { id: 'APPLICATION', label: 'Applicants' },
  { id: 'INVITATION', label: 'Invitations' },
];

const LINK_STYLES = {
  GitHub: { icon: 'GH', bg: '#24292e' },
  LinkedIn: { icon: 'in', bg: '#0077b5' },
  Telegram: { icon: 'TG', bg: '#2aabee' },
};

function ProfileLinks({ user }) {
  const links = [
    user.githubUrl && { href: user.githubUrl, label: 'GitHub' },
    user.linkedinUrl && { href: user.linkedinUrl, label: 'LinkedIn' },
    user.telegramHandle && { href: `https://t.me/${user.telegramHandle.replace(/^@/, '')}`, label: 'Telegram' },
  ].filter(Boolean);
  return (
    <div className="flex gap-1.5">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          title={l.label}
          aria-label={l.label}
          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white hover:opacity-80 transition-opacity"
          style={{ background: LINK_STYLES[l.label].bg }}
        >
          {LINK_STYLES[l.label].icon}
        </a>
      ))}
    </div>
  );
}

export default function ManageTeamPage() {
  const { id } = useParams();
  const { user } = useContext(UserContext);
  const [team, setTeam] = useState(null);
  const [tab, setTab] = useState('APPLICATION');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});

  const loadTeam = useCallback(
    () => teamApi.getTeamById(id).then(setTeam).catch((err) => setError(err.message)),
    [id]
  );
  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const isOwner = team?.creatorId === user.id;

  useEffect(() => {
    if (!isOwner) return undefined;
    let cancelled = false;
    teamManagementApi
      .getTeamApplications(id, tab)
      .then((data) => !cancelled && setItems(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [id, tab, isOwner]);

  const switchTab = (next) => {
    setTab(next);
    setItems(null);
    setError('');
  };

  const respond = async (item, status) => {
    setBusyId(item.id);
    setRowErrors((prev) => ({ ...prev, [item.id]: '' }));
    try {
      const updated = await teamManagementApi.respondToApplication(item.id, status);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: updated.status } : i)));
      if (status === 'ACCEPTED') loadTeam();
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [item.id]: err.message }));
    } finally {
      setBusyId(null);
    }
  };

  if (!team) {
    return (
      <main className="min-h-[calc(100vh-65px)] bg-slate-50 p-8">
        {error ? <ErrorBox message={error} /> : <Spinner />}
      </main>
    );
  }
  if (!isOwner) {
    return (
      <main className="min-h-[calc(100vh-65px)] bg-slate-50 p-8 space-y-4">
        <ErrorBox message="Only the team creator can manage this team." />
        <Link to={`/teams/${team.id}`} className="text-sm text-blue-600 font-semibold hover:text-blue-700">
          View team
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              to="/my-teams"
              className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              My teams
            </Link>
            <h1 className="text-slate-900 text-2xl font-bold mt-3" style={heading}>
              {team.name}
            </h1>
            <div className="flex flex-wrap gap-1 pt-2">
              {team.openRoles.map((r) => (
                <span
                  key={r.id}
                  className="text-xs px-2.5 py-1 bg-white text-slate-600 rounded-full border border-slate-200 font-medium"
                >
                  {r.role.name} · {r.slotsFilled}/{r.slotsTotal}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <StatusBadge status={team.status} />
            <Link
              to={`/teams/${team.id}`}
              className="px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              View public page
            </Link>
          </div>
        </div>

        {team.status === 'DRAFT' && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-sm flex items-center justify-between gap-4">
            <span>This team is a draft and not visible to other students yet.</span>
            <Link to={`/teams/new?team=${team.id}`} className="font-semibold underline flex-shrink-0">
              Finish setup
            </Link>
          </div>
        )}

        <Tabs tabs={TABS} active={tab} onChange={switchTab} />
        <ErrorBox message={error} />

        {tab === 'INVITATION' && (
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
            <h2 className="text-slate-900 font-bold text-sm" style={heading}>
              Invite students
            </h2>
            {team.status === 'DRAFT' ? (
              <p className="text-sm text-slate-500">Publish the team before inviting people.</p>
            ) : (
              <InvitePanel team={team} onInvited={(invitation) => setItems((prev) => [invitation, ...(prev || [])])} />
            )}
          </section>
        )}

        <section className="space-y-3">
          {tab === 'INVITATION' && (
            <h2 className="text-slate-900 font-bold text-sm" style={heading}>
              Sent invitations
            </h2>
          )}
          {!items && !error && <Spinner />}
          {items && items.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
              <div className="text-slate-700 font-semibold mb-1">
                {tab === 'APPLICATION' ? 'No applications yet' : 'No invitations sent yet'}
              </div>
              <div className="text-slate-400 text-sm">
                {tab === 'APPLICATION' ? 'Applicants will show up here.' : 'Invite students to fill your open roles.'}
              </div>
            </div>
          )}
          {items?.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 space-y-2"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    aria-hidden="true"
                  >
                    {initials(item.user) || '?'}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate" style={heading}>
                      {displayName(item.user)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {[item.teamOpenRole.role.name, item.user.faculty, item.user.studyYear].filter(Boolean).join(' · ')}
                    </p>
                    <ProfileLinks user={item.user} />
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={item.status} />
                  {tab === 'APPLICATION' && ['SENT', 'VIEWED'].includes(item.status) && (
                    <DecisionButtons busy={busyId === item.id} onDecide={(status) => respond(item, status)} />
                  )}
                </div>
              </div>
              {rowErrors[item.id] && <p className="text-xs text-red-500">{rowErrors[item.id]}</p>}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
