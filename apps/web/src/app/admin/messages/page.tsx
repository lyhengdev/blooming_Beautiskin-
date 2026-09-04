'use client';

import { useEffect, useState } from 'react';
import {
  Loader2, Search, Mail, MailOpen, Trash2, Eye, X, Inbox,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

interface ContactMsg {
  id: string; name: string; email: string; subject: string;
  message: string; isRead: boolean; createdAt: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function DetailModal({ msg, onClose }: { msg: ContactMsg; onClose: () => void }) {
  const queryClient = useQueryClient();

  const markRead = useMutation({
    mutationFn: () => api.patch(`/contact/admin/${msg.id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMessages'] });
      queryClient.invalidateQueries({ queryKey: ['contactUnread'] });
    },
  });

  const markUnread = useMutation({
    mutationFn: () => api.patch(`/contact/admin/${msg.id}/unread`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMessages'] });
      queryClient.invalidateQueries({ queryKey: ['contactUnread'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/contact/admin/${msg.id}`),
    onSuccess: () => {
      toast.success('Message deleted');
      queryClient.invalidateQueries({ queryKey: ['adminMessages'] });
      queryClient.invalidateQueries({ queryKey: ['contactUnread'] });
      onClose();
    },
  });

  // Mark as read when opening
  useEffect(() => {
    if (!msg.isRead) {
      markRead.mutate();
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-4xl shadow-pink-lg mb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blush-100 sticky top-0 bg-white rounded-t-4xl z-10">
          <div className="min-w-0">
            <h2 className="font-heading font-extrabold text-gray-900 text-lg truncate">{msg.subject}</h2>
            <p className="text-xs text-gray-400 mt-0.5">From {msg.name} &middot; {formatDate(msg.createdAt)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-blush-100 transition-colors shrink-0">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Sender info */}
          <div className="rounded-2xl bg-blush-50 p-4 space-y-1">
            <p className="text-sm"><span className="font-bold text-gray-700">Name:</span> <span className="text-gray-600">{msg.name}</span></p>
            <p className="text-sm"><span className="font-bold text-gray-700">Email:</span> <a href={`mailto:${msg.email}`} className="text-primary-500 hover:underline">{msg.email}</a></p>
            <p className="text-sm"><span className="font-bold text-gray-700">Date:</span> <span className="text-gray-600">{formatDate(msg.createdAt)}</span></p>
          </div>

          {/* Message body */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Message</label>
            <div className="rounded-2xl border border-blush-100 bg-white p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed min-h-[120px]">
              {msg.message}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-blush-100">
            <button onClick={onClose} className="btn-secondary px-5 py-2.5 text-sm">Close</button>
            {msg.isRead ? (
              <button onClick={() => markUnread.mutate()} className="btn-secondary px-5 py-2.5 text-sm flex items-center gap-2">
                <MailOpen className="h-4 w-4" /> Mark Unread
              </button>
            ) : null}
            <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50 shadow-sm">
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminMessagesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<ContactMsg | null>(null);

  const { data: unreadRes } = useQuery({
    queryKey: ['contactUnread'],
    queryFn: () => api.get('/contact/admin/unread-count'),
  });
  const unreadCount = unreadRes?.data?.data?.count ?? 0;

  const { data: messagesRes, isLoading } = useQuery({
    queryKey: ['adminMessages', page, filter, search],
    queryFn: () => api.get('/contact/admin', { params: { page, limit: 20, unread: filter === 'unread' ? 'true' : undefined, search: search || undefined } }),
  });

  const messages: ContactMsg[] = messagesRes?.data?.data?.messages ?? [];
  const pagination = messagesRes?.data?.data?.pagination ?? { page: 1, total: 0, totalPages: 1 };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contact/admin/${id}`),
    onSuccess: () => {
      toast.success('Message deleted');
      queryClient.invalidateQueries({ queryKey: ['adminMessages'] });
      queryClient.invalidateQueries({ queryKey: ['contactUnread'] });
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-extrabold text-gray-900">Messages</h1>
        <p className="mt-1 text-sm text-gray-500">View and manage contact form submissions.</p>
      </div>

      {/* Stats + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-2">
          {(['all', 'unread'] as const).map((f) => (
            <button key={f} onClick={() => { setFilter(f); setPage(1); }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-colors
                ${filter === f ? 'bg-primary-500 text-white shadow-pink-sm' : 'bg-white text-gray-600 border border-blush-200 hover:bg-blush-50'}`}>
              {f === 'all' ? <Inbox className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
              {f === 'all' ? 'All' : 'Unread'}
              {f === 'unread' && unreadCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] px-1">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search messages..." className="input-field w-full pl-9" />
        </div>
      </div>

      {/* Messages */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 text-primary-400 animate-spin" /></div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Mail className="h-12 w-12 text-blush-300 mb-3" />
          <p className="font-heading font-bold text-gray-500 text-lg">No messages</p>
          <p className="text-sm text-gray-400 mt-1">
            {filter === 'unread' ? 'All caught up! No unread messages.' : 'No contact form submissions yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {messages.map((msg) => (
              <button key={msg.id} onClick={() => setDetail(msg)}
                className={`w-full text-left rounded-2xl border px-4 py-3 shadow-pink-sm hover:shadow-pink-md transition-all
                  ${msg.isRead ? 'bg-white border-blush-100' : 'bg-primary-50/50 border-primary-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0
                    ${msg.isRead ? 'bg-blush-100 text-gray-400' : 'bg-primary-500 text-white'}`}>
                    {msg.isRead ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm font-bold truncate ${msg.isRead ? 'text-gray-700' : 'text-gray-900'}`}>{msg.subject}</span>
                      {!msg.isRead && <span className="h-2 w-2 rounded-full bg-primary-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{msg.name} &middot; {msg.email}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{msg.message.slice(0, 100)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-gray-400">{formatDate(msg.createdAt)}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(msg.id); }}
                      className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </button>
            ))}
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

      {detail && <DetailModal msg={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
