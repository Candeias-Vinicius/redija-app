export function uint8ArrayToDataUrl(bytes: Uint8Array, ext: string): string {
  let mime = 'image/png';
  if (ext.includes('jpg') || ext.includes('jpeg')) mime = 'image/jpeg';
  else if (ext.includes('webp')) mime = 'image/webp';
  else if (ext.includes('svg')) mime = 'image/svg+xml';
  else if (ext.includes('gif')) mime = 'image/gif';

  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

/**
 * Sanitiza fragmentos de HTML para permitir apenas tags de formatação semântica seguras
 * e sem atributos executáveis ou manipuladores de eventos maliciosos (on*, javascript:, etc.).
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // 1. Remove tags executáveis ou perigosas por completo com seu conteúdo interno
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  cleaned = cleaned.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  cleaned = cleaned.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  cleaned = cleaned.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');
  cleaned = cleaned.replace(/<math\b[^<]*(?:(?!<\/math>)<[^<]*)*<\/math>/gi, '');

  // 2. Remove handlers de eventos (onload=, onerror=, onclick=, etc.) e links javascript:
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
  cleaned = cleaned.replace(
    /href\s*=\s*(?:'javascript:[^']*'|"javascript:[^"]*"|javascript:[^\s>]+)/gi,
    'href="#"',
  );

  // 3. Remove tags não permitidas mantendo o conteúdo interno
  cleaned = cleaned.replace(/<(\/?)(\w+)([^>]*)>/gi, (_match, isClosing, tagName) => {
    const tag = tagName.toLowerCase();
    const safeTags = ['strong', 'em', 'u', 'sup', 'sub', 'p', 'br', 'code', 's', 'b', 'i'];
    if (!safeTags.includes(tag)) {
      return '';
    }
    if (isClosing) {
      return `</${tag}>`;
    }
    if (tag === 'br') {
      return '<br/>';
    }
    return `<${tag}>`;
  });

  return cleaned.replace(/\s+/g, ' ').trim();
}

export function cleanInlineFormatting(html: string): string {
  return sanitizeHtml(html);
}
