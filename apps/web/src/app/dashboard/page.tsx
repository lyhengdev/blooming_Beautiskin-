'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { User, Package, Heart, MapPin, Star, Lock, LogOut, Plus, Trash2, CheckCircle, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

const VALID_TABS = ['profile', 'orders', 'wishlist', 'addresses', 'reviews'];

const CAMBODIAN_PROVINCES = [
  'Phnom Penh',
  'Banteay Meanchey',
  'Battambang',
  'Kampong Cham',
  'Kampong Chhnang',
  'Kampong Speu',
  'Kampong Thom',
  'Kampot',
  'Kandal',
  'Koh Kong',
  'Kratie',
  'Mondulkiri',
  'Pailin',
  'Preah Vihear',
  'Prey Veng',
  'Pursat',
  'Ratanakiri',
  'Siem Reap',
  'Sihanoukville',
  'Stung Treng',
  'Svay Rieng',
  'Takeo',
  'Tboung Khmum',
];

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'orders', label: 'My Orders', icon: Package },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'reviews', label: 'Reviews', icon: Star },
];

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  items: { quantity: number; product: { name: string } }[];
}

interface WishlistItem {
  id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: string;
    brand: { name: string; slug: string };
    images: { url: string; alt: string | null }[];
  };
}

interface Address {
  id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  isDefault: boolean;
}

const EMPTY_ADDRESS_FORM = {
  name: '',
  phone: '',
  street: '',
  city: '',
  province: '',
  isDefault: false,
};

export default function DashboardContent() {
  const router = useRouter();
  const { user, logout, isInitialized } = useAuthStore();

  const [activeTab, setActiveTab] = useState('profile');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);

  // Read ?tab= from the URL on mount and on popstate (back/forward)
  useEffect(() => {
    const readTab = () => {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab') ?? '';
      if (VALID_TABS.includes(t)) setActiveTab(t);
      else setActiveTab('profile');
    };
    readTab();
    window.addEventListener('popstate', readTab);
    return () => window.removeEventListener('popstate', readTab);
  }, []);
  const [profileData, setProfileData] = useState({ name: '', phone: '' });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/login?returnTo=/dashboard');
    }
  }, [isInitialized, user, router]);

  useEffect(() => {
    if (!user) return;
    setProfileData({ name: user.name, phone: user.phone || '' });
  }, [user]);

  const { data: ordersRes, isLoading: ordersLoading } = useQuery({
    queryKey: ['userOrders'],
    queryFn: () => api.get('/orders'),
    enabled: !!user && activeTab === 'orders',
  });
  const orders: Order[] = ordersRes?.data?.data?.orders ?? [];

  const { data: wishlistRes, isLoading: wishlistLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist'),
    enabled: !!user && activeTab === 'wishlist',
  });
  const wishlist: WishlistItem[] = wishlistRes?.data?.data?.wishlist ?? [];

  const { data: addressesRes, isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/auth/addresses'),
    enabled: !!user && activeTab === 'addresses',
  });
  const addresses: Address[] = addressesRes?.data?.data?.addresses ?? [];

  const loading = activeTab === 'orders'
    ? ordersLoading
    : activeTab === 'wishlist'
      ? wishlistLoading
      : activeTab === 'addresses'
        ? addressesLoading
        : false;

  const profileMutation = useMutation({
    mutationFn: (data: { name: string; phone: string }) => api.put('/auth/profile', data),
    onSuccess: (res) => {
      const updatedUser = res.data.data.user;
      useAuthStore.setState((state) => ({
        user: state.user ? { ...state.user, ...updatedUser } : null,
      }));
      toast.success('Profile updated successfully');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    },
  });

  const handleSaveProfile = () => {
    profileMutation.mutate(profileData);
  };

  const resetAddressForm = () => {
    setAddressForm(EMPTY_ADDRESS_FORM);
    setEditingAddressId(null);
    setShowAddressForm(false);
  };

  const createAddressMutation = useMutation({
    mutationFn: (data: typeof EMPTY_ADDRESS_FORM) => api.post('/auth/addresses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      resetAddressForm();
      toast.success('Address saved');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save address');
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof EMPTY_ADDRESS_FORM }) => api.put(`/auth/addresses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      resetAddressForm();
      toast.success('Address updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update address');
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/addresses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address deleted');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete address');
    },
  });

  const defaultAddressMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/auth/addresses/${id}/default`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Default address updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update default address');
    },
  });

  const handleSubmitAddress = (e: FormEvent) => {
    e.preventDefault();
    if (editingAddressId) {
      updateAddressMutation.mutate({ id: editingAddressId, data: addressForm });
      return;
    }
    createAddressMutation.mutate(addressForm);
  };

  const handleEditAddress = (address: Address) => {
    setAddressForm({
      name: address.name,
      phone: address.phone,
      street: address.street,
      city: address.city,
      province: address.province,
      isDefault: address.isDefault,
    });
    setEditingAddressId(address.id);
    setShowAddressForm(true);
  };

  if (!isInitialized || !user) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 bg-gray-50">
          <div className="container-shop py-8">
            <div className="h-9 bg-gray-200 rounded w-48 mb-8 animate-pulse" />
            <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
              <div className="card p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24" />
                    <div className="h-3 bg-gray-200 rounded w-32" />
                  </div>
                </div>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 bg-gray-100 rounded" />)}
                </div>
              </div>
              <div className="card p-6">
                <div className="h-6 bg-gray-200 rounded w-40 mb-4" />
                <div className="space-y-3">
                  <div className="h-10 bg-gray-100 rounded" />
                  <div className="h-10 bg-gray-100 rounded" />
                  <div className="h-10 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <div className="container-shop py-8">
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 mb-8">My Account</h1>

          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
            <div className="mb-6 lg:mb-0">
              <div className="card p-4">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-lg font-bold text-primary-700">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        router.replace(`/dashboard?tab=${tab.id}`, { scroll: false });
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === tab.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                      <tab.icon className="h-4 w-4" />{tab.label}
                    </button>
                  ))}
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    <Lock className="h-4 w-4" /> Change Password
                  </button>
                  <button onClick={async () => { await logout(); router.push('/'); }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </nav>
              </div>
            </div>

            <div>
              {activeTab === 'profile' && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input type="text" className="input-field" value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" className="input-field" value={user.email} disabled />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input type="tel" className="input-field" value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} />
                    </div>
                  </div>
                  <button onClick={handleSaveProfile} className="mt-6 btn-primary">Save Changes</button>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold mb-4">Order History</h2>
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}
                    </div>
                  ) : orders.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No orders yet. <a href="/shop" className="text-primary-600">Start shopping</a></p>
                  ) : (
                    <div className="space-y-3">
                      {orders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{order.orderNumber}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString()} &middot; {order.items.length} items
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : order.status === 'SHIPPING' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {order.status}
                            </span>
                            <p className="text-sm font-bold mt-1">${order.total}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'wishlist' && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold mb-4">My Wishlist</h2>
                  {loading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => <div key={i} className="h-56 bg-gray-100 rounded-lg animate-pulse" />)}
                    </div>
                  ) : wishlist.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Your wishlist is empty.</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {wishlist.map((item) => (
                        <a key={item.id} href={`/product/${item.product.slug}`} className="card">
                          <div className="relative aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                            {item.product.images.length > 0 ? (
                              <Image src={item.product.images[0].url} alt={item.product.name} fill className="object-cover" unoptimized />
                            ) : <Package className="h-8 w-8 text-gray-300" />}
                          </div>
                          <div className="p-3">
                            <p className="text-xs text-primary-600">{item.product.brand.name}</p>
                            <p className="text-sm font-medium truncate">{item.product.name}</p>
                            <p className="text-lg font-bold text-primary-600 mt-1">${item.product.price}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'addresses' && (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Saved Addresses</h2>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddressId(null);
                        setAddressForm(EMPTY_ADDRESS_FORM);
                        setShowAddressForm((value) => !value);
                      }}
                      className="btn-secondary text-sm"
                    >
                      <Plus className="h-4 w-4" /> Add Address
                    </button>
                  </div>
                  {showAddressForm && (
                    <form onSubmit={handleSubmitAddress} className="mb-6 rounded-2xl border border-blush-100 bg-blush-50 p-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Name</label>
                          <input
                            type="text"
                            required
                            className="input-field"
                            value={addressForm.name}
                            onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            required
                            className="input-field"
                            value={addressForm.phone}
                            onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                          <input
                            type="text"
                            required
                            className="input-field"
                            value={addressForm.street}
                            onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City/District</label>
                          <input
                            type="text"
                            required
                            className="input-field"
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                          <select
                            required
                            className="input-field"
                            value={addressForm.province}
                            onChange={(e) => setAddressForm({ ...addressForm, province: e.target.value })}
                          >
                            <option value="">Select province</option>
                            {CAMBODIAN_PROVINCES.map((province) => (
                              <option key={province} value={province}>{province}</option>
                            ))}
                          </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={addressForm.isDefault}
                            onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                            className="h-4 w-4 rounded border-blush-200 text-primary-600"
                          />
                          Use as default shipping address
                        </label>
                      </div>
                      <div className="mt-4 flex gap-3">
                        <button
                          type="submit"
                          disabled={createAddressMutation.isPending || updateAddressMutation.isPending}
                          className="btn-primary"
                        >
                          {editingAddressId ? 'Update Address' : 'Save Address'}
                        </button>
                        <button type="button" onClick={resetAddressForm} className="btn-ghost">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => <div key={i} className="h-28 bg-gray-100 rounded-lg animate-pulse" />)}
                    </div>
                  ) : addresses.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No saved addresses yet.</p>
                  ) : (
                    <div className="grid gap-3">
                      {addresses.map((address) => (
                        <div key={address.id} className="rounded-2xl border border-blush-100 bg-white p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-gray-900">{address.name}</p>
                                {address.isDefault && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                                    <CheckCircle className="h-3 w-3" /> Default
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-sm text-gray-500">{address.phone}</p>
                              <p className="mt-1 text-sm text-gray-600">{address.street}</p>
                              <p className="text-sm text-gray-500">{address.city}, {address.province}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {!address.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => defaultAddressMutation.mutate(address.id)}
                                  className="rounded-lg border border-blush-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-primary-300 hover:text-primary-600"
                                >
                                  Set Default
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleEditAddress(address)}
                                className="rounded-lg border border-blush-200 p-2 text-gray-500 hover:border-primary-300 hover:text-primary-600"
                                aria-label="Edit address"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteAddressMutation.mutate(address.id)}
                                className="rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50"
                                aria-label="Delete address"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold mb-4">My Reviews</h2>
                  <p className="text-gray-500 text-center py-8">You haven&apos;t written any reviews yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
