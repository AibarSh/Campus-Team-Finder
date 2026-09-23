import { useState } from 'react';
import { initials } from '../../lib/names';

export default function Step1_PersonalInfo({ data = {}, update }) {
  const [firstName, setFirstName] = useState(data.firstName || '');
  const [lastName, setLastName] = useState(data.lastName || '');
  const [bio, setBio] = useState(data.bio || '');

  const handleFirstNameChange = (e) => {
    const val = e.target.value;
    setFirstName(val);
    if (update) update({ ...data, firstName: val, lastName, bio });
  };

  const handleLastNameChange = (e) => {
    const val = e.target.value;
    setLastName(val);
    if (update) update({ ...data, firstName, lastName: val, bio });
  };

  const handleBioChange = (e) => {
    const val = e.target.value;
    if (val.length <= 200) {
      setBio(val);
      if (update) update({ ...data, firstName, lastName, bio: val });
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Photo Upload Section */}
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-blue-100/70 text-blue-600 flex items-center justify-center font-bold text-2xl border border-blue-200 shrink-0">
          {initials({ firstName, lastName })}
        </div>
        <p className="text-xs text-gray-400">Your initials are shown to other students.</p>
      </div>

      {/* Name Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">First Name</label>
          <input
            type="text"
            placeholder="Aisha"
            value={firstName}
            onChange={handleFirstNameChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">Last Name</label>
          <input
            type="text"
            placeholder="Bekova"
            value={lastName}
            onChange={handleLastNameChange}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
          />
        </div>
      </div>

      {/* Short Bio Area */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-900">Short Bio</label>
        <div className="relative">
          <textarea
            rows={4}
            placeholder="I'm a 3rd-year CS student passionate about AI and building products that matter..."
            value={bio}
            onChange={handleBioChange}
            className="w-full p-4 rounded-2xl border border-gray-200 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition resize-none placeholder-gray-400"
          />
          <div className="text-right text-xs text-gray-400 mt-1 font-medium">
            {bio.length}/200
          </div>
        </div>
      </div>
    </div>
  );
}
