import * as RadixSlider from '@radix-ui/react-slider';
import { cn } from '@/lib/cn';

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  'aria-label'?: string;
  disabled?: boolean;
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
  disabled,
  ...rest
}: SliderProps) {
  return (
    <RadixSlider.Root
      value={[value]}
      onValueChange={(v) => onValueChange(v[0])}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      aria-label={rest['aria-label']}
      className={cn(
        'relative flex h-5 w-full touch-none select-none items-center',
        disabled && 'opacity-50',
        className
      )}
    >
      <RadixSlider.Track className="relative h-1.5 grow rounded-full bg-slate-200 dark:bg-slate-700">
        <RadixSlider.Range className="absolute h-full rounded-full bg-brand-600 dark:bg-brand-500" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        className={cn(
          'block h-4 w-4 rounded-full bg-white shadow-soft ring-2 ring-brand-600 transition-transform',
          'hover:scale-110',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/40',
          'dark:bg-slate-100 dark:ring-brand-500'
        )}
      />
    </RadixSlider.Root>
  );
}
