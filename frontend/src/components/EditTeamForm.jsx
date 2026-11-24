import { useEffect, useState } from 'react';
import { lookupApi, teamManagementApi } from '../services/api';
import { ErrorBox } from './Feedback';
import RequiredSkillsInput from './RequiredSkillsInput';

const inputClass = 'mt-1 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500';

export default function EditTeamForm({ team, onSaved, onCancel }) {
  const [event, setEvent] = useState(team.eventTarget ?? '');
  const [description, setDescription] = useState(team.description ?? '');
  const [changes, setChanges] = useState({});
  const [added, setAdded] = useState([]);
  const [newRole, setNewRole] = useState('');
  const [catalog, setCatalog] = useState({ loading: true, options: [] });
  const [roles, setRoles] = useState([]);
  const [roleError, setRoleError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    lookupApi.getRoles()
      .then((options) => { if (active) setRoles(options); })
      .catch((err) => { if (active) setRoleError(err.message); });
    lookupApi.getSkills()
      .then((options) => { if (active) setCatalog({ options }); })
      .catch(() => { if (active) setCatalog({ options: [], error: true }); });
    return () => { active = false; };
  }, []);

  const positions = [...team.openRoles, ...added];
  const unused = roles.filter(({ id }) => !positions.some(({ roleId }) => roleId === id));
  const update = (role, change) => setChanges((current) => ({
    ...current,
    [role.roleId]: { slotsTotal: role.slotsTotal, ...current[role.roleId], ...change },
  }));

  const addRole = () => {
    const role = unused.find(({ id }) => id === newRole);
    if (!role) return;
    setAdded([...added, { roleId: role.id, role, slotsTotal: 1, slotsFilled: 0, requiredSkills: [] }]);
    setNewRole('');
  };

  const save = async (e) => {
    e.preventDefault();
    const updates = positions.filter((role) => changes[role.roleId] || !role.id);
    if (updates.some((role) => {
      const total = changes[role.roleId]?.slotsTotal ?? role.slotsTotal;
      return !Number.isInteger(total) || total < Math.max(role.slotsFilled, 1) || total > 2147483647;
    })) {
      setError('Use a whole number of slots that covers all current members.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = await teamManagementApi.updateTeam(team.id, {
        eventTarget: event.trim() || null,
        description: description.trim() || null,
        roles: updates.map(({ roleId, slotsTotal }) => ({ roleId, slotsTotal, ...changes[roleId] })),
      });
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 sm:p-6">
      <h2 className="font-bold text-slate-900">Edit Team</h2>
      <ErrorBox message={error} />
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Team name
          <input value={team.name} disabled className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Event
          <input value={event} onChange={(e) => setEvent(e.target.value)} className={inputClass} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputClass} />
        </label>
        <h3 className="font-semibold text-sm text-slate-900">Roles</h3>
        {positions.map((role) => {
          const full = role.slotsFilled >= role.slotsTotal;
          const pending = changes[role.roleId];
          const skills = pending?.requiredSkills ?? role.requiredSkills.map(({ name }) => name);
          return (
            <fieldset key={role.roleId} disabled={full} className="min-w-0 space-y-3 rounded-xl border border-slate-200 p-3">
              <legend className="max-w-full px-1 text-sm font-semibold wrap-anywhere">{role.role.name}</legend>
              <div className="flex flex-wrap items-end gap-3">
                <label className="block text-sm text-slate-700">
                  Slots
                  <input
                    type="number"
                    min={Math.max(role.slotsFilled, 1)}
                    max={2147483647}
                    required
                    value={pending?.slotsTotal ?? role.slotsTotal}
                    onChange={(e) => update(role, { slotsTotal: e.target.value === '' ? '' : Number(e.target.value) })}
                    className={`${inputClass} block max-w-28`}
                  />
                </label>
                <p className="pb-2 text-sm text-slate-500">
                  {role.slotsFilled} occupied{full ? ' · Full' : ''}
                </p>
              </div>
              {full ? (
                <p className="text-sm text-slate-500 wrap-anywhere">
                  Required Skills{skills.length ? ` · ${skills.join(', ')}` : ' · None'}
                </p>
              ) : (
                <RequiredSkillsInput skills={skills} catalog={catalog} onChange={(requiredSkills) => update(role, { requiredSkills })} />
              )}
            </fieldset>
          );
        })}
        <ErrorBox message={roleError} />
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">
            New role
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className={inputClass}>
              <option value="">Select a role</option>
              {unused.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
          </label>
          <button type="button" onClick={addRole} disabled={!newRole} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">
            Add role
          </button>
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
          Cancel
        </button>
      </div>
    </form>
  );
}
