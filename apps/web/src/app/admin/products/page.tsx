'use client';

import { useRef, useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Plus, Trash2, Pencil, Loader2, Package, Search,
  Eye, EyeOff, Star, ChevronLeft, ChevronRight,
  Upload, Link as LinkIcon, ArrowUp, ArrowDown, X,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductImage {
  id?: string;
  url: string;
  alt?: string;
  sortOrder?: number;
}

interface ProductVariant {
  id?: string;
  name: string;
  price: string;
  stock: string;
  options?: any;
}

interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: string;
  comparePrice: string | null;
  stock: number;
  trackStock: boolean;
  isActive: boolean;
  isFeatured: boolean;
  brand: { id: string; name: string };
  category: { id: string; name: string };
  images: { url: string }[];
  _count: { variants: number; reviews: number; orderItems: number };
  createdAt: string;
}

interface ProductFull extends ProductListItem {
  description: string;
  shortDesc: string | null;
  weight: number | null;
  skinTypes: string[];
  concerns: string[];
  images: ProductImage[];
  variants: { id: string; name: string; price: string; stock: number; options: any }[];
}

interface Category { id: string; name: string; parent?: { id: string; name: string } | null; }
interface Brand { id: string; name: string; }

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

const SKIN_TYPE_OPTIONS = ['Oily', 'Dry', 'Combination', 'Normal', 'Sensitive'];
const CONCERN_OPTIONS = ['Acne', 'Aging', 'Hydration', 'Brightening', 'Sun Protection', 'Redness', 'Pores', 'Dark Spots'];

// ── Product Form Modal ────────────────────────────────────────────────────────

function ProductFormModal({
  initial,
  categories,
  brands,
  onClose,
  onSaved,
}: {
  initial: ProductFull | null;
  categories: Category[];
  brands: Brand[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  // Basic fields
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [shortDesc, setShortDesc] = useState(initial?.shortDesc ?? '');
  const [price, setPrice] = useState(initial?.price?.toString() ?? '');
  const [comparePrice, setComparePrice] = useState(initial?.comparePrice?.toString() ?? '');
  const [stock, setStock] = useState(initial?.stock?.toString() ?? '0');
  const [trackStock, setTrackStock] = useState(initial?.trackStock ?? false);
  const [weight, setWeight] = useState(initial?.weight?.toString() ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);
  const [categoryId, setCategoryId] = useState(initial?.category?.id ?? '');
  const [brandId, setBrandId] = useState(initial?.brand?.id ?? '');
  const [skinTypes, setSkinTypes] = useState<string[]>(initial?.skinTypes ?? []);
  const [concerns, setConcerns] = useState<string[]>(initial?.concerns ?? []);
  const [skinTypeInput, setSkinTypeInput] = useState('');
  const [concernInput, setConcernInput] = useState('');

  // Images
  const [images, setImages] = useState<ProductImage[]>(initial?.images ?? []);
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Variants
  const [variants, setVariants] = useState<ProductVariant[]>(
    initial?.variants?.map((v) => ({
      id: v.id,
      name: v.name,
      price: v.price.toString(),
      stock: v.stock.toString(),
      options: v.options,
    })) ?? []
  );

  const saveMutation = useMutation({
    mutationFn: (payload: any) =>
      initial
        ? api.put(`/products/admin/${initial.id}`, payload)
        : api.post('/products/admin', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminProducts'] });
      toast.success(initial ? 'Product updated' : 'Product created');
      onSaved();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || 'Failed to save product');
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
    try {
      const url = await uploadToCloudinary(file);
      setImages((prev) => [...prev, { url, alt: '', sortOrder: prev.length }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const moveImage = (idx: number, dir: 'up' | 'down') => {
    setImages((prev) => {
      const arr = [...prev];
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= arr.length) return prev;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr.map((img, i) => ({ ...img, sortOrder: i }));
    });
  };

  const addVariant = () => setVariants((prev) => [...prev, { name: '', price: price || '0', stock: '0' }]);
  const removeVariant = (idx: number) => setVariants((prev) => prev.filter((_, i) => i !== idx));
  const updateVariant = (idx: number, field: string, val: string) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: val } : v)));
  };

  const toggleArrayItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const addCustomTag = (arr: string[], setArr: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    const trimmed = input.trim();
    if (trimmed && !arr.includes(trimmed)) {
      setArr([...arr, trimmed]);
      setInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    if (!sku.trim()) { setError('SKU is required'); return; }
    if (!price || parseFloat(price) < 0) { setError('Valid price is required'); return; }
    if (!categoryId) { setError('Category is required'); return; }
    if (!brandId) { setError('Brand is required'); return; }
    if (!description.trim()) { setError('Description is required'); return; }
    setError('');

    saveMutation.mutate({
      name, slug: slug || slugify(name), sku: sku.trim(), description, shortDesc: shortDesc || null,
      price, comparePrice: comparePrice || null, stock, trackStock, weight: weight || null,
      isActive, isFeatured, categoryId, brandId, skinTypes, concerns,
      images: images.map((img, i) => ({ url: img.url, alt: img.alt || '', sortOrder: i })),
      variants: variants.filter((v) => v.name.trim()).map((v) => ({
        name: v.name, price: v.price, stock: v.stock, options: v.options || null,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-4xl shadow-pink-lg mb-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blush-100 sticky top-0 bg-white rounded-t-4xl z-10">
          <h2 className="font-heading font-extrabold text-gray-900 text-lg">
            {initial ? 'Edit Product' : 'Add Product'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-blush-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
          )}

          {/* Basic Info */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Basic Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">Name <span className="text-red-400">*</span></label>
                <input value={name} onChange={(e) => handleNameChange(e.target.value)} className="input-field w-full" placeholder="Product name" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">SKU <span className="text-red-400">*</span></label>
                <input value={sku} onChange={(e) => setSku(e.target.value)} className="input-field w-full" placeholder="e.g. COSRX-001" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-600 mb-1">Slug</label>
                <input value={slug} onChange={(e) => { setSlugEdited(true); setSlug(e.target.value); }} className="input-field w-full" placeholder="auto-generated" />
              </div>
            </div>
          </section>

          {/* Description */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Description</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Short Description</label>
                <input value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} className="input-field w-full" placeholder="Brief summary..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Full Description <span className="text-red-400">*</span></label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="input-field w-full resize-none" placeholder="Detailed product description..." />
              </div>
            </div>
          </section>

          {/* Pricing & Inventory */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Pricing & Inventory</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Price ($) <span className="text-red-400">*</span></label>
                <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="input-field w-full" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Compare Price ($)</label>
                <input type="number" step="0.01" min="0" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} className="input-field w-full" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Stock</label>
                <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Weight (g)</label>
                <input type="number" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} className="input-field w-full" placeholder="Optional" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                  <input type="checkbox" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} className="h-4 w-4 rounded border-blush-300 text-primary-500 focus:ring-primary-400" />
                  <span className="text-sm font-semibold text-gray-700">Track Stock</span>
                </label>
              </div>
            </div>
          </section>

          {/* Categorization */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Categorization</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Category <span className="text-red-400">*</span></label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field w-full">
                  <option value="">Select category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.parent ? `${c.parent.name} > ` : ''}{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Brand <span className="text-red-400">*</span></label>
                <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="input-field w-full">
                  <option value="">Select brand...</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            {/* Skin Types */}
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Skin Types</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {SKIN_TYPE_OPTIONS.map((st) => (
                  <button key={st} type="button" onClick={() => toggleArrayItem(skinTypes, setSkinTypes, st)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${skinTypes.includes(st) ? 'bg-primary-500 text-white' : 'bg-blush-100 text-gray-600 hover:bg-blush-200'}`}>
                    {st}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={skinTypeInput} onChange={(e) => setSkinTypeInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(skinTypes, setSkinTypes, skinTypeInput, setSkinTypeInput); } }}
                  className="input-field flex-1 text-sm" placeholder="Custom skin type..." />
                <button type="button" onClick={() => addCustomTag(skinTypes, setSkinTypes, skinTypeInput, setSkinTypeInput)}
                  className="btn-secondary px-3 py-1.5 text-xs">Add</button>
              </div>
              {skinTypes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {skinTypes.map((st) => (
                    <span key={st} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-600">
                      {st}
                      <button type="button" onClick={() => setSkinTypes(skinTypes.filter((s) => s !== st))} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* Concerns */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Concerns</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {CONCERN_OPTIONS.map((cn) => (
                  <button key={cn} type="button" onClick={() => toggleArrayItem(concerns, setConcerns, cn)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${concerns.includes(cn) ? 'bg-primary-500 text-white' : 'bg-blush-100 text-gray-600 hover:bg-blush-200'}`}>
                    {cn}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={concernInput} onChange={(e) => setConcernInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag(concerns, setConcerns, concernInput, setConcernInput); } }}
                  className="input-field flex-1 text-sm" placeholder="Custom concern..." />
                <button type="button" onClick={() => addCustomTag(concerns, setConcerns, concernInput, setConcernInput)}
                  className="btn-secondary px-3 py-1.5 text-xs">Add</button>
              </div>
              {concerns.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {concerns.map((cn) => (
                    <span key={cn} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-600">
                      {cn}
                      <button type="button" onClick={() => setConcerns(concerns.filter((c) => c !== cn))} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Images */}
          <section>
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Images</h3>
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
                  {uploading ? 'Uploading...' : 'Click to upload image'}
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://example.com/image.jpg" className="input-field flex-1" />
                <button type="button" onClick={() => { if (urlInput.trim()) { setImages((prev) => [...prev, { url: urlInput.trim(), alt: '', sortOrder: prev.length }]); setUrlInput(''); } }}
                  disabled={!urlInput.trim()} className="btn-primary px-4 py-2.5 text-sm shrink-0">Add</button>
              </div>
            )}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {images.map((img, idx) => (
                  <div key={idx} className="group relative rounded-2xl border border-blush-200 bg-blush-50 overflow-hidden">
                    <div className="aspect-square relative">
                      <Image src={img.url} alt={img.alt || ''} fill className="object-cover" unoptimized />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      <button type="button" onClick={() => moveImage(idx, 'up')} disabled={idx === 0}
                        className="p-1.5 rounded-full bg-white/90 hover:bg-white disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => moveImage(idx, 'down')} disabled={idx === images.length - 1}
                        className="p-1.5 rounded-full bg-white/90 hover:bg-white disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => removeImage(idx)}
                        className="p-1.5 rounded-full bg-white/90 hover:bg-white text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-[10px] font-bold text-gray-600">
                      {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Variants */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Variants</h3>
              <button type="button" onClick={addVariant} className="flex items-center gap-1 text-xs font-bold text-primary-500 hover:text-primary-700">
                <Plus className="h-3.5 w-3.5" /> Add Variant
              </button>
            </div>
            {variants.length === 0 ? (
              <p className="text-xs text-gray-400">No variants. Add one if this product has options (size, color, etc).</p>
            ) : (
              <div className="space-y-3">
                {variants.map((v, idx) => (
                  <div key={idx} className="flex items-start gap-3 rounded-2xl border border-blush-100 bg-blush-50/50 p-3">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <input value={v.name} onChange={(e) => updateVariant(idx, 'name', e.target.value)}
                        className="input-field text-sm" placeholder="Variant name" />
                      <input type="number" step="0.01" min="0" value={v.price} onChange={(e) => updateVariant(idx, 'price', e.target.value)}
                        className="input-field text-sm" placeholder="Price" />
                      <input type="number" min="0" value={v.stock} onChange={(e) => updateVariant(idx, 'stock', e.target.value)}
                        className="input-field text-sm" placeholder="Stock" />
                    </div>
                    <button type="button" onClick={() => removeVariant(idx)}
                      className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Toggles */}
          <section className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-blush-300 text-primary-500 focus:ring-primary-400" />
              <span className="text-sm font-semibold text-gray-700">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4 rounded border-blush-300 text-primary-500 focus:ring-primary-400" />
              <span className="text-sm font-semibold text-gray-700">Featured</span>
            </label>
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-blush-100">
            <button type="button" onClick={onClose} className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending}
              className="btn-primary px-5 py-2.5 text-sm">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saveMutation.isPending ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────

function DeleteConfirmModal({
  product,
  onClose,
  onDeleted,
}: {
  product: ProductListItem;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/products/admin/${product.id}`),
    onSuccess: () => { toast.success('Product deleted'); queryClient.invalidateQueries({ queryKey: ['adminProducts'] }); onDeleted(); },
    onError: (err: any) => { toast.error(err?.response?.data?.message || 'Failed to delete product'); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-4xl shadow-pink-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50"><Trash2 className="h-5 w-5 text-red-500" /></div>
          <div>
            <h3 className="font-heading font-extrabold text-gray-900">Delete Product</h3>
            <p className="text-xs text-gray-500">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Delete <span className="font-bold">{product.name}</span>?
          {product._count.orderItems > 0 && (
            <span className="block mt-1 text-red-500 text-xs font-semibold">
              This product appears in {product._count.orderItems} order(s) and cannot be deleted. Deactivate it instead.
            </span>
          )}
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={deleteMutation.isPending} className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
          <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending || product._count.orderItems > 0}
            className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-colors disabled:opacity-50 shadow-sm">
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Products Page ───────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductFull | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<ProductListItem | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterFeatured, setFilterFeatured] = useState('');
  const [sort, setSort] = useState('newest');

  const { data: productsRes, isLoading: loading } = useQuery({
    queryKey: ['adminProducts', page, search, filterCategory, filterBrand, filterActive, filterFeatured, sort],
    queryFn: () => api.get('/products/admin', { params: { page, limit: 12, search: search || undefined, category: filterCategory || undefined, brand: filterBrand || undefined, isActive: filterActive || undefined, isFeatured: filterFeatured || undefined, sort } }),
  });

  const { data: categoriesRes } = useQuery({ queryKey: ['adminCategories'], queryFn: () => api.get('/categories/admin') });
  const { data: brandsRes } = useQuery({ queryKey: ['adminBrands'], queryFn: () => api.get('/brands/admin') });

  const products: ProductListItem[] = productsRes?.data?.data?.products ?? [];
  const pagination = productsRes?.data?.data?.pagination ?? { page: 1, total: 0, totalPages: 1 };
  const categories: Category[] = categoriesRes?.data?.data?.categories ?? [];
  const brands: Brand[] = brandsRes?.data?.data?.brands ?? [];

  const toggleActiveMutation = useMutation({
    mutationFn: (p: ProductListItem) => api.patch(`/products/admin/${p.id}/toggle`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminProducts'] }); toast.success('Product updated'); },
    onError: () => toast.error('Failed to update'),
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: (p: ProductListItem) => api.patch(`/products/admin/${p.id}/feature`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['adminProducts'] }); toast.success('Product updated'); },
    onError: () => toast.error('Failed to update'),
  });

  const handleEdit = async (p: ProductListItem) => {
    try {
      const res = await api.get(`/products/admin/${p.id}`);
      setEditProduct(res.data.data.product);
      setShowForm(true);
    } catch {
      toast.error('Failed to load product details');
    }
  };

  const handleSaved = () => { setShowForm(false); setEditProduct(null); };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your product catalog.</p>
        </div>
        <button onClick={() => { setEditProduct(null); setShowForm(true); }} className="btn-primary px-5 py-2.5 text-sm">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, SKU..."
            className="input-field w-full pl-9" />
        </div>
        <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }} className="input-field">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.parent ? `${c.parent.name} > ` : ''}{c.name}</option>)}
        </select>
        <select value={filterBrand} onChange={(e) => { setFilterBrand(e.target.value); setPage(1); }} className="input-field">
          <option value="">All Brands</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={`${filterActive}:${filterFeatured}:${sort}`} onChange={(e) => {
          const [a, f, s] = e.target.value.split(':');
          setFilterActive(a); setFilterFeatured(f); setSort(s); setPage(1);
        }} className="input-field">
          <option value="::newest">Newest First</option>
          <option value="::name">Name A-Z</option>
          <option value="::price_asc">Price Low-High</option>
          <option value="::price_desc">Price High-Low</option>
          <option value="::stock">Stock Low-High</option>
          <option value="true::newest">Active Only</option>
          <option value="false::newest">Inactive Only</option>
          <option value=":true:newest">Featured Only</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="h-12 w-12 text-blush-300 mb-3" />
          <p className="font-heading font-bold text-gray-500 text-lg">
            {search || filterCategory || filterBrand ? 'No products match your filters' : 'No products yet'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {search || filterCategory || filterBrand ? 'Try adjusting your filters.' : 'Add your first product to get started.'}
          </p>
        </div>
      ) : (
        <>
          {/* Product grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <div key={p.id} className="group relative rounded-3xl border border-blush-100 bg-white shadow-pink-sm hover:shadow-pink-md transition-all overflow-hidden">
                {/* Image */}
                <div className="aspect-[4/3] bg-blush-50 relative">
                  {p.images[0] ? (
                    <Image src={p.images[0].url} alt={p.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center"><Package className="h-10 w-10 text-blush-300" /></div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    {!p.isActive && <span className="rounded-full bg-gray-800/70 px-2 py-0.5 text-[10px] font-bold text-white">Inactive</span>}
                    {p.isFeatured && <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white flex items-center gap-0.5"><Star className="h-2.5 w-2.5" /> Featured</span>}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{p.name}</h3>
                      <p className="text-[11px] text-gray-400">{p.sku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-gray-900">${parseFloat(p.price).toFixed(2)}</p>
                      {p.comparePrice && <p className="text-[11px] text-gray-400 line-through">${parseFloat(p.comparePrice).toFixed(2)}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-3">
                    <span className="rounded-full bg-blush-50 px-2 py-0.5">{p.category.name}</span>
                    <span className="rounded-full bg-blush-50 px-2 py-0.5">{p.brand.name}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className={`font-semibold ${p.trackStock && p.stock <= 5 ? 'text-red-500' : 'text-gray-500'}`}>
                        Stock: {p.stock}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500">{p._count.reviews} reviews</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(p)} className="p-1.5 rounded-full hover:bg-blush-100 text-gray-400 hover:text-primary-600" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => toggleActiveMutation.mutate(p)} className="p-1.5 rounded-full hover:bg-blush-100 text-gray-400 hover:text-primary-600" title={p.isActive ? 'Deactivate' : 'Activate'}>
                        {p.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => toggleFeaturedMutation.mutate(p)} className={`p-1.5 rounded-full hover:bg-blush-100 ${p.isFeatured ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`} title={p.isFeatured ? 'Unfeature' : 'Feature'}>
                        <Star className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteProduct(p)} className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}
                  className="flex items-center gap-1 rounded-full border border-blush-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-blush-50 disabled:opacity-40">
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showForm && (
        <ProductFormModal
          initial={editProduct}
          categories={categories}
          brands={brands}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
          onSaved={handleSaved}
        />
      )}
      {deleteProduct && (
        <DeleteConfirmModal
          product={deleteProduct}
          onClose={() => setDeleteProduct(null)}
          onDeleted={() => setDeleteProduct(null)}
        />
      )}
    </div>
  );
}
