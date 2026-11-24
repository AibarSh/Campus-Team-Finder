import { useId, useState } from 'react';

const normalize = (name) => name.trim().toLowerCase();

export default function RequiredSkillsInput({ skills, onChange, catalog }) {
  const id = useId();
  const [query, setQuery] = useState('');
  const name = query.trim();
  const normalized = normalize(name);
  const added = new Set(skills.map(normalize));
  const duplicate = added.has(normalized);
  const exact = catalog.options.find((option) => normalize(option.name) === normalized);
  const suggestions = normalized ? catalog.options.filter((option) => {
    const candidate = normalize(option.name);
    return candidate.includes(normalized) && !added.has(candidate);
  }).slice(0, 8) : [];

  const add = (value) => {
    if (!value || added.has(normalize(value))) return;
    onChange([...skills, value]);
    setQuery('');
  };

  return (
    <div className="min-w-0 space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        Required Skills <span className="font-normal text-slate-500">(optional)</span>
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          aria-describedby={`${id}-hint`}
          value={query}
          maxLength={200}
          placeholder="e.g. Python"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add(exact?.name ?? name);
            }
          }}
          className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400"
        />
        <button
          type="button"
          onClick={() => add(exact?.name ?? name)}
          disabled={!name || duplicate}
          className="rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
        >
          Add
        </button>
      </div>
      <p id={`${id}-hint`} className="text-xs text-slate-500">Choose a suggestion or add your own skill.</p>
      {catalog.loading && <p role="status" className="text-xs text-slate-500">Loading skill suggestions…</p>}
      {catalog.error && <p role="status" className="text-xs text-slate-500">Skill suggestions are unavailable.</p>}
      {duplicate && <p role="status" className="text-xs text-slate-500">This skill is already required.</p>}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Skill suggestions">
          {suggestions.map(({ id: skillId, name: suggestion }) => (
            <button
              key={skillId}
              type="button"
              onClick={() => add(suggestion)}
              className="max-w-full wrap-anywhere rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <button
            key={skill}
            type="button"
            aria-label={`Remove ${skill}`}
            onClick={() => onChange(skills.filter((value) => value !== skill))}
            className="max-w-full wrap-anywhere rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            {skill} <span aria-hidden="true">×</span>
          </button>
        ))}
      </div>
    </div>
  );
}
