'use client';

import { useState } from 'react';
import {
  Loader2, Search, Trash2, ToggleLeft, ToggleRight, Send,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Subscriber {
  id: string; email: string; isActive: boolean; createdAt: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminSubscribersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);

  const { data: statsRes } = useQuery({
    queryKey: ['newsletterStats'],
    queryFn: () => api.get('/newsletter/admin/stats'),
  });
  const stats = statsRes?.data?.data ?? { total: 0, active: 0, inactive: 0 };

  const { data: subsRes, isLoading } = useQuery({
    queryKey: ['adminSubscribers', page, filter, search],
    queryFn: () => api.get('/newsletter/admin', {
      params: { page, limit: 20, active: filter === 'active' ? 'true' : filter === 'inactive' ? 'false' : undefined, search: search || undefined },
    }),
  });

  const subscribers: Subscriber[] = subsRes?.data?.data?.subscribers ?? [];
  const pagination = subsRes?.data?.data?.pagination ?? { page: 1, total: 0, totalPages: 1 };

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/newsletter/admin/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSubscribers'] });
      queryClient.invalidateQueries({ queryKey: ['newsletterStats'] });
      toast.success('Subscription status updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/newsletter/admin/${id}`),
    onSuccess: () => {
      toast.success('Subscriber removed');
      queryClient.invalidateQueries({ queryKey: ['adminSubscribers'] });
      queryClient.invalidateQueries({ queryKey: ['newsletterStats'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const statPills = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'active', label: 'Active', count: stats.active },
    { key: 'inactive', label: 'Inactive', count: stats.inactive },
  ] as const;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-gray-900">Subscribers</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your newsletter subscriber list.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {statPills.map(({ key, label, count }) => (
          <button key={key} onClick={() => { setFilter(key); setPage(1); }}
            className={`rounded-2xl px-4 py-3 text-left shadow-pink-sm transition-all
              ${filter === key ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-blush-50 border border-blush-100'}`}>
            <p className={`text-[11px] font-bold uppercase tracking-wide ${filter === key ? 'text-white/70' : 'text-gray-400'}`}>{label}</p>
            <p className={`text-xl font-extrabold font-heading ${filter === key ? 'text-white' : 'text-gray-900'}`}>{count}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by email..." className="input-field w-full pl-9" />
      </div>

      {/* Subscribers */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 text-primary-400 animate-spin" /></div>
      ) : subscribers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Send className="h-12 w-12 text-blush-300 mb-3" />
          <p className="font-heading font-bold text-gray-500 text-lg">No subscribers found</p>
          <p className="text-sm text-gray-400 mt-1">{search ? 'Try a different search.' : 'No newsletter subscribers yet.'}</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-blush-100 bg-white shadow-pink-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blush-100 text-left">
                  <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">Subscribed</th>
                  <th className="px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="border-b border-blush-50 last:border-0 hover:bg-blush-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800">{sub.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      {sub.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(sub.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleMutation.mutate(sub.id)}
                          className={`p-2 rounded-full transition-colors ${sub.isActive ? 'hover:bg-amber-50 text-emerald-500 hover:text-amber-500' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-500'}`}
                          title={sub.isActive ? 'Deactivate' : 'Activate'}>
                          {sub.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                        <button onClick={() => deleteMutation.mutate(sub.id)}
                          className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
    </div>
  );
}
