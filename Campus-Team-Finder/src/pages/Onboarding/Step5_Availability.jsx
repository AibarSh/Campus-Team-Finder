import { useState } from 'react';
import { AVAILABILITY_OPTIONS } from '../../lib/profileOptions';

const LINK_FIELDS = [
  { key: 'github', placeholder: 'github.com/username', icon: 'GH', bg: '#24292e', label: 'GitHub' },
  { key: 'linkedin', placeholder: 'linkedin.com/in/username', icon: 'in', bg: '#0077b5', label: 'LinkedIn' },
  { key: 'telegram', placeholder: '@username', icon: 'TG', bg: '#2aabee', label: 'Telegram' },
];

export default function Step5_Availability({ data = {}, update }) {
  const [availability, setAvailability] = useState(data.availability || '');
  const [links, setLinks] = useState({ github: '', linkedin: '', telegram: '', ...(data.links || {}) });

  const handleSelectAvailability = (id) => {
    setAvailability(id);
    if (update) update({ availability: id, links });
  };

  const handleLinkChange = (field, value) => {
    const next = { ...links, [field]: value };
    setLinks(next);
    if (update) update({ availability, links: next });
  };

  return (
    <div className="space-y-7">
      <div>
        <div className="block text-sm font-medium text-slate-700 mb-3">Weekly Availability</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AVAILABILITY_OPTIONS.map((opt) => {
            const selected = availability === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectAvailability(opt.id)}
                aria-pressed={selected}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selected
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className={`text-sm font-semibold ${selected ? 'text-blue-700' : 'text-slate-800'}`}>
                  {opt.title}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{opt.subtitle}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="block text-sm font-medium text-slate-700 mb-3">Social & Professional Links</div>
        <div className="space-y-3">
          {LINK_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: field.bg }}
                aria-hidden="true"
              >
                {field.icon}
              </div>
              <input
                value={links[field.key]}
                onChange={(e) => handleLinkChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                aria-label={field.label}
                className="flex-1 h-10 px-4 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3">All links are optional but help teams learn more about you</p>
      </div>
    </div>
  );
}
