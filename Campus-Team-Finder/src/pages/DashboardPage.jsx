import { useContext, useEffect, useState } from 'react';
import { UserContext } from '../context/UserContext';
import { teamApi } from '../services/api';
import StatCard from '../components/StatCard';
import TeamCard from '../components/TeamCard';
import UserProfileSidebar from '../components/UserProfileSidebar';

export default function DashboardPage() {
  const { user } = useContext(UserContext);
  const [teams, setTeams] = useState([]);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState('');

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
    <div className="flex min-h-[calc(100vh-65px)]">
      <main className="flex-grow p-8 space-y-8">
        {/* Greeting Banner */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-950">
              Good morning, {user?.firstName || user?.name} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Here's what's happening with your team search today.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search teams, skills, events..."
                className="w-72 px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-600 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard number={activeCount} label="Active Applications" />
          <StatCard number={joinedCount} label="Teams Joined" />
        </div>

        {/* Recommended Teams Section */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-950">Recommended for you</h2>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {!error && teams.length === 0 && <p className="text-sm text-gray-500">No open teams yet.</p>}

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