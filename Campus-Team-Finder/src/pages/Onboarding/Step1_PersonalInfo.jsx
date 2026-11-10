import { useState } from 'react';
import { initials } from '../../lib/names';

const inputClass =
  'w-full h-10 px-4 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all';

export default function Step1_PersonalInfo({ data = {}, update }) {
  const [firstName, setFirstName] = useState(data.firstName || '');
  const [lastName, setLastName] = useState(data.lastName || '');
  const [bio, setBio] = useState(data.bio || '');

  const handleFirstNameChange = (e) => {
    const val = e.target.value;
    setFirstName(val);
    if (update) update({ firstName: val, lastName, bio });
  };

  const handleLastNameChange = (e) => {
    const val = e.target.value;
    setLastName(val);
    if (update) update({ firstName, lastName: val, bio });
  };

  const handleBioChange = (e) => {
    const val = e.target.value.slice(0, 200);
    setBio(val);
    if (update) update({ firstName, lastName, bio: val });
  };

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-6">
        <div
          className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold select-none flex-shrink-0"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          {initials({ firstName, lastName }) || '?'}
        </div>
        <div>
          <div className="text-sm font-medium text-slate-700 mb-1">Profile avatar</div>
          <p className="text-xs text-slate-400">Your initials are shown to other students.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1.5">
            First Name
          </label>
          <input
            id="firstName"
            value={firstName}
            onChange={handleFirstNameChange}
            placeholder="Aisha"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1.5">
            Last Name
          </label>
          <input
            id="lastName"
            value={lastName}
            onChange={handleLastNameChange}
            placeholder="Bekova"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-slate-700 mb-1.5">
          Short Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={handleBioChange}
          placeholder="I'm a 3rd-year CS student passionate about AI and building products that matter…"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all resize-none"
        />
        <div className="flex justify-end mt-1">
          <span className="text-xs text-slate-400">{bio.length}/200</span>
        </div>
      </div>
    </div>
  );
}
