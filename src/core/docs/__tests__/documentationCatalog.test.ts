import { describe, it, expect } from 'vitest';
import {
  ABNT_STANDARDS_DOCS,
  DOCS_SECTIONS,
  filterDocsSections,
} from '../documentationCatalog';

describe('documentationCatalog', () => {
  it('contém as 9 normas ABNT oficiais, créditos do motor Typst e trilha AGPL-3.0 na central /docs', () => {
    expect(ABNT_STANDARDS_DOCS).toHaveLength(9);
    expect(DOCS_SECTIONS.length).toBeGreaterThanOrEqual(5);
    expect(DOCS_SECTIONS.some((s) => s.id === 'normas-abnt')).toBe(true);
    const openSourceSection = DOCS_SECTIONS.find((s) => s.id === 'codigo-aberto');
    expect(openSourceSection).toBeDefined();
    expect(openSourceSection?.description).toContain('AGPL-3.0');
    expect(
      openSourceSection?.articles.some(
        (article) =>
          article.id === 'licenca-agpl-e-creditos' &&
          article.bullets.some((b) => b.includes('Apache-2.0') && b.includes('Typst')),
      ),
    ).toBe(true);
  });

  it('retorna todas as seções quando a busca estiver vazia', () => {
    expect(filterDocsSections('')).toHaveLength(DOCS_SECTIONS.length);
    expect(filterDocsSections('   ')).toHaveLength(DOCS_SECTIONS.length);
  });

  it('filtra normas específicas e artigos sem retornar seções vazias', () => {
    const abntMatch = filterDocsSections('NBR 14724');
    expect(abntMatch.some((s) => s.id === 'normas-abnt')).toBe(true);
    expect(filterDocsSections('termo-inexistente-xyz-999')).toEqual([]);
  });
});
