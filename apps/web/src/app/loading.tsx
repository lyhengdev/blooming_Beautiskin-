export default function HomeLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="h-16 bg-white border-b border-gray-100" />
      <main className="flex-1">
        <section className="bg-gradient-to-br from-primary-50 via-pink-50 to-white py-14 lg:py-20">
          <div className="container-shop">
            <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-4 animate-pulse">
                <div className="h-8 bg-gray-200 rounded-full w-64" />
                <div className="h-12 bg-gray-200 rounded w-3/4" />
                <div className="h-12 bg-gray-200 rounded w-1/2" />
                <div className="h-6 bg-gray-200 rounded w-2/3" />
                <div className="flex gap-3">
                  <div className="h-12 bg-gray-200 rounded-lg w-32" />
                  <div className="h-12 bg-gray-200 rounded-lg w-32" />
                </div>
              </div>
              <div className="aspect-square bg-gray-200 rounded-2xl animate-pulse" />
            </div>
          </div>
        </section>
        <section className="py-12 lg:py-16">
          <div className="container-shop">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {[1, 2, 3, 4].map((i) => (
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
        </section>
      </main>
    </div>
  );
}
