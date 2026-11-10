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
        {
          id: 'b2',
          type: 'image',
          content: '',
          meta: {
            caption: 'Figura 2',
            imageWidthPct: 9999,
          },
        },
      ],
    };

    const normalized = normalizeProject(maliciousInput);
    expect(normalized.templateConfig?.fontFamily).toBe('serif'); // fallback padrão
    expect(normalized.templateConfig?.fontSizePt).toBe(12); // fallback seguro
    expect(normalized.templateConfig?.columns).toBe(1); // fallback seguro
    expect(normalized.templateConfig?.marginTopCm).toBe(3); // fallback seguro
    // @ts-expect-error verificando propriedade removida
    expect(normalized.templateConfig?.unknownInjectedProp).toBeUndefined();

    // Verifica que block.meta higienizou imageWidthPct
    expect(normalized.blocks[0].meta?.imageWidthPct).toBeUndefined();
    expect(normalized.blocks[1].meta?.imageWidthPct).toBe(100);
    // @ts-expect-error verificando propriedade removida
    expect(normalized.blocks[0].meta?.unknownMeta).toBeUndefined();
  });

  it('higieniza sidebarConfig preservando isCustomized e hiddenFieldIds válidos', () => {
    const withSidebarConfig = {
      name: 'Projeto Sidebar Config',
      metadata: { title: 'Teste' },
      sidebarConfig: {
        isCustomized: 'not-boolean-truthy',
        hiddenFieldIds: ['advisor', 123, null, 'nature', ''],
        extraEvilProp: 'strip-me',
      },
      blocks: [{ id: 'b1', type: 'paragraph', content: 'Texto' }],
    };

    const normalized = normalizeProject(withSidebarConfig);
    expect(normalized.sidebarConfig).toEqual({
      isCustomized: true,
      hiddenFieldIds: ['advisor', 'nature'],
    });
  });

  it('clampa fontSizePt e paragraphSpacingEm, higieniza runningHeader e preserva raw_typst e estilos CSL', () => {
    const input = {
      name: 'Projeto Paridade Typst',
      templateType: 'tcc',
      metadata: { title: 'Paridade' },
      templateConfig: {
        ...DEFAULT_TEMPLATE_CONFIG,
        fontSizePt: 40, // > 24 => 24
        paragraphSpacingEm: 9, // > 3 => 3
        runningHeader: 'Linha 1\nLinha 2\tTab',
        paperSize: 'letter',
        pageOrientation: 'landscape',
        documentLanguage: 'es',
        bodyAlignment: 'left',
        pageNumbering: 'bottom_right',
        headingNumbering: 'I.A',
        referenceOrdering: 'citation_order',
        referenceEntryFormat: 'ieee',
        bibliographyEngine: 'typst_csl',
        cslStyle: 'vancouver',
        hideFirstPageNumber: false,
        romanPreTextual: true,
        h1PageBreak: false,
      },
      blocks: [
        { id: 'raw1', type: 'raw_typst', content: '#rect[Teste]' },
      ],
    };

    const normalized = normalizeProject(input);
    expect(normalized.templateConfig?.fontSizePt).toBe(24);
    expect(normalized.templateConfig?.paragraphSpacingEm).toBe(3);
    expect(normalized.templateConfig?.runningHeader).toBe('Linha 1 Linha 2 Tab');
    expect(normalized.templateConfig?.paperSize).toBe('letter');
    expect(normalized.templateConfig?.pageOrientation).toBe('landscape');
    expect(normalized.templateConfig?.documentLanguage).toBe('es');
    expect(normalized.templateConfig?.bodyAlignment).toBe('left');
    expect(normalized.templateConfig?.pageNumbering).toBe('bottom_right');
    expect(normalized.templateConfig?.headingNumbering).toBe('I.A');
    expect(normalized.templateConfig?.referenceOrdering).toBe('citation_order');
    expect(normalized.templateConfig?.referenceEntryFormat).toBe('ieee');
    expect(normalized.templateConfig?.bibliographyEngine).toBe('typst_csl');
    expect(normalized.templateConfig?.cslStyle).toBe('vancouver');
    expect(normalized.templateConfig?.hideFirstPageNumber).toBe(false);
    expect(normalized.templateConfig?.romanPreTextual).toBe(true);
    expect(normalized.templateConfig?.h1PageBreak).toBe(false);
    expect(normalized.blocks[0].type).toBe('raw_typst');
    expect(normalized.blocks[0].content).toBe('#rect[Teste]');

    // Limite inferior de fontSizePt e fallback de cslStyle/paperSize inválidos
    const low = normalizeProject({
      name: 'Low',
      metadata: { title: 'Low' },
      templateConfig: {
        ...DEFAULT_TEMPLATE_CONFIG,
        fontSizePt: 2,
        paperSize: 'a99',
        cslStyle: 'harvard-cite-them-right',
      },
      blocks: [],
    });
    expect(low.templateConfig?.fontSizePt).toBe(8);
    expect(low.templateConfig?.paperSize).toBeUndefined();
    expect(low.templateConfig?.cslStyle).toBe('harvard-cite-them-right');
  });

  it('migra o autor do documento de exemplo legado de Vinícius Candeias para Nome do Autor', () => {
    const demoTitle =
      'Desenvolvimento de uma Plataforma Automatizada para Redação Científica em Conformidade com as Normas da ABNT';

    const migrated = normalizeProject({
      name: 'Meu Trabalho Acadêmico ABNT',
      metadata: {
        title: demoTitle,
        author: 'Vinícius Candeias',
      },
      blocks: [],
    });
    expect(migrated.metadata.author).toBe('Nome do Autor');

    const preserved = normalizeProject({
      name: 'TCC Pessoal',
      metadata: {
        title: 'Outro Título Qualquer',
        author: 'Vinícius Candeias',
      },
      blocks: [],
    });
    expect(preserved.metadata.author).toBe('Vinícius Candeias');
  });

  it('higieniza campos de compartilhamento, segredo P2P e tombstones de sincronização', () => {
    const validSecret = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde';
    const cleaned = normalizeProject({
      name: 'Projeto Sync',
      metadata: { title: 'Sync' },
      blocks: [],
      shareRole: 'reader',
      collabSecret: validSecret,
      blocksOrderUpdatedAt: 1731100000000,
      metadataUpdatedAt: 1731100001000,
      referencesUpdatedAt: -5, // negativo inválido -> ignorado
      deletedBlockTimestamps: {
        blk_1: 1731100002000,
        blk_bad: 'invalid',
        blk_zero: 0,
      },
    });

    expect(cleaned.shareRole).toBe('reader');
    expect(cleaned.collabSecret).toBe(validSecret);
    expect(cleaned.blocksOrderUpdatedAt).toBe(1731100000000);
    expect(cleaned.metadataUpdatedAt).toBe(1731100001000);
    expect(cleaned.referencesUpdatedAt).toBeUndefined();
    expect(cleaned.deletedBlockTimestamps).toEqual({ blk_1: 1731100002000 });

    const invalidSecretProj = normalizeProject({
      name: 'Segredo Fraco',
      metadata: { title: 'Weak' },
      blocks: [],
      shareRole: 'superadmin',
      collabSecret: 'fraco',
    });

    expect(invalidSecretProj.shareRole).toBeUndefined();
    expect(invalidSecretProj.collabSecret).toBeUndefined();
  });
});
