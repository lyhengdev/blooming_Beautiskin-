'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import {
  Plus, Trash2, Eye, EyeOff,
  Upload, X, Save, Loader2,
  Image as ImageIcon, Link as LinkIcon,
  AlertTriangle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

// ── Cloudinary upload helper ──────────────────────────────────────────────────

async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary env vars not set');
  }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();
  return data.secure_url as string;
}

// ── Banner Form Modal ─────────────────────────────────────────────────────────

function BannerFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Banner | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const saveMutation = useMutation({
    mutationFn: (payload: { imageUrl: string; title: string }) =>
      initial
        ? api.put(`/banners/admin/${initial.id}`, payload)
        : api.post('/banners/admin', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
      onSaved();
    },
    onError: () => {
      setError('Failed to save. Please try again.');
    },
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadToCloudinary(file);
      setImageUrl(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) { setError('Please upload or paste an image URL'); return; }
    setError('');
    saveMutation.mutate({ imageUrl, title: initial?.title ?? 'Banner' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-4xl shadow-pink-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blush-100">
          <h2 className="font-heading font-extrabold text-gray-900 text-lg">
            {initial ? 'Edit Banner' : 'Add Banner'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-blush-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Image */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              Banner Image <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2 mb-3">
              {(['upload', 'url'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setImageTab(tab)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors
                              ${imageTab === tab ? 'bg-primary-500 text-white' : 'bg-blush-100 text-primary-600 hover:bg-blush-200'}`}
                >
                  {tab === 'upload' ? <><Upload className="h-3 w-3" /> Upload</> : <><LinkIcon className="h-3 w-3" /> Paste URL</>}
                </button>
              ))}
            </div>
            {imageTab === 'upload' ? (
              <>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-blush-300
                             bg-blush-50 px-5 py-6 text-sm font-semibold text-primary-500
                             hover:bg-blush-100 transition-colors w-full justify-center"
                >
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  {uploading ? 'Uploading…' : 'Click to upload image'}
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (urlInput.trim()) { setImageUrl(urlInput.trim()); setUrlInput(''); }
                  }}
                  disabled={!urlInput.trim()}
                  className="btn-primary px-4 py-2.5 text-sm shrink-0"
                >
                  Use
                </button>
              </div>
            )}
            {imageUrl && (
              <div className="mt-3 rounded-2xl overflow-hidden border border-blush-200 h-40 bg-blush-50 relative">
                <Image src={imageUrl} alt="Preview" fill className="object-cover" unoptimized />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-blush-100">
            <button type="button" onClick={onClose}
              className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending || !imageUrl.trim()}
              className="btn-primary px-5 py-2.5 text-sm">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────

function DeleteConfirmModal({
  onClose,
  onDeleted,
  bannerId,
}: {
  onClose: () => void;
  onDeleted: () => void;
  bannerId: string;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/banners/admin/${bannerId}`),
    onSuccess: () => {
      toast.success('Banner deleted');
      queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
      onDeleted();
    },
    onError: () => {
      toast.error('Failed to delete banner');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-4xl shadow-pink-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-gray-900">Delete Banner</h3>
            <p className="text-xs text-gray-500">This cannot be undone.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={deleteMutation.isPending}
            className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
          <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white
                       hover:bg-red-600 transition-colors disabled:opacity-50 shadow-sm">
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sortable Banner Card ─────────────────────────────────────────────────────

function SortableBanner({
  banner,
  index,
  onEdit,
  onDelete,
  onToggle,
}: {
  banner: Banner;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-3xl border bg-white overflow-hidden shadow-pink-sm
                  transition-shadow
                  ${banner.isActive ? 'border-blush-200' : 'border-gray-200 opacity-50'}
                  ${isDragging ? '' : 'hover:shadow-pink-md'}`}
    >
      <BannerCardInner
        banner={banner}
        index={index}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggle={onToggle}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// ── Drag Overlay Card (follows cursor, no interaction) ──────────────────────

function OverlayBanner({
  banner,
  index,
}: {
  banner: Banner;
  index: number;
}) {
  return (
    <div className="rounded-3xl border-2 border-primary-400 bg-white overflow-hidden shadow-2xl rotate-[2deg] scale-105">
      <BannerCardInner
        banner={banner}
        index={index}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggle={() => {}}
        dragHandleProps={{}}
      />
    </div>
  );
}

// ── Inner card (shared between sortable & overlay) ──────────────────────────

function BannerCardInner({
  banner,
  index,
  onEdit,
  onDelete,
  onToggle,
  dragHandleProps,
}: {
  banner: Banner;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  dragHandleProps: Record<string, any>;
}) {
  return (
    <>
      {/* Image */}
      <div className="aspect-[16/9] bg-blush-50 relative">
        <img
          src={banner.imageUrl}
          alt="Banner"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Overlay controls — always visible on overlay card */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 z-10">
        <span
          {...dragHandleProps}
          className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-2 text-[10px] font-bold text-gray-600 cursor-grab active:cursor-grabbing hover:bg-white transition-colors"
          title="Drag to reorder"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="p-2 rounded-full bg-white/90 text-gray-600 hover:bg-white transition-colors"
          title={banner.isActive ? 'Deactivate' : 'Activate'}
        >
          {banner.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-2 rounded-full bg-white/90 text-gray-600 hover:bg-white transition-colors"
          title="Edit"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 rounded-full bg-white/90 text-red-500 hover:bg-white hover:text-red-600 transition-colors"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Active badge */}
      {!banner.isActive && (
        <span className="absolute top-2 left-2 rounded-full bg-gray-800/70 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
          Inactive
        </span>
      )}

      {/* Sort number */}
      <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-[11px] font-bold text-gray-600">
        {index + 1}
      </span>
    </>
  );
}

// ── Main Banners Page ────────────────────────────────────────────────────────

export default function AdminBannersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: bannersRes, isLoading: loading } = useQuery({
    queryKey: ['adminBanners'],
    queryFn: () => api.get('/banners/admin'),
  });

  const banners: Banner[] = bannersRes?.data?.data?.banners ?? [];
  const sorted = [...banners].sort((a, b) => a.sortOrder - b.sortOrder);
  const activeBanner = activeId ? sorted.find((b) => b.id === activeId) : null;
  const activeIndex = activeId ? sorted.findIndex((b) => b.id === activeId) : -1;

  // DnD sensors — require 8px movement before drag starts (prevents accidental drags)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const toggleMutation = useMutation({
    mutationFn: (banner: Banner) => api.patch(`/banners/admin/${banner.id}/toggle`),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
      toast.success(`Banner ${response.data.data.banner.isActive ? 'activated' : 'deactivated'}`);
    },
    onError: () => {
      toast.error('Failed to toggle banner');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; sortOrder: number }[]) =>
      api.patch('/banners/admin/reorder', { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBanners'] });
      toast.success('Order updated');
    },
    onError: () => {
      toast.error('Failed to reorder');
    },
  });

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = sorted.findIndex((b) => b.id === active.id);
    const newIndex = sorted.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(sorted, oldIndex, newIndex);

    const items = reordered.map((b, i) => ({ id: b.id, sortOrder: i }));
    reorderMutation.mutate(items);
  }

  const handleSaved = () => {
    setShowForm(false);
    setEditBanner(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-gray-900">Banners</h1>
          <p className="mt-1 text-sm text-gray-500">Long-press &amp; drag to reorder your homepage slider.</p>
        </div>
        <button
          onClick={() => { setEditBanner(null); setShowForm(true); }}
          className="btn-primary px-5 py-2.5 text-sm"
        >
          <Plus className="h-4 w-4" /> Add Banner
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ImageIcon className="h-12 w-12 text-blush-300 mb-3" />
          <p className="font-heading font-bold text-gray-500 text-lg">No banners yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload your first banner image to get started.</p>
          <button
            onClick={() => { setEditBanner(null); setShowForm(true); }}
            className="btn-primary px-5 py-2.5 text-sm mt-4"
          >
            <Plus className="h-4 w-4" /> Add Banner
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sorted.map((b) => b.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {sorted.map((banner, idx) => (
                <SortableBanner
                  key={banner.id}
                  banner={banner}
                  index={idx}
                  onEdit={() => { setEditBanner(banner); setShowForm(true); }}
                  onDelete={() => setDeleteId(banner.id)}
                  onToggle={() => toggleMutation.mutate(banner)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}>
            {activeBanner ? (
              <OverlayBanner banner={activeBanner} index={activeIndex} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Footer */}
      {!loading && banners.length > 0 && (
        <div className="mt-5 text-xs text-gray-400">
          {banners.filter((b) => b.isActive).length} active of {banners.length} total · Long-press &amp; drag to reorder
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <BannerFormModal
          initial={editBanner}
          onClose={() => { setShowForm(false); setEditBanner(null); }}
          onSaved={handleSaved}
        />
      )}
      {deleteId && (
        <DeleteConfirmModal
          bannerId={deleteId}
          onClose={() => setDeleteId(null)}
          onDeleted={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
