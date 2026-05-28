import enUS from '@/locales/en-US.json';
import enGB from '@/locales/en-GB.json';
import de from '@/locales/de.json';
import fr from '@/locales/fr.json';
import es from '@/locales/es.json';
import ptBR from '@/locales/pt-BR.json';
import ptPT from '@/locales/pt-PT.json';
import nl from '@/locales/nl.json';
import pl from '@/locales/pl.json';
import ja from '@/locales/ja.json';
import zhHans from '@/locales/zh-Hans.json';

export type SupportedLocale =
  | 'en-US'
  | 'en-GB'
  | 'de'
  | 'fr'
  | 'es'
  | 'pt-BR'
  | 'pt-PT'
  | 'nl'
  | 'pl'
  | 'ja'
  | 'zh-Hans';

const BUNDLES: Record<SupportedLocale, Record<string, string>> = {
  'en-US': enUS,
  'en-GB': enGB,
  de: de,
  fr: fr,
  es: es,
  'pt-BR': ptBR,
  'pt-PT': ptPT,
  nl: nl,
  pl: pl,
  ja: ja,
  'zh-Hans': zhHans,
};

const FALLBACK_MAP: Record<string, SupportedLocale> = {
  'de-DE': 'de',
  'de-AT': 'de',
  'de-CH': 'de',
  'de-LI': 'de',
  'en-AU': 'en-GB',
  'en-CA': 'en-GB',
  'en-IE': 'en-GB',
  'en-NZ': 'en-GB',
  'en-ZA': 'en-GB',
  'fr-CA': 'fr',
  'fr-CH': 'fr',
  'fr-BE': 'fr',
  'fr-LU': 'fr',
  'es-MX': 'es',
  'es-AR': 'es',
  'es-CL': 'es',
  'es-ES': 'es',
  'zh-CN': 'zh-Hans',
  'zh-SG': 'zh-Hans',
};

export function resolveLocale(input?: string | null): SupportedLocale {
  if (!input) return 'en-US';
  const candidate = input as SupportedLocale;
  if (candidate in BUNDLES) return candidate;
  if (FALLBACK_MAP[input]) return FALLBACK_MAP[input];
  // Match language part only (e.g. "fr-XX" -> "fr").
  const lang = input.split('-')[0];
  for (const key of Object.keys(BUNDLES) as SupportedLocale[]) {
    if (key === lang || key.startsWith(`${lang}-`)) return key;
  }
  return 'en-US';
}

export function detectLocale(): SupportedLocale {
  try {
    const ctx = Office?.context;
    const candidates: (string | undefined | null)[] = [
      ctx?.contentLanguage,
      ctx?.displayLanguage,
      navigator?.language,
    ];
    for (const c of candidates) {
      if (c) {
        const resolved = resolveLocale(c);
        if (resolved) return resolved;
      }
    }
  } catch {
    /* Office may not be ready yet */
  }
  return 'en-US';
}

export interface I18n {
  locale: SupportedLocale;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

export function createI18n(locale: SupportedLocale): I18n {
  const bundle = BUNDLES[locale];
  const fallback = BUNDLES['en-US'];
  return {
    locale,
    t(key, vars) {
      const raw = bundle[key] ?? fallback[key] ?? key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, name) =>
        vars[name] !== undefined ? String(vars[name]) : `{${name}}`
      );
    },
  };
}

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  'en-US',
  'en-GB',
  'de',
  'fr',
  'es',
  'pt-BR',
  'pt-PT',
  'nl',
  'pl',
  'ja',
  'zh-Hans',
];

export const LOCALE_DISPLAY_NAME: Record<SupportedLocale, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  'pt-BR': 'Português (Brasil)',
  'pt-PT': 'Português (Portugal)',
  nl: 'Nederlands',
  pl: 'Polski',
  ja: '日本語',
  'zh-Hans': '简体中文',
};
