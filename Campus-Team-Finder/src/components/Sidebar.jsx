import { NavLink } from 'react-router-dom';

const sidebarItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'home' },
  { path: '/browse', label: 'Browse Teams', icon: 'users' },
  { path: '/applications', label: 'My Applications', icon: 'file-text' },
  // ... and others from image_6.png left panel
];

function Sidebar() {
  return (
    <aside className="w-64 border-r border-gray-100 bg-white p-6 sticky top-20 h-[calc(100vh-80px)]">
      <nav className="space-y-3">
        {sidebarItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 p-3 rounded-lg text-lg font-medium transition ${
                isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <i className={`fi fi-rs-${item.icon} text-lg`}></i>
            {item.label}
          </NavLink>
        ))}
      </nav>
      {/* Settings at the bottom */}
    </aside>
  );
}

export default Sidebar;