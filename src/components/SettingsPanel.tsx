import { Select } from './ui/Select';
import { Checkbox } from './ui/Checkbox';
import { RadioGroup } from './ui/RadioGroup';
import { Slider } from './ui/Slider';
import { cn } from '@/lib/cn';
import type { I18n } from '@/lib/i18n';
import { LOCALE_DISPLAY_NAME, SUPPORTED_LOCALES } from '@/lib/i18n';
import type { Settings, Scale, WidthValue } from '@/types/settings';

interface SettingsPanelProps {
  i18n: I18n;
  settings: Settings;
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  detectedWidth: number | null;
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field-group">
      <label className="label-text" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function SettingsPanel({
  i18n,
  settings,
  onChange,
  detectedWidth,
}: SettingsPanelProps) {
  const widthOptions = [
    {
      value: 'auto',
      label: detectedWidth
        ? i18n.t('field.width.auto_with', { px: detectedWidth })
        : i18n.t('field.width.auto'),
    },
    { value: '640', label: i18n.t('field.width.px', { px: 640 }) },
    { value: '800', label: i18n.t('field.width.px', { px: 800 }) },
    { value: '1000', label: i18n.t('field.width.px', { px: 1000 }) },
    { value: '1200', label: i18n.t('field.width.px', { px: 1200 }) },
  ];

  const scaleOptions = [
    { value: '1', label: i18n.t('field.scale.1x') },
    { value: '2', label: i18n.t('field.scale.2x') },
    { value: '3', label: i18n.t('field.scale.3x') },
  ];

  const formatOptions = [
    { value: 'png', label: i18n.t('field.format.png') },
    { value: 'jpg', label: i18n.t('field.format.jpg') },
  ];

  const paginationOptions = [
    { value: 'single', label: i18n.t('field.pagination.single') },
    { value: 'auto-split', label: i18n.t('field.pagination.autoSplit') },
  ];

  const externalImagesOptions = [
    { value: 'block', label: i18n.t('field.externalImages.block') },
    { value: 'allow', label: i18n.t('field.externalImages.allow') },
  ];

  const backgroundOptions = [
    { value: 'auto', label: i18n.t('field.background.auto') },
    { value: 'light', label: i18n.t('field.background.light') },
    { value: 'dark', label: i18n.t('field.background.dark') },
  ];

  const headerLocaleOptions: { value: string; label: React.ReactNode }[] = [
    { value: 'auto', label: i18n.t('field.headerLocale.auto') },
    ...SUPPORTED_LOCALES.map((l) => ({ value: l, label: LOCALE_DISPLAY_NAME[l] })),
  ];

  return (
    <div className="grid grid-cols-1 gap-5 px-4 py-5 sm:grid-cols-2 lg:grid-cols-1">
      <Field label={i18n.t('field.format')}>
        <RadioGroup
          value={settings.format}
          onValueChange={(v) => onChange('format', v as Settings['format'])}
          options={formatOptions}
          aria-label={i18n.t('field.format')}
        />
      </Field>

      <Field label={i18n.t('field.scale')}>
        <RadioGroup
          value={String(settings.scale)}
          onValueChange={(v) => onChange('scale', Number(v) as Scale)}
          options={scaleOptions}
          aria-label={i18n.t('field.scale')}
        />
      </Field>

      <Field label={i18n.t('field.width')}>
        <Select
          value={String(settings.width)}
          onValueChange={(v) =>
            onChange('width', v === 'auto' ? 'auto' : (Number(v) as WidthValue))
          }
          options={widthOptions}
          aria-label={i18n.t('field.width')}
        />
      </Field>

      <Field label={i18n.t('field.pagination')}>
        <Select
          value={settings.pagination}
          onValueChange={(v) =>
            onChange('pagination', v as Settings['pagination'])
          }
          options={paginationOptions}
          aria-label={i18n.t('field.pagination')}
        />
      </Field>

      <Field label={i18n.t('field.background')}>
        <RadioGroup
          value={settings.background}
          onValueChange={(v) =>
            onChange('background', v as Settings['background'])
          }
          options={backgroundOptions}
          aria-label={i18n.t('field.background')}
        />
      </Field>

      <Field label={i18n.t('field.externalImages')}>
        <Select
          value={settings.externalImages}
          onValueChange={(v) =>
            onChange('externalImages', v as Settings['externalImages'])
          }
          options={externalImagesOptions}
          aria-label={i18n.t('field.externalImages')}
        />
      </Field>

      <Field label={i18n.t('field.headerLocale')}>
        <Select
          value={settings.headerLocale}
          onValueChange={(v) =>
            onChange('headerLocale', v as Settings['headerLocale'])
          }
          options={headerLocaleOptions}
          aria-label={i18n.t('field.headerLocale')}
        />
      </Field>

      {settings.format === 'jpg' ? (
        <Field label={`${i18n.t('field.jpgQuality')} · ${settings.jpgQuality}`}>
          <Slider
            value={settings.jpgQuality}
            onValueChange={(v) => onChange('jpgQuality', v)}
            min={50}
            max={100}
            aria-label={i18n.t('field.jpgQuality')}
          />
        </Field>
      ) : (
        <div className="hidden sm:block" />
      )}

      <div
        className={cn(
          'col-span-full mt-1 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-200/70 pt-4 dark:border-slate-800/60'
        )}
      >
        <Checkbox
          checked={settings.outlookHeader}
          onCheckedChange={(v) => onChange('outlookHeader', v)}
          label={i18n.t('field.outlookHeader')}
        />
        <Checkbox
          checked={settings.autoCrop}
          onCheckedChange={(v) => onChange('autoCrop', v)}
          label={i18n.t('field.autoCrop')}
        />
      </div>
    </div>
  );
}
