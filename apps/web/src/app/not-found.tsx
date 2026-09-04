import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-6xl font-bold text-primary-600">404</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Page not found</h1>
          <p className="text-gray-500 mt-2">
            The page you are looking for does not exist or has been moved.
          </p>
          <Link href="/" className="mt-6 inline-block btn-primary">Go Home</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
