import { describe, it, expect } from 'vitest';
import { Block } from '@/types/document';
import {
  SLASH_OPTION_DEFS,
  computeSectionNumbers,
  createDefaultMetaForType,
  filterSlashOptions,
  reorderBlocks,
  shouldSkipContentUpdate,
} from '../blockHelpers';

describe('Editor blockHelpers', () => {
  it('calcula numeração progressiva hierárquica até 5 níveis (NBR 6024)', () => {
    const blocks: Block[] = [
      { id: 'b1', type: 'h1', content: 'Introdução' },
      { id: 'b2', type: 'h2', content: 'Objetivos' },
      { id: 'b3', type: 'h3', content: 'Específicos' },
      { id: 'b4', type: 'h4', content: 'Detalhe' },
      { id: 'b5', type: 'h5', content: 'Subdetalhe' },
      { id: 'b6', type: 'h2', content: 'Justificativa' },
      { id: 'b7', type: 'h1', content: 'Metodologia' },
    ];

    expect(computeSectionNumbers(blocks)).toEqual({
      b1: '1',
      b2: '1.1',
      b3: '1.1.1',
      b4: '1.1.1.1',
      b5: '1.1.1.1.1',
      b6: '1.2',
      b7: '2',
    });
  });

  it('gera metadados padrão adequados para quote_long, image, code, table e box', () => {
    expect(createDefaultMetaForType('quote_long')).toEqual({
      author: 'SOBRENOME',
      year: '2025',
      page: '15',
    });
    expect(createDefaultMetaForType('image')?.imageWidthPct).toBe(75);
    expect(createDefaultMetaForType('code')?.language).toBe('python');
    expect(createDefaultMetaForType('table')?.caption).toBe('Comparativo de resultados');
    expect(createDefaultMetaForType('box')?.caption).toBe('Quadro síntese de conceitos');
    expect(createDefaultMetaForType('paragraph')).toBeUndefined();
  });

  it('filtra comandos slash por rótulo ou palavras-chave e reordena blocos sem mutação', () => {
    const results = filterSlashOptions(SLASH_OPTION_DEFS, 'ibge');
    expect(results.map((r) => r.type)).toEqual(['table']);

    const list: Block[] = [
      { id: '1', type: 'paragraph', content: 'A' },
      { id: '2', type: 'paragraph', content: 'B' },
      { id: '3', type: 'paragraph', content: 'C' },
    ];
    const reordered = reorderBlocks(list, '3', '1');
    expect(reordered.map((b) => b.id)).toEqual(['3', '1', '2']);
    expect(list.map((b) => b.id)).toEqual(['1', '2', '3']);
  });

  it('ignora wrapper <p> vazio inicial do TipTap sobre texto puro sem marcação', () => {
    expect(shouldSkipContentUpdate('Texto puro', '<p>Texto puro</p>')).toBe(true);
    expect(shouldSkipContentUpdate('Texto puro', '<p><strong>Texto puro</strong></p>')).toBe(false);
    expect(shouldSkipContentUpdate('<p>Texto</p>', '<p>Texto alterado</p>')).toBe(false);
  });
});
