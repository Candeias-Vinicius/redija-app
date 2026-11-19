import 'fake-indexeddb/auto';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, type StoredLibraryFolder, type StoredLibraryReference } from '../db';
import {
  addLibraryReference,
  createLibraryFolder,
  deleteLibraryFolder,
  flushReferenceLibrary,
  getLibraryFolders,
  getLibraryReferences,
  loadReferenceLibrary,
  moveLibraryReferencesToFolder,
  removeLibraryReference,
  resetReferenceLibraryForTests,
  updateLibraryReference,
} from '../referenceLibrary';
import { parseReferenceLibraryPayload } from '../referenceLibraryMerge';
import { syncReferenceLibraryWithDrive } from '../referenceLibrarySync';
import { listDriveProjects } from '../googleDriveService';
import { createFakeDrive, installMemoryLocalStorage, type FakeDrive } from './fakeDrive';

const ACCOUNT = 'pesquisador@gmail.com';
const TOKEN = 'token-real-biblioteca';
let drive: FakeDrive;

beforeAll(() => {
  installMemoryLocalStorage();
});

beforeEach(async () => {
  await flushReferenceLibrary();
  resetReferenceLibraryForTests();
  await db.library.clear();
  await db.libraryFolders.clear();
  drive = createFakeDrive();
  vi.spyOn(globalThis, 'fetch').mockImplementation(drive.fetch);
  await loadReferenceLibrary();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function snapshotDevice(): Promise<{
  refs: StoredLibraryReference[];
  folders: StoredLibraryFolder[];
}> {
  await flushReferenceLibrary();
  return {
    refs: await db.library.toArray(),
    folders: await db.libraryFolders.toArray(),
  };
}

async function switchToDevice(
  state: { refs: StoredLibraryReference[]; folders: StoredLibraryFolder[] } = {
    refs: [],
    folders: [],
  },
): Promise<void> {
  await flushReferenceLibrary();
  resetReferenceLibraryForTests();
  await db.library.clear();
  await db.libraryFolders.clear();
  if (state.folders.length > 0) await db.libraryFolders.bulkPut(state.folders);
  if (state.refs.length > 0) await db.library.bulkPut(state.refs);
  await loadReferenceLibrary();
}

function libraryDriveFiles() {
  return [...drive.files.values()].filter(
    (f) => f.appProperties.isRedijaReferenceLibrary === 'true' && !f.trashed,
  );
}

describe('RDJ-07.4 e RDJ-07.5: Sincronização da biblioteca com o Google Drive', () => {
  it('sincroniza referências, pastas e tags entre dois dispositivos e propaga exclusões (tombstone)', async () => {
    // Dispositivo A cria pasta "TCC", adiciona referência com tags e sincroniza
    const { folder } = createLibraryFolder(ACCOUNT, 'TCC');
    const { reference: added } = addLibraryReference(ACCOUNT, {
      type: 'article',
      authors: 'SILVA, Roberto; SOUZA, Maria',
      title: 'Tipografia Digital Contemporânea',
      year: '2024',
      journal: 'Revista Brasileira de Design',
      doi: '10.1000/rbd.2024.01',
      folderId: folder.id,
      tags: ['metodologia', 'qualitativa'],
    });

    const syncA = await syncReferenceLibraryWithDrive(ACCOUNT, TOKEN);
    expect(syncA).toMatchObject({ status: 'synced', uploaded: true });

    const files = libraryDriveFiles();
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('redija-biblioteca.json');
    const remoteState = parseReferenceLibraryPayload(files[0].content);
    expect(remoteState.references).toHaveLength(1);
    expect(remoteState.folders).toHaveLength(1);

    const deviceASnapshot = await snapshotDevice();

    // Dispositivo B (novo navegador) baixa a biblioteca ao sincronizar (Cenário 1)
    await switchToDevice();
    expect(getLibraryReferences(ACCOUNT)).toEqual([]);
    await syncReferenceLibraryWithDrive(ACCOUNT, TOKEN);

    expect(getLibraryFolders(ACCOUNT).map((f) => f.name)).toEqual(['TCC']);
    expect(getLibraryReferences(ACCOUNT)).toHaveLength(1);
    expect(getLibraryReferences(ACCOUNT)[0]).toMatchObject({
      id: added.id,
      title: 'Tipografia Digital Contemporânea',
      folderId: folder.id,
      tags: ['metodologia', 'qualitativa'],
    });

    // Dispositivo B edita a referência e adiciona uma segunda obra (Cenários 2 e 3)
    updateLibraryReference(ACCOUNT, added.id, {
      title: 'Tipografia Digital Contemporânea (2ª ed.)',
    });
    const { reference: second } = addLibraryReference(ACCOUNT, {
      type: 'book',
      authors: 'LAKATOS, Eva Maria; MARCONI, Marina',
      title: 'Fundamentos de Metodologia Científica',
      year: '2021',
    });
    await syncReferenceLibraryWithDrive(ACCOUNT, TOKEN);

    // Dispositivo A sincroniza e recebe a edição mais recente e a nova obra
    await switchToDevice(deviceASnapshot);
    await syncReferenceLibraryWithDrive(ACCOUNT, TOKEN);
    expect(getLibraryReferences(ACCOUNT)).toHaveLength(2);
    expect(getLibraryReferences(ACCOUNT).find((r) => r.id === added.id)?.title).toBe(
      'Tipografia Digital Contemporânea (2ª ed.)',
    );

    // Dispositivo A exclui a segunda referência (Cenário 4: exclusão não reaparece)
    removeLibraryReference(ACCOUNT, second.id);
    await syncReferenceLibraryWithDrive(ACCOUNT, TOKEN);
    expect(getLibraryReferences(ACCOUNT).map((r) => r.id)).toEqual([added.id]);
  });

  it('excluir pasta move as referências para Sem pasta sem excluí-las (RDJ-07.5 Cenário 4)', async () => {
    const { folder } = createLibraryFolder(ACCOUNT, 'Disciplina IA');
    const { reference } = addLibraryReference(ACCOUNT, {
      authors: 'RUSSELL, Stuart; NORVIG, Peter',
      title: 'Inteligência Artificial',
      year: '2022',
    });
    moveLibraryReferencesToFolder(ACCOUNT, [reference.id], folder.id);
    expect(getLibraryReferences(ACCOUNT)[0].folderId).toBe(folder.id);

    deleteLibraryFolder(ACCOUNT, folder.id);
    expect(getLibraryFolders(ACCOUNT)).toEqual([]);
    expect(getLibraryReferences(ACCOUNT)).toHaveLength(1);
    expect(getLibraryReferences(ACCOUNT)[0].folderId).toBeNull();
  });

  it('listDriveProjects ignora o arquivo redija-biblioteca.json e perfil local nunca envia para a rede', async () => {
    addLibraryReference('local', {
      authors: 'AUTOR, Local',
      title: 'Obra Somente Local',
      year: '2025',
    });
    const localSync = await syncReferenceLibraryWithDrive('local', TOKEN);
    expect(localSync.status).toBe('skipped');
    expect(drive.requests).toEqual([]);

    drive.addFile({
      id: 'bib-file',
      name: 'redija-biblioteca.json',
      appProperties: { isRedijaReferenceLibrary: 'true' },
    });
    drive.addFile({
      id: 'proj-file',
      name: 'Meu TCC.redija',
      appProperties: { redijaProjectId: 'p-1' },
    });

    vi.mocked(globalThis.fetch).mockImplementationOnce(
      async () =>
        new Response(
          JSON.stringify({
            files: [...drive.files.values()].map((f) => ({
              id: f.id,
              name: f.name,
              modifiedTime: f.modifiedTime,
              appProperties: f.appProperties,
            })),
          }),
        ),
    );
    const listed = await listDriveProjects(TOKEN);
    expect(listed.map((p) => p.id)).toEqual(['proj-file']);
  });
});
