import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../context/UserContext';
import { profileApi } from '../services/api';
import { displayName, initials } from '../lib/names';

export default function UserProfileSidebar() {
  const { user } = useContext(UserContext);
  const [skills, setSkills] = useState([]);

  useEffect(() => {
    profileApi
      .getProfile()
      .then((profile) => setSkills(profile.skills.map((s) => s.skill.name)))
      .catch(() => setSkills([]));
  }, []);

  return (
    <aside className="w-80 border-l border-gray-100 p-6 space-y-6 bg-white shrink-0 hidden xl:block">
      <div className="bg-gray-50/70 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-lg">
            {initials(user)}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">{displayName(user)}</h3>
            <p className="text-xs text-gray-400">
              {[user?.faculty, user?.studyYear].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Top skills</h4>
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">
              {skill}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
