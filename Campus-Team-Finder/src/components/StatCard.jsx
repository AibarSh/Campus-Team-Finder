export default function StatCard({ number, label, detail, iconBg = "bg-gray-100" }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center text-gray-600 font-semibold text-sm`}>
        📊
      </div>
      <div className="space-y-1">
        <h3 className="text-3xl font-extrabold text-gray-950">{number}</h3>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {detail && <p className="text-xs text-blue-600 font-semibold pt-1">{detail}</p>}
      </div>
    </div>
  );
}