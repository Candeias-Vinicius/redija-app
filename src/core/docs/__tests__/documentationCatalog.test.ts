import { describe, it, expect } from 'vitest';
import {
  ABNT_STANDARDS_DOCS,
  DOCS_SECTIONS,
  filterDocsSections,
} from '../documentationCatalog';

describe('documentationCatalog', () => {
  it('contém as 9 normas ABNT oficiais e todas as trilhas da central /docs', () => {
    expect(ABNT_STANDARDS_DOCS).toHaveLength(9);
    expect(DOCS_SECTIONS.length).toBeGreaterThanOrEqual(5);
    expect(DOCS_SECTIONS.some((s) => s.id === 'normas-abnt')).toBe(true);
    expect(DOCS_SECTIONS.some((s) => s.id === 'codigo-aberto')).toBe(true);
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
