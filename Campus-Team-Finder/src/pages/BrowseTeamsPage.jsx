import { useContext, useState } from 'react';
import { UserContext } from '../context/UserContext';
import TeamCard from '../components/TeamCard';

const CATEGORIES = ['All', 'AI/ML', 'Mobile', 'Web3', 'IoT', 'EdTech'];

export default function BrowseTeamsPage() {
  const { teams } = useContext(UserContext);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredTeams = selectedCategory === 'All'
    ? teams
    : teams.filter((t) => t.category === selectedCategory);

  return (
    <main className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-950">Browse Teams</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filteredTeams.length} open teams looking for members
          </p>
        </div>

        <button className="px-5 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition">
          + Create Team
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 font-medium">{filteredTeams.length} results</span>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </main>
  );
}