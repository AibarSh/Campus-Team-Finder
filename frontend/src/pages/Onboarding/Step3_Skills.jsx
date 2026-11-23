import { useEffect, useState } from 'react';
import { lookupApi } from '../../services/api';

const MIN_SKILLS = 2;

// Each level has its own color: green, blue, purple
const LEVELS = [
  { value: 'BEGINNER', label: 'Beginner', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { value: 'INTERMEDIATE', label: 'Intermediate', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { value: 'ADVANCED', label: 'Advanced', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
];
const levelOf = (value) => LEVELS.find((l) => l.value === value) || LEVELS[0];

// How many quick-add chips to show before the person starts typing
const QUICK_LIMIT = 14;

const idleStyle = { color: '#64748b', background: '#ffffff', borderColor: '#e2e8f0' };

function LevelButton({ level, selected, onClick, size = 'md' }) {
  const small = size === 'sm';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold transition-all ${
        small ? 'h-6 px-2 text-[11px]' : 'h-8 px-3 text-xs'
      }`}
      style={selected ? { color: level.color, background: level.bg, borderColor: level.color } : idleStyle}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: level.color }} />
      {level.label}
    </button>
  );
}

export default function Step3_Skills({ data = [], update, error }) {
  const [skills, setSkills] = useState(data);
  const [options, setOptions] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('INTERMEDIATE');
  const [editingId, setEditingId] = useState(null); // which added skill is changing its level

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

  const removeSkill = (id) => {
    if (editingId === id) setEditingId(null);
    change(skills.filter((s) => s.id !== id));
  };

  const changeLevel = (id, value) => {
    change(skills.map((s) => (s.id === id ? { ...s, level: value } : s)));
    setEditingId(null);
  };

  const q = query.trim().toLowerCase();
  const available = options.filter((o) => !skills.some((s) => s.id === o.id) && o.name.toLowerCase().includes(q));
  const suggestions = q ? available : available.slice(0, QUICK_LIMIT);

  // Add button / Enter: take an exact match, or the only remaining match
  const addFromQuery = () => {
    if (!q) return;
    const match = available.find((o) => o.name.toLowerCase() === q) || (available.length === 1 ? available[0] : null);
    if (match) addSkill(match);
  };

  const missing = Math.max(MIN_SKILLS - skills.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="skillSearch" className="block text-sm font-medium text-slate-700 mb-2">
          Add a skill <span className="text-red-500">*</span>
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
          <button
            type="button"
            onClick={addFromQuery}
            className="h-10 px-5 bg-blue-600 text-white text-sm rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Add
          </button>
        </div>

        {/* Level for the next skill you add */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs font-medium text-slate-500 mr-1">Level</span>
          {LEVELS.map((l) => (
            <LevelButton key={l.value} level={l} selected={level === l.value} onClick={() => setLevel(l.value)} />
          ))}
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
                <p className="text-xs text-slate-400">
                  {q ? `No skill matches “${query.trim()}”.` : 'No more skills to add.'}
                </p>
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
              const lv = levelOf(sk.level);
              const editing = editingId === sk.id;
              return (
                <div
                  key={sk.id}
                  className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border"
                  style={{ background: lv.bg, borderColor: lv.border }}
                >
                  <span className="text-sm font-semibold text-slate-800">{sk.name}</span>

                  {editing ? (
                    <div className="flex items-center gap-1">
                      {LEVELS.map((l) => (
                        <LevelButton
                          key={l.value}
                          level={l}
                          size="sm"
                          selected={sk.level === l.value}
                          onClick={() => changeLevel(sk.id, l.value)}
                        />
                      ))}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingId(sk.id)}
                      title="Change level"
                      aria-label={`Change level of ${sk.name} (currently ${lv.label})`}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full hover:opacity-80 transition-opacity"
                      style={{ color: lv.color, background: '#ffffffb3' }}
                    >
                      {lv.label}
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => removeSkill(sk.id)}
                    aria-label={`Remove ${sk.name}`}
                    className="text-slate-400 hover:text-red-500 transition-colors ml-0.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
          {missing > 0 && (
            <p role={error ? 'alert' : undefined} className={`text-xs mt-3 ${error ? 'text-red-500' : 'text-slate-400'}`}>
              Add {missing} more {missing === 1 ? 'skill' : 'skills'} to continue.
            </p>
          )}
        </div>
      ) : (
        <div
          role={error ? 'alert' : undefined}
          className={`border-2 border-dashed rounded-xl p-8 text-center ${
            error ? 'border-red-300 bg-red-50/40' : 'border-slate-200'
          }`}
        >
          <div className="text-2xl mb-2">⚡</div>
          <p className={`text-sm ${error ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
            Add at least {MIN_SKILLS} skills to help teams find you
          </p>
        </div>
      )}
    </div>
  );
}
