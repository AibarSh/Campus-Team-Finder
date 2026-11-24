import { useEffect, useState } from 'react';
import { lookupApi } from '../../services/api';

const MAX_SKILL_NAME_LENGTH = 200;
const normalizeName = (name) => name.trim().toLowerCase();

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

export default function Step3_Skills({ data = [], minSkills, update, error }) {
  const [skills, setSkills] = useState(data);
  const [catalog, setCatalog] = useState({ status: 'loading' });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('INTERMEDIATE');
  const [editingName, setEditingName] = useState(null);

  useEffect(() => {
    let active = true;
    lookupApi
      .getSkills()
      .then((options) => {
        if (active) setCatalog({ status: 'ready', options });
      })
      .catch((err) => {
        if (active) setCatalog({ status: 'error', message: err.message });
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const retry = () => {
    setCatalog({ status: 'loading' });
    setLoadAttempt((attempt) => attempt + 1);
  };

  const change = (next) => {
    setSkills(next);
    if (update) update(next);
  };

  const addSkill = (option) => {
    change([...skills, { id: option.id, name: option.name, level }]);
    setQuery('');
  };

  const removeSkill = (name) => {
    if (editingName === name) setEditingName(null);
    change(skills.filter((s) => s.name !== name));
  };

  const changeLevel = (name, value) => {
    change(skills.map((s) => (s.name === name ? { ...s, level: value } : s)));
    setEditingName(null);
  };

  const name = query.trim();
  const q = normalizeName(name);
  const addedNames = new Set(skills.map((skill) => normalizeName(skill.name)));
  const duplicate = addedNames.has(q);
  const options = catalog.status === 'ready' ? catalog.options : [];
  const available = options.filter((o) => {
    const normalized = normalizeName(o.name);
    return normalized.includes(q) && !addedNames.has(normalized);
  });
  const suggestions = q ? available : available.slice(0, QUICK_LIMIT);
  const match = available.find((o) => normalizeName(o.name) === q);
  const canAdd = Boolean(q && !duplicate && catalog.status === 'ready');

  const addFromQuery = () => {
    if (canAdd) addSkill(match ?? { id: null, name });
  };

  const missing = Math.max(minSkills - skills.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="skillSearch" className="block text-sm font-medium text-slate-700 mb-2">
          Add a skill {minSkills > 0 && <span className="text-red-500">*</span>}
        </label>
        <div className="flex gap-2">
          <input
            id="skillSearch"
            aria-describedby="skillSearchHint"
            value={query}
            maxLength={MAX_SKILL_NAME_LENGTH}
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
            disabled={!canAdd}
            className="h-10 px-5 bg-blue-600 text-white text-sm rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <p id="skillSearchHint" className="mt-2 text-xs text-slate-500">
          Choose a suggestion or type a skill of your own and select Add.
        </p>
        {duplicate && <p role="status" className="mt-1 text-xs text-slate-600">You already added this skill.</p>}

        {/* Level for the next skill you add */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs font-medium text-slate-500 mr-1">Level</span>
          {LEVELS.map((l) => (
            <LevelButton key={l.value} level={l} selected={level === l.value} onClick={() => setLevel(l.value)} />
          ))}
        </div>

        <div className="mt-4">
          {catalog.status === 'loading' ? (
            <p role="status" className="text-xs text-slate-500">Loading skills…</p>
          ) : catalog.status === 'error' || options.length === 0 ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center justify-between gap-3">
              <span role="alert">
                {catalog.status === 'error'
                  ? `Couldn't load skills: ${catalog.message}`
                  : 'The skills catalog is empty. You can still add your own skill.'}
              </span>
              <button type="button" onClick={retry} className="font-semibold underline">
                Retry
              </button>
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <div className="text-xs text-slate-400 mb-2">{q ? 'Matching skills' : 'Quick-add skills'}</div>
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
            </>
          ) : !q && <p className="text-xs text-slate-400">No more skills to add.</p>}
        </div>
      </div>

      {skills.length > 0 ? (
        <div>
          <div className="text-sm font-medium text-slate-700 mb-3">Your skills ({skills.length})</div>
          <div className="flex flex-wrap gap-2">
            {skills.map((sk) => {
              const lv = levelOf(sk.level);
              const editing = editingName === sk.name;
              return (
                <div
                  key={sk.name}
                  className="flex min-w-0 max-w-full flex-wrap items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl border"
                  style={{ background: lv.bg, borderColor: lv.border }}
                >
                  <span className="min-w-0 wrap-anywhere text-sm font-semibold text-slate-800">{sk.name}</span>

                  {editing ? (
                    <div className="flex flex-wrap items-center gap-1">
                      {LEVELS.map((l) => (
                        <LevelButton
                          key={l.value}
                          level={l}
                          size="sm"
                          selected={sk.level === l.value}
                          onClick={() => changeLevel(sk.name, l.value)}
                        />
                      ))}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingName(sk.name)}
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
                    onClick={() => removeSkill(sk.name)}
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
            {minSkills > 0 ? `Add at least ${minSkills} skills to help teams find you` : 'You have no skills on your profile yet.'}
          </p>
        </div>
      )}
    </div>
  );
}
