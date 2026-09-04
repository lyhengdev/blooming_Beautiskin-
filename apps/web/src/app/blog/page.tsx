'use client';

import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  tags: string[];
  publishedAt: string;
  author: { name: string };
}

export default function BlogPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['blog'],
    queryFn: () => api.get('/blog'),
  });

  const posts: BlogPost[] = data?.data.data.posts ?? [];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-br from-primary-50 to-pink-50 py-10 lg:py-16">
          <div className="container-shop text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-gray-900">Skincare Blog</h1>
            <p className="mt-3 text-gray-600">Tips, guides, and ingredient deep-dives</p>
          </div>
        </div>

        <div className="container-shop py-12">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-pulse">
                  <div className="aspect-video bg-gray-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-10 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="card group">
                  <div className="relative aspect-video bg-gray-100 flex items-center justify-center">
                    {post.coverImage ? (
                      <Image src={post.coverImage} alt={post.title} fill className="object-cover" unoptimized />
                    ) : (
                      <FileText className="h-10 w-10 text-gray-300" />
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex gap-2 mb-2">
                      {post.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="mt-2 text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                      <span>{post.author.name}</span>
                      <span>&middot;</span>
                      <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
