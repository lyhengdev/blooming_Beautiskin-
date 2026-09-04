export default function ShopLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="h-16 bg-white border-b border-gray-100" />
      <div className="bg-gray-50 py-8">
        <div className="container-shop">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-32 mt-2 animate-pulse" />
        </div>
      </div>
      <div className="container-shop py-8">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-5 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
