import { ExternalLink, FileText, Shield, Star } from 'lucide-react';
import type { I18n } from '@/lib/i18n';

const STORE_URL = 'https://appsource.microsoft.com/';
const GITHUB_ISSUES =
  'https://github.com/ardimedia-com/outlook-save-email-as-image/issues';
const PRIVACY_URL = '/privacy.html';
const TERMS_URL = '/terms.html';

/**
 * GitHub mark, inlined.
 *
 * lucide-react removed all brand icons in v1 for trademark reasons, so `Github` no longer
 * exists. The link points at our own issue tracker and the logo is what makes it recognisable
 * at 14px, so the mark is inlined here rather than swapped for a generic icon.
 */
function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

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
          <GithubMark className="h-3.5 w-3.5" />
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
