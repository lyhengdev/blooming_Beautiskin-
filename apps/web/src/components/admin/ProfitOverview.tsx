'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, AlertTriangle, PiggyBank, RefreshCw, Calendar } from 'lucide-react';
import api from '@/lib/api';

type Summary = {
  revenue: number; cost: number; profit: number | null; margin: number | null;
  unitsSold: number; unitsWithoutCost: number; estimatedUnits: number; orders: number;
  missingCostProducts?: { productId: string; name: string; sku: string; unitsWithoutCost: number; savedSalesWithoutCost: number }[];
  estimatedCostProducts?: { productId: string; name: string; sku: string; estimatedUnits: number; costPrice: number }[];
};
type ProfitStats = {
  today: Summary; last30Days: Summary; allTime: Summary; custom?: Summary;
  trend: (Summary & { date: string })[];
  topProducts: (Summary & { productId: string; name: string; sku: string })[];
  totalProducts: number; totalProductsWithCost: number;
};
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const periods = [
  { key: 'today', label: 'Today' },
  { key: 'last30Days', label: 'Last 30 days' },
  { key: 'allTime', label: 'All time' },
  { key: 'custom', label: 'Custom' },
] as const;
type PeriodKey = typeof periods[number]['key'];

export default function ProfitOverview() {
  const [period, setPeriod] = useState<PeriodKey>('last30Days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const isCustom = period === 'custom' && customFrom && customTo;
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['adminProfitStats', isCustom ? customFrom : null, isCustom ? customTo : null],
    queryFn: async () => {
      const params = isCustom ? { params: { from: customFrom, to: customTo } } : {};
      return (await api.get<{ data: ProfitStats }>('/admin/profit-stats', params)).data.data;
    },
    refetchInterval: 60000,
  });
  const summary = period === 'custom' ? data?.custom : data?.[period];
  const max = Math.max(...(data?.trend.map((day) => Math.abs(day.profit ?? 0)) ?? []), 1);
  const periodLabel = period === 'custom' && customFrom && customTo
    ? `${customFrom} – ${customTo}`
    : periods.find((entry) => entry.key === period)?.label;

  return (
    <section aria-labelledby="profit-heading" className="mb-6 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-pink-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-100 bg-emerald-50/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><PiggyBank className="h-5 w-5" /></div>
          <div><h2 id="profit-heading" className="font-bold text-gray-900">Profit overview</h2><p className="text-xs text-gray-500">Know what your sales earn</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 bg-white p-1" role="group" aria-label="Profit period">
            {periods.map(({ key, label }) => <button key={key} onClick={() => setPeriod(key)} aria-pressed={period === key} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${period === key ? 'bg-emerald-700 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{label}</button>)}
          </div>
          <button onClick={() => refetch()} disabled={isFetching} aria-label="Refresh profit" className="rounded-lg p-2 text-gray-500 hover:bg-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>
      {period === 'custom' && <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-3">
        <Calendar className="h-4 w-4 text-gray-400" />
        <label className="text-xs font-semibold text-gray-600">From
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="ml-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </label>
        <label className="text-xs font-semibold text-gray-600">To
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="ml-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </label>
        {!customFrom || !customTo ? <p className="text-xs text-gray-400">Select both dates to see results</p> : null}
      </div>}
      {isLoading ? <p role="status" className="p-8 text-center text-sm text-gray-500">Loading profit…</p>
        : isError ? <div role="alert" className="p-6 text-sm text-red-600">Couldn&apos;t load profit. <button onClick={() => refetch()} className="font-bold underline">Try again</button></div>
        : summary && data && <div className="p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={`rounded-xl p-4 ${summary.profit !== null && summary.profit < 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <p className="text-xs font-semibold text-gray-600">{summary.estimatedUnits > 0 ? 'Estimated gross profit' : 'Gross profit'}</p>
              <p className={`mt-2 text-3xl font-extrabold tracking-tight ${summary.profit !== null && summary.profit < 0 ? 'text-red-700' : 'text-emerald-800'}`}>{summary.profit === null ? 'Incomplete' : money(summary.profit)}</p>
              <p className="mt-2 text-xs text-gray-500">Sales after discounts − product costs</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-4"><p className="text-xs font-semibold text-gray-500">Product sales</p><p className="mt-2 text-2xl font-bold text-gray-900">{money(summary.revenue)}</p><p className="mt-2 text-xs text-gray-500">{summary.orders} orders · {summary.unitsSold} units sold</p></div>
            <div className="rounded-xl border border-gray-100 p-4"><p className="text-xs font-semibold text-gray-500">{summary.unitsWithoutCost ? 'Known product costs' : 'Product costs'}</p><p className="mt-2 text-2xl font-bold text-gray-900">{money(summary.cost)}</p><p className="mt-2 text-xs text-gray-500">Purchase cost of items sold</p></div>
            <div className="rounded-xl border border-gray-100 p-4"><p className="text-xs font-semibold text-gray-500">Gross margin</p><p className={`mt-2 text-2xl font-bold ${(summary.margin ?? 0) < 0 ? 'text-red-700' : 'text-gray-900'}`}>{summary.margin === null ? '—' : `${summary.margin.toFixed(1)}%`}</p><p className="mt-2 text-xs text-gray-500">Profit as a share of product sales</p></div>
          </div>
          {summary.unitsWithoutCost > 0 && <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
            <div role="status" className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{summary.unitsWithoutCost} sold {summary.unitsWithoutCost === 1 ? 'unit has' : 'units have'} no recorded cost, so profit and margin are incomplete.</p>
            </div>
            <h3 className="mt-3 font-bold">Products missing cost · {periodLabel}</h3>
            <ul aria-label="Products missing cost" className="mt-2 max-h-64 space-y-2 overflow-y-auto">
              {(summary.missingCostProducts ?? []).map((product) => <li key={product.productId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
                <div className="min-w-0 flex-1 basis-40">
                  <Link href={`/admin/products?edit=${encodeURIComponent(product.productId)}`} className="break-words font-bold hover:underline">{product.name}</Link>
                  <p className="break-words text-amber-700">SKU: {product.sku || '—'} · {product.unitsWithoutCost} {product.unitsWithoutCost === 1 ? 'unit' : 'units'} missing cost</p>
                  {product.savedSalesWithoutCost > 0 && <p className="text-[11px]">{product.savedSalesWithoutCost} {product.savedSalesWithoutCost === 1 ? 'unit needs' : 'units need'} a historical sale cost correction; editing the product only affects future sales.</p>}
                </div>
                <Link href={`/admin/products?edit=${encodeURIComponent(product.productId)}`} aria-label={`Edit cost for ${product.name}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-200 px-3 py-1.5 font-bold hover:bg-amber-100">Edit cost <ArrowRight className="h-3 w-3" /></Link>
              </li>)}
            </ul>
            <p className="mt-3">Set each product&apos;s purchase cost before new sales. Older sales without a saved cost use the current product cost as an estimate.</p>
          </div>}
          {summary.estimatedUnits > 0 && <details key={period} className="mt-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-xs leading-5 text-amber-800">
            <summary className="cursor-pointer rounded font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600">
              {summary.estimatedUnits} {summary.estimatedUnits === 1 ? 'unit from an older sale uses' : 'units from older sales use'} current product costs. Their profit is an estimate.
              <span className="ml-2 underline">View products ({summary.estimatedCostProducts?.length ?? 0})</span>
            </summary>
            <h3 className="mt-3 font-bold">Products using estimated costs · {periodLabel}</h3>
            <ul aria-label="Products using estimated costs" className="mt-2 max-h-64 space-y-2 overflow-y-auto">
              {(summary.estimatedCostProducts ?? []).map((product) => <li key={product.productId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2">
                <div className="min-w-0 flex-1 basis-40">
                  <Link href={`/admin/products?edit=${encodeURIComponent(product.productId)}`} className="break-words font-bold hover:underline">{product.name}</Link>
                  <p className="break-words">SKU: {product.sku || '—'} · {product.estimatedUnits} {product.estimatedUnits === 1 ? 'unit' : 'units'}</p>
                  <p>Cost used: <span className="font-semibold">{money(product.costPrice)} per unit</span></p>
                </div>
                <Link href={`/admin/products?edit=${encodeURIComponent(product.productId)}`} aria-label={`Review cost for ${product.name}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-200 px-3 py-1.5 font-bold hover:bg-amber-100">Review cost <ArrowRight className="h-3 w-3" /></Link>
              </li>)}
            </ul>
            <p className="mt-3">These sales have no saved purchase cost. Changing the current product cost updates their estimate; it does not confirm what you paid at the time.</p>
          </details>}
          {summary.orders === 0 && <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-500">No sales in this period yet. Profit will appear as orders come in.</p>}
          <p className="mt-4 text-xs leading-5 text-gray-500">Includes unpaid and pending orders; cancelled and refunded orders are excluded. Shipping and operating expenses are excluded. Dates use Cambodia time.</p>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-100 p-4">
              <h3 className="text-sm font-bold text-gray-800">Daily gross profit</h3><p className="mt-1 text-xs text-gray-400">Last 7 days · current-cost estimates for older sales</p>
              <div className="mt-4 grid grid-cols-7 gap-2" aria-label="Daily gross profit for the last seven days">
                {data.trend.map((day) => <div key={day.date} className="min-w-0 text-center" title={`${day.date}: ${day.profit === null ? 'Missing costs' : money(day.profit)}`}>
                  <div className="flex h-24 items-end justify-center rounded-lg bg-gray-50"><div className={`w-5 rounded-t-md sm:w-8 ${day.profit === null ? 'bg-amber-200' : day.profit < 0 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ height: `${day.profit === null ? 8 : Math.max(4, Math.abs(day.profit) / max * 100)}%` }} /></div>
                  <p className="mt-2 break-all text-[10px] font-bold text-gray-700">{day.profit === null ? '—' : money(day.profit)}</p>
                  <p className="mt-1 text-[10px] text-gray-400">{day.date.slice(5).replace('-', '/')}</p>
                </div>)}
              </div>
            </div>
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-gray-800">Top sellers · all time</h3><Link href="/admin/products" className="flex items-center gap-1 text-xs font-bold text-primary-600">Manage costs <ArrowRight className="h-3 w-3" /></Link></div>
              {data.topProducts.length === 0 ? <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">Your best-selling products will appear here.</p> : <div className="space-y-2">{data.topProducts.slice(0, 5).map((product) => <div key={product.productId} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2">
                <div className="min-w-0"><Link href={`/admin/products?edit=${product.productId}`} className="block truncate text-sm font-semibold text-gray-800 hover:text-primary-600">{product.name}</Link><p className="text-[11px] text-gray-500">{product.unitsSold} sold · {money(product.revenue)} sales</p></div>
                <div className="shrink-0 text-right"><p className={`text-sm font-bold ${product.profit === null ? 'text-amber-700' : product.profit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{product.profit === null ? 'Missing cost' : money(product.profit)}</p><p className="text-[10px] text-gray-500">{product.estimatedUnits ? 'Estimated profit' : 'Gross profit'}{product.margin !== null ? ` · ${product.margin.toFixed(1)}%` : ''}</p></div>
              </div>)}</div>}
              <p className="mt-3 text-xs text-gray-400">Cost prices set for {data.totalProductsWithCost} of {data.totalProducts} active products.</p>
            </div>
          </div>
        </div>}
    </section>
  );
}
