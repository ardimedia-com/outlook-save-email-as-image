import * as React from 'react';
import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

interface CheckboxProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: React.ReactNode;
  className?: string;
}

export function Checkbox({ id, checked, onCheckedChange, label, className }: CheckboxProps) {
  const auto = React.useId();
  const fieldId = id ?? auto;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <RadixCheckbox.Root
        id={fieldId}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-white transition-colors',
          'hover:border-slate-400',
          'data-[state=checked]:border-brand-600 data-[state=checked]:bg-brand-600',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900',
          'dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500'
        )}
      >
        <RadixCheckbox.Indicator>
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {label && (
        <label
          htmlFor={fieldId}
          className="cursor-pointer select-none text-sm text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
      )}
    </div>
  );
}
