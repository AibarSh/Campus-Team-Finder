import { useCallback, useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { teamApi, teamManagementApi } from '../services/api';
import { displayName } from '../lib/names';
import Tabs from '../components/Tabs';
import StatusBadge from '../components/StatusBadge';
import DecisionButtons from '../components/DecisionButtons';
import InvitePanel from '../components/InvitePanel';
import { ErrorBox, Spinner } from '../components/Feedback';

const TABS = [
  { id: 'APPLICATION', label: 'Applicants' },
  { id: 'INVITATION', label: 'Invitations' },
];

function ProfileLinks({ user }) {
  const links = [
    user.githubUrl && { href: user.githubUrl, label: 'GitHub' },
    user.linkedinUrl && { href: user.linkedinUrl, label: 'LinkedIn' },
    user.telegramHandle && { href: `https://t.me/${user.telegramHandle.replace(/^@/, '')}`, label: 'Telegram' },
  ].filter(Boolean);
  return (
    <div className="flex gap-3">
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">
          {l.label}
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
    return <main className="p-8">{error ? <ErrorBox message={error} /> : <Spinner />}</main>;
  }
  if (!isOwner) {
    return (
      <main className="p-8 space-y-4">
        <ErrorBox message="Only the team creator can manage this team." />
        <Link to={`/teams/${team.id}`} className="text-sm text-blue-600 font-semibold">
          View team
        </Link>
      </main>
    );
  }

  return (
    <main className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/my-teams" className="text-sm text-gray-500 hover:text-gray-700">
            ← My teams
          </Link>
          <h1 className="text-2xl font-extrabold text-gray-950 mt-2">{team.name}</h1>
          <div className="flex flex-wrap gap-1.5 pt-2">
            {team.openRoles.map((r) => (
              <span key={r.id} className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs rounded-lg">
                {r.role.name} · {r.slotsFilled}/{r.slotsTotal}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={team.status} />
          <Link to={`/teams/${team.id}`} className="text-sm font-semibold text-blue-600">
            View public page
          </Link>
        </div>
      </div>

      {team.status === 'DRAFT' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 text-sm flex items-center justify-between">
          <span>This team is a draft and not visible to other students yet.</span>
          <Link to={`/teams/new?team=${team.id}`} className="font-semibold underline">
            Finish setup
          </Link>
        </div>
      )}

      <Tabs tabs={TABS} active={tab} onChange={switchTab} />
      <ErrorBox message={error} />

      {tab === 'INVITATION' && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Invite students</h2>
          <InvitePanel team={team} onInvited={(invitation) => setItems((prev) => [invitation, ...(prev || [])])} />
        </section>
      )}

      <section className="space-y-3">
        {tab === 'INVITATION' && <h2 className="text-sm font-bold text-gray-900">Sent invitations</h2>}
        {!items && !error && <Spinner />}
        {items && items.length === 0 && (
          <p className="text-sm text-gray-500">
            {tab === 'APPLICATION' ? 'No applications yet.' : 'No invitations sent yet.'}
          </p>
        )}
        {items?.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-semibold text-gray-900">{displayName(item.user)}</p>
                <p className="text-xs text-gray-400">
                  {[item.teamOpenRole.role.name, item.user.faculty, item.user.studyYear].filter(Boolean).join(' · ')}
                </p>
                <ProfileLinks user={item.user} />
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={item.status} />
                {tab === 'APPLICATION' && ['SENT', 'VIEWED'].includes(item.status) && (
                  <DecisionButtons busy={busyId === item.id} onDecide={(status) => respond(item, status)} />
                )}
              </div>
            </div>
            {rowErrors[item.id] && <p className="text-xs text-red-600">{rowErrors[item.id]}</p>}
          </div>
        ))}
      </section>
    </main>
  );
}
