import { useState } from 'react';

const AVAILABILITY_OPTIONS = [
  { id: 'less-5', title: 'Less than 5 hrs/week', subtitle: 'Light commitment' },
  { id: '5-10', title: '5–10 hrs/week', subtitle: 'Part-time' },
  { id: '10-20', title: '10–20 hrs/week', subtitle: 'Dedicated' },
  { id: '20-plus', title: '20+ hrs/week', subtitle: 'Full-time hackathon' },
];

export default function Step5_Availability({ data = {}, update }) {
  const [selectedAvailability, setSelectedAvailability] = useState(data.availability || '');
  const [links, setLinks] = useState(
    data.links || { github: '', linkedin: '', telegram: '' }
  );

  const handleSelectAvailability = (id) => {
    setSelectedAvailability(id);
    if (update) update({ ...data, availability: id, links });
  };

  const handleLinkChange = (field, value) => {
    const updatedLinks = { ...links, [field]: value };
    setLinks(updatedLinks);
    if (update) update({ ...data, availability: selectedAvailability, links: updatedLinks });
  };

  return (
    <div className="space-y-8">
      {/* Weekly Availability Grid */}
      <div className="space-y-3">
        <h3 className="text-base font-medium text-gray-900">Weekly Availability</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {AVAILABILITY_OPTIONS.map((opt) => {
            const isSelected = selectedAvailability === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => handleSelectAvailability(opt.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-2 border-blue-600 bg-blue-50/30'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <h4 className="font-bold text-gray-900 text-sm">{opt.title}</h4>
                <p className="text-xs text-gray-400 mt-1">{opt.subtitle}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Social & Professional Links */}
      <div className="space-y-4 pt-2">
        <h3 className="text-base font-medium text-gray-900">Social & Professional Links</h3>

        <div className="space-y-3">
          {/* GitHub Input */}
          <div className="flex items-center border border-gray-200 rounded-2xl overflow-hidden focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition">
            <div className="bg-gray-900 text-white font-bold px-4 py-3.5 flex items-center justify-center text-xs w-12 shrink-0">
              GH
            </div>
            <input
              type="text"
              placeholder="github.com/username"
              value={links.github}
              onChange={(e) => handleLinkChange('github', e.target.value)}
              className="w-full px-4 py-3 text-sm text-gray-900 outline-none placeholder-gray-400"
            />
          </div>

          {/* LinkedIn Input */}
          <div className="flex items-center border border-gray-200 rounded-2xl overflow-hidden focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition">
            <div className="bg-blue-600 text-white font-bold px-4 py-3.5 flex items-center justify-center text-xs w-12 shrink-0">
              in
            </div>
            <input
              type="text"
              placeholder="linkedin.com/in/username"
              value={links.linkedin}
              onChange={(e) => handleLinkChange('linkedin', e.target.value)}
              className="w-full px-4 py-3 text-sm text-gray-900 outline-none placeholder-gray-400"
            />
          </div>

          {/* Telegram Input */}
          <div className="flex items-center border border-gray-200 rounded-2xl overflow-hidden focus-within:border-blue-600 focus-within:ring-1 focus-within:ring-blue-600 transition">
            <div className="bg-sky-500 text-white font-bold px-4 py-3.5 flex items-center justify-center text-xs w-12 shrink-0">
              TG
            </div>
            <input
              type="text"
              placeholder="@username"
              value={links.telegram}
              onChange={(e) => handleLinkChange('telegram', e.target.value)}
              className="w-full px-4 py-3 text-sm text-gray-900 outline-none placeholder-gray-400"
            />
          </div>
        </div>

        <p className="text-xs text-gray-400">
          All links are optional but help teams learn more about you
        </p>
      </div>
    </div>
  );
}