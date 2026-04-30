'use client';

import type { ReactNode } from 'react';

import { buttonClass, chipActiveClass, chipInactiveClass } from './class-names';

interface ToggleChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function ToggleChip({
  active,
  onClick,
  children,
  ariaLabel,
  disabled,
  className = '',
}: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`${buttonClass} ${active ? chipActiveClass : chipInactiveClass} ${className}`}
    >
      {children}
    </button>
  );
}
