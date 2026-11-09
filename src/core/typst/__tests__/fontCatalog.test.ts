import { describe, it, expect } from 'vitest';
import {
  FONT_CATALOG,
  buildFontsourceUrlsForName,
  getCdnUrlsForFont,
  getFontCacheKey,
  getTypstFontStack,
  sanitizeCustomFontFamily,
  toFontsourceSlug,
} from '../fontCatalog';

describe('fontCatalog: Tipografia Acadêmica & Fontes Sob Demanda via CDN', () => {
  it('expõe fontes bundled offline e catálogo CDN jsDelivr válido', () => {
    const serif = FONT_CATALOG.find((f) => f.id === 'serif');
    const sans = FONT_CATALOG.find((f) => f.id === 'sans');
    const inter = FONT_CATALOG.find((f) => f.id === 'inter');

    expect(serif?.source).toBe('bundled');
    expect(sans?.source).toBe('bundled');
    expect(inter?.source).toBe('cdn');
    expect(getCdnUrlsForFont('serif')).toEqual([]);
    expect(getCdnUrlsForFont('inter').every((u) => u.startsWith('https://cdn.jsdelivr.net/'))).toBe(
      true,
    );
  });

  it('normaliza slugs do Fontsource e gera URLs seguras para fontes customizadas', () => {
    expect(toFontsourceSlug('Source Serif 4')).toBe('source-serif-4');
    expect(toFontsourceSlug('Open Sans')).toBe('open-sans');

    const urls = buildFontsourceUrlsForName('Open Sans');
    expect(urls).toHaveLength(4);
    expect(urls[0]).toBe('https://cdn.jsdelivr.net/fontsource/fonts/open-sans@latest/latin-400-normal.ttf');

    expect(getFontCacheKey('custom', 'Open Sans')).toBe('custom:open-sans');
    expect(getTypstFontStack('custom', 'Open Sans')).toEqual([
      'Open Sans',
      'Tinos',
      'Arimo',
      'Libertinus Serif',
    ]);
  });

  it('bloqueia caracteres inseguros em nomes de fontes customizadas contra injeção Typst', () => {
    expect(sanitizeCustomFontFamily('Roboto Slab')).toBe('Roboto Slab');
    expect(sanitizeCustomFontFamily('Arial", panic("hack")')).toBeUndefined();
    expect(sanitizeCustomFontFamily('Font; #import "evil"')).toBeUndefined();
    expect(getCdnUrlsForFont('custom', 'Arial", panic()')).toEqual([]);
  });
});
