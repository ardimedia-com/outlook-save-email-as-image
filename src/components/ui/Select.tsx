import * as React from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  id,
  ...rest
}: SelectProps) {
  return (
    <RadixSelect.Root value={value} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        id={id}
        aria-label={rest['aria-label']}
        className={cn(
          'inline-flex h-9 w-full items-center justify-between rounded-lg bg-white px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 transition-colors',
          'hover:ring-slate-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          'data-[placeholder]:text-slate-400',
          'dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 dark:hover:ring-slate-600',
          className
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg bg-white p-1 shadow-soft-lg ring-1 ring-slate-200',
            'animate-fade-in',
            'dark:bg-slate-800 dark:ring-slate-700'
          )}
        >
          <RadixSelect.Viewport>
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  'relative flex h-8 cursor-default select-none items-center rounded-md pl-8 pr-3 text-sm text-slate-900 outline-none',
                  'data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-900',
                  'dark:text-slate-100 dark:data-[highlighted]:bg-brand-900/40 dark:data-[highlighted]:text-brand-100'
                )}
              >
                <RadixSelect.ItemIndicator className="absolute left-2 inline-flex items-center justify-center">
                  <Check className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                </RadixSelect.ItemIndicator>
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
