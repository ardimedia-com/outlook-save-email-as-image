const UMLAUT_MAP: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  Ä: 'Ae',
  Ö: 'Oe',
  Ü: 'Ue',
  ß: 'ss',
};

function transliterate(input: string): string {
  return input.replace(/[äöüÄÖÜß]/g, (ch) => UMLAUT_MAP[ch] ?? ch);
}

export function sanitizeFilename(subject: string, maxLength = 80): string {
  const transliterated = transliterate(subject ?? '');
  const cleaned = transliterated
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9-_]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
  const result = cleaned.slice(0, maxLength);
  return result.length > 0 ? result : 'email';
}

export function timestampPart(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}`
  );
}

export function buildFilename(opts: {
  subject: string;
  date: Date;
  ext: 'png' | 'jpg';
  page?: number;
  totalPages?: number;
}): string {
  const stamp = timestampPart(opts.date);
  const subject = sanitizeFilename(opts.subject);
  const suffix =
    opts.totalPages && opts.totalPages > 1
      ? `_p${String(opts.page ?? 1).padStart(2, '0')}`
      : '';
  return `${stamp}_${subject}${suffix}.${opts.ext}`;
}
