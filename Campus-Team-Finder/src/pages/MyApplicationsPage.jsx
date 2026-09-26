import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { teamApi, teamManagementApi } from '../services/api';
import Tabs from '../components/Tabs';
import StatusBadge from '../components/StatusBadge';
import DecisionButtons from '../components/DecisionButtons';
import { ErrorBox, Spinner } from '../components/Feedback';

const TABS = [
  { id: 'APPLICATION', label: 'Sent applications' },
  { id: 'INVITATION', label: 'Invitations' },
];

export default function MyApplicationsPage() {
  const [tab, setTab] = useState('APPLICATION');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    teamApi
      .getMyApplications(tab)
      .then((data) => !cancelled && setItems(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [tab]);

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
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [item.id]: err.message }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-950">My Applications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track where you applied and answer team invitations.</p>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={switchTab} />
      <ErrorBox message={error} />
      {!items && !error && <Spinner />}
      {items && items.length === 0 && (
        <p className="text-sm text-gray-500">
          {tab === 'APPLICATION' ? "You haven't applied to any team yet." : 'No invitations yet.'}
        </p>
      )}

      <div className="space-y-3">
        {items?.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Link to={`/teams/${item.teamId}`} className="font-semibold text-gray-900 hover:text-blue-600">
                  {item.team.name}
                </Link>
                <p className="text-xs text-gray-400">
                  {item.teamOpenRole.role.name} · {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={item.status} />
                {tab === 'INVITATION' && ['SENT', 'VIEWED'].includes(item.status) && (
                  <DecisionButtons busy={busyId === item.id} onDecide={(status) => respond(item, status)} />
                )}
              </div>
            </div>
            {rowErrors[item.id] && <p className="text-xs text-red-600">{rowErrors[item.id]}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}
