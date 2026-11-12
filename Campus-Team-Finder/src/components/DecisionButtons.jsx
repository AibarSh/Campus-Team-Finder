export default function DecisionButtons({ busy, onDecide }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => onDecide('ACCEPTED')}
        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
      >
        Accept
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onDecide('DECLINED')}
        className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  );
}
