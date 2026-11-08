import { describe, it, expect } from 'vitest';
import { normalizeProject } from '../schemaNormalizer';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document';

describe('schemaNormalizer: Regressão e Integridade de Dados', () => {
  it('preenche campos ausentes com padrões seguros da ABNT em projetos v1 legados', () => {
    // Objeto mínimo incompleto simulando projeto criado em versão anterior
    const legacyProject = {
      id: 'proj-123',
      name: 'Meu TCC Antigo',
      metadata: {
        title: 'Título Antigo',
        author: 'Estudante A',
      },
      blocks: [
        {
          id: 'b-1',
          type: 'paragraph',
          content: 'Primeiro parágrafo do estudante.',
        },
      ],
    };

    const normalized = normalizeProject(legacyProject);

    expect(normalized.id).toBe('proj-123');
    expect(normalized.name).toBe('Meu TCC Antigo');
    expect(normalized.templateType).toBe('tcc');
    expect(normalized.metadata.title).toBe('Título Antigo');
    expect(normalized.metadata.author).toBe('Estudante A');
    expect(normalized.metadata.institution).toBe('Nome da Instituição de Ensino');
    expect(normalized.metadata.keywords).toEqual([]);
    expect(normalized.templateConfig).toEqual(DEFAULT_TEMPLATE_CONFIG);
    expect(normalized.blocks).toHaveLength(1);
    expect(normalized.blocks[0].content).toBe('Primeiro parágrafo do estudante.');
    expect(normalized.references).toEqual([]);
    expect(normalized.deletedAt).toBeNull();
  });

  it('preserva dados completos e customizações de template sem perda', () => {
    const fullProject = {
      id: 'proj-full',
      name: 'Artigo Completo',
      templateType: 'artigo',
      templateConfig: {
        ...DEFAULT_TEMPLATE_CONFIG,
        fontFamily: 'sans' as const,
        fontSizePt: 11 as const,
        columns: 2 as const,
      },
      metadata: {
        title: 'Artigo Completo',
        author: 'Dra. Pesquisadora',
        institution: 'Universidade Federal',
        course: 'Engenharia de Software',
        location: 'São Paulo - SP',
        year: '2026',
        abstract: 'Resumo do artigo com mais de cem palavras...',
        keywords: ['Engenharia', 'Typst', 'ABNT'],
      },
      blocks: [
        {
          id: 'b-art-1',
          type: 'h1',
          content: 'Introdução',
        },
      ],
      references: [
        {
          id: 'ref-1',
          authors: 'SILVA, João',
          title: 'Manual de Typst',
          city: 'Curitiba',
          publisher: 'Editora UFPR',
          year: '2025',
        },
      ],
      ownerEmail: 'pesquisador@gmail.com',
      driveFileId: 'drive-abc-123',
    };

    const normalized = normalizeProject(fullProject);

    expect(normalized.templateConfig?.fontFamily).toBe('sans');
    expect(normalized.templateConfig?.fontSizePt).toBe(11);
    expect(normalized.templateConfig?.columns).toBe(2);
    expect(normalized.metadata.keywords).toEqual(['Engenharia', 'Typst', 'ABNT']);
    expect(normalized.references).toHaveLength(1);
    expect(normalized.references[0].authors).toBe('SILVA, João');
    expect(normalized.ownerEmail).toBe('pesquisador@gmail.com');
    expect(normalized.driveFileId).toBe('drive-abc-123');
  });

  it('filtra blocos corrompidos ou malformados preservando blocos válidos', () => {
    const corruptedInput = {
      name: 'Projeto com blocos sujos',
      metadata: {
        title: 'Trabalho',
      },
      blocks: [
        null,
        'string invalida',
        { id: 'b-valido', type: 'paragraph', content: 'Texto seguro' },
        undefined,
      ],
    };

    const normalized = normalizeProject(corruptedInput);
    expect(normalized.blocks).toHaveLength(1);
    expect(normalized.blocks[0].id).toBe('b-valido');
    expect(normalized.blocks[0].content).toBe('Texto seguro');
  });

  it('rejeita objetos inválidos (null, undefined, string)', () => {
    expect(() => normalizeProject(null)).toThrow('Formato de projeto inválido');
    expect(() => normalizeProject(undefined)).toThrow('Formato de projeto inválido');
    expect(() => normalizeProject('string')).toThrow('Formato de projeto inválido');
  });

  it('coerge e higieniza propriedades em templateConfig e block.meta evitando injeção de tipos e prototype pollution', () => {
    const maliciousInput = {
      name: 'Projeto Injeção',
      metadata: { title: 'Teste' },
      templateConfig: {
        templateId: 'tcc',
        fontFamily: 'invalid_font',
        fontSizePt: 'not-a-number',
        columns: '3-drop-tables',
        marginTopCm: 'hack; #panic()',
        // Propriedade estranha que não deve vazar
        __proto__: { polluted: true },
        unknownInjectedProp: 'malicious',
      },
      blocks: [
        {
          id: 'b1',
          type: 'image',
          content: '',
          meta: {
            caption: 'Figura',
            imageWidthPct: 'invalid-string',
            unknownMeta: 'strip-me',
          },
        },
      ],
    };

    const normalized = normalizeProject(maliciousInput);
    expect(normalized.templateConfig?.fontFamily).toBe('times'); // fallback padrão
    expect(normalized.templateConfig?.fontSizePt).toBe(12); // fallback seguro
    expect(normalized.templateConfig?.columns).toBe(1); // fallback seguro
    expect(normalized.templateConfig?.marginTopCm).toBe(3); // fallback seguro
    // @ts-expect-error verificando propriedade removida
    expect(normalized.templateConfig?.unknownInjectedProp).toBeUndefined();

    // Verifica que block.meta higienizou imageWidthPct
    expect(normalized.blocks[0].meta?.imageWidthPct).toBe(80);
    // @ts-expect-error verificando propriedade removida
    expect(normalized.blocks[0].meta?.unknownMeta).toBeUndefined();
  });
});
