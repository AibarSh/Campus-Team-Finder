export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">{message}</div>
  );
}
