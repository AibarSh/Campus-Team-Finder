import { useState, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import kbtuLogo from '../assets/kbtu_connect_logo.svg';
import { UserContext } from '../context/UserContext';
import { initials } from '../lib/names';
import { NavigationLinks } from './Sidebar';

function Header({ showProgress = false, progressStep = 0 }) {
  const { user, logout } = useContext(UserContext);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigation = useRef(null);
  const navigate = useNavigate();

  const closeNavigation = () => navigation.current?.removeAttribute('open');

  const handleNavigationKey = (event) => {
    if (event.key === 'Escape' && navigation.current?.open) {
      closeNavigation();
      navigation.current.querySelector('summary')?.focus();
    }
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login');
  };

  // Define progress steps from the design (image_1 to image_5)
  const totalOnboardingSteps = 5;

  return (
    <header className="flex items-center justify-between gap-2 p-4 bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        {user && (
          <details ref={navigation} onKeyDown={handleNavigationKey} className="md:hidden shrink-0">
            <summary
              className="flex size-10 items-center justify-center rounded-lg text-slate-700 cursor-pointer list-none hover:bg-slate-100 [&::-webkit-details-marker]:hidden"
              onClick={() => setProfileOpen(false)}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="sr-only">Menu</span>
            </summary>
            <NavigationLinks
              onNavigate={closeNavigation}
              className="absolute inset-x-0 top-full max-h-[calc(100dvh-5rem)] overflow-y-auto bg-white border-b border-slate-100 px-3 py-2 space-y-0.5 shadow-lg"
            />
          </details>
        )}
        <img src={kbtuLogo} alt="KBTU Connect Logo" className="h-8" />
        <span className="text-base md:text-xl font-semibold text-gray-900">KBTU Connect</span>
      </div>

      {showProgress && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          Step {progressStep} of {totalOnboardingSteps}
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Render notification icon and profile circle like in image_6.png */}
        {user ? (
          <>
            <button className="hidden md:block text-gray-500 p-2 rounded-full hover:bg-gray-100">
              <i className="fi fi-rs-bell text-lg"></i> {/* Use an icon library */}
            </button>
            <div className="relative">
              <button
                onClick={() => {
                  closeNavigation();
                  setProfileOpen(!profileOpen);
                }}
                className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-lg"
              >
                {initials(user)}
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-12 py-2 bg-white shadow-xl border border-gray-100 rounded-2xl w-48">
                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}

export default Header;
