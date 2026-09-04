export default function ProductLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="h-16 bg-white border-b border-gray-100" />
      <main className="flex-1 container-shop py-8">
        <div className="h-4 bg-gray-200 rounded w-64 mb-8 animate-pulse" />
        <div className="grid lg:grid-cols-2 gap-10 animate-pulse">
          <div className="aspect-square bg-gray-200 rounded-xl" />
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-6 bg-gray-200 rounded w-1/6" />
            <div className="h-20 bg-gray-200 rounded" />
            <div className="h-12 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      </main>
    </div>
  );
}
