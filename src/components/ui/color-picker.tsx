'use client';

import { inputClass, labelClass } from './class-names';

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  swatches?: ReadonlyArray<string>;
}

export function ColorPicker({ value, onChange, label, swatches }: ColorPickerProps) {
  return (
    <div>
      {label && <label className={labelClass}>{label}</label>}
      {swatches && swatches.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {swatches.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              aria-label={c}
              className={`w-8 h-8 rounded-full border transition-transform ${
                value.toLowerCase() === c.toLowerCase()
                  ? 'border-white scale-110'
                  : 'border-white/30'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-white/30 bg-transparent cursor-pointer shrink-0"
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
