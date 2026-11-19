export function uint8ArrayToDataUrl(bytes: Uint8Array, ext: string): string {
  let mime = 'image/png';
  if (ext.includes('jpg') || ext.includes('jpeg')) mime = 'image/jpeg';
  else if (ext.includes('webp')) mime = 'image/webp';
  else if (ext.includes('svg')) mime = 'image/svg+xml';
  else if (ext.includes('gif')) mime = 'image/gif';

  // Em blocos: concatenar byte a byte trava a aba com imagens de vários MB
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.byteLength; i += CHUNK) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
  }
  return `data:${mime};base64,${btoa(parts.join(''))}`;
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
