import { Link } from 'react-router-dom';
import { displayName } from '../lib/names';
import { roleAvailabilityStatus, spotsRemaining } from '../lib/teamAvailability';
import { statusLabel } from '../lib/statusLabel';

export default function TeamCard({ team }) {
  const remaining = team.openRoles.reduce((total, role) => total + spotsRemaining(role, team.status), 0);
  return (
    <div className="min-w-0 wrap-anywhere bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-lg">
            {team.name[0]?.toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">{team.name}</h3>
            {team.eventTarget && <p className="text-xs text-gray-400">{team.eventTarget}</p>}
          </div>
        </div>

        {team.description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{team.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5 pt-2">
          {team.openRoles.map((openRole) => {
            const status = roleAvailabilityStatus(openRole, team.status);
            return (
              <span key={openRole.id} className="max-w-full wrap-anywhere px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600 text-xs rounded-lg">
                {openRole.role.name} · {openRole.slotsFilled}/{openRole.slotsTotal}{status && ` · ${statusLabel(status)}`}
              </span>
            );
          })}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 space-y-3">
        <p className="text-xs font-medium text-slate-600">{remaining} {remaining === 1 ? 'spot' : 'spots'} left</p>
        <p className="text-xs text-gray-400">
          Created by <span className="font-semibold text-gray-700">{displayName(team.creator)}</span>
        </p>
        <Link
          to={`/teams/${team.id}`}
          className="block text-center w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
        >
          View Team
        </Link>
      </div>
    </div>
  );
}
