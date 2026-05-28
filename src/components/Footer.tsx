import { ExternalLink, Github, Shield, Star } from 'lucide-react';
import type { I18n } from '@/lib/i18n';

const STORE_URL = 'https://appsource.microsoft.com/';
const GITHUB_ISSUES =
  'https://github.com/ardimedia-com/outlook-save-email-as-image/issues';
const PRIVACY_URL = '/privacy.html';

export function Footer({ i18n }: { i18n: I18n }) {
  return (
    <footer className="border-t border-slate-200/70 bg-slate-100/80 px-4 py-3 text-[11px] text-slate-500 backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/80 dark:text-slate-400">
      <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
        <span className="opacity-80">
          {i18n.t('footer.tagline')}
          <span className="opacity-70"> · v{__APP_VERSION__}</span>
        </span>
        <div className="flex items-center gap-4">
          <a
            href={STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400"
          >
            <Star className="h-3.5 w-3.5" />
            {i18n.t('footer.review')}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
          <a
            href={GITHUB_ISSUES}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400"
          >
            <Github className="h-3.5 w-3.5" />
            {i18n.t('footer.feedback')}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400"
          >
            <Shield className="h-3.5 w-3.5" />
            {i18n.t('footer.privacy')}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        </div>
      </div>
    </footer>
  );
}
