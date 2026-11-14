// =====================================================================
// RedijaApp: Aplicação da Lixeira no Google Drive (efeitos colaterais)
// =====================================================================

import { DocumentProject, DriveTrashSyncState } from '@/types/document';
import { setProjectDriveTrashSync } from './db';
import { addDriveTombstone, removeDriveTombstone } from './driveTrash';
import { DriveRequestError, deleteDriveProject, setDriveProjectTrashed } from './googleDriveService';

/**
 * Envia (ou tira) um projeto da lixeira do Drive e grava no IndexedDB o estado resultante.
 * Nunca lança: em caso de falha transitória o projeto fica marcado como pendente e a próxima
 * sincronização tenta de novo.
 */
export async function pushTrashStateToDrive(
  project: Pick<DocumentProject, 'id' | 'driveFileId' | 'isSharedWithMe'>,
  trashed: boolean,
  accessToken: string | null,
): Promise<DriveTrashSyncState | null> {
  const settled: DriveTrashSyncState | null = trashed ? 'synced' : null;
  const pending: DriveTrashSyncState = trashed ? 'pending-trash' : 'pending-restore';

  let result: DriveTrashSyncState | null;
  if (!project.driveFileId) {
    result = settled;
  } else if (!accessToken) {
    result = pending;
  } else {
    try {
      await setDriveProjectTrashed(
        { projectId: project.id, fileId: project.driveFileId },
        trashed,
        accessToken,
      );
      result = settled;
    } catch (err) {
      if (err instanceof DriveRequestError && err.status === 404) {
        // O arquivo já não existe no Drive: não há o que sincronizar.
        result = settled;
      } else if (
        trashed &&
        (project.isSharedWithMe || (err instanceof DriveRequestError && err.isPermissionDenied))
      ) {
        // Arquivo de outra pessoa: só esconde da lista deste usuário.
        result = 'local-only';
      } else {
        console.warn('Não foi possível atualizar a lixeira no Google Drive:', err);
        result = pending;
      }
    }
  }

  await setProjectDriveTrashSync(project.id, result);
  return result;
}

/**
 * Exclui definitivamente o arquivo do Drive. Antes de chamar a API grava uma marca (tombstone)
 * para que, se a chamada falhar ou a página for fechada no meio, a sincronização nunca reimporte
 * o arquivo e tente excluir de novo depois.
 */
export async function purgeProjectFromDrive(
  ownerEmail: string,
  project: Pick<DocumentProject, 'id' | 'driveFileId' | 'isSharedWithMe' | 'driveTrashSync'>,
  accessToken: string | null,
): Promise<void> {
  const fileId = project.driveFileId;
  if (!fileId) return;

  if (project.isSharedWithMe || project.driveTrashSync === 'local-only') {
    addDriveTombstone(ownerEmail, fileId, 'hide', project.id);
    return;
  }

  addDriveTombstone(ownerEmail, fileId, 'delete', project.id);
  if (!accessToken) return;

  try {
    await deleteDriveProject(fileId, accessToken, project.id);
    removeDriveTombstone(ownerEmail, fileId);
  } catch (err) {
    if (err instanceof DriveRequestError && err.isPermissionDenied) {
      addDriveTombstone(ownerEmail, fileId, 'hide', project.id);
      return;
    }
    console.warn('Não foi possível excluir o arquivo no Google Drive (nova tentativa depois):', err);
  }
}
