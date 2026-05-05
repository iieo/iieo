'use client';

import { buttonClass, inputClass, labelClass } from '@/components/ui/class-names';
import { ColorPicker } from '@/components/ui/color-picker';
import { Panel } from '@/components/ui/panel';
import { ToggleChip } from '@/components/ui/toggle-chip';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  buildQrString,
  CONTENT_TYPES,
  ContentForm,
  ContentState,
  ContentType,
  INITIAL_CONTENT,
} from './content-forms';

type DotType = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'extra-rounded';
type CornerSquareType = 'square' | 'dot' | 'extra-rounded';
type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';
type ExportFormat = 'png' | 'svg' | 'jpeg';

interface StyleState {
  size: number;
  fgColor: string;
  bgColor: string;
  dotStyle: DotType;
  cornerStyle: CornerSquareType;
  errorCorrection: ErrorCorrection;
  logoDataUrl: string | null;
  logoSize: number;
  hideBackgroundDots: boolean;
}

const PRESETS: { label: string; fg: string; bg: string }[] = [
  { label: 'Klassisch', fg: '#000000', bg: '#ffffff' },
  { label: 'Invertiert', fg: '#ffffff', bg: '#000000' },
  { label: 'Indigo', fg: '#1e1b4b', bg: '#ffffff' },
  { label: 'Sand', fg: '#1c1917', bg: '#fafaf9' },
  { label: 'Smaragd', fg: '#064e3b', bg: '#ecfdf5' },
  { label: 'Burgund', fg: '#7f1d1d', bg: '#fef2f2' },
  { label: 'Ozean', fg: '#0c4a6e', bg: '#f0f9ff' },
];

const DOT_STYLES: { value: DotType; label: string }[] = [
  { value: 'square', label: 'Quadrat' },
  { value: 'rounded', label: 'Abgerundet' },
  { value: 'dots', label: 'Punkte' },
  { value: 'classy', label: 'Klassisch' },
  { value: 'classy-rounded', label: 'Klassisch rund' },
  { value: 'extra-rounded', label: 'Extra rund' },
];

const SIZE_PRESETS = [256, 512, 1024, 2048];
const MIN_SIZE = 128;
const MAX_SIZE = 4096;

const INITIAL_STYLE: StyleState = {
  size: 512,
  fgColor: '#000000',
  bgColor: '#ffffff',
  dotStyle: 'rounded',
  cornerStyle: 'extra-rounded',
  errorCorrection: 'M',
  logoDataUrl: null,
  logoSize: 0.3,
  hideBackgroundDots: true,
};

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function QrGenerator() {
  const [contentType, setContentType] = useState<ContentType>('url');
  const [content, setContent] = useState<ContentState>(INITIAL_CONTENT);
  const [style, setStyle] = useState<StyleState>(INITIAL_STYLE);
  const [sizeInput, setSizeInput] = useState<string>(String(INITIAL_STYLE.size));
  const [toast, setToast] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrInstanceRef = useRef<any>(null);
  const appendedContainerRef = useRef<HTMLDivElement | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<ExportFormat>('png');

  const data = buildQrString(contentType, content);
  const debouncedData = useDebounced(data, 150);
  const debouncedStyle = useDebounced(style, 150);

  const effectiveErrorCorrection: ErrorCorrection = useMemo(
    () => (style.logoDataUrl ? 'H' : style.errorCorrection),
    [style.logoDataUrl, style.errorCorrection],
  );

  useEffect(() => {
    let cancelled = false;
    if (!debouncedData) return;

    (async () => {
      const mod = await import('qr-code-styling');
      if (cancelled) return;
      const QRCodeStyling = mod.default;

      const options = {
        width: debouncedStyle.size,
        height: debouncedStyle.size,
        type: 'svg' as const,
        data: debouncedData,
        margin: 8,
        qrOptions: { errorCorrectionLevel: effectiveErrorCorrection },
        dotsOptions: { color: debouncedStyle.fgColor, type: debouncedStyle.dotStyle },
        backgroundOptions: { color: debouncedStyle.bgColor },
        cornersSquareOptions: {
          color: debouncedStyle.fgColor,
          type: debouncedStyle.cornerStyle,
        },
        cornersDotOptions: { color: debouncedStyle.fgColor },
        image: debouncedStyle.logoDataUrl ?? undefined,
        imageOptions: {
          hideBackgroundDots: debouncedStyle.hideBackgroundDots,
          imageSize: debouncedStyle.logoSize,
          margin: 6,
          crossOrigin: 'anonymous',
        },
      };

      if (!qrInstanceRef.current) {
        qrInstanceRef.current = new QRCodeStyling(options);
      } else {
        qrInstanceRef.current.update(options);
      }

      const container = containerRef.current;
      if (container && appendedContainerRef.current !== container) {
        container.innerHTML = '';
        qrInstanceRef.current.append(container);
        appendedContainerRef.current = container;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedData, debouncedStyle, effectiveErrorCorrection]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  const handleContentChange = useCallback(
    <K extends ContentType>(type: K, value: ContentState[K]) => {
      setContent((prev) => ({ ...prev, [type]: value }));
    },
    [],
  );

  const commitSize = useCallback(
    (raw: string) => {
      const parsed = Number.parseInt(raw, 10);
      if (Number.isNaN(parsed)) {
        setSizeInput(String(style.size));
        return;
      }
      const clamped = Math.min(MAX_SIZE, Math.max(MIN_SIZE, parsed));
      setStyle((s) => ({ ...s, size: clamped }));
      setSizeInput(String(clamped));
    },
    [style.size],
  );

  const handleLogoUpload = useCallback(
    (file: File) => {
      if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
        showToast('Nur PNG, JPEG, SVG oder WebP erlaubt.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showToast('Logo darf maximal 2 MB groß sein.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setStyle((s) => ({ ...s, logoDataUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    },
    [showToast],
  );

  const handleDownload = useCallback(async () => {
    if (!qrInstanceRef.current) return;
    await qrInstanceRef.current.download({ name: 'qr-code', extension: downloadFormat });
  }, [downloadFormat]);

  const handleCopyDataUrl = useCallback(async () => {
    if (!qrInstanceRef.current) return;
    const blob: Blob = await qrInstanceRef.current.getRawData('png');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await navigator.clipboard.writeText(reader.result as string);
        showToast('Data-URL kopiert.');
      } catch {
        showToast('Kopieren fehlgeschlagen.');
      }
    };
    reader.readAsDataURL(blob);
  }, [showToast]);

  const handleReset = useCallback(() => {
    setStyle(INITIAL_STYLE);
    setContent(INITIAL_CONTENT);
    setContentType('url');
    setSizeInput(String(INITIAL_STYLE.size));
    showToast('Zurückgesetzt.');
  }, [showToast]);

  const isContentEmpty = !data;

  return (
    <section className="px-6 sm:px-8 md:px-16 lg:px-24 pb-24 max-w-6xl mx-auto">
      <div className="mb-10">
        <p className="text-white/45 text-xs font-sans tracking-[0.2em] uppercase mb-4">Tool</p>
        <h1 className="text-white text-4xl sm:text-5xl md:text-6xl leading-[0.95] mb-4">
          QR-Code Generator
        </h1>
        <p className="text-white/55 font-sans text-base max-w-2xl">
          Erstelle anpassbare QR-Codes mit Logo. Alles passiert in deinem Browser — nichts wird
          hochgeladen.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        {/* Form column */}
        <div className="space-y-6">
          <Panel>
            <p className={labelClass}>Inhalt</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {CONTENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setContentType(t.value)}
                  className={`px-3 py-1.5 text-xs font-sans rounded-full border transition-colors ${
                    contentType === t.value
                      ? 'bg-white text-black border-white'
                      : 'border-white/25 text-white/70 hover:border-white/40 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <ContentForm type={contentType} state={content} onChange={handleContentChange} />
          </Panel>

          <Panel>
            <div className="flex items-center justify-between mb-3">
              <p className={`${labelClass} mb-0`}>Größe</p>
              <span className="text-white/55 text-xs font-sans">
                {MIN_SIZE}–{MAX_SIZE}px
              </span>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                inputMode="numeric"
                min={MIN_SIZE}
                max={MAX_SIZE}
                step={16}
                value={sizeInput}
                onChange={(e) => setSizeInput(e.target.value)}
                onBlur={(e) => commitSize(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitSize((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className={inputClass}
              />
              <span className="text-white/55 text-sm font-sans shrink-0">px</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {SIZE_PRESETS.map((px) => (
                <ToggleChip
                  key={px}
                  active={style.size === px}
                  onClick={() => {
                    setStyle((s) => ({ ...s, size: px }));
                    setSizeInput(String(px));
                  }}
                >
                  {px}
                </ToggleChip>
              ))}
            </div>
          </Panel>

          <Panel>
            <p className={labelClass}>Logo (optional)</p>
            <LogoUploader
              dataUrl={style.logoDataUrl}
              onUpload={handleLogoUpload}
              onRemove={() => setStyle((s) => ({ ...s, logoDataUrl: null }))}
            />
            {style.logoDataUrl ? (
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`${labelClass} mb-0`}>Logo-Größe</span>
                    <span className="text-white/70 text-sm font-sans">
                      {Math.round(style.logoSize * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={0.5}
                    step={0.01}
                    value={style.logoSize}
                    onChange={(e) => setStyle((s) => ({ ...s, logoSize: Number(e.target.value) }))}
                    className="w-full accent-white"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={style.hideBackgroundDots}
                    onChange={(e) =>
                      setStyle((s) => ({ ...s, hideBackgroundDots: e.target.checked }))
                    }
                    className="accent-white"
                  />
                  <span className="text-white/70 text-sm font-sans">
                    Punkte hinter Logo ausblenden
                  </span>
                </label>
                {style.logoSize > 0.35 && (
                  <p className="text-amber-300/80 text-xs font-sans">
                    Hinweis: Logos über 35 % können die Lesbarkeit beeinträchtigen.
                  </p>
                )}
              </div>
            ) : null}
          </Panel>

          <Panel className="space-y-5">
            <p className={labelClass}>Stil</p>

            <div className="grid grid-cols-2 gap-3">
              <ColorPicker
                label="Vordergrund"
                value={style.fgColor}
                onChange={(v) => setStyle((s) => ({ ...s, fgColor: v }))}
              />
              <ColorPicker
                label="Hintergrund"
                value={style.bgColor}
                onChange={(v) => setStyle((s) => ({ ...s, bgColor: v }))}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setStyle((s) => ({ ...s, fgColor: p.fg, bgColor: p.bg }))}
                  className="px-3 py-1.5 text-xs font-sans rounded-full border border-white/20 text-white/70 hover:border-white/40 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span
                    className="w-3 h-3 rounded-full border border-white/25"
                    style={{ backgroundColor: p.fg }}
                  />
                  {p.label}
                </button>
              ))}
            </div>

            <div>
              <label className={labelClass}>Punkt-Stil</label>
              <DotStyleDropdown
                value={style.dotStyle}
                onChange={(v) => setStyle((s) => ({ ...s, dotStyle: v }))}
                fgColor={style.fgColor}
                bgColor={style.bgColor}
              />
            </div>

            <div>
              <label className={labelClass}>Ecken</label>
              <select
                value={style.cornerStyle}
                onChange={(e) =>
                  setStyle((s) => ({ ...s, cornerStyle: e.target.value as CornerSquareType }))
                }
                className={inputClass}
              >
                <option value="square">Quadratisch</option>
                <option value="dot">Punkt</option>
                <option value="extra-rounded">Extra rund</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Fehlerkorrektur
                {style.logoDataUrl && (
                  <span className="text-white/45 normal-case tracking-normal">
                    {' '}
                    — automatisch bei Logo
                  </span>
                )}
              </label>
              <select
                value={style.logoDataUrl ? 'H' : style.errorCorrection}
                disabled={!!style.logoDataUrl}
                aria-disabled={!!style.logoDataUrl}
                onChange={(e) =>
                  setStyle((s) => ({ ...s, errorCorrection: e.target.value as ErrorCorrection }))
                }
                className={`${inputClass} ${
                  style.logoDataUrl
                    ? 'opacity-50 cursor-not-allowed bg-white/[0.015] !border-white/10 !text-white/55'
                    : ''
                }`}
              >
                <option value="L">L — niedrig (~7%)</option>
                <option value="M">M — mittel (~15%)</option>
                <option value="Q">Q — hoch (~25%)</option>
                <option value="H">H — sehr hoch (~30%)</option>
              </select>
            </div>
          </Panel>
        </div>

        {/* Preview column */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <Panel>
            <div
              className="aspect-square w-full rounded-xl overflow-hidden flex items-center justify-center transition-colors"
              style={{ backgroundColor: style.bgColor }}
            >
              {isContentEmpty ? (
                <p className="text-black/40 text-sm font-sans px-6 text-center">
                  Fülle den Inhalt aus, um eine Vorschau zu sehen.
                </p>
              ) : (
                <div ref={containerRef} className="[&>svg]:w-full [&>svg]:h-full" />
              )}
            </div>
          </Panel>

          <div>
            <p className={labelClass}>Format</p>
            <div role="radiogroup" aria-label="Download-Format" className="grid grid-cols-3 gap-2">
              {(['png', 'svg', 'jpeg'] as const).map((fmt) => (
                <ToggleChip
                  key={fmt}
                  active={downloadFormat === fmt}
                  onClick={() => setDownloadFormat(fmt)}
                >
                  {fmt.toUpperCase()}
                </ToggleChip>
              ))}
            </div>
          </div>

          <button
            onClick={handleDownload}
            disabled={isContentEmpty}
            className={`${buttonClass} w-full bg-white text-black border-white hover:bg-white/90`}
          >
            Download
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyDataUrl}
              disabled={isContentEmpty}
              className={`${buttonClass} border-white/25 text-white/75 hover:border-white/40 hover:text-white`}
            >
              Data-URL kopieren
            </button>
            <button
              onClick={handleReset}
              className={`${buttonClass} border-white/25 text-white/75 hover:border-white/40 hover:text-white`}
            >
              Zurücksetzen
            </button>
          </div>

          <p className="text-white/45 text-xs font-sans leading-relaxed">
            Tipp: Teste den QR-Code vor dem Drucken mit deiner Smartphone-Kamera, besonders wenn du
            ein Logo eingefügt hast.
          </p>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white text-black px-4 py-2 rounded-full text-sm font-sans shadow-lg">
          {toast}
        </div>
      )}
    </section>
  );
}

function DotStyleDropdown({
  value,
  onChange,
  fgColor,
  bgColor,
}: {
  value: DotType;
  onChange: (v: DotType) => void;
  fgColor: string;
  bgColor: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = DOT_STYLES.find((d) => d.value === value) ?? { value, label: value };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${inputClass} flex items-center justify-between gap-2 cursor-pointer`}
      >
        <span className="flex items-center gap-2.5">
          <DotStylePreview type={current.value} color={fgColor} bg={bgColor} />
          <span>{current.label}</span>
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`text-white/55 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1.5 w-full rounded-lg border border-white/20 bg-[#0a0a0a] shadow-xl overflow-hidden"
        >
          {DOT_STYLES.map((d) => {
            const active = d.value === value;
            return (
              <li key={d.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(d.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-sans text-left transition-colors ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/75 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <DotStylePreview type={d.value} color={fgColor} bg={bgColor} />
                  <span>{d.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  [tl, tr, br, bl]: [number, number, number, number],
): string {
  return [
    `M${x + tl},${y}`,
    `H${x + w - tr}`,
    tr ? `A${tr},${tr} 0 0 1 ${x + w},${y + tr}` : '',
    `V${y + h - br}`,
    br ? `A${br},${br} 0 0 1 ${x + w - br},${y + h}` : '',
    `H${x + bl}`,
    bl ? `A${bl},${bl} 0 0 1 ${x},${y + h - bl}` : '',
    `V${y + tl}`,
    tl ? `A${tl},${tl} 0 0 1 ${x + tl},${y}` : '',
    'Z',
  ].join(' ');
}

function DotStylePreview({ type, color, bg }: { type: DotType; color: string; bg: string }) {
  const pattern = [
    [1, 0, 1, 1],
    [0, 1, 1, 0],
    [1, 1, 0, 1],
    [1, 0, 1, 1],
  ];
  const size = 24;
  const cell = size / 4;
  const inner = cell - 1;
  const half = inner / 2;

  const renderCell = (x: number, y: number, key: string) => {
    const px = x * cell + 0.5;
    const py = y * cell + 0.5;
    if (type === 'dots') {
      return <circle key={key} cx={px + half} cy={py + half} r={half} fill={color} />;
    }
    if (type === 'square') {
      return <rect key={key} x={px} y={py} width={inner} height={inner} fill={color} />;
    }
    if (type === 'rounded') {
      const r = inner * 0.25;
      return (
        <rect key={key} x={px} y={py} width={inner} height={inner} rx={r} ry={r} fill={color} />
      );
    }
    if (type === 'extra-rounded') {
      const r = inner * 0.45;
      return (
        <rect key={key} x={px} y={py} width={inner} height={inner} rx={r} ry={r} fill={color} />
      );
    }
    // classy & classy-rounded — only TL and BR corners rounded (leaf shape)
    const r = type === 'classy' ? half : inner * 0.35;
    return <path key={key} d={roundedRectPath(px, py, inner, inner, [r, 0, r, 0])} fill={color} />;
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 rounded-sm"
      style={{ backgroundColor: bg }}
      aria-hidden
    >
      {pattern.flatMap((row, y) => row.map((v, x) => (v ? renderCell(x, y, `${x}-${y}`) : null)))}
    </svg>
  );
}

function LogoUploader({
  dataUrl,
  onUpload,
  onRemove,
}: {
  dataUrl: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (dataUrl) {
    return (
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-lg border border-white/20 bg-white/5 p-2 flex items-center justify-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="Logo Vorschau" className="max-w-full max-h-full object-contain" />
        </div>
        <button
          onClick={onRemove}
          className={`${buttonClass} border-white/30 text-white/75 hover:border-white/50 hover:text-white`}
        >
          Entfernen
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onUpload(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`border border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        dragOver
          ? 'border-white/50 bg-white/[0.04]'
          : 'border-white/25 hover:border-white/40 hover:bg-white/[0.03]'
      }`}
    >
      <p className="text-white/70 text-sm font-sans">Bild ablegen oder klicken</p>
      <p className="text-white/45 text-xs font-sans mt-1">PNG, JPEG, SVG, WebP — max 2 MB</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
