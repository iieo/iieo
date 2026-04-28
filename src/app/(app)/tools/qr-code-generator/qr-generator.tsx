'use client';

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
];

const SIZE_PRESETS = [256, 512, 1024, 2048];

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

const labelClass = 'block text-white/40 text-xs font-sans tracking-wider uppercase mb-1.5';
const inputClass =
  'w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-sans focus:outline-none focus:border-white/30 transition-colors';
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

export default function QrGenerator() {
  const [contentType, setContentType] = useState<ContentType>('url');
  const [content, setContent] = useState<ContentState>(INITIAL_CONTENT);
  const [style, setStyle] = useState<StyleState>(INITIAL_STYLE);
  const [toast, setToast] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrInstanceRef = useRef<any>(null);

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
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          qrInstanceRef.current.append(containerRef.current);
        }
      } else {
        qrInstanceRef.current.update(options);
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

  const handleDownload = useCallback(async (format: ExportFormat) => {
    if (!qrInstanceRef.current) return;
    await qrInstanceRef.current.download({ name: 'qr-code', extension: format });
  }, []);

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
    showToast('Zurückgesetzt.');
  }, [showToast]);

  const isContentEmpty = !data;

  return (
    <section className="px-6 sm:px-8 md:px-16 lg:px-24 pb-24 max-w-6xl mx-auto">
      <div className="mb-10">
        <p className="text-white/30 text-xs font-sans tracking-[0.2em] uppercase mb-4">Tool</p>
        <h1 className="text-white text-4xl sm:text-5xl md:text-6xl leading-[0.95] mb-4">
          QR-Code Generator
        </h1>
        <p className="text-white/40 font-sans text-base max-w-2xl">
          Erstelle anpassbare QR-Codes mit Logo. Alles passiert in deinem Browser — nichts wird
          hochgeladen.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        {/* Form column */}
        <div className="space-y-6">
          <div className="border border-white/[0.08] rounded-2xl p-5 md:p-6 bg-white/[0.01] backdrop-blur-sm">
            <p className={labelClass}>Inhalt</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {CONTENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setContentType(t.value)}
                  className={`px-3 py-1.5 text-xs font-sans rounded-full border transition-colors ${
                    contentType === t.value
                      ? 'bg-white text-black border-white'
                      : 'border-white/15 text-white/60 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <ContentForm type={contentType} state={content} onChange={handleContentChange} />
          </div>

          <div className="border border-white/[0.08] rounded-2xl p-5 md:p-6 bg-white/[0.01] backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <p className={`${labelClass} mb-0`}>Größe</p>
              <span className="text-white/60 text-sm font-sans">{style.size}px</span>
            </div>
            <input
              type="range"
              min={256}
              max={2048}
              step={16}
              value={style.size}
              onChange={(e) => setStyle((s) => ({ ...s, size: Number(e.target.value) }))}
              className="w-full accent-white"
            />
            <div className="flex gap-2 mt-3">
              {SIZE_PRESETS.map((px) => (
                <button
                  key={px}
                  onClick={() => setStyle((s) => ({ ...s, size: px }))}
                  className={`${buttonClass} flex-1 ${
                    style.size === px
                      ? 'bg-white/10 border-white/30 text-white'
                      : 'border-white/10 text-white/50 hover:border-white/25'
                  }`}
                >
                  {px}px
                </button>
              ))}
            </div>
          </div>

          <div className="border border-white/[0.08] rounded-2xl p-5 md:p-6 bg-white/[0.01] backdrop-blur-sm">
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
                    <span className="text-white/60 text-sm font-sans">
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
                  <span className="text-white/60 text-sm font-sans">
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
          </div>

          <div className="border border-white/[0.08] rounded-2xl p-5 md:p-6 bg-white/[0.01] backdrop-blur-sm space-y-4">
            <p className={labelClass}>Stil</p>

            <div className="grid grid-cols-2 gap-3">
              <ColorField
                label="Vordergrund"
                value={style.fgColor}
                onChange={(v) => setStyle((s) => ({ ...s, fgColor: v }))}
              />
              <ColorField
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
                  className="px-3 py-1.5 text-xs font-sans rounded-full border border-white/10 text-white/60 hover:border-white/30 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span
                    className="w-3 h-3 rounded-full border border-white/20"
                    style={{ backgroundColor: p.fg }}
                  />
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Punkt-Stil</label>
                <select
                  value={style.dotStyle}
                  onChange={(e) => setStyle((s) => ({ ...s, dotStyle: e.target.value as DotType }))}
                  className={inputClass}
                >
                  <option value="square">Quadratisch</option>
                  <option value="rounded">Abgerundet</option>
                  <option value="dots">Punkte</option>
                  <option value="classy">Klassisch</option>
                  <option value="classy-rounded">Klassisch rund</option>
                  <option value="extra-rounded">Extra rund</option>
                </select>
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
            </div>

            <div>
              <label className={labelClass}>
                Fehlerkorrektur
                {style.logoDataUrl && (
                  <span className="text-white/30 normal-case tracking-normal"> — auto: H</span>
                )}
              </label>
              <select
                value={style.errorCorrection}
                disabled={!!style.logoDataUrl}
                onChange={(e) =>
                  setStyle((s) => ({ ...s, errorCorrection: e.target.value as ErrorCorrection }))
                }
                className={inputClass}
              >
                <option value="L">L — niedrig (~7%)</option>
                <option value="M">M — mittel (~15%)</option>
                <option value="Q">Q — hoch (~25%)</option>
                <option value="H">H — sehr hoch (~30%)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Preview column */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
          <div className="border border-white/[0.08] rounded-2xl p-6 bg-white/[0.01] backdrop-blur-sm">
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
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleDownload('png')}
              disabled={isContentEmpty}
              className={`${buttonClass} bg-white text-black border-white hover:bg-white/90`}
            >
              PNG
            </button>
            <button
              onClick={() => handleDownload('svg')}
              disabled={isContentEmpty}
              className={`${buttonClass} border-white/20 text-white hover:border-white/40`}
            >
              SVG
            </button>
            <button
              onClick={() => handleDownload('jpeg')}
              disabled={isContentEmpty}
              className={`${buttonClass} border-white/20 text-white hover:border-white/40`}
            >
              JPEG
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleCopyDataUrl}
              disabled={isContentEmpty}
              className={`${buttonClass} border-white/15 text-white/70 hover:border-white/30 hover:text-white`}
            >
              Data-URL kopieren
            </button>
            <button
              onClick={handleReset}
              className={`${buttonClass} border-white/15 text-white/70 hover:border-white/30 hover:text-white`}
            >
              Zurücksetzen
            </button>
          </div>

          <p className="text-white/30 text-xs font-sans leading-relaxed">
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

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      </div>
    </div>
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
        <div className="w-20 h-20 rounded-lg border border-white/10 bg-white/5 p-2 flex items-center justify-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="Logo Vorschau" className="max-w-full max-h-full object-contain" />
        </div>
        <button
          onClick={onRemove}
          className={`${buttonClass} border-white/20 text-white/70 hover:border-white/40 hover:text-white`}
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
          ? 'border-white/40 bg-white/[0.03]'
          : 'border-white/15 hover:border-white/30 hover:bg-white/[0.02]'
      }`}
    >
      <p className="text-white/60 text-sm font-sans">Bild ablegen oder klicken</p>
      <p className="text-white/30 text-xs font-sans mt-1">PNG, JPEG, SVG, WebP — max 2 MB</p>
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
