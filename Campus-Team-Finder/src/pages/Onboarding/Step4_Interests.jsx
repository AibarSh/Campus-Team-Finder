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

  const toggleInterest = (item) => {
    const updated = selectedInterests.includes(item)
      ? selectedInterests.filter((i) => i !== item)
      : [...selectedInterests, item];

    setSelectedInterests(updated);
    if (update) update({ ...data, interests: updated, roles: selectedRoles });
  };

  const toggleRole = (item) => {
    const updated = selectedRoles.includes(item)
      ? selectedRoles.filter((r) => r !== item)
      : [...selectedRoles, item];

    setSelectedRoles(updated);
    if (update) update({ ...data, interests: selectedInterests, roles: updated });
  };

  return (
    <div className="space-y-8">
      {loadError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center justify-between">
          <span>Couldn't load options: {loadError}</span>
          <button type="button" onClick={load} className="font-semibold underline">Retry</button>
        </div>
      )}

      {/* Interests Section */}
      <div className="space-y-3">
        <h3 className="text-base font-medium text-gray-900">Interests</h3>
        <p className="text-xs text-gray-400">
          Select all that apply — we use these to recommend projects
        </p>

        <div className="flex flex-wrap gap-2.5 pt-1">
          {interestOptions.map((item) => {
            const isSelected = selectedInterests.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleInterest(item.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-50 border-2 border-blue-600 text-blue-600'
                    : 'bg-gray-50/50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preferred Roles Section */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-medium text-gray-900">Preferred Roles</h3>
        <p className="text-xs text-gray-400">
          Pick the roles you'd like to fill on a team
        </p>

        <div className="flex flex-wrap gap-2.5 pt-1">
          {roleOptions.map((item) => {
            const isSelected = selectedRoles.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleRole(item.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-50 border-2 border-blue-600 text-blue-600'
                    : 'bg-gray-50/50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
