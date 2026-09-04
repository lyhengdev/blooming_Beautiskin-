'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import api from '@/lib/api';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  tags: string[];
  publishedAt: string;
  author: { id: string; name: string; avatar: string | null };
}

export default function BlogPostPage() {
  const params = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ['blogPost', params.slug],
    queryFn: () => api.get(`/blog/${params.slug}`),
  });

  const post = data?.data.data.post as BlogPost | undefined;

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container-shop py-12">
          <div className="max-w-3xl mx-auto animate-pulse space-y-6">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="aspect-video bg-gray-200 rounded-xl" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-4 bg-gray-200 rounded w-4/6" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Post Not Found</h1>
            <p className="text-gray-500 mt-2">The blog post you are looking for does not exist.</p>
            <Link href="/blog" className="mt-4 inline-block btn-primary">Back to Blog</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-br from-primary-50 to-pink-50 py-12">
          <div className="max-w-3xl mx-auto px-4">
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 mb-6">
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>
            <div className="flex flex-wrap gap-2 mb-3">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
            <h1 className="text-3xl lg:text-4xl font-heading font-bold text-gray-900">{post.title}</h1>
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700">
                  {post.author.name.charAt(0)}
                </div>
                <span>{post.author.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>

        {post.coverImage && (
          <div className="max-w-3xl mx-auto px-4 -mt-2">
            <Image src={post.coverImage} alt={post.title} width={768} height={400} className="rounded-xl object-cover max-h-[500px]" />
          </div>
        )}

        <article className="max-w-3xl mx-auto px-4 py-12">
          <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
            {post.content}
          </div>

          {post.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-4 w-4 text-gray-400" />
                {post.tags.map((tag) => (
                  <span key={tag} className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 pt-6 border-t flex justify-between items-center">
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:underline">
              <ArrowLeft className="h-4 w-4" /> All Articles
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
