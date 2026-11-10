import { describe, it, expect } from 'vitest';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';
import {
  classifyBlocksChange,
  computeNextDeletedBlockTimestamps,
  generateDefaultProjectName,
  generateUniqueCopyName,
  resolveTemplateTypeOnCustomizerApply,
} from '../useProjectWorkspace';

describe('useProjectWorkspace helpers', () => {
  it('resolveTemplateTypeOnCustomizerApply transita corretamente entre presets acadêmicos', () => {
    expect(
      resolveTemplateTypeOnCustomizerApply('tcc', { ...DEFAULT_TEMPLATE_CONFIG, preset: 'ieee' }),
    ).toBe('ieee');

    expect(
      resolveTemplateTypeOnCustomizerApply('ieee', {
        ...DEFAULT_TEMPLATE_CONFIG,
        preset: 'abnt_classic',
      }),
    ).toBe('tcc');

    expect(
      resolveTemplateTypeOnCustomizerApply('sbc', {
        ...DEFAULT_TEMPLATE_CONFIG,
        preset: 'article_2col',
      }),
    ).toBe('artigo');

    expect(
      resolveTemplateTypeOnCustomizerApply(
        'tcc',
        { ...DEFAULT_TEMPLATE_CONFIG, preset: 'abnt_2023' },
        'relatorio',
      ),
    ).toBe('relatorio');
  });

  it('generateDefaultProjectName cria nomes únicos ignorando maiúsculas/minúsculas', () => {
    const existing = [
      { name: 'trabalho de conclusão de curso' },
      { name: 'Trabalho de Conclusão de Curso (2)' },
    ];
    expect(generateDefaultProjectName('tcc', existing)).toBe('Trabalho de Conclusão de Curso (3)');
    expect(generateDefaultProjectName('ieee', existing)).toBe('Novo Artigo IEEE');
  });

  it('generateUniqueCopyName gera sufixos incrementais de cópia sem colisões', () => {
    const existing = [
      { name: 'Artigo IA' },
      { name: 'Artigo IA (Cópia)' },
      { name: 'artigo ia (cópia 2)' },
    ];
    expect(generateUniqueCopyName('Artigo IA', existing)).toBe('Artigo IA (Cópia 3)');
  });

  it('classifyBlocksChange diferencia edição pontual, mudança estrutural e igualdade', () => {
    const project = createProjectFromTemplate('tcc');
    const blocks = project.blocks;

    expect(classifyBlocksChange(blocks, blocks)).toEqual({ kind: 'none' });
    expect(classifyBlocksChange(blocks, [...blocks])).toEqual({ kind: 'none' });

    const appended = [
      ...blocks,
      { id: 'extra-1', type: 'paragraph' as const, content: '<p>Novo</p>' },
    ];
    expect(classifyBlocksChange(blocks, appended)).toEqual({ kind: 'structural' });

    const edited = blocks.map((b, index) =>
      index === 0 ? { ...b, content: 'Conteúdo editado' } : b,
    );
    expect(classifyBlocksChange(blocks, edited)).toEqual({
      kind: 'content',
      modifiedBlock: edited[0],
    });
  });

  it('computeNextDeletedBlockTimestamps registra exclusões e remove tombstones quando blocos são restaurados', () => {
    const b1 = { id: 'b1', type: 'paragraph' as const, content: 'A' };
    const b2 = { id: 'b2', type: 'paragraph' as const, content: 'B' };

    // Remove b2 -> cria tombstone
    const afterDelete = computeNextDeletedBlockTimestamps([b1, b2], [b1], undefined, 5000);
    expect(afterDelete).toEqual({ b2: 5000 });

    // Restaura b2 (ex: via Undo) -> remove tombstone antigo
    const afterUndo = computeNextDeletedBlockTimestamps([b1], [b1, b2], afterDelete, 6000);
    expect(afterUndo).toBeUndefined();
  });
});
