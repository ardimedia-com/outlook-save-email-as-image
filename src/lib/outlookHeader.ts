import type { EmailMeta } from './officeItemReader';
import type { SupportedLocale } from './i18n';

interface HeaderLabels {
  from: string;
  sent: string;
  to: string;
  cc: string;
  subject: string;
  /** Optional inline annotation to add to the "Sent" value when we had to fall back to the receive timestamp. */
  receivedFallback: string;
}

const LABEL_MAP: Record<SupportedLocale, HeaderLabels> = {
  de: {
    from: 'Von',
    sent: 'Gesendet',
    to: 'An',
    cc: 'Cc',
    subject: 'Betreff',
    receivedFallback: 'Empfangen',
  },
  'en-US': {
    from: 'From',
    sent: 'Sent',
    to: 'To',
    cc: 'Cc',
    subject: 'Subject',
    receivedFallback: 'Received',
  },
  'en-GB': {
    from: 'From',
    sent: 'Sent',
    to: 'To',
    cc: 'Cc',
    subject: 'Subject',
    receivedFallback: 'Received',
  },
  fr: {
    from: 'De',
    sent: 'Envoyé',
    to: 'À',
    cc: 'Cc',
    subject: 'Objet',
    receivedFallback: 'Reçu',
  },
  es: {
    from: 'De',
    sent: 'Enviado',
    to: 'Para',
    cc: 'Cc',
    subject: 'Asunto',
    receivedFallback: 'Recibido',
  },
  'pt-BR': {
    from: 'De',
    sent: 'Enviado',
    to: 'Para',
    cc: 'Cc',
    subject: 'Assunto',
    receivedFallback: 'Recebido',
  },
  'pt-PT': {
    from: 'De',
    sent: 'Enviado',
    to: 'Para',
    cc: 'Cc',
    subject: 'Assunto',
    receivedFallback: 'Recebido',
  },
  nl: {
    from: 'Van',
    sent: 'Verzonden',
    to: 'Aan',
    cc: 'Cc',
    subject: 'Onderwerp',
    receivedFallback: 'Ontvangen',
  },
  pl: {
    from: 'Od',
    sent: 'Wysłano',
    to: 'Do',
    cc: 'DW',
    subject: 'Temat',
    receivedFallback: 'Odebrano',
  },
  ja: {
    from: '差出人',
    sent: '送信日時',
    to: '宛先',
    cc: 'Cc',
    subject: '件名',
    receivedFallback: '受信日時',
  },
  'zh-Hans': {
    from: '发件人',
    sent: '发送时间',
    to: '收件人',
    cc: '抄送',
    subject: '主题',
    receivedFallback: '接收时间',
  },
};

function formatDate(date: Date, locale: SupportedLocale): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  try {
    return new Intl.DateTimeFormat(locale, opts).format(date);
  } catch {
    return date.toLocaleString(locale);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAddressList(list: { displayName: string; emailAddress: string }[]): string {
  if (list.length === 0) return '';
  return list
    .map((a) => {
      const name = escapeHtml(a.displayName);
      const addr = escapeHtml(a.emailAddress);
      return `${name} &lt;${addr}&gt;`;
    })
    .join(', ');
}

export interface BuildHeaderOptions {
  meta: EmailMeta;
  locale: SupportedLocale;
  fontFamily: string;
  background: 'light' | 'dark';
}

interface HeaderColors {
  text: string;
  rule: string;
  annotation: string;
}

const HEADER_COLORS: Record<'light' | 'dark', HeaderColors> = {
  light: { text: '#111111', rule: '#d4d4d8', annotation: '#888888' },
  dark: { text: '#e2e8f0', rule: '#334155', annotation: '#94a3b8' },
};

export function buildHeaderHtml(opts: BuildHeaderOptions): string {
  const { meta, locale, fontFamily, background } = opts;
  const labels = LABEL_MAP[locale];
  const colors = HEADER_COLORS[background];

  const dateStr = formatDate(meta.sentTime, locale);
  const dateWithFallback = meta.sentTimeIsReceived
    ? `${dateStr} <span style="color:${colors.annotation};font-style:italic">(${labels.receivedFallback})</span>`
    : dateStr;

  const fromHtml = meta.from
    ? `${escapeHtml(meta.from.displayName)} &lt;${escapeHtml(meta.from.emailAddress)}&gt;`
    : '';
  const toHtml = formatAddressList(meta.to);
  const ccHtml = formatAddressList(meta.cc);
  const subjectHtml = escapeHtml(meta.subject || '');

  const ccRow = ccHtml
    ? `<tr><td style="padding:0 12px 3px 0;vertical-align:top"><b>${labels.cc}:</b></td><td style="padding:0 0 3px 0;vertical-align:top">${ccHtml}</td></tr>`
    : '';

  return `<table class="ofh-header" style="font-family:${fontFamily};font-size:11pt;color:${colors.text};border-collapse:collapse;margin:0 0 8px 0;line-height:1.45;width:100%;">
    <tr><td style="padding:0 12px 3px 0;vertical-align:top;white-space:nowrap;"><b>${labels.from}:</b></td><td style="padding:0 0 3px 0;vertical-align:top">${fromHtml}</td></tr>
    <tr><td style="padding:0 12px 3px 0;vertical-align:top;white-space:nowrap;"><b>${labels.sent}:</b></td><td style="padding:0 0 3px 0;vertical-align:top">${dateWithFallback}</td></tr>
    <tr><td style="padding:0 12px 3px 0;vertical-align:top;white-space:nowrap;"><b>${labels.to}:</b></td><td style="padding:0 0 3px 0;vertical-align:top">${toHtml}</td></tr>
    ${ccRow}
    <tr><td style="padding:0 12px 3px 0;vertical-align:top;white-space:nowrap;"><b>${labels.subject}:</b></td><td style="padding:0 0 3px 0;vertical-align:top"><b>${subjectHtml}</b></td></tr>
  </table>
  <hr style="border:0;border-top:1px solid ${colors.rule};margin:0 0 12px 0;">`;
}

export function getHeaderFontStack(locale: SupportedLocale): string {
  const cjkFonts =
    locale === 'ja' || locale === 'zh-Hans'
      ? `'Yu Gothic UI', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans', `
      : '';
  return `'Aptos', 'Segoe UI', ${cjkFonts}Calibri, sans-serif`;
}
