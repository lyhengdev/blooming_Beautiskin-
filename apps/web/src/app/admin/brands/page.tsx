'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Plus, Trash2, Pencil, Loader2, Star,
  Search, Upload, Link as LinkIcon,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  _count: { products: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) throw new Error('Cloudinary env vars not set');
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

// ── Brand Form Modal ─────────────────────────────────────────────────────────

function BrandFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: Brand | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(false);
  const [logo, setLogo] = useState(initial?.logo ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [logoTab, setLogoTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const saveMutation = useMutation({
    mutationFn: (payload: { name: string; slug: string; logo: string | null; description: string | null }) =>
      initial
        ? api.put(`/brands/admin/${initial.id}`, payload)
        : api.post('/brands/admin', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBrands'] });
      toast.success(initial ? 'Brand updated' : 'Brand created');
      onSaved();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to save brand';
      setError(msg);
    },
  });

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) setSlug(slugify(val));
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadToCloudinary(file);
      setLogo(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setError('');
    saveMutation.mutate({
      name,
      slug: slug || slugify(name),
      logo: logo || null,
      description: description || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-4xl shadow-pink-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blush-100">
          <h2 className="font-heading font-extrabold text-gray-900 text-lg">
            {initial ? 'Edit Brand' : 'Add Brand'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-blush-100 transition-colors">
            <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. COSRX"
              className="input-field w-full"
              autoFocus
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Slug</label>
            <input
              value={slug}
              onChange={(e) => { setSlugEdited(true); setSlug(e.target.value); }}
              placeholder="auto-generated-from-name"
              className="input-field w-full"
            />
            <p className="mt-1 text-[11px] text-gray-400">URL-friendly identifier. Leave blank to auto-generate.</p>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Logo</label>
            <div className="flex gap-2 mb-3">
              {(['upload', 'url'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setLogoTab(tab)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors
                              ${logoTab === tab ? 'bg-primary-500 text-white' : 'bg-blush-100 text-primary-600 hover:bg-blush-200'}`}
                >
                  {tab === 'upload' ? <><Upload className="h-3 w-3" /> Upload</> : <><LinkIcon className="h-3 w-3" /> Paste URL</>}
                </button>
              ))}
            </div>
            {logoTab === 'upload' ? (
              <>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-blush-300
                             bg-blush-50 px-5 py-4 text-sm font-semibold text-primary-500
                             hover:bg-blush-100 transition-colors w-full justify-center"
                >
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  {uploading ? 'Uploading...' : 'Click to upload logo'}
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (urlInput.trim()) { setLogo(urlInput.trim()); setUrlInput(''); }
                  }}
                  disabled={!urlInput.trim()}
                  className="btn-primary px-4 py-2.5 text-sm shrink-0"
                >
                  Use
                </button>
              </div>
            )}
            {logo && (
              <div className="mt-3 flex items-center gap-3">
                <div className="h-16 w-16 rounded-2xl overflow-hidden border border-blush-200 bg-blush-50 relative shrink-0">
                  <Image src={logo} alt="Logo preview" fill className="object-contain p-1" unoptimized />
                </div>
                <button
                  type="button"
                  onClick={() => setLogo('')}
                  className="text-xs text-red-400 hover:text-red-600 font-semibold"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional brand description..."
              rows={3}
              className="input-field w-full resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-blush-100">
            <button type="button" onClick={onClose}
              className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending || !name.trim()}
              className="btn-primary px-5 py-2.5 text-sm">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────

function DeleteConfirmModal({
  brand,
  onClose,
  onDeleted,
}: {
  brand: Brand;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/brands/admin/${brand.id}`),
    onSuccess: () => {
      toast.success('Brand deleted');
      queryClient.invalidateQueries({ queryKey: ['adminBrands'] });
      onDeleted();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to delete brand';
      toast.error(msg);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-4xl shadow-pink-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <Trash2 className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-gray-900">Delete Brand</h3>
            <p className="text-xs text-gray-500">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to delete <span className="font-bold">{brand.name}</span>?
          {brand._count.products > 0 && (
            <span className="block mt-1 text-red-500 text-xs font-semibold">
              This brand has {brand._count.products} product(s) and cannot be deleted. Reassign them first.
            </span>
          )}
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={deleteMutation.isPending}
            className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending || brand._count.products > 0}
            className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white
                       hover:bg-red-600 transition-colors disabled:opacity-50 shadow-sm"
          >
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Brands Page ─────────────────────────────────────────────────────────

export default function AdminBrandsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editBrand, setEditBrand] = useState<Brand | null>(null);
  const [deleteBrand, setDeleteBrand] = useState<Brand | null>(null);
  const [search, setSearch] = useState('');

  const { data: brandsRes, isLoading: loading } = useQuery({
    queryKey: ['adminBrands'],
    queryFn: () => api.get('/brands/admin'),
  });

  const brands: Brand[] = brandsRes?.data?.data?.brands ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return brands;
    const q = search.toLowerCase();
    return brands.filter(
      (b) => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q),
    );
  }, [brands, search]);

  const handleSaved = () => {
    setShowForm(false);
    setEditBrand(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-gray-900">Brands</h1>
          <p className="mt-1 text-sm text-gray-500">Manage the brands you carry in your store.</p>
        </div>
        <button
          onClick={() => { setEditBrand(null); setShowForm(true); }}
          className="btn-primary px-5 py-2.5 text-sm"
        >
          <Plus className="h-4 w-4" /> Add Brand
        </button>
      </div>

      {/* Search + Stats */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search brands..."
            className="input-field w-full pl-9"
          />
        </div>
        <div className="text-xs text-gray-400 flex items-center">
          {brands.length} brands
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
        </div>
      ) : brands.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Star className="h-12 w-12 text-blush-300 mb-3" />
          <p className="font-heading font-bold text-gray-500 text-lg">No brands yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first brand to get started.</p>
          <button
            onClick={() => { setEditBrand(null); setShowForm(true); }}
            className="btn-primary px-5 py-2.5 text-sm mt-4"
          >
            <Plus className="h-4 w-4" /> Add Brand
          </button>
        </div>
      ) : filtered.length === 0 && search ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="h-10 w-10 text-blush-300 mb-3" />
          <p className="font-heading font-bold text-gray-500">No results for &ldquo;{search}&rdquo;</p>
          <p className="text-sm text-gray-400 mt-1">Try a different search term.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((brand) => (
            <div
              key={brand.id}
              className="group relative rounded-3xl border border-blush-100 bg-white p-5
                         shadow-pink-sm hover:shadow-pink-md transition-all"
            >
              <div className="flex items-start gap-4">
                {/* Logo */}
                <div className="h-14 w-14 rounded-2xl overflow-hidden bg-blush-50 shrink-0 relative border border-blush-100">
                  {brand.logo ? (
                    <Image src={brand.logo} alt={brand.name} fill className="object-contain p-1" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Star className="h-6 w-6 text-blush-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-extrabold text-gray-900 truncate">{brand.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">/{brand.slug}</p>
                  {brand.description && (
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{brand.description}</p>
                  )}
                  <span className="inline-block mt-2 text-xs font-semibold text-gray-500 bg-blush-50 px-2.5 py-1 rounded-full">
                    {brand._count.products} product{brand._count.products !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Actions overlay */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setEditBrand(brand); setShowForm(true); }}
                  className="p-2 rounded-full bg-white border border-blush-100 shadow-sm hover:bg-blush-50 text-gray-500 hover:text-primary-600 transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteBrand(brand)}
                  className="p-2 rounded-full bg-white border border-blush-100 shadow-sm hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <BrandFormModal
          initial={editBrand}
          onClose={() => { setShowForm(false); setEditBrand(null); }}
          onSaved={handleSaved}
        />
      )}
      {deleteBrand && (
        <DeleteConfirmModal
          brand={deleteBrand}
          onClose={() => setDeleteBrand(null)}
          onDeleted={() => setDeleteBrand(null)}
        />
      )}
    </div>
  );
}
