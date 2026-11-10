import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { lookupApi, teamApi, teamManagementApi } from '../services/api';
import { ErrorBox, Spinner } from '../components/Feedback';

const heading = { fontFamily: 'Outfit, sans-serif' };

const STEPS = [
  { id: 1, title: 'Project Info', description: 'Name your team and the event or hackathon you are building for.' },
  { id: 2, title: 'Open Roles', description: 'Specify the roles you need and how many people for each.' },
  { id: 3, title: 'Review & Publish', description: 'Check everything, then publish to make your team visible to students.' },
];

const fieldClass =
  'w-full px-4 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all bg-white';
const inputClass = `${fieldClass} h-10`;
const textareaClass = `${fieldClass} py-3 min-h-28 resize-none`;
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

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
    <main className="min-h-[calc(100vh-65px)] bg-slate-50 px-6 py-10">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-800 font-semibold text-sm" style={heading}>
              Create team
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Step {step} of {STEPS.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className="flex-1 h-1.5 rounded-full transition-all duration-500"
                style={{ background: s.id < step ? '#2563eb' : s.id === step ? '#93c5fd' : '#e2e8f0' }}
              />
            ))}
          </div>
        </div>

        {/* Step label */}
        <div className="mb-7">
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {meta.description}
          </div>
          <h1 className="text-slate-900 text-2xl font-bold" style={heading}>
            {meta.title}
          </h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 space-y-6">
          <ErrorBox message={error} />
          {waitingForDraft && !error && <Spinner />}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label htmlFor="teamName" className={labelClass}>
                  Team name <span className="text-red-500">*</span>
                </label>
                <input
                  id="teamName"
                  className={inputClass}
                  value={info.name}
                  onChange={(e) => setInfo({ ...info, name: e.target.value })}
                  placeholder="e.g. AI Study Buddy"
                />
              </div>
              <div>
                <label htmlFor="teamEvent" className={labelClass}>
                  Event / hackathon
                </label>
                <input
                  id="teamEvent"
                  className={inputClass}
                  value={info.eventTarget}
                  onChange={(e) => setInfo({ ...info, eventTarget: e.target.value })}
                  placeholder="e.g. KBTU Hackathon 2026"
                />
              </div>
              <div>
                <label htmlFor="teamDescription" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="teamDescription"
                  className={textareaClass}
                  value={info.description}
                  onChange={(e) => setInfo({ ...info, description: e.target.value })}
                  placeholder="What are you building and who are you looking for?"
                />
              </div>
            </div>
          )}

          {step === 2 && team && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs font-medium text-slate-400">
                <span className="flex-1">Role</span>
                <span className="w-24">Slots</span>
                <span className="w-8" />
              </div>
              {rows.map((row, index) => (
                <div key={index} className="flex items-center gap-3">
                  <select
                    className={`${inputClass} flex-1`}
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
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:hover:text-slate-300 disabled:hover:bg-transparent"
                    aria-label="Remove role"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, { roleId: '', slotsTotal: 1 }])}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                + Add role
              </button>
            </div>
          )}

          {step === 3 && team && (
            <div className="space-y-5 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-400 mb-1">Team</p>
                <p className="text-slate-900 font-bold text-lg" style={heading}>
                  {team.name}
                </p>
                {team.eventTarget && <p className="text-slate-500">{team.eventTarget}</p>}
              </div>
              {team.description && (
                <div>
                  <p className="text-xs font-medium text-slate-400 mb-1">Description</p>
                  <p className="text-slate-600 leading-relaxed">{team.description}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-slate-400 mb-2">Open roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {team.openRoles.map((r) => (
                    <span
                      key={r.id}
                      className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium"
                    >
                      {r.role.name} · {r.slotsTotal} {r.slotsTotal === 1 ? 'slot' : 'slots'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Nav buttons */}
        <div className="flex items-center justify-between mt-6">
          {step === 3 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={busy}
              className="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              Back
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
                className="px-6 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                Save as draft
              </button>
            )}
            <button
              type="button"
              onClick={step === 1 ? saveInfo : step === 2 ? saveRoles : publish}
              disabled={busy || waitingForDraft}
              className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
            >
              {busy ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : step === 3 ? (
                'Publish team'
              ) : (
                <>
                  Continue
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
