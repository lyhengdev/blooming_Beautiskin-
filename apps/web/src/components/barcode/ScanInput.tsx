'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, ScanLine, X } from 'lucide-react';

export interface ScanCode { value: string; format?: string }

export default function ScanInput({ onScan, disabled = false, autoFocus = false, onPendingChange }: {
  onScan: (code: ScanCode) => Promise<string>;
  disabled?: boolean;
  autoFocus?: boolean;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('Ready');
  const [failed, setFailed] = useState(false);
  const [camera, setCamera] = useState(false);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [format, setFormat] = useState('');
  const [zoomLevels, setZoomLevels] = useState<number[]>([]);
  const [zoom, setZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  async function applyZoom(level: number) {
    const track = trackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: level }] } as unknown as MediaTrackConstraints);
      setZoom(level);
    } catch {
      setStatus('Zoom not supported on this camera.');
    }
  }
  const queue = useRef(Promise.resolve());
  const pending = useRef(0);
  const pendingCallback = useRef(onPendingChange);
  pendingCallback.current = onPendingChange;
  const callback = useRef(onScan);
  callback.current = onScan;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; pendingCallback.current?.(false); }; }, []);

  function submit(code: ScanCode) {
    if (!code.value.trim() || disabled) return;
    if (pending.current >= 50) { setFailed(true); setStatus('Scan queue is full. Wait for the current items, then scan again.'); return; }
    pending.current += 1;
    pendingCallback.current?.(true);
    setValue('');
    queue.current = queue.current.then(async () => {
      if (!mounted.current) return;
      setStatus(`Looking up ${code.value}`);
      setFailed(false);
      try {
        const message = await callback.current(code);
        if (mounted.current) setStatus(message);
      } catch (error) {
        if (mounted.current) {
          setFailed(true);
          setStatus(error instanceof Error ? error.message : 'Scan failed. Please retry.');
        }
      } finally {
        pending.current -= 1;
        if (mounted.current) pendingCallback.current?.(pending.current > 0);
      }
    });
  }
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    if (!camera || disabled) return;
    let cancelled = false;
    let accepted = false;
    let controls: { stop: () => void } | undefined;
    const element = video.current;
    trackRef.current = null;
    setZoomLevels([]);
    setZoomSupported(false);
    async function start() {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera requires HTTPS or localhost. Use the barcode field instead.');
        }
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'), import('@zxing/library'),
        ]);
        if (cancelled || !element) return;
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.CODE_128]);
        const reader = new BrowserMultiFormatReader(hints);
        controls = await reader.decodeFromConstraints({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920, max: 2560 },
            height: { ideal: 1080, max: 1440 },
          },
          audio: false,
        }, element, (result, _error, scanner) => {
          if (!result || accepted || cancelled) return;
          accepted = true;
          scanner.stop();
          setCamera(false);
          submitRef.current({ value: result.getText(), format: BarcodeFormat[result.getBarcodeFormat()] });
          input.current?.focus();
        });
        if (cancelled) controls.stop();

        // Wait for the stream to attach, then enable smart auto-focus + zoom.
        const track = element.srcObject instanceof MediaStream
          ? element.srcObject.getVideoTracks()[0]
          : undefined;
        if (track) {
          trackRef.current = track;
          const capabilities: Record<string, unknown> = typeof track.getCapabilities === 'function' ? track.getCapabilities() as unknown as Record<string, unknown> : {};
          const focusModes = capabilities.focusMode;
          if (Array.isArray(focusModes) && focusModes.includes('continuous')) {
            try { await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as unknown as MediaTrackConstraints); } catch { /* optional */ }
          }
          const capZoom = capabilities.zoom as { min?: number; max?: number; step?: number } | undefined;
          if (capZoom && typeof capZoom.max === 'number' && capZoom.max > 1) {
            const levels = [1, 2, 3, 4].filter((level) => level <= capZoom.max! + 0.0001);
            if (levels.length > 1) {
              setZoomLevels(levels);
              setZoomSupported(true);
              try { await track.applyConstraints({ advanced: [{ zoom: levels[0] }] } as unknown as MediaTrackConstraints); } catch { /* optional */ }
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          setFailed(true);
          setStatus(error instanceof Error ? error.message : 'Camera unavailable. Use the barcode field.');
          setCamera(false);
        }
      }
    }
    void start();
    return () => {
      cancelled = true;
      controls?.stop();
      trackRef.current = null;
      if (element?.srcObject instanceof MediaStream) element.srcObject.getTracks().forEach((track) => track.stop());
    };
  }, [camera, disabled, facing]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_44px_44px] items-center gap-2">
        <div className="relative min-w-0">
          <ScanLine className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
          <input ref={input} aria-label="Barcode" autoFocus={autoFocus} disabled={disabled}
            value={value} onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); submit({ value, format: format || undefined }); } }}
            className="input-field w-full pl-9" placeholder="Barcode" autoComplete="off" spellCheck={false} />
        </div>
        <select aria-label="Barcode format" value={format} onChange={(event) => setFormat(event.target.value)} disabled={disabled} className="input-field order-last col-span-3 w-32 justify-self-start py-1 text-xs">
          <option value="">Auto</option><option value="GTIN">GTIN</option><option value="CODE_128">Code 128</option>
        </select>
        <button type="button" disabled={disabled || !value.trim()} onClick={() => submit({ value, format: format || undefined })} title="Look up barcode" aria-label="Look up barcode" className="rounded-lg border p-2.5 disabled:opacity-40"><ScanLine className="h-5 w-5" /></button>
        <button type="button" disabled={disabled} onClick={() => setCamera(true)} title="Scan with camera" aria-label="Scan with camera" className="rounded-lg border p-2.5 disabled:opacity-40"><Camera className="h-5 w-5" /></button>
      </div>
      <p role="status" aria-live="polite" className={`min-h-5 break-words text-xs ${failed ? 'text-red-700' : 'text-gray-600'}`}>{status}</p>
      {camera && <div role="dialog" aria-modal="true" aria-label="Scan barcode" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onKeyDown={(event) => { if (event.key === 'Escape') setCamera(false); }}>
        <div className="w-full max-w-lg rounded-lg bg-white p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Scan barcode</h2><button autoFocus type="button" onClick={() => { setCamera(false); input.current?.focus(); }} aria-label="Close camera" className="p-2"><X className="h-5 w-5" /></button></div>
          <video ref={video} muted playsInline className="aspect-[4/3] w-full rounded-lg bg-black object-cover" />
          {zoomSupported && zoomLevels.length > 1 && (
            <div className="mt-3 flex items-center gap-2" role="group" aria-label="Camera zoom">
              <span className="text-xs font-semibold text-gray-500">Zoom</span>
              {zoomLevels.map((level) => (
                <button key={level} type="button" onClick={() => void applyZoom(level)}
                  aria-label={`Zoom ${level}x${level === zoom ? ' (current)' : ''}`}
                  className={`min-w-9 rounded-lg border px-2 py-1 text-sm ${level === zoom ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-300 text-gray-700'}`}>
                  {level}x
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <button type="button" onClick={() => setFacing((current) => current === 'environment' ? 'user' : 'environment')} className="rounded-lg border px-3 py-2 text-sm">Switch camera</button>
            <p className="text-xs text-gray-500">Hold the barcode steady and level. Move farther away and zoom in if needed.</p>
          </div>
        </div>
      </div>}
    </div>
  );
}
