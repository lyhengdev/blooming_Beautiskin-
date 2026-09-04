'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuthStore } from '@/stores/authStore';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/dashboard';
  const { register, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
      });
      router.push(decodeURIComponent(returnTo));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-900">Create Account</h1>
        <p className="text-gray-500 mt-2">Join Blooming Beauty Skin today</p>
      </div>

      <div className="card p-6 sm:p-8">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
            <span className="text-red-500 font-bold">!</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" required className="input-field" placeholder="Your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required className="input-field" placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
            <input type="tel" className="input-field" placeholder="+855"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required minLength={6} className="input-field pr-10"
                placeholder="Min. 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input type="password" required className="input-field" placeholder="Repeat password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full btn-primary py-3 disabled:opacity-50 transition-opacity">
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Suspense fallback={
          <div className="w-full max-w-md animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-2/3 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
            <div className="card p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 bg-gray-200 rounded" />)}
              <div className="h-12 bg-gray-200 rounded" />
            </div>
          </div>
        }>
          <RegisterForm />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
