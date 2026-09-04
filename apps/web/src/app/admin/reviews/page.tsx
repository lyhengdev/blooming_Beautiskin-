'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Loader2, Search, Star, Trash2, CheckCircle2, XCircle,
  ShieldCheck, ShieldAlert, MessageSquare,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewUser { id: string; name: string; avatar: string | null; }
interface ReviewProduct { id: string; name: string; slug: string; images: string[]; }

interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string | null;
  images: string[];
  isApproved: boolean;
  createdAt: string;
  user: ReviewUser;
  product: ReviewProduct;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteReviewModal({ review, onClose }: { review: Review; onClose: () => void }) {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/reviews/admin/${review.id}`),
    onSuccess: () => { toast.success('Review deleted'); queryClient.invalidateQueries({ queryKey: ['adminReviews'] }); queryClient.invalidateQueries({ queryKey: ['reviewStats'] }); onClose(); },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-4xl shadow-pink-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50"><Trash2 className="h-5 w-5 text-red-500" /></div>
          <div>
            <h3 className="font-heading font-extrabold text-gray-900">Delete Review</h3>
            <p className="text-xs text-gray-500">This action cannot be undone.</p>
          </div>
        </div>
        <div className="rounded-2xl bg-blush-50 p-3 mb-4 text-sm">
          <p className="font-bold text-gray-700">{review.user.name} &middot; {review.product.name}</p>
          {review.comment && <p className="text-gray-500 mt-1 line-clamp-2">&ldquo;{review.comment}&rdquo;</p>}
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={deleteMutation.isPending} className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
          <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50 shadow-sm">
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'pending' | 'approved'>('all');
  const [page, setPage] = useState(1);
  const [deleteReview, setDeleteReview] = useState<Review | null>(null);

  const { data: statsRes } = useQuery({
    queryKey: ['reviewStats'],
    queryFn: () => api.get('/reviews/admin/stats'),
  });
  const stats = statsRes?.data?.data ?? { total: 0, pending: 0, approved: 0 };

  const { data: reviewsRes, isLoading } = useQuery({
    queryKey: ['adminReviews', page, status, search],
    queryFn: () => api.get('/reviews/admin', { params: { page, limit: 20, status: status === 'all' ? undefined : status, search: search || undefined } }),
  });

  const reviews: Review[] = reviewsRes?.data?.data?.reviews ?? [];
  const pagination = reviewsRes?.data?.data?.pagination ?? { page: 1, total: 0, totalPages: 1 };

  const toggleApproval = useMutation({
    mutationFn: (r: Review) => api.patch(`/reviews/admin/${r.id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviewStats'] });
      toast.success('Review status updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const statusPills = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'approved', label: 'Approved', count: stats.approved },
  ] as const;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-gray-900">Reviews</h1>
        <p className="mt-1 text-sm text-gray-500">Moderate customer reviews. Approve or remove reviews before they appear publicly.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {statusPills.map(({ key, label, count }) => (
          <button key={key} onClick={() => { setStatus(key); setPage(1); }}
            className={`rounded-2xl px-4 py-3 text-left shadow-pink-sm transition-all ${status === key ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-blush-50 border border-blush-100'}`}>
            <p className={`text-[11px] font-bold uppercase tracking-wide ${status === key ? 'text-white/70' : 'text-gray-400'}`}>{label}</p>
            <p className={`text-xl font-extrabold font-heading ${status === key ? 'text-white' : 'text-gray-900'}`}>{count}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search reviews by content, product, or customer..." className="input-field w-full pl-9" />
      </div>

      {/* Reviews */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 text-primary-400 animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare className="h-12 w-12 text-blush-300 mb-3" />
          <p className="font-heading font-bold text-gray-500 text-lg">No reviews found</p>
          <p className="text-sm text-gray-400 mt-1">{search ? 'Try a different search.' : 'No reviews match this filter.'}</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="group rounded-2xl border border-blush-100 bg-white px-4 py-3 shadow-pink-sm hover:shadow-pink-md transition-all">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {review.user.avatar ? (
                      <Image src={review.user.avatar} alt="" width={36} height={36} className="rounded-full object-cover" unoptimized />
                    ) : (
                      review.user.name.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-bold text-gray-900">{review.user.name}</span>
                      <Stars rating={review.rating} />
                      <span className="text-[10px] text-gray-400">{formatDate(review.createdAt)}</span>
                    </div>

                    {/* Product link */}
                    <p className="text-xs text-primary-500 font-semibold mb-1 truncate">
                      on&nbsp;
                      <Link href={`/products/${review.product.slug}`} target="_blank" className="hover:underline">
                        {review.product.name}
                      </Link>
                    </p>

                    {review.comment && <p className="text-sm text-gray-600 line-clamp-2">{review.comment}</p>}

                    {/* Review images */}
                    {review.images.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {review.images.slice(0, 3).map((img, i) => (
                          <div key={i} className="h-12 w-12 rounded-lg overflow-hidden bg-blush-50 relative">
                            <Image src={img} alt="" fill className="object-cover" unoptimized />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => toggleApproval.mutate(review)}
                      className={`p-2 rounded-full transition-colors ${review.isApproved ? 'hover:bg-amber-50 text-emerald-500 hover:text-amber-500' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-500'}`}
                      title={review.isApproved ? 'Unapprove' : 'Approve'}>
                      {review.isApproved ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setDeleteReview(review)}
                      className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Approval badge */}
                {review.isApproved && (
                  <div className="mt-2 ml-12">
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Approved
                    </span>
                  </div>
                )}
                {!review.isApproved && (
                  <div className="mt-2 ml-12">
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                      <ShieldAlert className="h-2.5 w-2.5" /> Pending approval
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-gray-400">
                Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="flex items-center gap-1 rounded-full border border-blush-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-blush-50 disabled:opacity-40">
                  Prev
                </button>
                <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}
                  className="flex items-center gap-1 rounded-full border border-blush-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-blush-50 disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {deleteReview && <DeleteReviewModal review={deleteReview} onClose={() => setDeleteReview(null)} />}
    </div>
  );
}
