'use client';

import { inputClass } from './class-names';

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

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function NumberWithPresets({
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
        className={inputClass + (unit ? ' pr-20' : ' pr-10')}
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
