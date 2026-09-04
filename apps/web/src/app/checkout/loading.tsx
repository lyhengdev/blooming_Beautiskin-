export default function CheckoutLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="h-16 bg-white border-b border-gray-100" />
      <main className="flex-1 container-shop py-8">
        <div className="h-8 bg-gray-200 rounded w-32 mb-8 animate-pulse" />
        <div className="h-12 bg-gray-200 rounded max-w-xl mx-auto mb-10 animate-pulse" />
        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          <div className="card p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="card p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
