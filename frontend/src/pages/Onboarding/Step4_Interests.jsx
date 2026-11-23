import { useEffect, useState } from 'react';
import { lookupApi } from '../../services/api';

const MAX_CUSTOM = 10;
const MAX_LENGTH = 40;

// Static class names so Tailwind picks them up
const ACCENTS = {
  blue: {
    on: 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-200',
    add: 'bg-blue-600 hover:bg-blue-700',
    focus: 'focus:border-blue-400 focus:ring-2 focus:ring-blue-50',
  },
  emerald: {
    on: 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-200',
    add: 'bg-emerald-500 hover:bg-emerald-600',
    focus: 'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50',
  },
};

function ChipPicker({
  id,
  title,
  hint,
  addLabel,
  placeholder,
  accent,
  options,
  selectedIds,
  onToggle,
  custom,
  onAddCustom,
  onRemoveCustom,
}) {
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');
  const a = ACCENTS[accent];

  const submit = () => {
    const name = input.trim().replace(/\s+/g, ' ');
    if (!name) return;
    const problem = onAddCustom(name);
    if (problem) {
      setMessage(problem);
      return;
    }
    setMessage('');
    setInput('');
  };

  return (
    <div>
      <div className="block text-sm font-medium text-slate-700 mb-1">{title}</div>
      <p className="text-xs text-slate-400 mb-3">{hint}</p>

      <div className="flex flex-wrap gap-2">
        {options.map((item) => {
          const selected = selectedIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              aria-pressed={selected}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                selected ? a.on : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
              }`}
            >
              {item.name}
            </button>
          );
        })}

        {custom.map((name) => (
          <span
            key={name}
            className={`inline-flex items-center gap-2 pl-4 pr-2.5 py-2 rounded-xl border text-sm font-medium ${a.on}`}
          >
            {name}
            <button
              type="button"
              onClick={() => onRemoveCustom(name)}
              aria-label={`Remove ${name}`}
              className="opacity-80 hover:opacity-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>

      {/* Add your own */}
      <div className="mt-4">
        <label htmlFor={id} className="block text-xs font-medium text-slate-500 mb-1.5">
          {addLabel}
        </label>
        <div className="flex gap-2">
          <input
            id={id}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setMessage('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            maxLength={MAX_LENGTH + 10}
            placeholder={placeholder}
            className={`flex-1 min-w-0 h-10 px-4 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder-slate-400 outline-none transition-all ${a.focus}`}
          />
          <button
            type="button"
            onClick={submit}
            className={`h-10 px-5 text-white text-sm rounded-xl font-medium transition-colors ${a.add}`}
          >
            Add
          </button>
        </div>
        {message && (
          <p role="alert" className="mt-1.5 text-xs text-red-500">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Step4_Interests({ data = {}, update }) {
  const [selectedInterests, setSelectedInterests] = useState(data.interests || []);
  const [selectedRoles, setSelectedRoles] = useState(data.roles || []);
  const [customInterests, setCustomInterests] = useState(data.customInterests || []);
  const [customRoles, setCustomRoles] = useState(data.customRoles || []);
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

  const toggle = (list, setList, key) => (id) => {
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    setList(next);
    update?.({ [key]: next });
  };

  // Returns an error message, or null when the entry was accepted.
  // Typing a name that already exists in the list just selects that option.
  const makeAdder = ({ options, selected, setSelected, selectedKey, custom, setCustom, customKey }) => (name) => {
    if (name.length > MAX_LENGTH) return `Keep it under ${MAX_LENGTH} characters.`;

    const match = options.find((o) => o.name.toLowerCase() === name.toLowerCase());
    if (match) {
      if (!selected.includes(match.id)) {
        const next = [...selected, match.id];
        setSelected(next);
        update?.({ [selectedKey]: next });
      }
      return null;
    }

    if (custom.some((c) => c.toLowerCase() === name.toLowerCase())) return 'You already added that.';
    if (custom.length >= MAX_CUSTOM) return `You can add up to ${MAX_CUSTOM} of your own.`;

    const next = [...custom, name];
    setCustom(next);
    update?.({ [customKey]: next });
    return null;
  };

  const makeRemover = (custom, setCustom, customKey) => (name) => {
    const next = custom.filter((c) => c !== name);
    setCustom(next);
    update?.({ [customKey]: next });
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

      <ChipPicker
        id="customInterest"
        title="Interests"
        hint="Select all that apply — we use these to recommend projects"
        addLabel="Not listed? Add your own interest"
        placeholder="e.g. Robotics, Fintech…"
        accent="blue"
        options={interestOptions}
        selectedIds={selectedInterests}
        onToggle={toggle(selectedInterests, setSelectedInterests, 'interests')}
        custom={customInterests}
        onAddCustom={makeAdder({
          options: interestOptions,
          selected: selectedInterests,
          setSelected: setSelectedInterests,
          selectedKey: 'interests',
          custom: customInterests,
          setCustom: setCustomInterests,
          customKey: 'customInterests',
        })}
        onRemoveCustom={makeRemover(customInterests, setCustomInterests, 'customInterests')}
      />

      <ChipPicker
        id="customRole"
        title="Preferred Roles"
        hint="Pick the roles you'd like to fill on a team"
        addLabel="Not listed? Add your own role"
        placeholder="e.g. Technical Writer, Game Designer…"
        accent="emerald"
        options={roleOptions}
        selectedIds={selectedRoles}
        onToggle={toggle(selectedRoles, setSelectedRoles, 'roles')}
        custom={customRoles}
        onAddCustom={makeAdder({
          options: roleOptions,
          selected: selectedRoles,
          setSelected: setSelectedRoles,
          selectedKey: 'roles',
          custom: customRoles,
          setCustom: setCustomRoles,
          customKey: 'customRoles',
        })}
        onRemoveCustom={makeRemover(customRoles, setCustomRoles, 'customRoles')}
      />
    </div>
  );
}
