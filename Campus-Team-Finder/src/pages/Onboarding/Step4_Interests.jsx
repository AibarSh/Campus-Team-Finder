import { useEffect, useState } from 'react';
import { lookupApi } from '../../services/api';

export default function Step4_Interests({ data = {}, update }) {
  const [selectedInterests, setSelectedInterests] = useState(data.interests || []);
  const [selectedRoles, setSelectedRoles] = useState(data.roles || []);
  const [interestOptions, setInterestOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [loadError, setLoadError] = useState('');

  const load = () => {
    setLoadError('');
    Promise.all([lookupApi.getInterests(), lookupApi.getRoles()])
      .then(([interests, roles]) => {
        setInterestOptions(interests);
        setRoleOptions(roles);
      })
      .catch((err) => setLoadError(err.message));
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load-once is intended
  useEffect(load, []);

  const toggleInterest = (id) => {
    const updated = selectedInterests.includes(id)
      ? selectedInterests.filter((i) => i !== id)
      : [...selectedInterests, id];
    setSelectedInterests(updated);
    if (update) update({ interests: updated, roles: selectedRoles });
  };

  const toggleRole = (id) => {
    const updated = selectedRoles.includes(id) ? selectedRoles.filter((r) => r !== id) : [...selectedRoles, id];
    setSelectedRoles(updated);
    if (update) update({ interests: selectedInterests, roles: updated });
  };

  return (
    <div className="space-y-8">
      {loadError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center justify-between">
          <span>Couldn't load options: {loadError}</span>
          <button type="button" onClick={load} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <div>
        <div className="block text-sm font-medium text-slate-700 mb-1">Interests</div>
        <p className="text-xs text-slate-400 mb-3">Select all that apply — we use these to recommend projects</p>
        <div className="flex flex-wrap gap-2">
          {interestOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleInterest(item.id)}
              aria-pressed={selectedInterests.includes(item.id)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                selectedInterests.includes(item.id)
                  ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="block text-sm font-medium text-slate-700 mb-1">Preferred Roles</div>
        <p className="text-xs text-slate-400 mb-3">Pick the roles you'd like to fill on a team</p>
        <div className="flex flex-wrap gap-2">
          {roleOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleRole(item.id)}
              aria-pressed={selectedRoles.includes(item.id)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                selectedRoles.includes(item.id)
                  ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
