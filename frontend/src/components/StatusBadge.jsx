import { statusLabel } from '../lib/statusLabel';

const STYLES = {
  SENT: 'bg-gray-100 text-gray-600',
  VIEWED: 'bg-amber-50 text-amber-700',
  ACCEPTED: 'bg-green-50 text-green-700',
  DECLINED: 'bg-red-50 text-red-600',
  DRAFT: 'bg-gray-100 text-gray-600',
  PUBLISHED: 'bg-blue-50 text-blue-600',
  CLOSED: 'bg-gray-100 text-gray-500',
  FULL: 'bg-slate-100 text-slate-600',
  RECRUITMENT_CLOSED: 'bg-amber-50 text-amber-700',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${STYLES[status] || STYLES.SENT}`}>
      {statusLabel(status)}
    </span>
  );
}
