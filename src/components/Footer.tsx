import { ExternalLink, FileText, Github, Shield, Star } from 'lucide-react';
import type { I18n } from '@/lib/i18n';

const STORE_URL = 'https://appsource.microsoft.com/';
const GITHUB_ISSUES =
  'https://github.com/ardimedia-com/outlook-save-email-as-image/issues';
const PRIVACY_URL = '/privacy.html';
const TERMS_URL = '/terms.html';

// Command links styled as buttons.
const commandLink =
  'inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600 shadow-soft-sm transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-brand-700 dark:hover:text-brand-300';

export function Footer({ i18n }: { i18n: I18n }) {
  return (
    <footer className="border-t border-slate-200/70 bg-slate-100/80 px-4 py-2.5 text-[11px] text-slate-500 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/80 dark:text-slate-400">
      {/* Top line: the commands, styled as buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <a href={STORE_URL} target="_blank" rel="noopener noreferrer" className={commandLink}>
          <Star className="h-3.5 w-3.5" />
          {i18n.t('footer.review')}
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
        <a href={GITHUB_ISSUES} target="_blank" rel="noopener noreferrer" className={commandLink}>
          <Github className="h-3.5 w-3.5" />
          {i18n.t('footer.feedback')}
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      </div>

      {/* Bottom line: name + version, and privacy */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
        <span className="opacity-80">
          {i18n.t('footer.tagline')}
          <span className="opacity-70"> · v{__APP_VERSION__}</span>
        </span>
        <span className="opacity-40" aria-hidden="true">
          ·
        </span>
        <a
          href={PRIVACY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400"
        >
          <Shield className="h-3 w-3" />
          {i18n.t('footer.privacy')}
        </a>
        <span className="opacity-40" aria-hidden="true">
          ·
        </span>
        <a
          href={TERMS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400"
        >
          <FileText className="h-3 w-3" />
          {i18n.t('footer.terms')}
        </a>
      </div>
    </footer>
  );
}
