'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Plus, Trash2, Pencil, Loader2, FolderTree,
  ChevronRight, ChevronDown, Search,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CategoryParent {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  parent: CategoryParent | null;
  _count: { products: number };
}

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId: string;
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

// ── Category Form Modal ──────────────────────────────────────────────────────

function CategoryFormModal({
  initial,
  allCategories,
  onClose,
  onSaved,
}: {
  initial: Category | null;
  allCategories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CategoryFormData>({
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    description: initial?.description ?? '',
    image: initial?.image ?? '',
    parentId: initial?.parentId ?? '',
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState('');

  const saveMutation = useMutation({
    mutationFn: (payload: CategoryFormData) => {
      const body = {
        ...payload,
        parentId: payload.parentId || null,
      };
      return initial
        ? api.put(`/categories/admin/${initial.id}`, body)
        : api.post('/categories/admin', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      toast.success(initial ? 'Category updated' : 'Category created');
      onSaved();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to save category';
      setError(msg);
    },
  });

  const handleNameChange = (val: string) => {
    setForm((f) => ({
      ...f,
      name: val,
      slug: slugEdited ? f.slug : slugify(val),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setError('');
    saveMutation.mutate(form);
  };

  // Filter out current category and its descendants from parent options
  const parentOptions = useMemo(() => {
    if (!initial) return allCategories;
    return allCategories.filter((c) => c.id !== initial.id);
  }, [allCategories, initial]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-4xl shadow-pink-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-blush-100">
          <h2 className="font-heading font-extrabold text-gray-900 text-lg">
            {initial ? 'Edit Category' : 'Add Category'}
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
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Sunscreen"
              className="input-field w-full"
              autoFocus
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Slug</label>
            <input
              value={form.slug}
              onChange={(e) => { setSlugEdited(true); setForm((f) => ({ ...f, slug: e.target.value })); }}
              placeholder="auto-generated-from-name"
              className="input-field w-full"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              URL-friendly identifier. Leave blank to auto-generate.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional description..."
              rows={2}
              className="input-field w-full resize-none"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Image URL</label>
            <input
              value={form.image}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              placeholder="https://example.com/category.jpg"
              className="input-field w-full"
            />
            {form.image && (
              <div className="mt-2 rounded-2xl overflow-hidden border border-blush-200 h-32 bg-blush-50 relative">
                <Image src={form.image} alt="Preview" fill className="object-cover" unoptimized />
              </div>
            )}
          </div>

          {/* Parent Category */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Parent Category</label>
            <select
              value={form.parentId}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              className="input-field w-full"
            >
              <option value="">None (top-level)</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent ? `${c.parent.name} > ` : ''}{c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-blush-100">
            <button type="button" onClick={onClose}
              className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending || !form.name.trim()}
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
  category,
  onClose,
  onDeleted,
}: {
  category: Category;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/categories/admin/${category.id}`),
    onSuccess: () => {
      toast.success('Category deleted');
      queryClient.invalidateQueries({ queryKey: ['adminCategories'] });
      onDeleted();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to delete category';
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
            <h3 className="font-heading font-extrabold text-gray-900">Delete Category</h3>
            <p className="text-xs text-gray-500">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to delete <span className="font-bold">{category.name}</span>?
          {category._count.products > 0 && (
            <span className="block mt-1 text-red-500 text-xs font-semibold">
              This category has {category._count.products} product(s) and cannot be deleted. Reassign them first.
            </span>
          )}
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={deleteMutation.isPending}
            className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending || category._count.products > 0}
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

// ── Main Categories Page ─────────────────────────────────────────────────────

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState('');
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  const { data: categoriesRes, isLoading: loading } = useQuery({
    queryKey: ['adminCategories'],
    queryFn: () => api.get('/categories/admin'),
  });

  const categories: Category[] = categoriesRes?.data?.data?.categories ?? [];

  // Organize into tree for display
  const { topLevel, childMap } = useMemo(() => {
    const top: Category[] = [];
    const children: Record<string, Category[]> = {};
    for (const cat of categories) {
      if (!cat.parentId) {
        top.push(cat);
      } else {
        if (!children[cat.parentId]) children[cat.parentId] = [];
        children[cat.parentId].push(cat);
      }
    }
    top.sort((a, b) => a.name.localeCompare(b.name));
    for (const key of Object.keys(children)) {
      children[key].sort((a: Category, b: Category) => a.name.localeCompare(b.name));
    }
    return { topLevel: top, childMap: children };
  }, [categories]);

  // Filter by search
  const filteredTopLevel = useMemo(() => {
    if (!search.trim()) return topLevel;
    const q = search.toLowerCase();
    const matchedIds = new Set<string>();
    // Find direct matches
    for (const cat of categories) {
      if (cat.name.toLowerCase().includes(q) || cat.slug.toLowerCase().includes(q)) {
        matchedIds.add(cat.id);
        if (cat.parentId) matchedIds.add(cat.parentId);
      }
    }
    return topLevel.filter((c) => matchedIds.has(c.id));
  }, [topLevel, categories, search]);

  const toggleExpand = (id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditCategory(null);
  };

  const totalProducts = categories.reduce((sum, c) => sum + c._count.products, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-500">
            Organize your products into categories and subcategories.
          </p>
        </div>
        <button
          onClick={() => { setEditCategory(null); setShowForm(true); }}
          className="btn-primary px-5 py-2.5 text-sm"
        >
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {/* Search + Stats */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="input-field w-full pl-9"
          />
        </div>
        <div className="text-xs text-gray-400 flex items-center">
          {categories.length} categories · {totalProducts} products
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary-400 animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderTree className="h-12 w-12 text-blush-300 mb-3" />
          <p className="font-heading font-bold text-gray-500 text-lg">No categories yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first category to organize products.</p>
          <button
            onClick={() => { setEditCategory(null); setShowForm(true); }}
            className="btn-primary px-5 py-2.5 text-sm mt-4"
          >
            <Plus className="h-4 w-4" /> Add Category
          </button>
        </div>
      ) : filteredTopLevel.length === 0 && search ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="h-10 w-10 text-blush-300 mb-3" />
          <p className="font-heading font-bold text-gray-500">No results for &ldquo;{search}&rdquo;</p>
          <p className="text-sm text-gray-400 mt-1">Try a different search term.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredTopLevel.map((cat) => {
            const children = childMap[cat.id] ?? [];
            const isExpanded = expandedParents.has(cat.id);
            const hasChildren = children.length > 0;

            return (
              <div key={cat.id}>
                {/* Parent row */}
                <div className="group flex items-center gap-3 rounded-2xl border border-blush-100 bg-white px-4 py-3 shadow-pink-sm hover:shadow-pink-md transition-all">
                  {/* Expand toggle */}
                  <button
                    onClick={() => toggleExpand(cat.id)}
                    disabled={!hasChildren}
                    className={`p-1 rounded-lg transition-colors ${hasChildren ? 'hover:bg-blush-100 text-gray-400' : 'text-transparent'}`}
                  >
                    {hasChildren ? (
                      isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                  </button>

                  {/* Image */}
                  <div className="h-10 w-10 rounded-xl overflow-hidden bg-blush-50 shrink-0 relative">
                    {cat.image ? (
                      <Image src={cat.image} alt={cat.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <FolderTree className="h-5 w-5 text-blush-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{cat.name}</p>
                    <p className="text-xs text-gray-400 truncate">/{cat.slug}</p>
                  </div>

                  {/* Product count */}
                  <span className="text-xs font-semibold text-gray-500 bg-blush-50 px-2.5 py-1 rounded-full shrink-0">
                    {cat._count.products} product{cat._count.products !== 1 ? 's' : ''}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => { setEditCategory(cat); setShowForm(true); }}
                      className="p-2 rounded-full hover:bg-blush-100 text-gray-500 hover:text-primary-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteCategory(cat)}
                      className="p-2 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Children rows */}
                {isExpanded && children.map((child) => (
                  <div
                    key={child.id}
                    className="group flex items-center gap-3 rounded-2xl border border-blush-50 bg-blush-50/50 ml-10 mr-3 px-4 py-2.5 hover:bg-blush-50 transition-all"
                  >
                    <div className="h-8 w-8 rounded-lg overflow-hidden bg-blush-100 shrink-0 relative ml-5">
                      {child.image ? (
                        <Image src={child.image} alt={child.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <FolderTree className="h-4 w-4 text-blush-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">{child.name}</p>
                      <p className="text-xs text-gray-400 truncate">/{child.slug}</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 bg-white px-2.5 py-1 rounded-full shrink-0">
                      {child._count.products} product{child._count.products !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => { setEditCategory(child); setShowForm(true); }}
                        className="p-2 rounded-full hover:bg-blush-100 text-gray-500 hover:text-primary-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteCategory(child)}
                        className="p-2 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <CategoryFormModal
          initial={editCategory}
          allCategories={categories}
          onClose={() => { setShowForm(false); setEditCategory(null); }}
          onSaved={handleSaved}
        />
      )}
      {deleteCategory && (
        <DeleteConfirmModal
          category={deleteCategory}
          onClose={() => setDeleteCategory(null)}
          onDeleted={() => setDeleteCategory(null)}
        />
      )}
    </div>
  );
}
