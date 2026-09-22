export default function TeamCard({ team }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Header: Badge + Title + Bookmark */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${team.badgeBg} text-white font-bold flex items-center justify-center text-lg`}>
              {team.badgeLetter}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">{team.name}</h3>
              <p className="text-xs text-gray-400">{team.event}</p>
            </div>
          </div>
          <button className="text-gray-300 hover:text-gray-500">🔖</button>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
          {team.description}
        </p>

        {/* Category & Time */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="px-2.5 py-1 bg-purple-50 text-purple-600 font-semibold rounded-lg">
            {team.category}
          </span>
          <span className="text-gray-400">{team.daysLeft} days left</span>
        </div>

        {/* Open Roles */}
        <div className="flex flex-wrap gap-1.5 pt-2">
          {team.openRoles.map((role, idx) => (
            <span key={idx} className="px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs rounded-lg">
              {role}
            </span>
          ))}
        </div>
      </div>

      {/* Footer: Members + Prize + Action */}
      <div className="pt-4 border-t border-gray-100 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {team.members.map((m, idx) => (
                <div key={idx} className="w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
                  {m}
                </div>
              ))}
            </div>
            <span className="text-gray-400">{team.members.length}/{team.maxMembers} members</span>
          </div>
          <span className="font-bold text-gray-900">{team.prize}</span>
        </div>

        <button className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition">
          View Team
        </button>
      </div>
    </div>
  );
}