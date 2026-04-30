'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { encodeIco } from './ico-encoder';

const PAINT_SIZES = [1, 2, 3, 4, 5, 8, 10, 12, 16, 20, 24, 32, 48, 64, 80, 120];
const PAINT_OPACITY_PRESETS = [10, 25, 33, 50, 66, 75, 90, 100];

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

const labelClass = 'block text-white/65 text-xs font-sans tracking-wider uppercase mb-1.5';
const inputClass =
  'w-full bg-white/[0.03] border border-white/30 rounded-lg px-3 py-2.5 text-white text-sm font-sans focus:outline-none focus:border-white/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0';
const buttonClass =
  'px-4 py-2.5 text-sm font-sans rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed';

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

interface NumberWithPresetsProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  presets: ReadonlyArray<number>;
  presetsLabel: string;
}

function NumberWithPresets({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  presets,
  presetsLabel,
}: NumberWithPresetsProps) {
  return (
    <div className="relative">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10);
          onChange(clamp(Number.isNaN(parsed) ? min : parsed, min, max));
        }}
        className={
          inputClass +
          (unit ? ' pr-20' : ' pr-10') +
          ' [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0'
        }
      />
      {unit && (
        <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 text-white/75 text-xs font-sans">
          {unit}
        </span>
      )}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 h-[calc(100%-8px)] flex items-center border-l border-white/25 pl-1">
        <select
          value=""
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!Number.isNaN(v)) onChange(v);
          }}
          aria-label={presetsLabel}
          className="appearance-none bg-transparent text-transparent w-7 h-full pl-1 pr-4 cursor-pointer focus:outline-none"
        >
          <option value="" disabled>
            —
          </option>
          {presets.map((p) => (
            <option key={p} value={p} className="bg-[#0a0a0a] text-white">
              {p}
              {unit ? ` ${unit}` : ''}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/75 text-xs">
          ▾
        </span>
      </div>
    </div>
  );
}

type PaintTool =
  | 'brush'
  | 'eraser'
  | 'bucket'
  | 'picker'
  | 'select'
  | 'box'
  | 'circle'
  | 'line'
  | 'magic-wand';

interface PaintSelection {
  x: number;
  y: number;
  w: number;
  h: number;
  mask?: Uint8Array;
}

interface PaintCanvasProps {
  imgUrl: string;
  imgW: number;
  imgH: number;
  canvas: HTMLCanvasElement | null;
  tool: PaintTool;
  color: string;
  size: number;
  onStrokeStart: () => void;
  onStrokeEnd: () => void;
}

function PaintCanvas({
  imgUrl,
  imgW,
  imgH,
  canvas,
  tool,
  color,
  size,
  onStrokeStart,
  onStrokeEnd,
  tolerance = 30,
  fillShape = false,
  opacity = 100,
  selection,
  onSelectionChange,
  onColorPick,
  srcImg,
}: PaintCanvasProps & {
  tolerance?: number;
  fillShape?: boolean;
  opacity?: number;
  selection?: PaintSelection | null;
  onSelectionChange?: (sel: PaintSelection | null) => void;
  onColorPick?: (hex: string) => void;
  srcImg?: HTMLImageElement | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);
  const strokeBufferRef = useRef<HTMLCanvasElement | null>(null);
  const selOverlayRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !canvas) return;
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';
    canvas.style.cursor =
      tool === 'picker' ? 'copy' : tool === 'select' ? 'crosshair' : 'crosshair';
    wrap.appendChild(canvas);
    return () => {
      if (canvas.parentNode === wrap) wrap.removeChild(canvas);
    };
  }, [canvas, tool]);

  const toCanvasCoords = useCallback(
    (e: React.PointerEvent) => {
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
      return { x, y };
    },
    [canvas],
  );

  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1]!, 16),
          g: parseInt(result[2]!, 16),
          b: parseInt(result[3]!, 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  const floodFill = useCallback(
    (startX: number, startY: number, fillColor: string) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      const startIdx = (startY * w + startX) * 4;
      const startR = data[startIdx]!;
      const startG = data[startIdx + 1]!;
      const startB = data[startIdx + 2]!;
      const startA = data[startIdx + 3]!;

      const fill = hexToRgb(fillColor);
      if (
        startR === fill.r &&
        startG === fill.g &&
        startB === fill.b &&
        startA === 255 &&
        tolerance === 0
      ) {
        return;
      }

      const visited = new Uint8Array(w * h);
      const stack: number[] = [startY * w + startX];
      const matches = (idx: number): boolean => {
        const di = idx * 4;
        return (
          Math.abs(data[di]! - startR) <= tolerance &&
          Math.abs(data[di + 1]! - startG) <= tolerance &&
          Math.abs(data[di + 2]! - startB) <= tolerance &&
          Math.abs(data[di + 3]! - startA) <= tolerance
        );
      };

      while (stack.length > 0) {
        const seed = stack.pop()!;
        if (visited[seed]) continue;
        let left = seed;
        let right = seed;
        const row = Math.floor(seed / w) * w;
        while (left - 1 >= row && !visited[left - 1] && matches(left - 1)) left -= 1;
        while (right + 1 < row + w && !visited[right + 1] && matches(right + 1)) right += 1;
        for (let i = left; i <= right; i += 1) {
          visited[i] = 1;
          const di = i * 4;
          data[di] = fill.r;
          data[di + 1] = fill.g;
          data[di + 2] = fill.b;
          data[di + 3] = 255;
          if (i - w >= 0 && !visited[i - w] && matches(i - w)) stack.push(i - w);
          if (i + w < w * h && !visited[i + w] && matches(i + w)) stack.push(i + w);
        }
      }

      ctx.putImageData(imageData, 0, 0);
    },
    [canvas, tolerance],
  );

  const magicWandSelect = useCallback(
    (clickX: number, clickY: number): PaintSelection | null => {
      if (!canvas) return null;
      const w = canvas.width;
      const h = canvas.height;
      if (clickX < 0 || clickX >= w || clickY < 0 || clickY >= h) return null;

      // Sample the composite of source + paint so the wand reacts to what
      // the user actually sees, not just the (often empty) paint layer.
      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;
      const tctx = tmp.getContext('2d');
      if (!tctx) return null;
      if (srcImg) tctx.drawImage(srcImg, 0, 0, w, h);
      tctx.drawImage(canvas, 0, 0);
      const data = tctx.getImageData(0, 0, w, h).data;

      const ci = (clickY * w + clickX) * 4;
      const cr = data[ci]!;
      const cg = data[ci + 1]!;
      const cb = data[ci + 2]!;
      const ca = data[ci + 3]!;
      const tol = tolerance;
      const visited = new Uint8Array(w * h);
      const stack: number[] = [clickY * w + clickX];
      let minX = clickX;
      let maxX = clickX;
      let minY = clickY;
      let maxY = clickY;

      const matches = (idx: number): boolean => {
        const di = idx * 4;
        return (
          Math.abs(data[di]! - cr) <= tol &&
          Math.abs(data[di + 1]! - cg) <= tol &&
          Math.abs(data[di + 2]! - cb) <= tol &&
          Math.abs(data[di + 3]! - ca) <= tol
        );
      };

      while (stack.length > 0) {
        const seed = stack.pop()!;
        if (visited[seed]) continue;
        const row = Math.floor(seed / w);
        const rowStart = row * w;
        let left = seed;
        let right = seed;
        while (left - 1 >= rowStart && !visited[left - 1] && matches(left - 1)) left -= 1;
        while (right + 1 < rowStart + w && !visited[right + 1] && matches(right + 1)) right += 1;
        if (left - rowStart < minX) minX = left - rowStart;
        if (right - rowStart > maxX) maxX = right - rowStart;
        if (row < minY) minY = row;
        if (row > maxY) maxY = row;
        for (let i = left; i <= right; i += 1) {
          visited[i] = 1;
          if (i - w >= 0 && !visited[i - w] && matches(i - w)) stack.push(i - w);
          if (i + w < w * h && !visited[i + w] && matches(i + w)) stack.push(i + w);
        }
      }

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const mask = new Uint8Array(bw * bh);
      for (let y = 0; y < bh; y += 1) {
        const srcRow = (minY + y) * w + minX;
        const dstRow = y * bw;
        for (let x = 0; x < bw; x += 1) {
          if (visited[srcRow + x]) mask[dstRow + x] = 1;
        }
      }
      return { x: minX, y: minY, w: bw, h: bh, mask };
    },
    [canvas, tolerance, srcImg],
  );

  const ensureStrokeBuffer = useCallback((): HTMLCanvasElement | null => {
    if (!canvas) return null;
    let buf = strokeBufferRef.current;
    if (!buf || buf.width !== canvas.width || buf.height !== canvas.height) {
      buf = document.createElement('canvas');
      buf.width = canvas.width;
      buf.height = canvas.height;
      strokeBufferRef.current = buf;
    } else {
      const bctx = buf.getContext('2d');
      bctx?.clearRect(0, 0, buf.width, buf.height);
    }
    return buf;
  }, [canvas]);

  const fillSelection = useCallback(
    (sel: PaintSelection, fillColor: string) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const x = Math.max(0, Math.floor(sel.x));
      const y = Math.max(0, Math.floor(sel.y));
      const w = Math.min(canvas.width - x, Math.floor(sel.w));
      const h = Math.min(canvas.height - y, Math.floor(sel.h));
      if (w <= 0 || h <= 0) return;
      const fill = hexToRgb(fillColor);
      if (sel.mask) {
        const id = ctx.getImageData(x, y, w, h);
        const m = sel.mask;
        const stride = sel.w;
        for (let row = 0; row < h; row += 1) {
          for (let col = 0; col < w; col += 1) {
            if (m[row * stride + col]) {
              const di = (row * w + col) * 4;
              id.data[di] = fill.r;
              id.data[di + 1] = fill.g;
              id.data[di + 2] = fill.b;
              id.data[di + 3] = 255;
            }
          }
        }
        ctx.putImageData(id, x, y);
      } else {
        ctx.save();
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
      }
    },
    [canvas],
  );

  const compositeStroke = useCallback(() => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const buf = strokeBufferRef.current;
    const snap = snapshotRef.current;
    if (!ctx || !buf) return;
    if (snap) ctx.putImageData(snap, 0, 0);
    ctx.save();
    ctx.globalAlpha = opacity / 100;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.drawImage(buf, 0, 0);
    ctx.restore();
  }, [canvas, opacity, tool]);

  const drawSegmentToBuffer = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const buf = strokeBufferRef.current;
      if (!buf) return;
      const bctx = buf.getContext('2d');
      if (!bctx) return;
      bctx.lineCap = 'round';
      bctx.lineJoin = 'round';
      bctx.lineWidth = size;
      bctx.strokeStyle = tool === 'eraser' ? '#000' : color;
      bctx.beginPath();
      if (from.x === to.x && from.y === to.y) {
        // Dot — draw a filled circle so a single tap is visible.
        bctx.fillStyle = tool === 'eraser' ? '#000' : color;
        bctx.arc(from.x, from.y, size / 2, 0, Math.PI * 2);
        bctx.fill();
      } else {
        bctx.moveTo(from.x, from.y);
        bctx.lineTo(to.x, to.y);
        bctx.stroke();
      }
    },
    [color, size, tool],
  );

  const drawShape = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }, filled: boolean) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const snap = snapshotRef.current;
      if (snap) ctx.putImageData(snap, 0, 0);

      ctx.save();
      ctx.globalAlpha = opacity / 100;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#000';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
      }

      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);

      if (tool === 'box') {
        if (filled) ctx.fillRect(x, y, width, height);
        else ctx.strokeRect(x, y, width, height);
      } else if (tool === 'circle') {
        const cx = (start.x + end.x) / 2;
        const cy = (start.y + end.y) / 2;
        const rx = width / 2;
        const ry = height / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (filled) ctx.fill();
        else ctx.stroke();
      } else if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }

      ctx.restore();
    },
    [canvas, color, size, tool, opacity],
  );

  const snapshotCanvas = useCallback(() => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, [canvas]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const pt = toCanvasCoords(e);
      if (!pt) return;

      if (tool === 'bucket') {
        onStrokeStart();
        if (selection) {
          fillSelection(selection, color);
        } else {
          floodFill(Math.floor(pt.x), Math.floor(pt.y), color);
        }
        onStrokeEnd();
        return;
      }

      if (tool === 'picker') {
        if (!canvas) return;
        const px = Math.floor(pt.x);
        const py = Math.floor(pt.y);
        // Composite source + paint so the picker sees what the user sees.
        const tmp = document.createElement('canvas');
        tmp.width = canvas.width;
        tmp.height = canvas.height;
        const tctx = tmp.getContext('2d');
        if (!tctx) return;
        if (srcImg) tctx.drawImage(srcImg, 0, 0, canvas.width, canvas.height);
        tctx.drawImage(canvas, 0, 0);
        const data = tctx.getImageData(px, py, 1, 1).data;
        const hex = `#${((data[0]! << 16) | (data[1]! << 8) | data[2]!)
          .toString(16)
          .padStart(6, '0')}`;
        onColorPick?.(hex);
        return;
      }

      if (tool === 'magic-wand') {
        const sel = magicWandSelect(Math.floor(pt.x), Math.floor(pt.y));
        onSelectionChange?.(sel);
        return;
      }

      if (tool === 'select') {
        (e.target as Element).setPointerCapture(e.pointerId);
        startPointRef.current = pt;
        drawingRef.current = true;
        return;
      }

      (e.target as Element).setPointerCapture(e.pointerId);
      drawingRef.current = true;
      lastPtRef.current = pt;
      startPointRef.current = pt;
      onStrokeStart();
      snapshotCanvas();

      if (tool === 'brush' || tool === 'eraser') {
        ensureStrokeBuffer();
        drawSegmentToBuffer(pt, pt);
        compositeStroke();
      }
    },
    [
      tool,
      color,
      onStrokeStart,
      onStrokeEnd,
      onColorPick,
      onSelectionChange,
      toCanvasCoords,
      floodFill,
      fillSelection,
      selection,
      magicWandSelect,
      canvas,
      srcImg,
      snapshotCanvas,
      ensureStrokeBuffer,
      drawSegmentToBuffer,
      compositeStroke,
    ],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const pt = toCanvasCoords(e);
      if (!pt) return;

      if (drawingRef.current) {
        if (tool === 'brush' || tool === 'eraser') {
          const last = lastPtRef.current;
          if (!last) return;
          drawSegmentToBuffer(last, pt);
          compositeStroke();
          lastPtRef.current = pt;
        } else if (tool === 'box' || tool === 'circle' || tool === 'line') {
          const start = startPointRef.current;
          if (start) drawShape(start, pt, fillShape);
        } else if (tool === 'select') {
          const start = startPointRef.current;
          if (!start) return;
          const x = Math.min(start.x, pt.x);
          const y = Math.min(start.y, pt.y);
          const w = Math.abs(pt.x - start.x);
          const h = Math.abs(pt.y - start.y);
          onSelectionChange?.({ x, y, w, h });
        }
      }
    },
    [
      tool,
      drawSegmentToBuffer,
      compositeStroke,
      drawShape,
      onSelectionChange,
      toCanvasCoords,
      fillShape,
    ],
  );

  const onPointerUp = useCallback(() => {
    if (drawingRef.current) {
      drawingRef.current = false;
      lastPtRef.current = null;
      // Buffer + snapshot have already been composited onto the canvas via
      // compositeStroke / drawShape; nothing more to do here.
      snapshotRef.current = null;
      onStrokeEnd();
    }
    startPointRef.current = null;
  }, [onStrokeEnd]);

  const aspectStyle = useMemo(() => ({ aspectRatio: `${imgW} / ${imgH}` }), [imgW, imgH]);

  useEffect(() => {
    const c = selOverlayRef.current;
    if (!c) return;
    if (!selection?.mask) {
      const ctx = c.getContext('2d');
      ctx?.clearRect(0, 0, c.width, c.height);
      return;
    }
    if (c.width !== selection.w) c.width = selection.w;
    if (c.height !== selection.h) c.height = selection.h;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const id = ctx.createImageData(selection.w, selection.h);
    const m = selection.mask;
    for (let i = 0; i < m.length; i += 1) {
      if (m[i]) {
        const di = i * 4;
        id.data[di] = 255;
        id.data[di + 1] = 255;
        id.data[di + 2] = 255;
        id.data[di + 3] = 96;
      }
    }
    ctx.putImageData(id, 0, 0);
  }, [selection]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full max-w-full bg-[#0a0a0a] border border-white/30 rounded-lg overflow-hidden select-none"
      style={aspectStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img
        src={imgUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-fill pointer-events-none"
      />
      {selection?.mask ? (
        <canvas
          ref={selOverlayRef}
          className="absolute pointer-events-none border border-dashed border-white/85"
          style={{
            left: `${(selection.x / imgW) * 100}%`,
            top: `${(selection.y / imgH) * 100}%`,
            width: `${(selection.w / imgW) * 100}%`,
            height: `${(selection.h / imgH) * 100}%`,
            imageRendering: 'pixelated',
          }}
        />
      ) : selection ? (
        <div
          className="absolute border-2 border-dashed border-white/85 bg-white/10"
          style={{
            left: `${(selection.x / imgW) * 100}%`,
            top: `${(selection.y / imgH) * 100}%`,
            width: `${(selection.w / imgW) * 100}%`,
            height: `${(selection.h / imgH) * 100}%`,
          }}
        />
      ) : null}
    </div>
  );
}

const PAINT_COLORS = ['#ffffff', '#000000', '#ff3366', '#ffb800', '#34d399', '#3b82f6', '#a855f7'];
const MAX_PAINT_HISTORY = 25;

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
                <button
                  type="button"
                  onClick={() => setPaintFullscreen((v) => !v)}
                  className={`${buttonClass} ${
                    paintFullscreen
                      ? 'border-white/40 bg-white/10 text-white'
                      : 'border-white/25 text-white/80 hover:bg-white/[0.04]'
                  }`}
                  aria-pressed={paintFullscreen}
                >
                  {paintFullscreen ? '✕ Vollbild verlassen' : '⤢ Vollbild'}
                </button>
                <div>
                  <label className={labelClass}>Werkzeug</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaintTool('brush')}
                      className={`${buttonClass} ${
                        paintTool === 'brush'
                          ? 'border-white/40 bg-white/10 text-white'
                          : 'border-white/25 text-white/80 hover:bg-white/[0.04]'
                      }`}
                    >
                      Pinsel
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaintTool('eraser')}
                      className={`${buttonClass} ${
                        paintTool === 'eraser'
                          ? 'border-white/40 bg-white/10 text-white'
                          : 'border-white/25 text-white/80 hover:bg-white/[0.04]'
                      }`}
                    >
                      Radierer
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaintTool('bucket')}
                      className={`${buttonClass} ${
                        paintTool === 'bucket'
                          ? 'border-white/40 bg-white/10 text-white'
                          : 'border-white/25 text-white/80 hover:bg-white/[0.04]'
                      }`}
                    >
                      Bucket
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaintTool('magic-wand')}
                      className={`${buttonClass} ${
                        paintTool === 'magic-wand'
                          ? 'border-white/40 bg-white/10 text-white'
                          : 'border-white/25 text-white/80 hover:bg-white/[0.04]'
                      }`}
                    >
                      Zauberstab
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaintTool('picker')}
                      className={`${buttonClass} ${
                        paintTool === 'picker'
                          ? 'border-white/40 bg-white/10 text-white'
                          : 'border-white/25 text-white/80 hover:bg-white/[0.04]'
                      }`}
                    >
                      Farbwähler
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaintTool('select')}
                      className={`${buttonClass} ${
                        paintTool === 'select'
                          ? 'border-white/40 bg-white/10 text-white'
                          : 'border-white/25 text-white/80 hover:bg-white/[0.04]'
                      }`}
                    >
                      Auswahl
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaintTool('box')}
                      className={`${buttonClass} ${
                        paintTool === 'box'
                          ? 'border-white/40 bg-white/10 text-white'
                          : 'border-white/25 text-white/80 hover:bg-white/[0.04]'
                      }`}
                    >
                      Rechteck
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaintTool('circle')}
                      className={`${buttonClass} ${
                        paintTool === 'circle'
                          ? 'border-white/40 bg-white/10 text-white'
                          : 'border-white/25 text-white/80 hover:bg-white/[0.04]'
                      }`}
                    >
                      Kreis
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaintTool('line')}
                      className={`${buttonClass} ${
                        paintTool === 'line'
                          ? 'border-white/40 bg-white/10 text-white'
                          : 'border-white/25 text-white/80 hover:bg-white/[0.04]'
                      }`}
                    >
                      Linie
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Farbe</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PAINT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setPaintColor(c)}
                        aria-label={c}
                        className={`w-8 h-8 rounded-full border transition-transform ${
                          paintColor.toLowerCase() === c.toLowerCase()
                            ? 'border-white scale-110'
                            : 'border-white/30'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={paintColor}
                      onChange={(e) => setPaintColor(e.target.value)}
                      className="w-10 h-10 rounded border border-white/25 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={paintColor}
                      onChange={(e) => setPaintColor(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
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
                  <button
                    type="button"
                    onClick={() => setPaintFillShape((v) => !v)}
                    aria-pressed={paintFillShape}
                    className={`${buttonClass} ${
                      paintFillShape
                        ? 'border-white/40 bg-white/10 text-white'
                        : 'border-white/25 text-white/80 hover:bg-white/[0.04]'
                    }`}
                  >
                    {paintFillShape ? '■ Form gefüllt' : '□ Nur Kontur'}
                  </button>
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
                        <button
                          key={f.value}
                          type="button"
                          disabled={disabled}
                          title={
                            disabled
                              ? 'AVIF-Encoding wird vom Browser nicht unterstützt'
                              : undefined
                          }
                          onClick={() => setFormat(f.value)}
                          className={`${buttonClass} ${
                            format === f.value
                              ? 'border-white/40 bg-white/10 text-white'
                              : 'border-white/25 text-white/80 hover:bg-white/[0.04]'
                          }`}
                        >
                          {f.label}
                        </button>
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
