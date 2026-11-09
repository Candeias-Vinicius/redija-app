import { describe, it, expect } from 'vitest';
import { AcademicReference } from '@/types/document';
import {
  filterReferences,
  getAbstractWordRange,
  getReferenceTypeBadgeLabel,
} from '../sidebarHelpers';

describe('sidebarHelpers', () => {
  it('calcula faixas recomendadas de resumo por norma/template', () => {
    expect(getAbstractWordRange('sbc')).toEqual({ min: 50, max: 200 });
    expect(getAbstractWordRange('ieee')).toEqual({ min: 100, max: 250 });
    expect(getAbstractWordRange('artigo')).toEqual({ min: 100, max: 250 });
    expect(getAbstractWordRange('tcc')).toEqual({ min: 150, max: 500 });
  });

  it('filtra referências por tipo e consulta textual em autor, título, ano, revista ou editora', () => {
    const refs: AcademicReference[] = [
      {
        id: '1',
        type: 'book',
        authors: 'SILVA, João',
        title: 'Algoritmos Avançados',
        city: 'SP',
        publisher: 'Novatec',
        year: '2022',
      },
      {
        id: '2',
        type: 'article',
        authors: 'SOUZA, Maria',
        title: 'Redes Neurais',
        journal: 'SBC Journal',
        city: 'RJ',
        publisher: 'SBC',
        year: '2024',
      },
    ];

    expect(filterReferences(refs, '', 'all')).toHaveLength(2);
    expect(filterReferences(refs, '', 'article').map((r) => r.id)).toEqual(['2']);
    expect(filterReferences(refs, 'novatec', 'all').map((r) => r.id)).toEqual(['1']);
    expect(filterReferences(refs, '2024', 'book')).toHaveLength(0);
  });

  it('retorna rótulos amigáveis por tipo de referência', () => {
    expect(getReferenceTypeBadgeLabel('article')).toBe('Artigo');
    expect(getReferenceTypeBadgeLabel('thesis')).toBe('Tese/TCC');
    expect(getReferenceTypeBadgeLabel('website')).toBe('Site');
    expect(getReferenceTypeBadgeLabel('legislation')).toBe('Norma/Lei');
    expect(getReferenceTypeBadgeLabel(undefined)).toBe('Livro');
  });
});
