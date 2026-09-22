import { useState } from 'react';
import kbtuLogo from '../assets/kbtu_connect_logo.svg';

function Header({ user, showProgress = false, progressStep = 0 }) {
  const [profileOpen, setProfileOpen] = useState(false);

  // Define progress steps from the design (image_1 to image_5)
  const totalOnboardingSteps = 5;

  return (
    <header className="flex items-center justify-between p-4 bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <img src={kbtuLogo} alt="KBTU Connect Logo" className="h-8" />
        <span className="text-xl font-semibold text-gray-900">KBTU Connect</span>
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
            <button className="text-gray-500 p-2 rounded-full hover:bg-gray-100">
              <i className="fi fi-rs-bell text-lg"></i> {/* Use an icon library */}
            </button>
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-10 h-10 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-lg"
              >
                {/* Dynamically render user initials from Context */}
                {user.initials || "AB"}
              </button>
              {profileOpen && <div className="absolute right-0 top-12 p-4 bg-white shadow-xl border rounded-lg w-48">Profile Menu</div>}
            </div>
          </>
        ) : (
          /* For Onboarding/Login headers */
          <>
            <button className="text-gray-700 hover:text-blue-600">Make a copy</button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Share</button>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;