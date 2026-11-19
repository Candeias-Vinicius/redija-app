import { describe, expect, it } from 'vitest';
import {
  acknowledgeLibraryVersionOnProjectReference,
  applyLibraryUpdateToProjectReference,
  computeReferenceDiffs,
  dedupeTagsCaseInsensitive,
  filterLibraryReferences,
  findDuplicateInList,
  getNewerLibraryVersion,
  isDuplicateReference,
  mergeReferenceLibraries,
  parseReferenceLibraryPayload,
  serializeReferenceLibraryPayload,
  toProjectReference,
  type SyncedLibraryFolder,
  type SyncedLibraryReference,
} from '../referenceLibraryMerge';

function makeLibRef(
  overrides: Partial<SyncedLibraryReference> & { id: string },
): SyncedLibraryReference {
  return {
    type: 'book',
    authors: 'SILVA, João',
    title: `Obra ${overrides.id}`,
    city: 'São Paulo',
    publisher: 'Atlas',
    year: '2024',
    folderId: null,
    tags: [],
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function makeFolder(overrides: Partial<SyncedLibraryFolder> & { id: string }): SyncedLibraryFolder {
  return {
    name: `Pasta ${overrides.id}`,
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('RDJ-07.1: Regras de deduplicação e busca rápida local', () => {
  it('detecta duplicatas por DOI normalizado, por ISBN ou por título normalizado + ano', () => {
    const refA = makeLibRef({
      id: '1',
      title: 'Introdução à Tipografia Digital: Conceitos!',
      year: '2023',
      doi: 'https://doi.org/10.1145/12345.6789',
    });
    const sameDoi = makeLibRef({
      id: '2',
      title: 'Outro Título Qualquer',
      year: '2020',
      doi: '10.1145/12345.6789',
    });
    expect(isDuplicateReference(refA, sameDoi)).toBe(true);

    const refIsbnA = makeLibRef({
      id: '3',
      title: 'Metodologia Científica',
      year: '2021',
      isbn: '978-85-352-3699-6',
    });
    const refIsbnB = makeLibRef({
      id: '4',
      title: 'Metodologia Cientifica (Ed. Rev.)',
      year: '2022',
      isbn: '9788535236996',
    });
    expect(isDuplicateReference(refIsbnA, refIsbnB)).toBe(true);

    // Sem DOI/ISBN: compara título sem acentos, caixa e pontuação + ano
    const titleAccented = makeLibRef({
      id: '5',
      title: 'Análise de Sistemas Distribuídos: Uma Abordagem Prática!',
      year: '2024',
    });
    const titlePlain = makeLibRef({
      id: '6',
      title: 'analise de sistemas distribuidos',
      subtitle: 'uma abordagem pratica',
      year: '2024',
    });
    const titleOtherYear = makeLibRef({
      id: '7',
      title: 'Análise de Sistemas Distribuídos: Uma Abordagem Prática',
      year: '2020',
    });

    expect(isDuplicateReference(titleAccented, titlePlain)).toBe(true);
    expect(isDuplicateReference(titleAccented, titleOtherYear)).toBe(false);
    expect(findDuplicateInList(titlePlain, [titleAccented])?.id).toBe('5');
  });

  it('responde em menos de 200 ms ao buscar em um acervo de 5.000 referências', () => {
    const bulk: SyncedLibraryReference[] = [];
    for (let i = 0; i < 5000; i++) {
      bulk.push(
        makeLibRef({
          id: `ref-${i}`,
          title:
            i === 4321
              ? 'Arquitetura Local-First com Compilação Typst WebAssembly'
              : `Estudo Experimental de Sistemas Acadêmicos Volume ${i}`,
          authors: i === 4321 ? 'CANDEIAS, Vinícius; REIS, Elias' : `AUTOR, Pesquisador ${i}`,
          year: String(1990 + (i % 36)),
          tags: i % 10 === 0 ? ['metodologia', 'abnt'] : ['geral'],
        }),
      );
    }

    const start = performance.now();
    const hits = filterLibraryReferences(bulk, {
      query: 'WebAssembly Candeias',
    });
    const elapsedMs = performance.now() - start;

    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe('ref-4321');
    expect(elapsedMs).toBeLessThan(200);
  });
});

describe('RDJ-07.4 e RDJ-07.5: Mesclagem não destrutiva, pastas e tags', () => {
  it('deduplica tags sem diferenciar maiúsculas e minúsculas', () => {
    expect(
      dedupeTagsCaseInsensitive(['Metodologia', 'qualitativa', 'METODOLOGIA', '  Qualitativa ']),
    ).toEqual(['Metodologia', 'qualitativa']);
  });

  it('preserva edições de referências diferentes em dois dispositivos e vence a mais recente na mesma referência', () => {
    const ref1Old = makeLibRef({
      id: 'r1',
      title: 'Título Antigo',
      updatedAt: '2026-03-01T10:00:00.000Z',
    });
    const ref1New = makeLibRef({
      id: 'r1',
      title: 'Título Corrigido no Laboratório',
      updatedAt: '2026-03-02T10:00:00.000Z',
    });
    const ref2DeviceA = makeLibRef({
      id: 'r2',
      title: 'Adicionada no Notebook',
      updatedAt: '2026-03-02T08:00:00.000Z',
    });
    const ref3DeviceB = makeLibRef({
      id: 'r3',
      title: 'Adicionada no Laboratório',
      updatedAt: '2026-03-02T09:00:00.000Z',
    });

    const result = mergeReferenceLibraries(
      { references: [ref1Old, ref2DeviceA], folders: [] },
      { references: [ref1New, ref3DeviceB], folders: [] },
    );

    expect(result.changedLocal).toBe(true);
    expect(result.changedRemote).toBe(true);
    expect(result.merged.references.map((r) => r.id).sort()).toEqual(['r1', 'r2', 'r3']);
    expect(result.merged.references.find((r) => r.id === 'r1')?.title).toBe(
      'Título Corrigido no Laboratório',
    );
  });

  it('propaga exclusão por tombstone e move referências de pasta excluída para Sem pasta', () => {
    const folderTcc = makeFolder({
      id: 'f-tcc',
      name: 'TCC',
      updatedAt: '2026-03-05T10:00:00.000Z',
      deletedAt: '2026-03-05T10:00:00.000Z',
    });
    const refInDeletedFolder = makeLibRef({
      id: 'r-in-folder',
      folderId: 'f-tcc',
      tags: ['metodologia', 'qualitativa'],
    });
    const refDeletedOnOtherDevice = makeLibRef({
      id: 'r-deleted',
      updatedAt: '2026-03-05T11:00:00.000Z',
      deletedAt: '2026-03-05T11:00:00.000Z',
    });

    const { merged } = mergeReferenceLibraries(
      {
        references: [
          refInDeletedFolder,
          { ...refDeletedOnOtherDevice, deletedAt: null, updatedAt: '2026-03-01T10:00:00.000Z' },
        ],
        folders: [{ ...folderTcc, deletedAt: null, updatedAt: '2026-03-01T10:00:00.000Z' }],
      },
      {
        references: [refDeletedOnOtherDevice],
        folders: [folderTcc],
      },
    );

    expect(merged.references.find((r) => r.id === 'r-deleted')?.deletedAt).toBe(
      '2026-03-05T11:00:00.000Z',
    );
    const activeRef = merged.references.find((r) => r.id === 'r-in-folder');
    expect(activeRef?.deletedAt).toBeNull();
    expect(activeRef?.folderId).toBeNull();
  });

  it('serializa e restaura o payload JSON do arquivo redija-biblioteca.json', () => {
    const state = {
      references: [makeLibRef({ id: 'r1', tags: ['abnt'] })],
      folders: [makeFolder({ id: 'f1', name: 'TCC' })],
    };
    const json = serializeReferenceLibraryPayload(state);
    expect(parseReferenceLibraryPayload(json)).toEqual(state);
    expect(parseReferenceLibraryPayload('corrompido')).toEqual({ references: [], folders: [] });
  });
});

describe('RDJ-07.6: Atualização controlada de referência alterada na biblioteca', () => {
  it('detecta versão mais nova na biblioteca, exibe diferenças campo a campo e permite atualizar ou manter versão do projeto', () => {
    const libOriginal = makeLibRef({
      id: 'lib-1',
      title: 'Engenharia de Software',
      edition: '9',
      year: '2011',
      updatedAt: '2026-03-01T10:00:00.000Z',
    });

    // Inserida no projeto como cópia independente
    const projectCopy = toProjectReference(libOriginal, 'proj-ref-1');
    expect(projectCopy.id).toBe('proj-ref-1');
    expect(projectCopy.libraryRefId).toBe('lib-1');
    expect(projectCopy.librarySyncedAt).toBe('2026-03-01T10:00:00.000Z');

    // Sem edição na biblioteca: indicador não aparece
    const map1 = new Map([[libOriginal.id, libOriginal]]);
    expect(getNewerLibraryVersion(projectCopy, map1)).toBeNull();

    // Edição na biblioteca (nova edição e ano corrigido)
    const libEdited: SyncedLibraryReference = {
      ...libOriginal,
      edition: '10',
      year: '2019',
      updatedAt: '2026-03-04T15:00:00.000Z',
    };
    const map2 = new Map([[libEdited.id, libEdited]]);

    const newer = getNewerLibraryVersion(projectCopy, map2);
    expect(newer).not.toBeNull();
    expect(computeReferenceDiffs(projectCopy, libEdited)).toEqual([
      { field: 'year', label: 'Ano', projectValue: '2011', libraryValue: '2019' },
      { field: 'edition', label: 'Edição', projectValue: '9', libraryValue: '10' },
    ]);

    // Cenário 3: Escolher "Manter esta versão" preserva os dados do projeto e oculta o indicador
    const kept = acknowledgeLibraryVersionOnProjectReference(projectCopy, libEdited);
    expect(kept.year).toBe('2011');
    expect(kept.edition).toBe('9');
    expect(getNewerLibraryVersion(kept, map2)).toBeNull();

    // Cenário 2: Confirmar "Atualizar" atualiza os campos preservando o id do projeto
    const updated = applyLibraryUpdateToProjectReference(projectCopy, libEdited);
    expect(updated.id).toBe('proj-ref-1');
    expect(updated.year).toBe('2019');
    expect(updated.edition).toBe('10');
    expect(getNewerLibraryVersion(updated, map2)).toBeNull();
  });
});
