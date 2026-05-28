import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'a',
  'b',
  'i',
  'u',
  'em',
  'strong',
  'small',
  'sub',
  'sup',
  'p',
  'br',
  'hr',
  'span',
  'div',
  'pre',
  'code',
  'blockquote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'colgroup',
  'col',
  'img',
  'figure',
  'figcaption',
  'center',
  'font',
  'address',
];

const ALLOWED_ATTR = [
  'href',
  'src',
  'alt',
  'title',
  'width',
  'height',
  'style',
  'class',
  'id',
  'align',
  'valign',
  'border',
  'cellpadding',
  'cellspacing',
  'bgcolor',
  'color',
  'face',
  'size',
  'colspan',
  'rowspan',
  'target',
  'rel',
  'role',
];

export interface SanitizeOptions {
  allowExternalImages: boolean;
}

interface SanitizeResult {
  html: string;
  externalImagesBlocked: number;
}

export function sanitizeEmailHtml(
  rawHtml: string,
  options: SanitizeOptions
): SanitizeResult {
  let externalImagesBlocked = 0;

  const placeholderHook = (node: Node) => {
    if (!(node instanceof Element)) return;
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') ?? '';
      const isExternal = /^https?:\/\//i.test(src);
      if (isExternal && !options.allowExternalImages) {
        externalImagesBlocked += 1;
        const width = node.getAttribute('width') || '120';
        const height = node.getAttribute('height') || '80';
        node.setAttribute(
          'style',
          [
            `display:inline-block`,
            `width:${width}px`,
            `height:${height}px`,
            `background:#f3f4f6`,
            `border:1px dashed #cbd5e1`,
            `box-sizing:border-box`,
            node.getAttribute('style') ?? '',
          ].join(';')
        );
        node.setAttribute('alt', node.getAttribute('alt') || 'blocked image');
        node.removeAttribute('src');
      }
    }
    if (node.tagName === 'A') {
      // Open links in new tab as a courtesy if user copies the rendered HTML.
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  };

  DOMPurify.addHook('uponSanitizeElement', placeholderHook);

  const clean = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    KEEP_CONTENT: true,
    RETURN_TRUSTED_TYPE: false,
  }) as string;

  DOMPurify.removeHook('uponSanitizeElement');

  return { html: clean, externalImagesBlocked };
}
