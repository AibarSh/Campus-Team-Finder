import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { lookupApi, teamApi, teamManagementApi } from '../services/api';
import { ErrorBox, Spinner } from '../components/Feedback';

const STEPS = [
  { id: 1, title: 'Project Info', description: 'Name your team and the event or hackathon you are building for.' },
  { id: 2, title: 'Open Roles', description: 'Specify the roles you need and how many people for each.' },
  { id: 3, title: 'Review & Publish', description: 'Check everything, then publish to make your team visible to students.' },
];

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-600 bg-white';

// Remounts the wizard whenever the resumed draft id changes (e.g. navigating from
// /teams/new?team=X to a fresh /teams/new), instead of keeping stale step/state around.
export function CreateTeamRoute() {
  const [sp] = useSearchParams();
  return <CreateTeamWizard key={sp.get('team') || 'new'} />;
}

export default function CreateTeamWizard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const resumeId = searchParams.get('team');
  const navigate = useNavigate();

  const [step, setStep] = useState(resumeId ? 2 : 1);
  const [team, setTeam] = useState(null);
  const [info, setInfo] = useState({ name: '', eventTarget: '', description: '' });
  const [rows, setRows] = useState([{ roleId: '', slotsTotal: 1 }]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    lookupApi.getRoles().then(setRoleOptions).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!resumeId) return;
    teamApi
      .getTeamById(resumeId)
      .then((t) => {
        if (t.status !== 'DRAFT') {
          navigate(`/teams/${t.id}/manage`, { replace: true });
          return;
        }
        setTeam(t);
        if (t.openRoles.length > 0) {
          setRows(t.openRoles.map((r) => ({ roleId: r.roleId, slotsTotal: r.slotsTotal })));
        }
      })
      .catch((err) => setError(err.message));
  }, [resumeId, navigate]);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveInfo = () => {
    if (!info.name.trim()) {
      setError('Team name is required');
      return;
    }
    run(async () => {
      const created = await teamManagementApi.createTeam({
        name: info.name.trim(),
        eventTarget: info.eventTarget.trim() || null,
        description: info.description.trim() || null,
      });
      setTeam({ ...created, openRoles: [] });
      setStep(2);
      setSearchParams({ team: created.id }, { replace: true });
    });
  };

  const saveRoles = () => {
    const chosen = rows.filter((r) => r.roleId);
    if (chosen.length === 0) return setError('Add at least one role');
    if (new Set(chosen.map((r) => r.roleId)).size !== chosen.length) return setError('Each role can only be added once');
    if (chosen.some((r) => !Number.isInteger(r.slotsTotal) || r.slotsTotal < 1)) return setError('Slots must be at least 1');
    run(async () => {
      const saved = await teamManagementApi.setOpenRoles(team.id, chosen);
      setTeam((t) => ({ ...t, openRoles: saved }));
      setStep(3);
    });
  };

  const publish = () =>
    run(async () => {
      await teamManagementApi.publishTeam(team.id);
      navigate(`/teams/${team.id}/manage`);
    });

  const updateRow = (index, patch) => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const meta = STEPS[step - 1];
  const waitingForDraft = step > 1 && !team;

  return (
    <main className="p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-2">
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-400 font-medium px-0.5">
            {STEPS.map((s) => (
              <span key={s.id} className={s.id <= step ? 'text-blue-600 font-bold' : ''}>
                {s.id}. {s.title}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">{meta.title}</h1>
            <p className="text-xs sm:text-sm text-gray-500">{meta.description}</p>
          </div>

          <ErrorBox message={error} />

          {waitingForDraft && !error && <Spinner />}

          {step === 1 && (
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">Team name *</span>
                <input
                  className={inputClass}
                  value={info.name}
                  onChange={(e) => setInfo({ ...info, name: e.target.value })}
                  placeholder="e.g. AI Study Buddy"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">Event / hackathon</span>
                <input
                  className={inputClass}
                  value={info.eventTarget}
                  onChange={(e) => setInfo({ ...info, eventTarget: e.target.value })}
                  placeholder="e.g. KBTU Hackathon 2026"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-gray-600">Description</span>
                <textarea
                  className={`${inputClass} min-h-28`}
                  value={info.description}
                  onChange={(e) => setInfo({ ...info, description: e.target.value })}
                  placeholder="What are you building and who are you looking for?"
                />
              </label>
            </div>
          )}

          {step === 2 && team && (
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={index} className="flex items-center gap-3">
                  <select
                    className={inputClass}
                    value={row.roleId}
                    onChange={(e) => updateRow(index, { roleId: e.target.value })}
                    aria-label="Role"
                  >
                    <option value="">Select a role</option>
                    {roleOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className={`${inputClass} w-24`}
                    value={row.slotsTotal}
                    onChange={(e) => updateRow(index, { slotsTotal: parseInt(e.target.value, 10) || 0 })}
                    aria-label="Slots"
                  />
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                    disabled={rows.length === 1}
                    className="px-3 py-2 text-sm text-gray-400 hover:text-red-600 disabled:opacity-30"
                    aria-label="Remove role"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, { roleId: '', slotsTotal: 1 }])}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                + Add role
              </button>
            </div>
          )}

          {step === 3 && team && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Team</p>
                <p className="font-bold text-gray-900">{team.name}</p>
                {team.eventTarget && <p className="text-gray-500">{team.eventTarget}</p>}
              </div>
              {team.description && <p className="text-gray-600">{team.description}</p>}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Open roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {team.openRoles.map((r) => (
                    <span key={r.id} className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs rounded-lg">
                      {r.role.name} · {r.slotsTotal} {r.slotsTotal === 1 ? 'slot' : 'slots'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            {step === 3 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={busy}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-3">
              {step === 3 && (
                <button
                  type="button"
                  onClick={() => navigate('/my-teams')}
                  disabled={busy}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
                >
                  Save as draft
                </button>
              )}
              <button
                type="button"
                onClick={step === 1 ? saveInfo : step === 2 ? saveRoles : publish}
                disabled={busy || waitingForDraft}
                className="px-6 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
              >
                {busy ? 'Saving...' : step === 3 ? 'Publish team' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
