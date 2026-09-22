import { useState } from 'react';

const INTEREST_OPTIONS = [
  'Artificial Intelligence',
  'Web Development',
  'Mobile Development',
  'Game Development',
  'Data Science',
  'Blockchain / Web3',
  'IoT & Embedded',
  'Cybersecurity',
  'UI/UX Design',
  'Cloud Computing',
];

const ROLE_OPTIONS = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'UI/UX Designer',
  'ML Engineer',
  'Data Scientist',
  'Mobile Developer',
  'DevOps Engineer',
  'Project Manager',
  'QA Engineer',
];

export default function Step4_Interests({ data = {}, update }) {
  const [selectedInterests, setSelectedInterests] = useState(data.interests || []);
  const [selectedRoles, setSelectedRoles] = useState(data.roles || []);

  const toggleInterest = (item) => {
    const updated = selectedInterests.includes(item)
      ? selectedInterests.filter((i) => i !== item)
      : [...selectedInterests, item];

    setSelectedInterests(updated);
    if (update) update({ ...data, interests: updated, roles: selectedRoles });
  };

  const toggleRole = (item) => {
    const updated = selectedRoles.includes(item)
      ? selectedRoles.filter((r) => r !== item)
      : [...selectedRoles, item];

    setSelectedRoles(updated);
    if (update) update({ ...data, interests: selectedInterests, roles: updated });
  };

  return (
    <div className="space-y-8">
      {/* Interests Section */}
      <div className="space-y-3">
        <h3 className="text-base font-medium text-gray-900">Interests</h3>
        <p className="text-xs text-gray-400">
          Select all that apply — we use these to recommend projects
        </p>

        <div className="flex flex-wrap gap-2.5 pt-1">
          {INTEREST_OPTIONS.map((item) => {
            const isSelected = selectedInterests.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleInterest(item)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-50 border-2 border-blue-600 text-blue-600'
                    : 'bg-gray-50/50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preferred Roles Section */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-medium text-gray-900">Preferred Roles</h3>
        <p className="text-xs text-gray-400">
          Pick the roles you'd like to fill on a team
        </p>

        <div className="flex flex-wrap gap-2.5 pt-1">
          {ROLE_OPTIONS.map((item) => {
            const isSelected = selectedRoles.includes(item);
            return (
              <button
                key={item}
                type="button"
                onClick={() => toggleRole(item)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-blue-50 border-2 border-blue-600 text-blue-600'
                    : 'bg-gray-50/50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}