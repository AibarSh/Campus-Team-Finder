import { useContext } from 'react';
import { UserContext } from '../context/UserContext';

export default function UserProfileSidebar() {
  const { user } = useContext(UserContext);

  return (
    <aside className="w-80 border-l border-gray-100 p-6 space-y-6 bg-white shrink-0 hidden xl:block">
      {/* Profile Card */}
      <div className="bg-gray-50/70 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-lg">
              {user?.initials || 'AB'}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">{user?.firstName} {user?.lastName}</h3>
              <p className="text-xs text-gray-400">{user?.major} · {user?.year}</p>
            </div>
          </div>
          <button className="text-xs text-blue-600 font-semibold hover:underline">Edit</button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500 font-medium">Profile completion</span>
            <span className="font-bold text-blue-600">{user?.completionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${user?.completionRate}%` }} />
          </div>
          <p className="text-[11px] text-blue-600 hover:underline cursor-pointer pt-1">
            + Add a GitHub link to reach 85%
          </p>
        </div>
      </div>

      {/* Top Skills */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Top skills</h4>
        <div className="flex flex-wrap gap-1.5">
          {user?.skills?.map((skill) => (
            <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Recent Invitations */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Invitations</h4>
          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center">
            2
          </span>
        </div>
      </div>
    </aside>
  );
}