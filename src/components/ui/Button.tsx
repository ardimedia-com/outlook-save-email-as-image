import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'subtle';
type Size = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-soft-sm hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300 disabled:cursor-not-allowed',
  secondary:
    'bg-white text-slate-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-700/80',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800',
  subtle:
    'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
