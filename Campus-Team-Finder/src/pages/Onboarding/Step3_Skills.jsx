import { useEffect, useState } from 'react';
import { lookupApi } from '../../services/api';

const LEVELS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];
const levelLabel = (value) => LEVELS.find((l) => l.value === value)?.label || value;

export default function Step3_Skills({ data = [], update }) {
  const [skills, setSkills] = useState(data);
  const [options, setOptions] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('INTERMEDIATE');

  const load = () => {
    setLoadError('');
    lookupApi.getSkills().then(setOptions).catch((err) => setLoadError(err.message));
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load-once is intended
  useEffect(load, []);

  const change = (next) => {
    setSkills(next);
    if (update) update(next);
  };

  const addSkill = (option) => {
    if (skills.some((s) => s.id === option.id)) return;
    change([...skills, { id: option.id, name: option.name, level }]);
    setQuery('');
  };

  const removeSkill = (id) => change(skills.filter((s) => s.id !== id));

  const available = options.filter(
    (o) => !skills.some((s) => s.id === o.id) && o.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">Add a skill</label>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search skills..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-grow px-4 py-3 rounded-2xl border border-gray-200 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
          />
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            aria-label="Proficiency"
            className="px-4 py-3 rounded-2xl border border-gray-200 text-sm bg-white outline-none text-gray-700 cursor-pointer"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loadError ? (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center justify-between">
          <span>Couldn't load skills: {loadError}</span>
          <button type="button" onClick={load} className="font-semibold underline">Retry</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => addSkill(option)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition"
            >
              + {option.name}
            </button>
          ))}
        </div>
      )}

      {skills.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center space-y-2 my-4">
          <div className="text-amber-500 text-xl font-bold">⚡</div>
          <p className="text-sm text-gray-500 font-medium">Add at least 2 skills to help teams find you</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5 pt-4">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-semibold text-blue-700"
            >
              <span>{skill.name}</span>
              <span className="text-blue-400 font-normal">({levelLabel(skill.level)})</span>
              <button type="button" onClick={() => removeSkill(skill.id)} className="hover:text-red-500 ml-1" aria-label={`Remove ${skill.name}`}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
