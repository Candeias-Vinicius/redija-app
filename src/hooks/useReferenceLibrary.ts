import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  addLibraryReference,
  createLibraryFolder,
  deleteLibraryFolder,
  getLibraryFolders,
  getLibraryReferences,
  moveLibraryReferencesToFolder,
  removeLibraryReference,
  renameLibraryFolder,
  restoreLibraryReference,
  subscribeReferenceLibrary,
  updateLibraryReference,
  type AddLibraryReferenceInput,
  type LibraryReference,
} from '@/core/storage/referenceLibrary';

/**
 * Hook reativo para o acervo pessoal de referências ("Minha Biblioteca" — RDJ-07)
 * isolado pelo perfil ativo (`'local'` ou e-mail da conta Google).
 */
export function useReferenceLibrary(owner: string) {
  const getRefsSnapshot = useCallback(() => getLibraryReferences(owner), [owner]);
  const getFoldersSnapshot = useCallback(() => getLibraryFolders(owner), [owner]);

  const references = useSyncExternalStore(
    subscribeReferenceLibrary,
    getRefsSnapshot,
    getRefsSnapshot,
  );
  const folders = useSyncExternalStore(
    subscribeReferenceLibrary,
    getFoldersSnapshot,
    getFoldersSnapshot,
  );

  const referencesById = useMemo(() => new Map(references.map((r) => [r.id, r])), [references]);

  const allTags = useMemo(() => {
    const seen = new Map<string, string>();
    for (const ref of references) {
      for (const tag of ref.tags) {
        const key = tag.toLocaleLowerCase('pt-BR');
        if (!seen.has(key)) seen.set(key, tag);
      }
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [references]);

  const addReference = useCallback(
    (input: AddLibraryReferenceInput) => addLibraryReference(owner, input),
    [owner],
  );

  const updateReference = useCallback(
    (
      id: string,
      patch: Partial<Omit<LibraryReference, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>,
    ) => updateLibraryReference(owner, id, patch),
    [owner],
  );

  const removeReference = useCallback((id: string) => removeLibraryReference(owner, id), [owner]);

  const restoreReference = useCallback(
    (ref: LibraryReference) => restoreLibraryReference(owner, ref),
    [owner],
  );

  const moveToFolder = useCallback(
    (referenceIds: string[], folderId: string | null) =>
      moveLibraryReferencesToFolder(owner, referenceIds, folderId),
    [owner],
  );

  const createFolder = useCallback((name: string) => createLibraryFolder(owner, name), [owner]);

  const renameFolder = useCallback(
    (folderId: string, newName: string) => renameLibraryFolder(owner, folderId, newName),
    [owner],
  );

  const removeFolder = useCallback(
    (folderId: string) => deleteLibraryFolder(owner, folderId),
    [owner],
  );

  return {
    references,
    referencesById,
    folders,
    allTags,
    addReference,
    updateReference,
    removeReference,
    restoreReference,
    moveToFolder,
    createFolder,
    renameFolder,
    removeFolder,
  };
}
