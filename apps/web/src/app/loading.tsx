export default function HomeLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="h-16 bg-white border-b border-gray-100" />
      <main className="flex-1">
        <section className="w-full h-[300px] sm:h-[420px] lg:h-[520px] bg-blush-100 animate-pulse" />
        {[0, 1, 2].map((i) => (
          <section key={i} className="py-10 lg:py-14 bg-white">
            <div className="container-shop">
              <div className="mb-8 space-y-3 animate-pulse">
                <div className="h-5 bg-gray-200 rounded-full w-36" />
                <div className="h-8 bg-gray-200 rounded w-56" />
                <div className="h-4 bg-gray-200 rounded w-72 max-w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="card animate-pulse">
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
          </section>
        ))}
      </main>
    </div>
  );
}