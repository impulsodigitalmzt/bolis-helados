import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'brand';
}

export function Card({
  children,
  className = '',
  variant = 'default',
}: CardProps) {
  const variants = {
    default: 'card-premium',
    elevated:
      'rounded-2xl border-2 border-stone-400 bg-white p-4 shadow-md shadow-black/15',
    brand:
      'rounded-2xl border-2 border-brand bg-white p-4 shadow-lg shadow-black/15',
  };

  return (
    <div className={`${variants[variant]} p-4 ${className}`}>{children}</div>
  );
}
