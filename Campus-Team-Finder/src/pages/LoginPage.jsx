import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const context = useContext(UserContext);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!email.toLowerCase().endsWith('@kbtu.kz')) {
      setError('Please use your official @kbtu.kz email address');
      return;
    }

    // Set default user state if context exists
    if (context?.setUser) {
      context.setUser((prev) => ({
        ...prev,
        email: email,
      }));
    }

    // Navigate to dashboard or onboarding
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl text-white font-extrabold flex items-center justify-center text-xl mx-auto shadow-sm">
            K
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">Welcome to KBTU Connect</h1>
          <p className="text-xs text-gray-500">
            Find team members, join hackathons, and build projects together
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">
              KBTU Email
            </label>
            <input
              type="email"
              placeholder="a_bekova@kbtu.kz"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition shadow-sm"
          >
            Sign In
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center text-xs text-gray-500">
          First time here?{' '}
          <button
            onClick={() => navigate('/onboarding')}
            className="text-blue-600 font-semibold hover:underline"
          >
            Create your profile
          </button>
        </div>
      </div>
    </div>
  );
}