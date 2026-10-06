import { useContext } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { UserContext } from '../context/UserContext';

const iconPaths = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  document:
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  users:
    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  add: 'M12 4v16m8-8H4',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
};

function Icon({ name }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={iconPaths[name]} />
    </svg>
  );
}

const sidebarItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'home' },
  { path: '/browse', label: 'Browse Teams', icon: 'search' },
  { path: '/applications', label: 'My Applications', icon: 'document' },
  { path: '/my-teams', label: 'My Teams', icon: 'users' },
  { path: '/teams/new', label: 'Create Team', icon: 'add' },
  { path: '/profile', label: 'Profile', icon: 'user' },
];

function Sidebar() {
  const { user } = useContext(UserContext);
  const name = user?.firstName ? [user.firstName, user.lastName].filter(Boolean).join(' ') : user?.name;

  return (
    <aside className="w-64 border-r border-slate-100 bg-white sticky top-20 h-[calc(100vh-80px)] flex flex-col">
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {sidebarItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}>
                  <Icon name={item.icon} />
                </span>
                <span className="flex-1 text-left">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className="p-4 border-t border-slate-100">
          <Link
            to="/profile"
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">{name}</div>
              {user.faculty && <div className="text-xs text-slate-400 truncate">{user.faculty}</div>}
            </div>
            <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;