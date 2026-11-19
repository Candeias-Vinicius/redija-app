// =====================================================================
// RedijaApp: Sincronização da Biblioteca de Referências com o Google Drive (RDJ-07.4)
// =====================================================================

import { isMockDriveToken } from './customTemplatesDrive';
import {
  applySyncedReferenceLibrary,
  getLibraryStateSnapshot,
  isSyncableLibraryOwner,
  refreshReferenceLibraryFromDb,
} from './referenceLibrary';
import {
  deleteReferenceLibraryDriveFile,
  listReferenceLibraryDriveFiles,
  loadReferenceLibraryFromDrive,
  saveReferenceLibraryToDrive,
} from './referenceLibraryDrive';
import { mergeReferenceLibraries, type LibraryStateSnapshot } from './referenceLibraryMerge';

export const REFERENCE_LIBRARY_SYNC_DEBOUNCE_MS = 2000;

export interface ReferenceLibrarySyncResult {
  status: 'synced' | 'skipped';
  changedLocal: boolean;
  uploaded: boolean;
}

const SKIPPED: ReferenceLibrarySyncResult = {
  status: 'skipped',
  changedLocal: false,
  uploaded: false,
};

const inFlight = new Map<string, Promise<ReferenceLibrarySyncResult>>();
const rerunRequested = new Set<string>();

async function runSync(owner: string, accessToken: string): Promise<ReferenceLibrarySyncResult> {
  await refreshReferenceLibraryFromDb(owner);

  const files = await listReferenceLibraryDriveFiles(accessToken);
  let remote: LibraryStateSnapshot = { references: [], folders: [] };
  for (const file of files) {
    const content = await loadReferenceLibraryFromDrive(file.id, accessToken);
    remote = files.length === 1 ? content : mergeReferenceLibraries(remote, content).merged;
  }

  const local = getLibraryStateSnapshot(owner);
  const { merged, changedLocal, changedRemote } = mergeReferenceLibraries(local, remote);

  let appliedLocal = false;
  if (changedLocal) {
    appliedLocal = await applySyncedReferenceLibrary(owner, merged);
  }

  // Sem nada dos dois lados, não cria arquivo vazio no Drive do usuário.
  if (files.length === 0 && merged.references.length === 0 && merged.folders.length === 0) {
    return { status: 'synced', changedLocal: appliedLocal, uploaded: false };
  }

  let uploaded = false;
  const primary = files[0];
  if (!primary || changedRemote || files.length > 1) {
    await saveReferenceLibraryToDrive(merged, accessToken, primary?.id);
    uploaded = true;
    for (const extra of files.slice(1)) {
      await deleteReferenceLibraryDriveFile(extra.id, accessToken).catch((err) => {
        console.warn('Não foi possível remover cópia duplicada da biblioteca no Drive:', err);
      });
    }
  }

  return { status: 'synced', changedLocal: appliedLocal, uploaded };
}

/**
 * Sincroniza a biblioteca de referências de uma conta Google com o Drive.
 * Chamadas concorrentes para a mesma conta são enfileiradas sem sobreposição.
 * O perfil local e o "Usuário Demonstração" nunca enviam dados para a rede.
 */
export function syncReferenceLibraryWithDrive(
  owner: string,
  accessToken: string,
): Promise<ReferenceLibrarySyncResult> {
  if (!isSyncableLibraryOwner(owner) || !accessToken || isMockDriveToken(accessToken)) {
    return Promise.resolve(SKIPPED);
  }

  const running = inFlight.get(owner);
  if (running) {
    rerunRequested.add(owner);
    return running;
  }

  const task = (async () => {
    try {
      let result: ReferenceLibrarySyncResult;
      let changedLocal = false;
      let uploaded = false;
      do {
        rerunRequested.delete(owner);
        result = await runSync(owner, accessToken);
        changedLocal ||= result.changedLocal;
        uploaded ||= result.uploaded;
      } while (rerunRequested.has(owner));
      return { ...result, changedLocal, uploaded };
    } finally {
      rerunRequested.delete(owner);
      inFlight.delete(owner);
    }
  })();

  inFlight.set(owner, task);
  return task;
}
