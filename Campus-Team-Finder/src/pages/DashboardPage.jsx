import { useContext } from 'react';
import { UserContext } from '../context/UserContext';
import StatCard from '../components/StatCard';
import TeamCard from '../components/TeamCard';
import UserProfileSidebar from '../components/UserProfileSidebar';

export default function DashboardPage() {
  const { user, teams } = useContext(UserContext);

  return (
    <div className="flex min-h-[calc(100vh-65px)]">
      <main className="flex-grow p-8 space-y-8">
        {/* Greeting Banner */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-950">
              Good morning, {user?.firstName} 👋
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
            <button className="px-5 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition">
              + Create Team
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard number="3" label="Active Applications" detail="+1 this week" />
          <StatCard number="1" label="Teams Joined" detail="AI Study Buddy" />
          <StatCard number="47" label="Profile Views" detail="+12 this week" />
          <StatCard number="12" label="Skill Matches" detail="new this week" />
        </div>

        {/* Recommended Teams Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-950">Recommended for you</h2>
            <div className="flex gap-1.5">
              {['All', 'AI/ML', 'Mobile', 'Web3', 'EdTech'].map((filter, i) => (
                <button
                  key={filter}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    i === 0 ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

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