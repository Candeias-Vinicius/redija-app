// =====================================================================
// RedijaApp — Construtor Puro de Pacotes Virtuais & Catálogo Universe
// Compatível com navegador (main thread) e Web Worker (sem DOM / Dexie).
// =====================================================================

export interface UniverseTemplateInfo {
  id: string; // Ex: "@preview/charged-ieee:0.1.4"
  name: string;
  version: string;
  title: string;
  description: string;
  category: 'conferencia' | 'artigo' | 'poster' | 'apresentacao';
  entrypoint: string;
}

export const POPULAR_UNIVERSE_TEMPLATES: UniverseTemplateInfo[] = [
  {
    id: '@preview/charged-ieee:0.1.4',
    name: 'charged-ieee',
    version: '0.1.4',
    title: 'IEEE Conference Article',
    description:
      'Template oficial e modernizado para artigos de conferência no padrão IEEE (duas colunas e abstract em destaque).',
    category: 'conferencia',
    entrypoint: 'ieee',
  },
  {
    id: '@preview/modern-sbc:0.1.0',
    name: 'modern-sbc',
    version: '0.1.0',
    title: 'SBC — Sociedade Brasileira de Computação',
    description: 'Template para congressos e periódicos de computação e informática brasileiros.',
    category: 'conferencia',
    entrypoint: 'sbc-article',
  },
  {
    id: '@preview/poster-template:0.1.0',
    name: 'poster-template',
    version: '0.1.0',
    title: 'Pôster Acadêmico A0 / A1',
    description:
      'Banner científico em grande formato para mostras, simpósios e encontros de iniciação científica.',
    category: 'poster',
    entrypoint: 'poster',
  },
  {
    id: '@preview/academic-cv:0.1.0',
    name: 'academic-cv',
    version: '0.1.0',
    title: 'Currículo Acadêmico / Lattes Estilizado',
    description:
      'Estrutura elegante e tipográfica para histórico acadêmico, publicações e bolsas.',
    category: 'artigo',
    entrypoint: 'cv',
  },
  {
    id: '@preview/touying:0.5.3',
    name: 'touying',
    version: '0.5.3',
    title: 'Apresentação de Slides Acadêmica',
    description:
      'Alternativa ao LaTeX Beamer com temas científicos para defesas de TCC e apresentações orais.',
    category: 'apresentacao',
    entrypoint: 'simple-theme',
  },
];

export interface ParsedPackageId {
  namespace: string;
  name: string;
  version: string;
  fullId: string;
}

/**
 * Normaliza e analisa um identificador de pacote do Typst Universe.
 * Aceita:
 * - `@preview/charged-ieee:0.1.4`
 * - `preview/charged-ieee:0.1.4`
 * - `charged-ieee:0.1.4` (assume namespace preview)
 * - `charged-ieee` (assume versão padrão conhecida)
 */
export function parsePackageId(rawId: string): ParsedPackageId {
  const clean = rawId.trim();
  const match = clean.match(/^@?([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+):([0-9.]+)$/);

  if (match) {
    return {
      namespace: match[1],
      name: match[2],
      version: match[3],
      fullId: `@${match[1]}/${match[2]}:${match[3]}`,
    };
  }

  // Formato sem namespace: name:version
  const simpleMatch = clean.match(/^@?([a-zA-Z0-9_-]+):([0-9.]+)$/);
  if (simpleMatch) {
    return {
      namespace: 'preview',
      name: simpleMatch[1],
      version: simpleMatch[2],
      fullId: `@preview/${simpleMatch[1]}:${simpleMatch[2]}`,
    };
  }

  // Formato apenas nome: assume template conhecido ou preview 0.1.0
  const known = POPULAR_UNIVERSE_TEMPLATES.find(
    (t) =>
      t.name.toLowerCase() === clean.toLowerCase() || t.id.toLowerCase() === clean.toLowerCase(),
  );
  if (known) {
    return {
      namespace: 'preview',
      name: known.name,
      version: known.version,
      fullId: known.id,
    };
  }

  const safeName = clean.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase() || 'custom-template';
  return {
    namespace: 'preview',
    name: safeName,
    version: '0.1.0',
    fullId: `@preview/${safeName}:0.1.0`,
  };
}

/**
 * Valida se os bytes correspondem a um arquivo `.tar.gz` (cabeçalho mágico gzip 1F 8B 08).
 */
export function isValidTarGzBytes(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 3 && bytes[0] === 0x1f && bytes[1] === 0x8b && bytes[2] === 0x08;
}

/**
 * Sanitiza um nome de função Typst válida como entrypoint de show-rule.
 */
export function sanitizeTypstIdent(raw?: string, fallback = 'article'): string {
  const cleaned = (raw || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!cleaned || !/^[a-zA-Z_]/.test(cleaned)) {
    return fallback;
  }
  return cleaned;
}

/**
 * Constrói os arquivos relativos (`typst.toml`, `lib.typ`, etc.) de um pacote
 * virtual Typst Universe para uso offline ou para templates virtuais curados.
 */
export function buildVirtualUniversePackageFiles(
  spec: { namespace: string; name: string; version: string },
  entrypoint?: string,
): Record<string, string> {
  const safePkgName = spec.name.replace(/[^a-zA-Z0-9_-]/g, '') || 'custom-template';
  const safeVersion = spec.version.replace(/[^0-9.]/g, '') || '0.1.0';
  const known = POPULAR_UNIVERSE_TEMPLATES.find((t) => t.name === safePkgName);
  const safeEntry = sanitizeTypstIdent(
    entrypoint || known?.entrypoint || safePkgName,
    'article',
  );

  const toml = `[package]
name = "${safePkgName}"
version = "${safeVersion}"
entrypoint = "lib.typ"
`;

  if (safePkgName === 'touying') {
    const simpleThemeCode = `// Fallback virtual local de slides compativel com @preview/touying
#let simple-theme(aspect-ratio: "16-9", ..rest, body) = {
  set page(paper: "presentation-" + aspect-ratio, margin: 2em)
  set text(size: 16pt)
  body
}
`;
    const themesIndexCode = `#import "themes/simple.typ" as simple
`;
    const libCode = `// Pacote virtual offline para @preview/touying:${safeVersion}
#import "themes.typ"
#let simple-theme = themes.simple.simple-theme
#let touying-slides(..rest, body) = themes.simple.simple-theme(..rest, body)
`;
    return {
      'typst.toml': toml,
      'themes/simple.typ': simpleThemeCode,
      'themes.typ': themesIndexCode,
      'lib.typ': libCode,
    };
  }

  const isPoster = safePkgName === 'poster-template' || safeEntry === 'poster';
  const isTwoCol = safePkgName === 'charged-ieee' || safeEntry === 'ieee';
  const pageConfig = isPoster
    ? 'set page(paper: "a1", margin: 2cm)'
    : `set page(paper: "a4", margin: (x: 2.2cm, y: 2.5cm)${isTwoCol ? ', columns: 2' : ''})`;

  const libCode = `// Pacote virtual Typst Universe (${safePkgName}:${safeVersion})
#let _format-author(a) = {
  if type(a) == dictionary {
    let nome = a.at("name", default: "")
    let org = a.at("organization", default: none)
    if org != none [#nome (#org)] else [#nome]
  } else {
    [#a]
  }
}

#let ${safeEntry}(title: "", authors: (), abstract: none, ..rest, body) = {
  ${pageConfig}
  set text(size: ${isPoster ? '18pt' : isTwoCol ? '10pt' : '11pt'})
  let author-items = if type(authors) == array { authors.map(_format-author) } else { () }
  align(center)[
    #v(0.3cm)
    #text(size: ${isPoster ? '34pt' : '16pt'}, weight: "bold")[#title]
    #if author-items.len() > 0 [
      #v(0.25cm)
      #text(size: ${isPoster ? '16pt' : '11pt'})[#author-items.join(", ")]
    ]
    #v(0.35cm)
  ]
  if abstract != none [
    #block(
      width: 100%,
      inset: (x: 0.8cm, y: 0.35cm),
      stroke: (left: 2pt + luma(140)),
    )[
      #strong[Resumo:] #abstract
    ]
    #v(0.4cm)
  ]
  body
}
`;

  return {
    'typst.toml': toml,
    'lib.typ': libCode,
  };
}
