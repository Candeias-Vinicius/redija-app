// =====================================================================
// RedijaApp — Catálogo de Fontes Typst & Fontes Sob Demanda via CDN
// =====================================================================

import { FontFamilyId } from '@/types/document';

export interface FontCatalogEntry {
  id: FontFamilyId;
  label: string;
  typstName: string;
  category: 'serif' | 'sans' | 'mono' | 'custom';
  badge: string;
  description: string;
  source: 'bundled' | 'cdn';
  fallbackStack: string[];
  cdnUrls: string[];
}

const TYPST_ASSETS_BASE = 'https://cdn.jsdelivr.net/gh/typst/typst-assets@v0.13.1/files/fonts';
const FONTSOURCE_CDN_BASE = 'https://cdn.jsdelivr.net/fontsource/fonts';

export const FONT_CATALOG: FontCatalogEntry[] = [
  {
    id: 'serif',
    label: 'Times New Roman / Tinos (Padrão ABNT Offline)',
    typstName: 'Tinos',
    category: 'serif',
    badge: 'Offline • ABNT',
    description: 'Métrica compatível com Times New Roman; funciona 100% offline.',
    source: 'bundled',
    fallbackStack: ['Tinos', 'TeX Gyre Termes', 'Liberation Serif', 'Times New Roman'],
    cdnUrls: [],
  },
  {
    id: 'sans',
    label: 'Arial / Arimo (Sem Serifa Offline)',
    typstName: 'Arimo',
    category: 'sans',
    badge: 'Offline • ABNT',
    description: 'Métrica compatível com Arial/Helvetica; funciona 100% offline.',
    source: 'bundled',
    fallbackStack: ['Arimo', 'Liberation Sans', 'Arial', 'Helvetica'],
    cdnUrls: [],
  },
  {
    id: 'libertinus',
    label: 'Libertinus Serif (Padrão Acadêmico Typst)',
    typstName: 'Libertinus Serif',
    category: 'serif',
    badge: 'CDN • Typst',
    description: 'Tipografia serifada clássica com excelente ligadura e suporte matemático.',
    source: 'cdn',
    fallbackStack: ['Libertinus Serif', 'Tinos', 'Liberation Serif'],
    cdnUrls: [
      `${TYPST_ASSETS_BASE}/LibertinusSerif-Regular.otf`,
      `${TYPST_ASSETS_BASE}/LibertinusSerif-Bold.otf`,
      `${TYPST_ASSETS_BASE}/LibertinusSerif-Italic.otf`,
      `${TYPST_ASSETS_BASE}/LibertinusSerif-BoldItalic.otf`,
    ],
  },
  {
    id: 'new_cm',
    label: 'New Computer Modern (Clássico LaTeX / Exatas)',
    typstName: 'New Computer Modern',
    category: 'serif',
    badge: 'CDN • LaTeX',
    description: 'Visual acadêmico tradicional de artigos de matemática, física e engenharia.',
    source: 'cdn',
    fallbackStack: ['New Computer Modern', 'Libertinus Serif', 'Tinos'],
    cdnUrls: [
      `${TYPST_ASSETS_BASE}/NewCM10-Regular.otf`,
      `${TYPST_ASSETS_BASE}/NewCM10-Bold.otf`,
      `${TYPST_ASSETS_BASE}/NewCM10-Italic.otf`,
      `${TYPST_ASSETS_BASE}/NewCM10-BoldItalic.otf`,
    ],
  },
  {
    id: 'lora',
    label: 'Lora (Editorial Serifada Moderna)',
    typstName: 'Lora',
    category: 'serif',
    badge: 'CDN • Editorial',
    description: 'Serifada contemporânea de alta legibilidade para humanidades e monografias.',
    source: 'cdn',
    fallbackStack: ['Lora', 'Tinos', 'Libertinus Serif'],
    cdnUrls: [
      `${FONTSOURCE_CDN_BASE}/lora@latest/latin-400-normal.ttf`,
      `${FONTSOURCE_CDN_BASE}/lora@latest/latin-700-normal.ttf`,
      `${FONTSOURCE_CDN_BASE}/lora@latest/latin-400-italic.ttf`,
      `${FONTSOURCE_CDN_BASE}/lora@latest/latin-700-italic.ttf`,
    ],
  },
  {
    id: 'eb_garamond',
    label: 'EB Garamond (Clássica Humanística)',
    typstName: 'EB Garamond',
    category: 'serif',
    badge: 'CDN • Clássica',
    description: 'Elegante para teses, ensaios e artigos de áreas humanas e sociais.',
    source: 'cdn',
    fallbackStack: ['EB Garamond', 'Tinos', 'Libertinus Serif'],
    cdnUrls: [
      `${FONTSOURCE_CDN_BASE}/eb-garamond@latest/latin-400-normal.ttf`,
      `${FONTSOURCE_CDN_BASE}/eb-garamond@latest/latin-700-normal.ttf`,
      `${FONTSOURCE_CDN_BASE}/eb-garamond@latest/latin-400-italic.ttf`,
      `${FONTSOURCE_CDN_BASE}/eb-garamond@latest/latin-700-italic.ttf`,
    ],
  },
  {
    id: 'inter',
    label: 'Inter (Sem Serifa Contemporânea)',
    typstName: 'Inter',
    category: 'sans',
    badge: 'CDN • Moderna',
    description: 'Fonte limpa otimizada para relatórios técnicos, documentação e banners.',
    source: 'cdn',
    fallbackStack: ['Inter', 'Arimo', 'Liberation Sans'],
    cdnUrls: [
      `${FONTSOURCE_CDN_BASE}/inter@latest/latin-400-normal.ttf`,
      `${FONTSOURCE_CDN_BASE}/inter@latest/latin-700-normal.ttf`,
      `${FONTSOURCE_CDN_BASE}/inter@latest/latin-400-italic.ttf`,
      `${FONTSOURCE_CDN_BASE}/inter@latest/latin-700-italic.ttf`,
    ],
  },
  {
    id: 'roboto',
    label: 'Roboto (Técnica / Engenharia)',
    typstName: 'Roboto',
    category: 'sans',
    badge: 'CDN • Técnica',
    description: 'Geométrica equilibrada para manuais técnicos e artigos em duas colunas.',
    source: 'cdn',
    fallbackStack: ['Roboto', 'Arimo', 'Liberation Sans'],
    cdnUrls: [
      `${FONTSOURCE_CDN_BASE}/roboto@latest/latin-400-normal.ttf`,
      `${FONTSOURCE_CDN_BASE}/roboto@latest/latin-700-normal.ttf`,
      `${FONTSOURCE_CDN_BASE}/roboto@latest/latin-400-italic.ttf`,
      `${FONTSOURCE_CDN_BASE}/roboto@latest/latin-700-italic.ttf`,
    ],
  },
  {
    id: 'fira_sans',
    label: 'Fira Sans (Pôsteres & Simpósios)',
    typstName: 'Fira Sans',
    category: 'sans',
    badge: 'CDN • Banners',
    description: 'Alta legibilidade a longa distância em pôsteres acadêmicos A0/A1.',
    source: 'cdn',
    fallbackStack: ['Fira Sans', 'Arimo', 'Liberation Sans'],
    cdnUrls: [
      `${FONTSOURCE_CDN_BASE}/fira-sans@latest/latin-400-normal.ttf`,
      `${FONTSOURCE_CDN_BASE}/fira-sans@latest/latin-700-normal.ttf`,
      `${FONTSOURCE_CDN_BASE}/fira-sans@latest/latin-400-italic.ttf`,
      `${FONTSOURCE_CDN_BASE}/fira-sans@latest/latin-700-italic.ttf`,
    ],
  },
  {
    id: 'jetbrains_mono',
    label: 'JetBrains Mono (Monoespaçada / Computação)',
    typstName: 'JetBrains Mono',
    category: 'mono',
    badge: 'CDN • Código',
    description: 'Monoespaçada nítida voltada a documentação técnica e artigos de computação.',
    source: 'cdn',
    fallbackStack: ['JetBrains Mono', 'DejaVu Sans Mono', 'Tinos'],
    cdnUrls: [
      `${FONTSOURCE_CDN_BASE}/jetbrains-mono@latest/latin-400-normal.ttf`,
      `${FONTSOURCE_CDN_BASE}/jetbrains-mono@latest/latin-700-normal.ttf`,
      `${FONTSOURCE_CDN_BASE}/jetbrains-mono@latest/latin-400-italic.ttf`,
      `${FONTSOURCE_CDN_BASE}/jetbrains-mono@latest/latin-700-italic.ttf`,
    ],
  },
];

export const VALID_FONT_FAMILY_IDS: ReadonlySet<FontFamilyId> = new Set<FontFamilyId>([
  'serif',
  'sans',
  'libertinus',
  'new_cm',
  'lora',
  'eb_garamond',
  'inter',
  'roboto',
  'fira_sans',
  'jetbrains_mono',
  'custom',
]);

const FONT_CATALOG_MAP = new Map<FontFamilyId, FontCatalogEntry>(
  FONT_CATALOG.map((entry) => [entry.id, entry]),
);

const SAFE_CUSTOM_FONT_REGEX = /^[a-zA-Z0-9\s_-]+$/;

export function sanitizeCustomFontFamily(raw?: string): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned || cleaned.length > 64 || !SAFE_CUSTOM_FONT_REGEX.test(cleaned)) {
    return undefined;
  }
  return cleaned;
}

/**
 * Converte o nome de uma fonte do Google Fonts em slug Fontsource CDN
 * (ex: "Open Sans" -> "open-sans", "Source Serif 4" -> "source-serif-4").
 */
export function toFontsourceSlug(fontName: string): string {
  return fontName
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildFontsourceUrlsForName(fontName: string): string[] {
  const slug = toFontsourceSlug(fontName);
  if (!slug) return [];
  return [
    `${FONTSOURCE_CDN_BASE}/${slug}@latest/latin-400-normal.ttf`,
    `${FONTSOURCE_CDN_BASE}/${slug}@latest/latin-700-normal.ttf`,
    `${FONTSOURCE_CDN_BASE}/${slug}@latest/latin-400-italic.ttf`,
    `${FONTSOURCE_CDN_BASE}/${slug}@latest/latin-700-italic.ttf`,
  ];
}

export interface RequestedFontDescriptor {
  fontFamily: FontFamilyId;
  customFontFamily?: string;
}

export function getFontCacheKey(fontFamily: FontFamilyId, customFontFamily?: string): string {
  if (fontFamily === 'custom') {
    const clean = sanitizeCustomFontFamily(customFontFamily);
    return clean ? `custom:${toFontsourceSlug(clean)}` : 'serif';
  }
  return fontFamily;
}

export function getCdnUrlsForFont(fontFamily: FontFamilyId, customFontFamily?: string): string[] {
  if (fontFamily === 'serif' || fontFamily === 'sans') return [];
  if (fontFamily === 'custom') {
    const clean = sanitizeCustomFontFamily(customFontFamily);
    return clean ? buildFontsourceUrlsForName(clean) : [];
  }
  return FONT_CATALOG_MAP.get(fontFamily)?.cdnUrls ?? [];
}

export function getTypstFontStack(fontFamily: FontFamilyId, customFontFamily?: string): string[] {
  if (fontFamily === 'custom') {
    const clean = sanitizeCustomFontFamily(customFontFamily);
    if (clean) {
      return [clean, 'Tinos', 'Arimo', 'Libertinus Serif'];
    }
    return FONT_CATALOG_MAP.get('serif')!.fallbackStack;
  }
  return FONT_CATALOG_MAP.get(fontFamily)?.fallbackStack ?? FONT_CATALOG_MAP.get('serif')!.fallbackStack;
}

export function getFontEntry(fontFamily: FontFamilyId): FontCatalogEntry | undefined {
  return FONT_CATALOG_MAP.get(fontFamily);
}
