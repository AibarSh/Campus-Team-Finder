import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import { teamApi } from '../services/api';
import TeamCard from '../components/TeamCard';
import UserProfileSidebar from '../components/UserProfileSidebar';

const heading = { fontFamily: 'Outfit, sans-serif' };

function StatTile({ value, label, hint, emoji, iconBg, hintColor }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-xl mb-3"
        style={{ background: iconBg }}
      >
        {emoji}
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-0.5" style={heading}>
        {value}
      </div>
      <div className="text-sm text-slate-600 font-medium">{label}</div>
      <div className="text-xs mt-1" style={{ color: hintColor }}>
        {hint}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useContext(UserContext);
  const [teams, setTeams] = useState([]);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/browse?role=${encodeURIComponent(q)}` : '/browse');
  };

  useEffect(() => {
    Promise.all([teamApi.getTeams(), teamApi.getMyApplications()])
      .then(([t, a]) => {
        setTeams(t);
        setApplications(a);
      })
      .catch((err) => setError(err.message));
  }, []);

  const activeCount = applications.filter((a) => a.status === 'SENT' || a.status === 'VIEWED').length;
  const joinedCount = applications.filter((a) => a.status === 'ACCEPTED').length;

  return (
    <div className="flex min-h-[calc(100vh-65px)] bg-slate-50">
      <main className="flex-grow p-8 space-y-8 min-w-0">
        {/* Welcome */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-slate-900 text-2xl font-bold" style={heading}>
              Good morning, {user?.firstName || user?.name} 👋
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Here's what's happening with your team search today.</p>
          </div>

          <div className="flex gap-3 flex-shrink-0">
            <Link
              to="/browse"
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Teams
            </Link>
            <Link
              to="/teams/new"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Team
            </Link>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teams by role..."
            aria-label="Search teams by role"
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
          />
        </form>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatTile
            value={activeCount}
            label="Active Applications"
            hint="Waiting for a response"
            emoji="📋"
            iconBg="#eff6ff"
            hintColor="#2563eb"
          />
          <StatTile
            value={joinedCount}
            label="Teams Joined"
            hint="Accepted applications"
            emoji="👥"
            iconBg="#f0fdf4"
            hintColor="#059669"
          />
        </div>

        {/* Recommended */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-900 font-bold" style={heading}>
              Recommended for you
            </h2>
            {teams.length > 2 && (
              <Link to="/browse" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                See all {teams.length} teams
              </Link>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {!error && teams.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-slate-700 font-semibold mb-1">No open teams yet</div>
              <div className="text-slate-400 text-sm">Check back soon, or create your own team.</div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {teams.slice(0, 2).map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </section>
      </main>

      <UserProfileSidebar />
    </div>
  );
}
