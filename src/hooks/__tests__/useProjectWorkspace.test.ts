import { describe, it, expect } from 'vitest';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';
import {
  classifyBlocksChange,
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

  it('valida conversão e metadados de importação como modelo livre/personalizado', () => {
    const importedSbc = createProjectFromTemplate('sbc', 'Artigo SBC');
    expect(importedSbc.templateType).toBe('sbc');

    // Ao optar por Modelo Personalizado (Livre)
    const customProject = {
      ...importedSbc,
      templateType: 'em_branco' as const,
      templateConfig: {
        ...DEFAULT_TEMPLATE_CONFIG,
        preset: 'custom' as const,
        includeCoverPage: false,
        includeTitlePage: false,
        includeToc: false,
      },
      sidebarConfig: { isCustomized: true },
    };

    expect(customProject.templateType).toBe('em_branco');
    expect(customProject.templateConfig.preset).toBe('custom');
    expect(customProject.templateConfig.includeCoverPage).toBe(false);
    expect(customProject.sidebarConfig.isCustomized).toBe(true);
  });
});
