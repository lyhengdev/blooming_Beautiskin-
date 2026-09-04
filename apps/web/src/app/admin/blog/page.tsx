'use client';

import { useRef, useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Plus, Trash2, Pencil, Loader2, FileText, Search,
  Eye, EyeOff, X, Upload, Link as LinkIcon, Send, Clock,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
  author: { id: string; name: string; avatar: string | null };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) throw new Error('Cloudinary env vars not set');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();
  return data.secure_url as string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Blog Post Form Modal ─────────────────────────────────────────────────────

function BlogPostFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: BlogPost | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(false);
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [publishNow, setPublishNow] = useState(!!initial?.publishedAt);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      initial
        ? api.put(`/blog/admin/${initial.id}`, payload)
        : api.post('/blog/admin', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPosts'] });
      toast.success(initial ? 'Post updated' : 'Post created');
      onSaved();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Failed to save post');
    },
  });

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugEdited) setSlug(slugify(val));
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setCoverImage(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    if (!content.trim()) { setError('Content is required'); return; }
    setError('');

    saveMutation.mutate({
      title,
      slug: slug || slugify(title),
      excerpt: excerpt || null,
      content,
      coverImage: coverImage || null,
      tags,
      publishedAt: publishNow ? (initial?.publishedAt ?? new Date().toISOString()) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-4xl shadow-pink-lg mb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blush-100 sticky top-0 bg-white rounded-t-4xl z-10">
          <h2 className="font-heading font-extrabold text-gray-900 text-lg">
            {initial ? 'Edit Post' : 'New Post'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-blush-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {/* Title + Slug */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Title <span className="text-red-400">*</span></label>
              <input value={title} onChange={(e) => handleTitleChange(e.target.value)} className="input-field w-full" placeholder="Post title" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Slug</label>
              <input value={slug} onChange={(e) => { setSlugEdited(true); setSlug(e.target.value); }} className="input-field w-full" placeholder="auto-generated" />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Excerpt</label>
            <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="input-field w-full" placeholder="Brief summary for previews..." />
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Cover Image</label>
            <div className="flex gap-2 mb-3">
              {(['upload', 'url'] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setImageTab(tab)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${imageTab === tab ? 'bg-primary-500 text-white' : 'bg-blush-100 text-primary-600 hover:bg-blush-200'}`}>
                  {tab === 'upload' ? <><Upload className="h-3 w-3" /> Upload</> : <><LinkIcon className="h-3 w-3" /> Paste URL</>}
                </button>
              ))}
            </div>
            {imageTab === 'upload' ? (
              <>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-blush-300 bg-blush-50 px-5 py-4 text-sm font-semibold text-primary-500 hover:bg-blush-100 transition-colors w-full justify-center">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  {uploading ? 'Uploading...' : 'Click to upload cover image'}
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://example.com/image.jpg" className="input-field flex-1" />
                <button type="button" onClick={() => { if (urlInput.trim()) { setCoverImage(urlInput.trim()); setUrlInput(''); } }}
                  disabled={!urlInput.trim()} className="btn-primary px-4 py-2.5 text-sm shrink-0">Use</button>
              </div>
            )}
            {coverImage && (
              <div className="mt-3 relative rounded-2xl overflow-hidden border border-blush-200 h-48 bg-blush-50">
                <Image src={coverImage} alt="Cover preview" fill className="object-cover" unoptimized />
                <button type="button" onClick={() => setCoverImage('')}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white text-red-500">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Content <span className="text-red-400">*</span></label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12}
              className="input-field w-full resize-none font-mono text-sm" placeholder="Write your post content here... (Markdown supported)" />
            <p className="mt-1 text-[11px] text-gray-400">{content.length} characters</p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Tags</label>
            <div className="flex gap-2 mb-2">
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                className="input-field flex-1 text-sm" placeholder="Add a tag..." />
              <button type="button" onClick={addTag} className="btn-secondary px-3 py-1.5 text-xs">Add</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-600">
                    {t}
                    <button type="button" onClick={() => setTags(tags.filter((tag) => tag !== t))} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Publish toggle */}
          <div className="flex items-center gap-3 rounded-2xl border border-blush-100 bg-blush-50/50 p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)}
                className="h-4 w-4 rounded border-blush-300 text-primary-500 focus:ring-primary-400" />
              <span className="text-sm font-semibold text-gray-700">Publish immediately</span>
            </label>
            <span className="text-xs text-gray-400">
              {publishNow ? 'This post will be visible on the blog.' : 'Save as draft to publish later.'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-blush-100">
            <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending || !title.trim() || !content.trim()}
              className="btn-primary px-5 py-2.5 text-sm">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saveMutation.isPending ? 'Saving...' : publishNow ? 'Publish' : 'Save Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────

function DeleteConfirmModal({
  post,
  onClose,
  onDeleted,
}: {
  post: BlogPost;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/blog/admin/${post.id}`),
    onSuccess: () => { toast.success('Post deleted'); queryClient.invalidateQueries({ queryKey: ['adminPosts'] }); onDeleted(); },
    onError: (err: any) => { toast.error(err?.response?.data?.message || 'Failed to delete'); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-4xl shadow-pink-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50"><Trash2 className="h-5 w-5 text-red-500" /></div>
          <div>
            <h3 className="font-heading font-extrabold text-gray-900">Delete Post</h3>
            <p className="text-xs text-gray-500">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to delete <span className="font-bold">&ldquo;{post.title}&rdquo;</span>?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={deleteMutation.isPending} className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
          <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50 shadow-sm">
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Blog Page ───────────────────────────────────────────────────────────

export default function AdminBlogPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editPost, setEditPost] = useState<BlogPost | null>(null);
  const [deletePost, setDeletePost] = useState<BlogPost | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: postsRes, isLoading: loading } = useQuery({
    queryKey: ['adminPosts', page, search],
    queryFn: () => api.get('/blog/admin', { params: { page, limit: 12, search: search || undefined } }),
  });

  const posts: BlogPost[] = postsRes?.data?.data?.posts ?? [];
  const pagination = postsRes?.data?.data?.pagination ?? { page: 1, total: 0, totalPages: 1 };

  const togglePublishMutation = useMutation({
    mutationFn: (p: BlogPost) => api.patch(`/blog/admin/${p.id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPosts'] });
      toast.success('Publish status updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const handleEdit = async (p: BlogPost) => {
    try {
      const res = await api.get(`/blog/admin/${p.id}`);
      setEditPost(res.data.data.post);
      setShowForm(true);
    } catch {
      toast.error('Failed to load post');
    }
  };

  const handleSaved = () => { setShowForm(false); setEditPost(null); };

  const published = posts.filter((p) => p.publishedAt).length;
  const drafts = posts.length - published;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-gray-900">Blog</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage blog posts for your store.</p>
        </div>
        <button onClick={() => { setEditPost(null); setShowForm(true); }} className="btn-primary px-5 py-2.5 text-sm">
          <Plus className="h-4 w-4" /> New Post
        </button>
      </div>

      {/* Search + Stats */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search posts..." className="input-field w-full pl-9" />
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-3">
          <span>{published} published</span>
          <span>{drafts} drafts</span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-12 w-12 text-blush-300 mb-3" />
          <p className="font-heading font-bold text-gray-500 text-lg">
            {search ? 'No posts match your search' : 'No blog posts yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Try a different search term.' : 'Write your first blog post to get started.'}
          </p>
          {!search && (
            <button onClick={() => { setEditPost(null); setShowForm(true); }} className="btn-primary px-5 py-2.5 text-sm mt-4">
              <Plus className="h-4 w-4" /> New Post
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="group rounded-2xl border border-blush-100 bg-white px-4 py-3 shadow-pink-sm hover:shadow-pink-md transition-all">
                <div className="flex items-center gap-4">
                  {/* Cover thumbnail */}
                  <div className="h-14 w-20 rounded-xl overflow-hidden bg-blush-50 shrink-0 relative hidden sm:block">
                    {post.coverImage ? (
                      <Image src={post.coverImage} alt="" fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full items-center justify-center"><FileText className="h-5 w-5 text-blush-300" /></div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{post.title}</h3>
                      {post.publishedAt ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 shrink-0">
                          <Send className="h-2.5 w-2.5" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 shrink-0">
                          <Clock className="h-2.5 w-2.5" /> Draft
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      /{post.slug} &middot; by {post.author.name} &middot; {formatDate(post.createdAt)}
                    </p>
                    {post.excerpt && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{post.excerpt}</p>}
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {post.tags.slice(0, 5).map((t) => (
                          <span key={t} className="rounded-full bg-blush-50 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{t}</span>
                        ))}
                        {post.tags.length > 5 && <span className="text-[10px] text-gray-400">+{post.tags.length - 5}</span>}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => togglePublishMutation.mutate(post)}
                      className="p-2 rounded-full hover:bg-blush-100 text-gray-400 hover:text-primary-600 transition-colors"
                      title={post.publishedAt ? 'Unpublish' : 'Publish'}>
                      {post.publishedAt ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => handleEdit(post)}
                      className="p-2 rounded-full hover:bg-blush-100 text-gray-400 hover:text-primary-600 transition-colors"
                      title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeletePost(post)}
                      className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-xs text-gray-400">
                Showing {(page - 1) * 12 + 1}-{Math.min(page * 12, pagination.total)} of {pagination.total}
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

      {/* Modals */}
      {showForm && (
        <BlogPostFormModal
          initial={editPost}
          onClose={() => { setShowForm(false); setEditPost(null); }}
          onSaved={handleSaved}
        />
      )}
      {deletePost && (
        <DeleteConfirmModal
          post={deletePost}
          onClose={() => setDeletePost(null)}
          onDeleted={() => setDeletePost(null)}
        />
      )}
    </div>
  );
}
