import { useEffect, useState } from 'react';
import { lookupApi } from '../../services/api';

const LEVELS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];
const LEVEL_COLORS = {
  BEGINNER: '#64748b',
  INTERMEDIATE: '#0891b2',
  ADVANCED: '#7c3aed',
};
const levelLabel = (value) => LEVELS.find((l) => l.value === value)?.label || value;

// How many quick-add chips to show before the person starts typing
const QUICK_LIMIT = 14;

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

  const q = query.trim().toLowerCase();
  const available = options.filter((o) => !skills.some((s) => s.id === o.id) && o.name.toLowerCase().includes(q));
  const suggestions = q ? available : available.slice(0, QUICK_LIMIT);

  // Add button / Enter: take an exact match, or the only remaining match
  const addFromQuery = () => {
    if (!q) return;
    const match = available.find((o) => o.name.toLowerCase() === q) || (available.length === 1 ? available[0] : null);
    if (match) addSkill(match);
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="skillSearch" className="block text-sm font-medium text-slate-700 mb-2">
          Add a skill
        </label>
        <div className="flex gap-2">
          <input
            id="skillSearch"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addFromQuery();
              }
            }}
            placeholder="e.g. React, Python, Figma…"
            className="flex-1 min-w-0 h-10 px-4 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
          />
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            aria-label="Proficiency"
            className="h-10 px-3 rounded-xl border border-slate-200 text-slate-700 text-sm outline-none focus:border-blue-400 bg-white"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addFromQuery}
            className="h-10 px-5 bg-blue-600 text-white text-sm rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Add
          </button>
        </div>

        <div className="mt-4">
          {loadError ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center justify-between">
              <span>Couldn't load skills: {loadError}</span>
              <button type="button" onClick={load} className="font-semibold underline">
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="text-xs text-slate-400 mb-2">{q ? 'Matching skills' : 'Quick-add skills'}</div>
              {suggestions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => addSkill(option)}
                      className="px-3 py-1 bg-slate-100 text-slate-600 text-xs rounded-full hover:bg-slate-200 transition-colors"
                    >
                      + {option.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">{q ? `No skill matches “${query.trim()}”.` : 'No more skills to add.'}</p>
              )}
            </>
          )}
        </div>
      </div>

      {skills.length > 0 ? (
        <div>
          <div className="text-sm font-medium text-slate-700 mb-3">Your skills ({skills.length})</div>
          <div className="flex flex-wrap gap-2">
            {skills.map((sk) => {
              const color = LEVEL_COLORS[sk.level] || LEVEL_COLORS.BEGINNER;
              return (
                <div
                  key={sk.id}
                  className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <span className="text-sm font-medium text-slate-800">{sk.name}</span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ color, background: color + '18' }}
                  >
                    {levelLabel(sk.level)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSkill(sk.id)}
                    aria-label={`Remove ${sk.name}`}
                    className="text-slate-300 hover:text-slate-500 transition-colors ml-0.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
          <div className="text-2xl mb-2">⚡</div>
          <p className="text-sm text-slate-500">Add at least 2 skills to help teams find you</p>
        </div>
      )}
    </div>
  );
}
