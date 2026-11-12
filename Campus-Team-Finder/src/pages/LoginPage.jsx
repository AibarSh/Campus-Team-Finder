import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { authApi } from '../services/api';

const heading = { fontFamily: 'Outfit, sans-serif' };

function NetworkIllustration() {
  return (
    <svg viewBox="0 0 420 320" className="w-full max-w-lg" aria-hidden="true">
      <line x1="210" y1="160" x2="110" y2="100" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="210" y1="160" x2="310" y2="100" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="210" y1="160" x2="80" y2="210" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="210" y1="160" x2="330" y2="220" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="210" y1="160" x2="170" y2="60" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="110" y1="100" x2="80" y2="210" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line x1="310" y1="100" x2="330" y2="220" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

      <circle cx="210" cy="160" r="46" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
      <circle cx="210" cy="160" r="34" fill="rgba(255,255,255,0.18)" />
      <text x="210" y="154" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" style={heading}>You</text>
      <text x="210" y="170" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="9.5">CS · 3rd year</text>

      <circle cx="110" cy="100" r="30" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <text x="110" y="95" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">Damir</text>
      <text x="110" y="108" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="8.5">ML Eng</text>

      <circle cx="310" cy="100" r="30" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <text x="310" y="95" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">Zarina</text>
      <text x="310" y="108" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="8.5">UI/UX</text>

      <circle cx="80" cy="210" r="26" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <text x="80" y="205" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="600">Ali</text>
      <text x="80" y="218" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="8">Backend</text>

      <circle cx="330" cy="220" r="26" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      <text x="330" y="215" textAnchor="middle" fill="white" fontSize="9.5" fontWeight="600">Kamila</text>
      <text x="330" y="228" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="8">PM</text>

      <circle cx="170" cy="60" r="22" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
      <text x="170" y="55" textAnchor="middle" fill="white" fontSize="9" fontWeight="600">Asel</text>
      <text x="170" y="67" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="8">Frontend</text>
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('Please enter your email');
      return;
    }

    if (!email.toLowerCase().endsWith('@kbtu.kz')) {
      setError('Please use your official @kbtu.kz email address');
      return;
    }

    setSubmitting(true);
    try {
      const { user } = await authApi.devLogin(email);
      setUser(user);
      navigate(user.profileComplete ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex w-[52%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 45%, #2563eb 100%)' }}
      >
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white opacity-[0.04]" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-blue-400 opacity-[0.08]" />
        <div className="absolute top-1/3 right-8 w-40 h-40 rounded-full bg-white opacity-[0.04]" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-blue-700 font-black text-lg" style={heading}>K</span>
          </div>
          <div>
            <div className="text-white font-bold text-xl leading-tight" style={heading}>KBTU Connect</div>
            <div className="text-blue-300 text-xs">Kazakh-British Technical University</div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <NetworkIllustration />
          <div>
            <h2 className="text-white text-[2rem] font-bold leading-tight" style={heading}>
              Find your dream team,<br />build the future.
            </h2>
            <p className="text-blue-200 mt-3 text-base leading-relaxed max-w-sm">
              Connect with talented KBTU students, form hackathon teams, and win competitions together.
            </p>
          </div>
        </div>

        {/* Static marketing numbers from the design — replace with real stats if you have an endpoint */}
        {/* <div className="relative z-10 flex gap-8">
          {[
            { value: '1,240+', label: 'Students' },
            { value: '86', label: 'Active Teams' },
            { value: '34', label: 'Hackathons Won' },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-white text-2xl font-bold" style={heading}>{s.value}</div>
              <div className="text-blue-300 text-sm">{s.label}</div>
            </div>
          ))}
        </div> */}
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[360px]">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold" style={heading}>K</span>
            </div>
            <span className="text-slate-900 font-bold text-lg" style={heading}>KBTU Connect</span>
          </div>

          <div className="mb-8">
            <h1 className="text-slate-900 text-[1.75rem] font-bold mb-1.5" style={heading}>Welcome!</h1>
            <p className="text-slate-500 text-sm">Sign in with your KBTU university account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                University Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="yourname@kbtu.kz"
                className={`w-full h-11 px-4 rounded-xl border bg-white text-slate-900 text-sm placeholder-slate-400 outline-none transition-all ${
                  error
                    ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50'
                    : 'border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50'
                }`}
              />
              {error && (
                <p role="alert" className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl transition-colors text-sm shadow-sm shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Signing in...' : 'Sign In to KBTU Connect'}
              {!submitting && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">Development login — no password required</p>
        </div>
      </div>
    </div>
  );
}
