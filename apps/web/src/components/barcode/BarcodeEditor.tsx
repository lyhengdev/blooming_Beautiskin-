'use client';

import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Printer, Trash2, Plus } from 'lucide-react';
import api from '@/lib/api';
import ScanInput, { ScanCode } from './ScanInput';
import BarcodeLabels from './BarcodeLabels';

export interface BarcodeValue extends ScanCode { id?: string }

export default function BarcodeEditor({ value, onChange, productId, variantId, name, onBusyChange, isVariant = false }: {
  value: BarcodeValue[]; onChange: (codes: BarcodeValue[]) => void; productId?: string; variantId?: string; name: string;
  onBusyChange?: (busy: boolean) => void; isVariant?: boolean;
}) {
  const [print, setPrint] = useState<BarcodeValue | null>(null);
  const [existing, setExisting] = useState<{ id: string; name: string } | null>(null);
  async function assign(code: ScanCode) {
    setExisting(null);
    if (value.some((entry) => entry.value === code.value)) throw new Error('This barcode is already listed.');
    try {
      const response = await api.get('/products/admin/barcode-lookup', { params: { code: code.value, format: code.format } });
      const found = response.data.data;
      const same = isVariant ? variantId && found.variant?.id === variantId : productId && found.product.id === productId && !found.variant;
      if (!same) {
        setExisting({ id: found.product.id, name: `${found.product.name}${found.variant ? ` (${found.variant.name})` : ''}` });
        throw new Error(`Already assigned to ${found.product.name}${found.variant ? ` (${found.variant.name})` : ''}`);
      }
      code = found.barcode;
    } catch (error) {
      if (!isAxiosError(error) || error.response?.status !== 404) {
        throw new Error(isAxiosError(error) ? error.response?.data?.message || 'Connection failed. Retry the lookup.' : (error as Error).message);
      }
    }
    onChange([...value, code]);
    return `Barcode ${code.value} added to draft`;
  }
  return <div className="space-y-2 border-t border-gray-100 pt-3">
    <h3 className="text-xs font-bold text-gray-600">Barcodes</h3>
    <ScanInput onScan={assign} onPendingChange={onBusyChange} />
    {existing && <a href={`/admin/products?edit=${encodeURIComponent(existing.id)}`} target="_blank" rel="noreferrer" className="block text-sm text-primary-600 underline">Open {existing.name}</a>}
    <ul className="space-y-1">{value.map((code, index) => <li key={`${code.value}-${index}`} className="flex min-w-0 items-center gap-2 rounded-lg border px-2 py-1">
      <span className="min-w-0 flex-1 break-all font-mono text-xs">{code.value}</span>
      <button type="button" disabled={!code.id} title={code.id ? 'Print barcode labels' : 'Save and reopen the product to print'} aria-label={`Print ${code.value}`} onClick={() => setPrint(code)} className="p-2 disabled:opacity-30"><Printer className="h-4 w-4" /></button>
      <button type="button" aria-label={`Remove ${code.value}`} onClick={() => onChange(value.filter((_, at) => at !== index))} className="p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
    </li>)}</ul>
    <button type="button" disabled={value.length >= 20} onClick={() => onChange([...value, { value: `BBS-${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`, format: 'CODE_128' }])} className="flex items-center gap-1 text-xs font-semibold text-primary-600 disabled:opacity-40"><Plus className="h-4 w-4" />Generate internal barcode</button>
    {print && <BarcodeLabels code={print} name={name} onClose={() => setPrint(null)} />}
  </div>;
}
