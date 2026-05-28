/// <reference types="office-js" />

export interface EmailAddress {
  displayName: string;
  emailAddress: string;
}

export interface EmailMeta {
  subject: string;
  from: EmailAddress | null;
  to: EmailAddress[];
  cc: EmailAddress[];
  /** True send time (PR_CLIENT_SUBMIT_TIME / EWS DateTimeSent). Falls back to dateTimeCreated if EWS is unavailable. */
  sentTime: Date;
  /** True when sentTime came from the receive timestamp (EWS unavailable). */
  sentTimeIsReceived: boolean;
}

export interface EmailContent {
  meta: EmailMeta;
  bodyHtml: string;
  bodyFormat: 'html' | 'text';
}

export interface InlineImage {
  /** Attachment name, e.g. "image001.png". */
  name: string;
  /** EWS attachment id. */
  id: string;
  /** Ready-to-use data URL: `data:image/png;base64,...`. */
  dataUrl: string;
}

function toEmailAddress(d: Office.EmailAddressDetails | undefined): EmailAddress | null {
  if (!d || !d.emailAddress) return null;
  return {
    displayName: d.displayName || d.emailAddress,
    emailAddress: d.emailAddress,
  };
}

function toEmailAddressList(arr?: Office.EmailAddressDetails[]): EmailAddress[] {
  if (!arr) return [];
  return arr
    .map(toEmailAddress)
    .filter((x): x is EmailAddress => x !== null);
}

function getBodyAsync(item: Office.MessageRead, coercionType: Office.CoercionType): Promise<string> {
  return new Promise((resolve, reject) => {
    item.body.getAsync(coercionType, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve(result.value);
      } else {
        reject(new Error(result.error?.message ?? 'Failed to read body'));
      }
    });
  });
}

/**
 * Fetch the true SENT time via EWS GetItem. Returns null if EWS is unavailable
 * (e.g. some Outlook on the Web hybrid setups, or REST-only configs).
 */
async function fetchSentTimeViaEws(itemId: string): Promise<Date | null> {
  const mailbox = Office.context.mailbox;
  if (typeof mailbox.makeEwsRequestAsync !== 'function') {
    return null;
  }

  const ewsId = mailbox.convertToEwsId(itemId, Office.MailboxEnums.RestVersion.v2_0);
  const soap = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:t="http://schemas.microsoft.com/exchange/services/2006/types"
               xmlns:m="http://schemas.microsoft.com/exchange/services/2006/messages">
  <soap:Body>
    <m:GetItem>
      <m:ItemShape>
        <t:BaseShape>IdOnly</t:BaseShape>
        <t:AdditionalProperties>
          <t:FieldURI FieldURI="item:DateTimeSent" />
        </t:AdditionalProperties>
      </m:ItemShape>
      <m:ItemIds>
        <t:ItemId Id="${ewsId}" />
      </m:ItemIds>
    </m:GetItem>
  </soap:Body>
</soap:Envelope>`;

  return new Promise((resolve) => {
    try {
      mailbox.makeEwsRequestAsync(soap, (result) => {
        if (result.status !== Office.AsyncResultStatus.Succeeded) {
          resolve(null);
          return;
        }
        const xmlText = result.value;
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');
        const node = doc.getElementsByTagNameNS(
          'http://schemas.microsoft.com/exchange/services/2006/types',
          'DateTimeSent'
        )[0];
        if (!node?.textContent) {
          resolve(null);
          return;
        }
        const d = new Date(node.textContent);
        if (Number.isNaN(d.getTime())) {
          resolve(null);
        } else {
          resolve(d);
        }
      });
    } catch {
      resolve(null);
    }
  });
}

export async function readCurrentEmail(): Promise<EmailContent> {
  const mailbox = Office.context.mailbox;
  if (!mailbox || !mailbox.item) {
    throw new Error('NO_ITEM');
  }
  const item = mailbox.item as Office.MessageRead;

  // Body: prefer HTML, fall back to text/plain wrapped in a div.
  let bodyHtml = '';
  let bodyFormat: 'html' | 'text' = 'html';

  try {
    bodyHtml = await getBodyAsync(item, Office.CoercionType.Html);
    if (!bodyHtml || bodyHtml.trim().length === 0) {
      const text = await getBodyAsync(item, Office.CoercionType.Text);
      bodyHtml = wrapPlainText(text);
      bodyFormat = 'text';
    }
  } catch {
    // HTML read failed (encrypted? IRM?). Try plain text as last resort.
    try {
      const text = await getBodyAsync(item, Office.CoercionType.Text);
      bodyHtml = wrapPlainText(text);
      bodyFormat = 'text';
    } catch (err) {
      throw new Error('BODY_UNREADABLE');
    }
  }

  if (!bodyHtml || bodyHtml.trim().length === 0) {
    throw new Error('BODY_EMPTY');
  }

  // Sent time: try EWS, fall back to dateTimeCreated.
  let sentTime: Date;
  let sentTimeIsReceived = false;
  const itemId = item.itemId;
  if (itemId) {
    const ewsSent = await fetchSentTimeViaEws(itemId);
    if (ewsSent) {
      sentTime = ewsSent;
    } else {
      sentTime = new Date(item.dateTimeCreated);
      sentTimeIsReceived = true;
    }
  } else {
    sentTime = new Date(item.dateTimeCreated);
    sentTimeIsReceived = true;
  }

  const meta: EmailMeta = {
    subject: item.subject ?? '',
    from: toEmailAddress(item.from),
    to: toEmailAddressList(item.to),
    cc: toEmailAddressList(item.cc),
    sentTime,
    sentTimeIsReceived,
  };

  return { meta, bodyHtml, bodyFormat };
}

function wrapPlainText(text: string): string {
  const safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Preserve line breaks without using <pre> — keep the text as flowing prose.
  const withBreaks = safe.replace(/\n/g, '<br />');
  return `<div style="font-family:Inter,Segoe UI,sans-serif;font-size:11pt;line-height:1.45;white-space:normal;">${withBreaks}</div>`;
}

function getAttachmentContentAsync(
  item: Office.MessageRead,
  attachmentId: string
): Promise<Office.AttachmentContent> {
  return new Promise((resolve, reject) => {
    item.getAttachmentContentAsync(attachmentId, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve(result.value);
      } else {
        reject(new Error(result.error?.message ?? 'Failed to read attachment'));
      }
    });
  });
}

function contentTypeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    case 'svg':
      return 'image/svg+xml';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}

/**
 * Fetch all inline image attachments of the current message as data URLs.
 * Returns an empty array if the host doesn't support getAttachmentContentAsync
 * (requirement set < 1.8) or the message has no inline images.
 */
export async function fetchInlineImages(): Promise<InlineImage[]> {
  const mailbox = Office.context.mailbox;
  if (!mailbox?.item) return [];
  const item = mailbox.item as Office.MessageRead;

  if (typeof item.getAttachmentContentAsync !== 'function') return [];
  const attachments = item.attachments ?? [];
  const inlineImages = attachments.filter(
    (a) => a.isInline && (a.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|bmp|svg|webp)$/i.test(a.name))
  );

  const results: InlineImage[] = [];
  for (const att of inlineImages) {
    try {
      const content = await getAttachmentContentAsync(item, att.id);
      if (content.format === Office.MailboxEnums.AttachmentContentFormat.Base64) {
        const mime = att.contentType || contentTypeFromName(att.name);
        results.push({
          name: att.name,
          id: att.id,
          dataUrl: `data:${mime};base64,${content.content}`,
        });
      }
    } catch {
      // Skip attachments that fail to load — they fall back to placeholders.
    }
  }
  return results;
}
