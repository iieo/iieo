'use client';

import { buttonClass, inputClass, labelClass } from '@/components/ui/class-names';
import { ColorPicker } from '@/components/ui/color-picker';
import { NumberWithPresets } from '@/components/ui/number-with-presets';
import { ToggleChip } from '@/components/ui/toggle-chip';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { encodeIco } from './ico-encoder';
import {
  MAX_PAINT_HISTORY,
  PAINT_COLORS,
  PAINT_OPACITY_PRESETS,
  PAINT_SIZES,
} from './paint/constants';
import { PaintCanvas, type PaintSelection, type PaintTool } from './paint/paint-canvas';

const PAINT_TOOL_BUTTONS: ReadonlyArray<{ tool: PaintTool; label: string }> = [
  { tool: 'brush', label: 'Pinsel' },
  { tool: 'eraser', label: 'Radierer' },
  { tool: 'bucket', label: 'Bucket' },
  { tool: 'magic-wand', label: 'Zauberstab' },
  { tool: 'picker', label: 'Farbwähler' },
  { tool: 'select', label: 'Auswahl' },
  { tool: 'box', label: 'Rechteck' },
  { tool: 'circle', label: 'Kreis' },
  { tool: 'line', label: 'Linie' },
];

type OutputFormat = 'png' | 'jpeg' | 'webp' | 'avif' | 'ico';

interface SourceImage {
  el: HTMLImageElement;
  name: string;
  type: string;
  width: number;
  height: number;
  size: number;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Extend {
  top: number;
  right: number;
  bottom: number;
  left: number;
  color: string;
  transparent: boolean;
}

interface ResizeState {
  width: number;
  height: number;
  lockAspect: boolean;
}

const FORMATS: { value: OutputFormat; label: string; ext: string; mime: string }[] = [
  { value: 'png', label: 'PNG', ext: 'png', mime: 'image/png' },
  { value: 'jpeg', label: 'JPEG', ext: 'jpg', mime: 'image/jpeg' },
  { value: 'webp', label: 'WEBP', ext: 'webp', mime: 'image/webp' },
  { value: 'avif', label: 'AVIF', ext: 'avif', mime: 'image/avif' },
  { value: 'ico', label: 'ICO (Favicon)', ext: 'ico', mime: 'image/x-icon' },
];

let avifSupportCache: boolean | null = null;
async function isAvifEncodeSupported(): Promise<boolean> {
  if (avifSupportCache !== null) return avifSupportCache;
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/avif', 0.5),
    );
    avifSupportCache = !!blob && blob.type === 'image/avif';
  } catch {
    avifSupportCache = false;
  }
  return avifSupportCache;
}

function isHeicFile(file: File): boolean {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

async function decodeHeic(file: File): Promise<Blob> {
  const mod = await import('heic2any');
  const heic2any = (mod.default ?? mod) as (opts: {
    blob: Blob;
    toType?: string;
    quality?: number;
  }) => Promise<Blob | Blob[]>;
  const result = await heic2any({ blob: file, toType: 'image/png' });
  return Array.isArray(result) ? result[0]! : result;
}

const ICO_SIZES = [16, 32, 48];

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function basename(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

async function loadImage(file: File): Promise<{ img: HTMLImageElement; sourceBlob: Blob }> {
  const blob = isHeicFile(file) ? await decodeHeic(file) : file;
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
      el.src = url;
    });
    return { img, sourceBlob: blob };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  }
}

function rotatedSize(w: number, h: number, rot: number): { width: number; height: number } {
  return rot % 180 === 0 ? { width: w, height: h } : { width: h, height: w };
}

function drawTransformed(
  ctx: CanvasRenderingContext2D,
  src: HTMLImageElement,
  paint: HTMLCanvasElement | null,
  rotation: number,
  flipH: boolean,
  flipV: boolean,
): void {
  const { width: tw, height: th } = rotatedSize(src.width, src.height, rotation);
  ctx.save();
  ctx.translate(tw / 2, th / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  if (paint) ctx.drawImage(paint, -src.width / 2, -src.height / 2);
  ctx.restore();
}

interface RenderOptions {
  src: HTMLImageElement;
  paint: HTMLCanvasElement | null;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  crop: CropRect;
  resize: ResizeState;
  extend: Extend;
}

function renderToCanvas(opts: RenderOptions): HTMLCanvasElement {
  const { src, paint, rotation, flipH, flipV, crop, resize, extend } = opts;

  const transformed = document.createElement('canvas');
  const t = rotatedSize(src.width, src.height, rotation);
  transformed.width = t.width;
  transformed.height = t.height;
  const tctx = transformed.getContext('2d');
  if (!tctx) throw new Error('Canvas context fehlgeschlagen');
  drawTransformed(tctx, src, paint, rotation, flipH, flipV);

  const cx = Math.max(0, Math.round(crop.x * t.width));
  const cy = Math.max(0, Math.round(crop.y * t.height));
  const cw = Math.max(1, Math.round(crop.w * t.width));
  const ch = Math.max(1, Math.round(crop.h * t.height));

  const targetW = Math.max(1, Math.round(resize.width));
  const targetH = Math.max(1, Math.round(resize.height));

  const finalW = targetW + extend.left + extend.right;
  const finalH = targetH + extend.top + extend.bottom;

  const out = document.createElement('canvas');
  out.width = finalW;
  out.height = finalH;
  const octx = out.getContext('2d');
  if (!octx) throw new Error('Canvas context fehlgeschlagen');

  if (!extend.transparent) {
    octx.fillStyle = extend.color;
    octx.fillRect(0, 0, finalW, finalH);
  }

  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(transformed, cx, cy, cw, ch, extend.left, extend.top, targetW, targetH);

  return out;
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Encoding fehlgeschlagen'));
      },
      mime,
      quality,
    );
  });
}

async function encodeOutput(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality: number,
): Promise<Blob> {
  if (format === 'ico') {
    const blobs = await Promise.all(
      ICO_SIZES.map(async (size) => {
        const c = document.createElement('canvas');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        if (!ctx) throw new Error('Canvas context fehlgeschlagen');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, size, size);
        return canvasToBlob(c, 'image/png', 1);
      }),
    );
    return encodeIco(blobs);
  }
  const fmt = FORMATS.find((f) => f.value === format);
  if (!fmt) throw new Error('Format unbekannt');
  return canvasToBlob(canvas, fmt.mime, quality);
}

interface CropOverlayProps {
  imgUrl: string;
  imgW: number;
  imgH: number;
  crop: CropRect;
  onChange: (next: CropRect) => void;
}

function CropOverlay({ imgUrl, imgW, imgH, crop, onChange }: CropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: 'move' | 'nw' | 'ne' | 'sw' | 'se';
    startX: number;
    startY: number;
    startCrop: CropRect;
    rect: DOMRect;
  } | null>(null);

  const onPointerDown = useCallback(
    (mode: 'move' | 'nw' | 'ne' | 'sw' | 'se') => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      (e.target as Element).setPointerCapture(e.pointerId);
      dragRef.current = {
        mode,
        startX: e.clientX,
        startY: e.clientY,
        startCrop: { ...crop },
        rect,
      };
    },
    [crop],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dxPct = (e.clientX - drag.startX) / drag.rect.width;
      const dyPct = (e.clientY - drag.startY) / drag.rect.height;
      const c = { ...drag.startCrop };
      const minSize = 0.02;

      if (drag.mode === 'move') {
        c.x = clamp(c.x + dxPct, 0, 1 - c.w);
        c.y = clamp(c.y + dyPct, 0, 1 - c.h);
      } else {
        if (drag.mode === 'nw' || drag.mode === 'sw') {
          const nx = clamp(c.x + dxPct, 0, c.x + c.w - minSize);
          c.w = c.w + (c.x - nx);
          c.x = nx;
        }
        if (drag.mode === 'ne' || drag.mode === 'se') {
          c.w = clamp(c.w + dxPct, minSize, 1 - c.x);
        }
        if (drag.mode === 'nw' || drag.mode === 'ne') {
          const ny = clamp(c.y + dyPct, 0, c.y + c.h - minSize);
          c.h = c.h + (c.y - ny);
          c.y = ny;
        }
        if (drag.mode === 'sw' || drag.mode === 'se') {
          c.h = clamp(c.h + dyPct, minSize, 1 - c.y);
        }
      }
      onChange(c);
    },
    [onChange],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const aspectStyle = useMemo(() => ({ aspectRatio: `${imgW} / ${imgH}` }), [imgW, imgH]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-full bg-[#0a0a0a] border border-white/20 rounded-lg overflow-hidden select-none"
      style={aspectStyle}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img
        src={imgUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-fill opacity-60 pointer-events-none"
      />
      <div
        className="absolute border border-white/80 cursor-move"
        style={{
          left: `${crop.x * 100}%`,
          top: `${crop.y * 100}%`,
          width: `${crop.w * 100}%`,
          height: `${crop.h * 100}%`,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
        }}
        onPointerDown={onPointerDown('move')}
      >
        {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
          <div
            key={corner}
            className="absolute w-3 h-3 bg-white border border-black/40"
            style={{
              left: corner.includes('w') ? -6 : undefined,
              right: corner.includes('e') ? -6 : undefined,
              top: corner.includes('n') ? -6 : undefined,
              bottom: corner.includes('s') ? -6 : undefined,
              cursor: corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize',
            }}
            onPointerDown={onPointerDown(corner)}
          />
        ))}
      </div>
    </div>
  );
}

export default function ImageConverter() {
  const [source, setSource] = useState<SourceImage | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 1, h: 1 });
  const [resize, setResize] = useState<ResizeState>({ width: 0, height: 0, lockAspect: true });
  const [extend, setExtend] = useState<Extend>({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    color: '#ffffff',
    transparent: true,
  });

  const [format, setFormat] = useState<OutputFormat>('png');
  const [quality, setQuality] = useState(0.92);
  const [avifSupported, setAvifSupported] = useState(false);

  const [activeTab, setActiveTab] = useState<'edit' | 'paint'>('edit');
  const paintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paintHistoryRef = useRef<ImageData[]>([]);
  const [paintTool, setPaintTool] = useState<PaintTool>('brush');
  const [paintColor, setPaintColor] = useState<string>('#ff3366');
  const [paintSize, setPaintSize] = useState<number>(8);
  const [paintVersion, setPaintVersion] = useState(0);
  const [paintCanUndo, setPaintCanUndo] = useState(false);
  const [paintTolerance, setPaintTolerance] = useState<number>(30);
  const [paintFillShape, setPaintFillShape] = useState(false);
  const [paintOpacity, setPaintOpacity] = useState<number>(100);
  const [paintSelection, setPaintSelection] = useState<PaintSelection | null>(null);
  const [paintFullscreen, setPaintFullscreen] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;
    isAvifEncodeSupported().then((ok) => {
      if (alive) setAvifSupported(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<number>(0);
  const [previewDims, setPreviewDims] = useState<{ w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (
      !file.type.startsWith('image/') &&
      !/\.(png|jpe?g|webp|gif|bmp|ico|avif|heic|heif)$/i.test(file.name)
    ) {
      setError('Bitte eine Bilddatei wählen.');
      return;
    }
    try {
      const { img, sourceBlob } = await loadImage(file);
      const url = URL.createObjectURL(sourceBlob);
      setSourceUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setSource({
        el: img,
        name: file.name,
        type: file.type || 'image/*',
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
      });
      const tw = img.naturalWidth;
      const th = img.naturalHeight;
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setCrop({ x: 0, y: 0, w: 1, h: 1 });
      setResize({ width: tw, height: th, lockAspect: true });
      setExtend({ top: 0, right: 0, bottom: 0, left: 0, color: '#ffffff', transparent: true });

      const pc = document.createElement('canvas');
      pc.width = tw;
      pc.height = th;
      paintCanvasRef.current = pc;
      paintHistoryRef.current = [];
      setPaintCanUndo(false);
      setPaintVersion((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bild konnte nicht geladen werden');
    }
  }, []);

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const baseDims = useMemo(() => {
    if (!source) return null;
    const r = rotatedSize(source.width, source.height, rotation);
    return {
      width: Math.max(1, Math.round(r.width * crop.w)),
      height: Math.max(1, Math.round(r.height * crop.h)),
    };
  }, [source, rotation, crop.w, crop.h]);

  const onResetResize = useCallback(() => {
    if (baseDims) setResize((p) => ({ ...p, width: baseDims.width, height: baseDims.height }));
  }, [baseDims]);

  const aspectRatio = baseDims ? baseDims.width / baseDims.height : 1;

  const onWidthChange = useCallback(
    (w: number) => {
      setResize((prev) => ({
        ...prev,
        width: w,
        height: prev.lockAspect ? Math.max(1, Math.round(w / aspectRatio)) : prev.height,
      }));
    },
    [aspectRatio],
  );

  const onHeightChange = useCallback(
    (h: number) => {
      setResize((prev) => ({
        ...prev,
        height: h,
        width: prev.lockAspect ? Math.max(1, Math.round(h * aspectRatio)) : prev.width,
      }));
    },
    [aspectRatio],
  );

  const debouncedRender = useDebounced(
    { source, rotation, flipH, flipV, crop, resize, extend, format, quality, paintVersion },
    150,
  );

  const onPaintStrokeStart = useCallback(() => {
    const pc = paintCanvasRef.current;
    if (!pc) return;
    const ctx = pc.getContext('2d');
    if (!ctx) return;
    try {
      const snap = ctx.getImageData(0, 0, pc.width, pc.height);
      const hist = paintHistoryRef.current;
      hist.push(snap);
      if (hist.length > MAX_PAINT_HISTORY) hist.shift();
      setPaintCanUndo(true);
    } catch {
      // ignore — tainted or oversized
    }
  }, []);

  const onPaintStrokeEnd = useCallback(() => {
    setPaintVersion((v) => v + 1);
  }, []);

  const onPaintUndo = useCallback(() => {
    const pc = paintCanvasRef.current;
    const hist = paintHistoryRef.current;
    if (!pc || hist.length === 0) return;
    const ctx = pc.getContext('2d');
    if (!ctx) return;
    const snap = hist.pop();
    if (snap) ctx.putImageData(snap, 0, 0);
    setPaintCanUndo(hist.length > 0);
    setPaintVersion((v) => v + 1);
  }, []);

  const onPaintClear = useCallback(() => {
    const pc = paintCanvasRef.current;
    if (!pc) return;
    const ctx = pc.getContext('2d');
    if (!ctx) return;
    if (paintSelection) {
      onPaintStrokeStart();
      if (paintSelection.mask) {
        const id = ctx.getImageData(
          paintSelection.x,
          paintSelection.y,
          paintSelection.w,
          paintSelection.h,
        );
        const m = paintSelection.mask;
        for (let i = 0; i < m.length; i += 1) {
          if (m[i]) id.data[i * 4 + 3] = 0;
        }
        ctx.putImageData(id, paintSelection.x, paintSelection.y);
      } else {
        ctx.clearRect(paintSelection.x, paintSelection.y, paintSelection.w, paintSelection.h);
      }
      setPaintSelection(null);
      setPaintVersion((v) => v + 1);
    } else {
      onPaintStrokeStart();
      ctx.clearRect(0, 0, pc.width, pc.height);
      setPaintVersion((v) => v + 1);
    }
  }, [onPaintStrokeStart, paintSelection]);

  useEffect(() => {
    let cancelled = false;
    if (!debouncedRender.source) {
      setPreviewUrl(null);
      return;
    }
    const src = debouncedRender.source;
    if (!src) return;
    setBusy(true);
    (async () => {
      try {
        const canvas = renderToCanvas({
          src: src.el,
          paint: paintCanvasRef.current,
          rotation: debouncedRender.rotation,
          flipH: debouncedRender.flipH,
          flipV: debouncedRender.flipV,
          crop: debouncedRender.crop,
          resize: debouncedRender.resize,
          extend: debouncedRender.extend,
        });
        const blob = await encodeOutput(canvas, debouncedRender.format, debouncedRender.quality);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setPreviewSize(blob.size);
        setPreviewDims({ w: canvas.width, h: canvas.height });
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Fehler beim Rendern');
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedRender]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'paint') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        onPaintUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        setPaintVersion((v) => v + 1);
      }
      if (e.key === 'Escape') {
        setPaintSelection(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, onPaintUndo]);

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [downloading, setDownloading] = useState(false);

  const onDownload = useCallback(async () => {
    if (!source) return;
    const fmt = FORMATS.find((f) => f.value === format);
    if (!fmt) return;
    setDownloading(true);
    try {
      const canvas = renderToCanvas({
        src: source.el,
        paint: paintCanvasRef.current,
        rotation,
        flipH,
        flipV,
        crop,
        resize,
        extend,
      });
      const blob = await encodeOutput(canvas, format, quality);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${basename(source.name)}.${fmt.ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download fehlgeschlagen');
    } finally {
      setDownloading(false);
    }
  }, [source, rotation, flipH, flipV, crop, resize, extend, format, quality]);

  const [targetKb, setTargetKb] = useState<string>('');
  const [compressing, setCompressing] = useState(false);

  const onCompressToTarget = useCallback(async () => {
    if (!source) return;
    const targetBytes = Math.max(1, parseInt(targetKb, 10) || 0) * 1024;
    if (!targetBytes) return;
    if (format !== 'jpeg' && format !== 'webp' && format !== 'avif') {
      setError('Auto-Kompression nur für JPEG, WEBP und AVIF.');
      return;
    }
    setCompressing(true);
    setError(null);
    try {
      const canvas = renderToCanvas({
        src: source.el,
        paint: paintCanvasRef.current,
        rotation,
        flipH,
        flipV,
        crop,
        resize,
        extend,
      });
      const fmt = FORMATS.find((f) => f.value === format);
      if (!fmt) throw new Error('Format unbekannt');

      let lo = 0.05;
      let hi = 1;
      let best: { blob: Blob; q: number } | null = null;
      for (let i = 0; i < 9; i += 1) {
        const q = (lo + hi) / 2;
        const blob = await canvasToBlob(canvas, fmt.mime, q);
        if (blob.size <= targetBytes) {
          best = { blob, q };
          lo = q;
        } else {
          hi = q;
        }
      }
      if (!best) {
        const blob = await canvasToBlob(canvas, fmt.mime, lo);
        best = { blob, q: lo };
      }
      setQuality(Number(best.q.toFixed(2)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kompression fehlgeschlagen');
    } finally {
      setCompressing(false);
    }
  }, [source, rotation, flipH, flipV, crop, resize, extend, format, targetKb]);

  const compressionRatio =
    source && previewSize ? Math.round((previewSize / source.size) * 100) : null;

  return (
    <section
      className={
        paintFullscreen && source
          ? 'min-h-[calc(100dvh-80px)] px-3 sm:px-4 py-6 max-w-none mx-auto'
          : 'min-h-[calc(100dvh-80px)] px-6 sm:px-8 md:px-16 lg:px-24 py-12 md:py-16 max-w-7xl mx-auto'
      }
    >
      {!source && (
        <>
          <p className="text-white/45 text-xs font-sans tracking-[0.2em] uppercase mb-6">Tools</p>
          <h1 className="text-white text-4xl sm:text-5xl md:text-6xl leading-[0.95] mb-4">
            Image Converter.
          </h1>
          <p className="text-white/55 font-sans text-sm md:text-base max-w-xl mb-10 tracking-wide">
            Konvertieren, komprimieren, zuschneiden und erweitern. Alles läuft lokal — keine Daten
            verlassen deinen Browser.
          </p>
        </>
      )}

      {!source && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-white/60 bg-white/[0.04]'
              : 'border-white/25 hover:border-white/30 bg-white/[0.01]'
          }`}
        >
          <p className="text-white text-lg font-sans mb-2">Bild hierher ziehen</p>
          <p className="text-white/55 text-sm font-sans">
            oder klicken zum Auswählen — PNG, JPEG, WEBP, AVIF, HEIC/HEIF, GIF, BMP, ICO
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={onFileInput}
          />
        </div>
      )}

      {error && (
        <div className="mt-4 px-4 py-3 border border-red-500/40 bg-red-500/5 rounded-lg text-red-300/90 text-sm font-sans">
          {error}
        </div>
      )}

      {source && sourceUrl && (
        <div
          className={
            paintFullscreen
              ? 'grid lg:grid-cols-[1fr_320px] gap-4'
              : 'grid lg:grid-cols-[1fr_360px] gap-8'
          }
        >
          <div className="flex flex-col gap-6 min-w-0">
            <div>
              <div className="flex items-center justify-between mb-3 gap-4">
                <span className={labelClass + ' mb-0'}>Quelle</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`${buttonClass} border-white/25 text-white/80 hover:bg-white/[0.04]`}
                >
                  Anderes Bild
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.heic,.heif"
                  className="hidden"
                  onChange={onFileInput}
                />
              </div>
              <p className="text-white/55 text-xs font-sans mb-3">
                {source.name} — {source.width}×{source.height} — {formatBytes(source.size)}
              </p>
              <div
                className={paintFullscreen && activeTab === 'paint' ? 'w-full' : 'max-w-sm mx-auto'}
              >
                {activeTab === 'paint' ? (
                  <PaintCanvas
                    imgUrl={sourceUrl}
                    imgW={source.width}
                    imgH={source.height}
                    canvas={paintCanvasRef.current}
                    tool={paintTool}
                    color={paintColor}
                    size={paintSize}
                    onStrokeStart={onPaintStrokeStart}
                    onStrokeEnd={onPaintStrokeEnd}
                    tolerance={paintTolerance}
                    fillShape={paintFillShape}
                    opacity={paintOpacity}
                    selection={paintSelection}
                    onSelectionChange={setPaintSelection}
                    onColorPick={(hex) => {
                      setPaintColor(hex);
                      setPaintTool('brush');
                    }}
                    srcImg={source.el}
                  />
                ) : (
                  <CropOverlay
                    imgUrl={sourceUrl}
                    imgW={rotatedSize(source.width, source.height, rotation).width}
                    imgH={rotatedSize(source.width, source.height, rotation).height}
                    crop={crop}
                    onChange={setCrop}
                  />
                )}
              </div>
            </div>

            <div>
              <span className={labelClass}>Vorschau</span>
              <div className="max-w-sm mx-auto border border-white/20 rounded-lg p-4 bg-[repeating-conic-gradient(#1a1a1a_0%_25%,#0f0f0f_0%_50%)] bg-[length:16px_16px]">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Vorschau"
                    className="max-w-full max-h-[60vh] mx-auto block"
                  />
                ) : (
                  <p className="text-white/55 text-sm font-sans text-center py-12">
                    {busy ? 'Wird gerendert…' : 'Keine Vorschau'}
                  </p>
                )}
              </div>
              {previewDims && (
                <p className="text-white/55 text-xs font-sans mt-2">
                  {previewDims.w}×{previewDims.h} — {formatBytes(previewSize)}
                  {compressionRatio !== null && (
                    <span className="ml-2 text-white/45">({compressionRatio}% der Quelle)</span>
                  )}
                </p>
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-1 p-1 border border-white/25 rounded-lg bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-2 text-xs font-sans rounded-md tracking-wider uppercase transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-white/10 text-white'
                    : 'text-white/65 hover:text-white/90'
                }`}
              >
                Bearbeiten
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paint')}
                className={`px-3 py-2 text-xs font-sans rounded-md tracking-wider uppercase transition-colors ${
                  activeTab === 'paint'
                    ? 'bg-white/10 text-white'
                    : 'text-white/65 hover:text-white/90'
                }`}
              >
                Zeichnen
              </button>
            </div>
            {activeTab === 'paint' && (
              <>
                <ToggleChip active={paintFullscreen} onClick={() => setPaintFullscreen((v) => !v)}>
                  {paintFullscreen ? '✕ Vollbild verlassen' : '⤢ Vollbild'}
                </ToggleChip>
                <div>
                  <label className={labelClass}>Werkzeug</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAINT_TOOL_BUTTONS.map(({ tool, label }) => (
                      <ToggleChip
                        key={tool}
                        active={paintTool === tool}
                        onClick={() => setPaintTool(tool)}
                      >
                        {label}
                      </ToggleChip>
                    ))}
                  </div>
                </div>
                <ColorPicker
                  label="Farbe"
                  value={paintColor}
                  onChange={setPaintColor}
                  swatches={PAINT_COLORS}
                />
                <div>
                  <label className={labelClass}>Pinselgröße</label>
                  <NumberWithPresets
                    value={paintSize}
                    onChange={setPaintSize}
                    min={1}
                    max={500}
                    unit="px"
                    presets={PAINT_SIZES}
                    presetsLabel="Vordefinierte Pinselgrößen"
                  />
                </div>
                {(paintTool === 'brush' ||
                  paintTool === 'eraser' ||
                  paintTool === 'box' ||
                  paintTool === 'circle' ||
                  paintTool === 'line') && (
                  <div>
                    <label className={labelClass}>Deckkraft</label>
                    <NumberWithPresets
                      value={paintOpacity}
                      onChange={setPaintOpacity}
                      min={1}
                      max={100}
                      unit="%"
                      presets={PAINT_OPACITY_PRESETS}
                      presetsLabel="Vordefinierte Deckkraft-Werte"
                    />
                  </div>
                )}
                {(paintTool === 'box' || paintTool === 'circle') && (
                  <ToggleChip active={paintFillShape} onClick={() => setPaintFillShape((v) => !v)}>
                    {paintFillShape ? '■ Form gefüllt' : '□ Nur Kontur'}
                  </ToggleChip>
                )}
                {(paintTool === 'bucket' || paintTool === 'magic-wand') && (
                  <div>
                    <label className={labelClass}>Toleranz — {paintTolerance}</label>
                    <input
                      type="range"
                      min={0}
                      max={255}
                      step={1}
                      value={paintTolerance}
                      onChange={(e) => setPaintTolerance(parseInt(e.target.value, 10))}
                      className="w-full accent-white"
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onPaintUndo}
                    disabled={!paintCanUndo}
                    className={`${buttonClass} border-white/25 text-white/80 hover:bg-white/[0.04]`}
                  >
                    ↶ Rückgängig
                  </button>
                  <button
                    type="button"
                    onClick={onPaintClear}
                    className={`${buttonClass} border-white/25 text-white/80 hover:bg-white/[0.04]`}
                  >
                    {paintSelection ? 'Auswahl löschen' : 'Alles löschen'}
                  </button>
                </div>
                <p className="text-white/45 text-[10px] font-sans">
                  Zeichnungen werden auf das Originalbild gelegt und mit exportiert.
                </p>
              </>
            )}
            {activeTab === 'edit' && (
              <>
                <div>
                  <label className={labelClass}>Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FORMATS.map((f) => {
                      const disabled = f.value === 'avif' && !avifSupported;
                      return (
                        <ToggleChip
                          key={f.value}
                          active={format === f.value}
                          disabled={disabled}
                          onClick={() => setFormat(f.value)}
                        >
                          {f.label}
                        </ToggleChip>
                      );
                    })}
                  </div>
                </div>

                {(format === 'jpeg' || format === 'webp' || format === 'avif') && (
                  <div>
                    <label className={labelClass}>Qualität — {Math.round(quality * 100)}%</label>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.01}
                      value={quality}
                      onChange={(e) => setQuality(parseFloat(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={labelClass + ' mb-0'}>Größe</span>
                    <button
                      type="button"
                      onClick={onResetResize}
                      className="text-white/55 hover:text-white text-xs font-sans"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-white/55 text-[10px] font-sans uppercase tracking-wider">
                        Breite
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={resize.width}
                        onChange={(e) => onWidthChange(parseInt(e.target.value, 10) || 1)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-white/55 text-[10px] font-sans uppercase tracking-wider">
                        Höhe
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={resize.height}
                        onChange={(e) => onHeightChange(parseInt(e.target.value, 10) || 1)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 mt-2 text-white/75 text-xs font-sans cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resize.lockAspect}
                      onChange={(e) => setResize((p) => ({ ...p, lockAspect: e.target.checked }))}
                      className="accent-white"
                    />
                    Seitenverhältnis sperren
                  </label>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {[0.25, 0.5, 1, 2].map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => {
                          if (!baseDims) return;
                          setResize((p) => ({
                            ...p,
                            width: Math.max(1, Math.round(baseDims.width * scale)),
                            height: Math.max(1, Math.round(baseDims.height * scale)),
                          }));
                        }}
                        className="px-2 py-1 text-xs font-sans rounded border border-white/25 text-white/75 hover:bg-white/[0.04]"
                      >
                        {scale}×
                      </button>
                    ))}
                  </div>
                </div>

                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none mb-2">
                    <span className={labelClass + ' mb-0'}>Erweitern (Padding in Pixel)</span>
                    <span className="text-white/55 text-xs font-sans transition-transform group-open:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <div className="grid grid-cols-2 gap-2">
                    {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                      <div key={side}>
                        <label className="text-white/55 text-[10px] font-sans uppercase tracking-wider">
                          {side === 'top'
                            ? 'Oben'
                            : side === 'right'
                              ? 'Rechts'
                              : side === 'bottom'
                                ? 'Unten'
                                : 'Links'}
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={extend[side]}
                          onChange={(e) =>
                            setExtend((p) => ({
                              ...p,
                              [side]: Math.max(0, parseInt(e.target.value, 10) || 0),
                            }))
                          }
                          className={inputClass}
                        />
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 mt-2 text-white/75 text-xs font-sans cursor-pointer">
                    <input
                      type="checkbox"
                      checked={extend.transparent}
                      onChange={(e) => setExtend((p) => ({ ...p, transparent: e.target.checked }))}
                      className="accent-white"
                    />
                    Transparent (nur PNG/WEBP/ICO)
                  </label>
                  {!extend.transparent && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="color"
                        value={extend.color}
                        onChange={(e) => setExtend((p) => ({ ...p, color: e.target.value }))}
                        className="w-10 h-10 rounded border border-white/25 bg-transparent cursor-pointer"
                      />
                      <input
                        type="text"
                        value={extend.color}
                        onChange={(e) => setExtend((p) => ({ ...p, color: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                  )}
                </details>

                {(format === 'jpeg' || format === 'webp' || format === 'avif') && (
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer list-none mb-2">
                      <span className={labelClass + ' mb-0'}>Auf Zielgröße komprimieren</span>
                      <span className="text-white/55 text-xs font-sans transition-transform group-open:rotate-180">
                        ▾
                      </span>
                    </summary>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        placeholder="z. B. 200"
                        value={targetKb}
                        onChange={(e) => setTargetKb(e.target.value)}
                        className={inputClass}
                      />
                      <span className="flex items-center text-white/65 text-xs font-sans">KB</span>
                    </div>
                    <button
                      type="button"
                      onClick={onCompressToTarget}
                      disabled={!targetKb || compressing}
                      className={`${buttonClass} border-white/25 text-white/90 hover:bg-white/[0.04] mt-2 w-full`}
                    >
                      {compressing ? 'Berechne Qualität…' : 'Quality automatisch finden'}
                    </button>
                    <p className="text-white/45 text-[10px] font-sans mt-1.5">
                      Binäre Suche über die Qualitätsstufe für die beste Größe ≤ Ziel.
                    </p>
                  </details>
                )}
              </>
            )}
            <button
              type="button"
              onClick={onDownload}
              disabled={!source || downloading}
              className={`${buttonClass} border-white bg-white text-black hover:bg-white/90 disabled:bg-white/40 mt-2`}
            >
              {downloading ? 'Wird heruntergeladen…' : 'Download'}
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}
