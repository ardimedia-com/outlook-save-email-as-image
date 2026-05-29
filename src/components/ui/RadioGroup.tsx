import * as React from 'react';
import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import { cn } from '@/lib/cn';

interface RadioOption {
  value: string;
  label: React.ReactNode;
}

interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  options: RadioOption[];
  className?: string;
  'aria-label'?: string;
}

export function RadioGroup({
  value,
  onValueChange,
  options,
  className,
  ...rest
}: RadioGroupProps) {
  return (
    <RadixRadioGroup.Root
      value={value}
      onValueChange={onValueChange}
      aria-label={rest['aria-label']}
      className={cn(
        'inline-flex w-full rounded-lg bg-slate-100 p-1 dark:bg-slate-800',
        className
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <RadixRadioGroup.Item
            key={opt.value}
            value={opt.value}
            className={cn(
              'flex-1 cursor-pointer rounded-md px-3 py-1.5 text-center text-xs font-medium transition-all',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
              selected
                ? 'bg-white text-slate-900 shadow-soft-sm dark:bg-slate-700 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {opt.label}
          </RadixRadioGroup.Item>
        );
      })}
    </RadixRadioGroup.Root>
  );
}
