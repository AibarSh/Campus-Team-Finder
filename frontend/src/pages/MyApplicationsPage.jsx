import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { teamApi, teamManagementApi } from '../services/api';
import Tabs from '../components/Tabs';
import StatusBadge from '../components/StatusBadge';
import DecisionButtons from '../components/DecisionButtons';
import { ErrorBox, Spinner } from '../components/Feedback';

const heading = { fontFamily: 'Outfit, sans-serif' };

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
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-slate-900 text-2xl font-bold" style={heading}>
            My Applications
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Track where you applied and answer team invitations.</p>
        </div>

        <Tabs tabs={TABS} active={tab} onChange={switchTab} />
        <ErrorBox message={error} />
        {!items && !error && <Spinner />}
        {items && items.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <div className="text-4xl mb-3">{tab === 'APPLICATION' ? '📋' : '✉️'}</div>
            <div className="text-slate-700 font-semibold mb-1">
              {tab === 'APPLICATION' ? "You haven't applied to any team yet" : 'No invitations yet'}
            </div>
            {tab === 'APPLICATION' && (
              <Link to="/browse" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                Browse teams
              </Link>
            )}
          </div>
        )}

        <div className="space-y-3">
          {items?.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 space-y-2"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {item.team.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <Link
                      to={`/teams/${item.teamId}`}
                      className="text-slate-900 font-semibold text-sm hover:text-blue-600 transition-colors truncate block"
                      style={heading}
                    >
                      {item.team.name}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.teamOpenRole.role.name} · {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={item.status} />
                  {tab === 'INVITATION' && ['SENT', 'VIEWED'].includes(item.status) && (
                    <DecisionButtons busy={busyId === item.id} onDecide={(status) => respond(item, status)} />
                  )}
                </div>
              </div>
              {rowErrors[item.id] && <p className="text-xs text-red-500">{rowErrors[item.id]}</p>}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
