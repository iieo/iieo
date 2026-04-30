'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

export type PaintTool =
  | 'brush'
  | 'eraser'
  | 'bucket'
  | 'picker'
  | 'select'
  | 'box'
  | 'circle'
  | 'line'
  | 'magic-wand';

export interface PaintSelection {
  x: number;
  y: number;
  w: number;
  h: number;
  mask?: Uint8Array;
}

interface Point {
  x: number;
  y: number;
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
  tolerance?: number;
  fillShape?: boolean;
  opacity?: number;
  selection?: PaintSelection | null;
  onSelectionChange?: (sel: PaintSelection | null) => void;
  onColorPick?: (hex: string) => void;
  srcImg?: HTMLImageElement | null;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function compositeSourceAndPaint(
  paint: HTMLCanvasElement,
  srcImg: HTMLImageElement | null | undefined,
): Uint8ClampedArray | null {
  const tmp = document.createElement('canvas');
  tmp.width = paint.width;
  tmp.height = paint.height;
  const tctx = tmp.getContext('2d');
  if (!tctx) return null;
  if (srcImg) tctx.drawImage(srcImg, 0, 0, paint.width, paint.height);
  tctx.drawImage(paint, 0, 0);
  return tctx.getImageData(0, 0, paint.width, paint.height).data;
}

export function PaintCanvas({
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
}: PaintCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<Point | null>(null);
  const startPointRef = useRef<Point | null>(null);
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
    (e: React.PointerEvent): Point | null => {
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * canvas.width,
        y: ((e.clientY - rect.top) / rect.height) * canvas.height,
      };
    },
    [canvas],
  );

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

      const data = compositeSourceAndPaint(canvas, srcImg);
      if (!data) return null;

      const ci = (clickY * w + clickX) * 4;
      const cr = data[ci]!;
      const cg = data[ci + 1]!;
      const cb = data[ci + 2]!;
      const ca = data[ci + 3]!;
      const visited = new Uint8Array(w * h);
      const stack: number[] = [clickY * w + clickX];
      let minX = clickX;
      let maxX = clickX;
      let minY = clickY;
      let maxY = clickY;

      const matches = (idx: number): boolean => {
        const di = idx * 4;
        return (
          Math.abs(data[di]! - cr) <= tolerance &&
          Math.abs(data[di + 1]! - cg) <= tolerance &&
          Math.abs(data[di + 2]! - cb) <= tolerance &&
          Math.abs(data[di + 3]! - ca) <= tolerance
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
      buf.getContext('2d')?.clearRect(0, 0, buf.width, buf.height);
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
    (from: Point, to: Point) => {
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
    (start: Point, end: Point, filled: boolean) => {
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
        ctx.beginPath();
        ctx.ellipse(cx, cy, width / 2, height / 2, 0, 0, Math.PI * 2);
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
        if (selection) fillSelection(selection, color);
        else floodFill(Math.floor(pt.x), Math.floor(pt.y), color);
        onStrokeEnd();
        return;
      }

      if (tool === 'picker') {
        if (!canvas) return;
        const data = compositeSourceAndPaint(canvas, srcImg);
        if (!data) return;
        const idx = (Math.floor(pt.y) * canvas.width + Math.floor(pt.x)) * 4;
        const hex = `#${((data[idx]! << 16) | (data[idx + 1]! << 8) | data[idx + 2]!)
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
      if (!drawingRef.current) return;

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
      c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
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
