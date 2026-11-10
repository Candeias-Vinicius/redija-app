import { describe, it, expect } from 'vitest';
import {
  mergeBlocks,
  mergeDeletedBlockTimestamps,
  mergeReferences,
  autoMergeProjects,
} from '../projectMerger';
import { Block, DocumentProject, AcademicReference } from '@/types/document';

describe('projectMerger — Mesclagem Automática por Blocos (Nível 2)', () => {
  it('combina novos blocos adicionados pelo colega sem perder alterações locais', () => {
    const localBlocks: Block[] = [
      { id: 'b1', type: 'h1', content: '1 Introdução' },
      { id: 'b2', type: 'paragraph', content: '<p>Texto da introdução escrito pelo aluno.</p>' },
    ];

    const remoteBlocks: Block[] = [
      { id: 'b1', type: 'h1', content: '1 Introdução' },
      { id: 'b2', type: 'paragraph', content: '<p>Texto da introdução escrito pelo aluno.</p>' },
      { id: 'b3', type: 'h1', content: '2 Metodologia' },
      { id: 'b4', type: 'paragraph', content: '<p>Metodologia adicionada pelo orientador no Drive.</p>' },
    ];

    const merged = mergeBlocks(localBlocks, remoteBlocks);

    expect(merged.length).toBe(4);
    expect(merged[0].id).toBe('b1');
    expect(merged[1].id).toBe('b2');
    expect(merged[2].id).toBe('b3');
    expect(merged[3].id).toBe('b4');
    expect(merged[3].content).toContain('Metodologia adicionada pelo orientador');
  });

  it('preserva blocos criados localmente enquanto incorpora adições do remoto', () => {
    const localBlocks: Block[] = [
      { id: 'b1', type: 'h1', content: '1 Introdução' },
      { id: 'b_local_novo', type: 'paragraph', content: '<p>Parágrafo novo do autor local.</p>' },
    ];

    const remoteBlocks: Block[] = [
      { id: 'b1', type: 'h1', content: '1 Introdução' },
      { id: 'b_remote_novo', type: 'quote_long', content: 'Citação adicionada pelo colega.' },
    ];

    const merged = mergeBlocks(localBlocks, remoteBlocks);

    expect(merged.length).toBe(3);
    const ids = merged.map((b) => b.id);
    expect(ids).toContain('b1');
    expect(ids).toContain('b_local_novo');
    expect(ids).toContain('b_remote_novo');
  });

  it('mescla referências acadêmicas sem duplicatas', () => {
    const localRefs: AcademicReference[] = [
      {
        id: 'ref1',
        authors: 'SILVA, Roberto',
        title: 'Livro de Metodologia',
        year: '2023',
        city: 'São Paulo',
        publisher: 'Atlas',
      },
    ];

    const remoteRefs: AcademicReference[] = [
      // Mesma referência (duplicata lógica)
      {
        id: 'ref1_dup',
        authors: 'SILVA, Roberto',
        title: 'Livro de Metodologia',
        year: '2023',
        city: 'São Paulo',
        publisher: 'Atlas',
      },
      // Referência nova inserida pelo colega
      {
        id: 'ref2',
        authors: 'SANTOS, Maria',
        title: 'Inteligência Artificial na Educação',
        year: '2024',
        city: 'Curitiba',
        publisher: 'Editora UFPR',
      },
    ];

    const merged = mergeReferences(localRefs, remoteRefs);

    expect(merged.length).toBe(2);
    expect(merged.some((r) => r.authors.includes('SANTOS'))).toBe(true);
    expect(merged.filter((r) => r.authors.includes('SILVA')).length).toBe(1);
  });

  it('executa autoMergeProjects completo de forma não destrutiva', () => {
    const localProj: DocumentProject = {
      id: 'proj1',
      name: 'TCC Engenharia de Software',
      updatedAt: '2026-11-07T12:00:00Z',
      metadata: {
        title: 'Título Local',
        author: 'Vinicius Candeias',
        advisor: '',
        institution: 'Universidade Federal',
        course: 'Computação',
        location: 'São Paulo',
        year: '2026',
        abstract: 'Resumo local',
        keywords: ['Computação'],
      },
      blocks: [{ id: 'b1', type: 'h1', content: '1 Introdução' }],
      references: [],
      driveFileId: 'drive_123',
    };

    const remoteProj: DocumentProject = {
      id: 'proj1',
      name: 'TCC Engenharia de Software',
      updatedAt: '2026-11-07T12:05:00Z',
      metadata: {
        title: 'Título Local',
        author: 'Vinicius Candeias',
        advisor: 'Prof. Dr. Orientador', // Preenchido remotamente
        institution: 'Universidade Federal',
        course: 'Computação',
        location: 'São Paulo',
        year: '2026',
        abstract: 'Resumo local',
        keywords: ['Computação', 'Typst'],
      },
      blocks: [
        { id: 'b1', type: 'h1', content: '1 Introdução' },
        { id: 'b2', type: 'paragraph', content: '<p>Texto adicionado no Drive.</p>' },
      ],
      references: [],
      driveFileId: 'drive_123',
    };

    const result = autoMergeProjects(localProj, remoteProj);

    expect(result.hasMergedRemoteChanges).toBe(true);
    expect(result.mergedBlockCount).toBe(2);
    // Preservou campos locais e preencheu campos que o colega adicionou
    expect(result.mergedProject.metadata.advisor).toBe('Prof. Dr. Orientador');
    expect(result.mergedProject.blocks.length).toBe(2);
  });

  it('adota a versão mais recente com base no updatedAt do bloco durante concorrência', () => {
    const localBlocks: Block[] = [
      {
        id: 'b1',
        type: 'paragraph',
        content: '<p>Edição local antiga</p>',
        updatedAt: 1000,
      },
    ];

    const remoteBlocks: Block[] = [
      {
        id: 'b1',
        type: 'paragraph',
        content: '<p>Edição remota mais recente feita pelo orientador</p>',
        updatedAt: 2000,
      },
    ];

    const merged = mergeBlocks(localBlocks, remoteBlocks);
    expect(merged.length).toBe(1);
    expect(merged[0].content).toBe('<p>Edição remota mais recente feita pelo orientador</p>');
  });

  it('respeita tombstones ao mesclar blocos excluídos sem perder reedições mais recentes', () => {
    const mergedMap = mergeDeletedBlockTimestamps(
      { b_resurrected: 4000, shared: 1000 },
      { b_deleted: 5000, shared: 2500 },
    );
    expect(mergedMap).toEqual({
      b_deleted: 5000,
      b_resurrected: 4000,
      shared: 2500,
    });

    const localBlocks: Block[] = [
      { id: 'b1', type: 'h1', content: '1 Introdução', updatedAt: 1000 },
      { id: 'b_deleted', type: 'paragraph', content: '<p>Parágrafo velho</p>', updatedAt: 3000 },
    ];

    const remoteBlocks: Block[] = [
      { id: 'b1', type: 'h1', content: '1 Introdução', updatedAt: 1000 },
      // Este bloco foi recriado/editado APÓS o tombstone (6000 > 4000) -> deve permanecer
      { id: 'b_resurrected', type: 'paragraph', content: '<p>Novo bloco</p>', updatedAt: 6000 },
    ];

    const merged = mergeBlocks(localBlocks, remoteBlocks, {
      localDeletedAt: { b_resurrected: 4000 },
      remoteDeletedAt: { b_deleted: 5000 },
    });
    expect(merged.map((b) => b.id)).toEqual(['b1', 'b_resurrected']);
  });

  it('adota ordenação estrutural remota mais recente e propaga exclusões de referências via timestamps', () => {
    const localProj: DocumentProject = {
      id: 'proj_sync',
      name: 'Artigo Colaborativo',
      updatedAt: '2026-11-08T10:00:00Z',
      blocksOrderUpdatedAt: 1000,
      metadataUpdatedAt: 1000,
      referencesUpdatedAt: 1000,
      collabSecret: 'A'.repeat(43),
      metadata: {
        title: 'Título Antigo',
        author: 'Autor 1',
        advisor: '',
        institution: 'UF',
        course: 'CC',
        location: 'SP',
        year: '2026',
        abstract: '',
        keywords: [],
      },
      blocks: [
        { id: 'b1', type: 'paragraph', content: 'Primeiro', updatedAt: 1000 },
        { id: 'b2', type: 'paragraph', content: 'Segundo', updatedAt: 1000 },
      ],
      references: [
        { id: 'ref1', authors: 'SILVA', title: 'Ref Removida', city: 'SP', publisher: 'Ed.', year: '2020' },
        { id: 'ref2', authors: 'SOUZA', title: 'Ref Mantida', city: 'RJ', publisher: 'Ed.', year: '2025' },
      ],
    };

    const remoteProj: DocumentProject = {
      ...localProj,
      updatedAt: '2026-11-08T10:05:00Z',
      blocksOrderUpdatedAt: 3000,
      metadataUpdatedAt: 3000,
      referencesUpdatedAt: 3000,
      metadata: {
        ...localProj.metadata,
        title: 'Título Atualizado pelo Coautor',
      },
      blocks: [
        { id: 'b2', type: 'paragraph', content: 'Segundo', updatedAt: 1000 },
        { id: 'b1', type: 'paragraph', content: 'Primeiro', updatedAt: 1000 },
      ],
      references: [
        { id: 'ref2', authors: 'SOUZA', title: 'Ref Mantida', city: 'RJ', publisher: 'Ed.', year: '2025' },
      ],
    };

    const res = autoMergeProjects(localProj, remoteProj);
    expect(res.hasMergedRemoteChanges).toBe(true);
    expect(res.mergedProject.blocks.map((b) => b.id)).toEqual(['b2', 'b1']);
    expect(res.mergedProject.metadata.title).toBe('Título Atualizado pelo Coautor');
    expect(res.mergedProject.references.map((r) => r.id)).toEqual(['ref2']);
    expect(res.mergedProject.blocksOrderUpdatedAt).toBe(3000);
  });
});
