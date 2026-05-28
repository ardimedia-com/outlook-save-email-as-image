import type { SupportedLocale } from '@/lib/i18n';
import type { Background } from '@/lib/imageExporter';

export type Format = 'png' | 'jpg';
export type Scale = 1 | 2 | 3;
export type WidthValue = 'auto' | 640 | 800 | 1000 | 1200;
export type Pagination = 'single' | 'auto-split';
export type ExternalImages = 'block' | 'allow';
export type HeaderLocaleSetting = 'auto' | SupportedLocale;

export interface Settings {
  format: Format;
  jpgQuality: number;
  width: WidthValue;
  scale: Scale;
  pagination: Pagination;
  outlookHeader: boolean;
  headerLocale: HeaderLocaleSetting;
  autoCrop: boolean;
  externalImages: ExternalImages;
  background: Background;
}

export const DEFAULT_SETTINGS: Settings = {
  format: 'png',
  jpgQuality: 90,
  width: 'auto',
  scale: 2,
  pagination: 'single',
  outlookHeader: true,
  headerLocale: 'auto',
  autoCrop: true,
  externalImages: 'block',
  background: 'light',
};
