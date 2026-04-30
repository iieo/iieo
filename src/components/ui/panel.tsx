'use client';

import type { HTMLAttributes, ReactNode } from 'react';

import { panelClass } from './class-names';

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className = '', ...rest }: PanelProps) {
  return (
    <div className={`${panelClass} ${className}`} {...rest}>
      {children}
    </div>
  );
}
