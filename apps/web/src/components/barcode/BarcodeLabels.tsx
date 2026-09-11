'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import type { ScanCode } from './ScanInput';

export default function BarcodeLabels({ code, name, onClose }: { code: ScanCode; name: string; onClose: () => void }) {
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  const [copies, setCopies] = useState(1);
  const [width, setWidth] = useState(60);
  const [height, setHeight] = useState(35);
  const [paper, setPaper] = useState('A4');
  useEffect(() => {
    let cancelled = false;
    import('bwip-js/browser').then((bwip) => {
      const canvas = document.createElement('canvas');
      const format = code.format === 'CODE_128' ? 'code128' : code.value.length === 8 ? 'ean8' : code.value.length === 12 ? 'upca' : code.value.length === 13 ? 'ean13' : 'code128';
      bwip.toCanvas(canvas, { bcid: format, text: code.value, scale: 3, height: 12, includetext: true, padding: 10, backgroundcolor: 'FFFFFF' });
      if (!cancelled) setImage(canvas.toDataURL('image/png'));
    }).catch(() => { if (!cancelled) setError('Unable to render this barcode. Check its value and format.'); });
    return () => { cancelled = true; };
  }, [code]);
  return createPortal(<div id="barcode-print-root" role="dialog" aria-modal="true" aria-label="Print barcode labels" className="fixed inset-0 z-[90] overflow-auto bg-white p-4 sm:p-8">
    <style>{`@media print { @page { size: ${paper === 'A4' ? 'A4' : `${width}mm ${height}mm`}; margin: ${paper === 'A4' ? '10mm' : '0'}; } body > *:not(#barcode-print-root) { display:none !important; } #barcode-print-root { position:static !important; padding:0 !important; overflow:visible !important; } .barcode-print-controls { display:none !important; } .barcode-label-grid { gap:0 !important; } .barcode-label { border:0 !important; } }`}</style>
    <div className="barcode-print-controls mx-auto mb-6 max-w-3xl space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Barcode labels</h2><button autoFocus type="button" onClick={onClose} aria-label="Close labels" className="p-2"><X /></button></div>
      <div className="flex flex-wrap gap-3">
        <label className="text-sm">Paper<select value={paper} onChange={(event) => setPaper(event.target.value)} className="input-field mt-1 block"><option>A4</option><option value="label">Single label</option></select></label>
        {[{ label: 'Copies', value: copies, set: setCopies, min: 1, max: 100 }, { label: 'Width (mm)', value: width, set: setWidth, min: 30, max: 100 }, { label: 'Height (mm)', value: height, set: setHeight, min: 25, max: 100 }].map((field) => <label key={field.label} className="text-sm">{field.label}<input type="number" min={field.min} max={field.max} value={field.value} onChange={(event) => field.set(Math.max(field.min, Math.min(field.max, Number(event.target.value) || field.min)))} className="input-field mt-1 block w-24" /></label>)}
        <button type="button" disabled={!image || !!error} onClick={() => window.print()} className="flex items-center gap-2 self-end rounded-lg bg-gray-900 px-4 py-3 text-sm text-white disabled:opacity-40"><Printer className="h-4 w-4" />Print</button>
      </div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
    </div>
    <div className="barcode-label-grid flex flex-wrap gap-2" style={{ maxWidth: paper === 'A4' ? '190mm' : `${width}mm` }}>
      {Array.from({ length: copies }, (_, index) => <div key={index} className="barcode-label flex flex-col items-center justify-center overflow-hidden border border-gray-200 bg-white p-2 text-black" style={{ width: `${width}mm`, height: `${height}mm`, breakInside: 'avoid' }}>
        <p className="line-clamp-2 w-full break-words text-center text-[10px] leading-tight">{name}</p>
        {/* A generated bitmap preserves the renderer's quiet zones when printed. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image && <img src={image} alt={code.value} className="min-h-0 max-w-full object-contain" style={{ maxHeight: `${height - 12}mm` }} />}
      </div>)}
    </div>
  </div>, document.body);
}
