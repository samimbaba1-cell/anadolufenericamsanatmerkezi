export default function AdminPageLoading() {
  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6" role="status" aria-busy="true" aria-label="Yükleniyor">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
        <div className="h-32 bg-gray-100 rounded" />
      </div>
    </main>
  );
}
