import * as React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/cn';

export const Tabs = RadixTabs.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof RadixTabs.List>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.List>
>(({ className, ...props }, ref) => (
  <RadixTabs.List
    ref={ref}
    className={cn(
      'inline-flex items-center gap-1 rounded-lg bg-slate-100/80 p-1 backdrop-blur-sm dark:bg-slate-800/60',
      className
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof RadixTabs.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(({ className, ...props }, ref) => (
  <RadixTabs.Trigger
    ref={ref}
    className={cn(
      'inline-flex h-7 cursor-pointer items-center justify-center rounded-md px-3 text-xs font-medium text-slate-600 transition-all',
      'data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-soft-sm',
      'hover:text-slate-900',
      'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
      'dark:text-slate-400 dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-slate-100 dark:hover:text-slate-200',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof RadixTabs.Content>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(({ className, ...props }, ref) => (
  <RadixTabs.Content
    ref={ref}
    className={cn('animate-fade-in focus-visible:outline-hidden', className)}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';
