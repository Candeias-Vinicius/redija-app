// =====================================================================
// RedijaApp: Arquivo da biblioteca de referências no Google Drive (RDJ-07.4)
// =====================================================================
//
// A biblioteca pessoal de referências de uma conta fica em `RedijaApp/redija-biblioteca.json`,
// marcada com `appProperties: { isRedijaReferenceLibrary: 'true' }`, separada dos projetos.

import {
  parseReferenceLibraryPayload,
  serializeReferenceLibraryPayload,
  type LibraryStateSnapshot,
} from './referenceLibraryMerge';
import { isMockDriveToken } from './customTemplatesDrive';
import { DriveRequestError, getOrCreateRedijaAppRootFolder } from './googleDriveService';

export const REFERENCE_LIBRARY_FILE_NAME = 'redija-biblioteca.json';
export const REFERENCE_LIBRARY_APP_PROPERTY = 'isRedijaReferenceLibrary';

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const JSON_MIME_TYPE = 'application/json';

export interface ReferenceLibraryDriveFile {
  id: string;
  modifiedTime?: string;
  createdTime?: string;
}

async function readError(res: Response, fallback: string): Promise<DriveRequestError> {
  const body = await res.json().catch(() => ({}));
  return new DriveRequestError(fallback, res.status, body);
}

/**
 * Lista os arquivos de biblioteca da conta no Google Drive, do mais antigo para o mais novo.
 */
export async function listReferenceLibraryDriveFiles(
  accessToken: string,
): Promise<ReferenceLibraryDriveFile[]> {
  const q = encodeURIComponent(
    `appProperties has { key='${REFERENCE_LIBRARY_APP_PROPERTY}' and value='true' } and trashed = false`,
  );
  const fields = encodeURIComponent('files(id, modifiedTime, createdTime)');
  const res = await fetch(
    `${DRIVE_FILES_URL}?q=${q}&fields=${fields}&orderBy=createdTime&pageSize=20`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw await readError(res, 'Erro ao consultar a biblioteca no Google Drive.');
  const data = (await res.json().catch(() => ({}))) as { files?: ReferenceLibraryDriveFile[] };
  return [...(data.files ?? [])].sort(
    (a, b) => (a.createdTime ?? '').localeCompare(b.createdTime ?? '') || a.id.localeCompare(b.id),
  );
}

/** Baixa o conteúdo do arquivo da biblioteca. Arquivo apagado (404) retorna biblioteca vazia. */
export async function loadReferenceLibraryFromDrive(
  fileId: string,
  accessToken: string,
): Promise<LibraryStateSnapshot> {
  const res = await fetch(`${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) return { references: [], folders: [] };
  if (!res.ok) throw await readError(res, 'Erro ao baixar a biblioteca do Google Drive.');
  return parseReferenceLibraryPayload(await res.text());
}

async function createReferenceLibraryFile(content: string, accessToken: string): Promise<string> {
  const rootFolderId = await getOrCreateRedijaAppRootFolder(accessToken);
  const metadata: Record<string, unknown> = {
    name: REFERENCE_LIBRARY_FILE_NAME,
    mimeType: JSON_MIME_TYPE,
    description:
      'Biblioteca pessoal de referências do RedijaApp (sincronizada entre seus dispositivos)',
    appProperties: { [REFERENCE_LIBRARY_APP_PROPERTY]: 'true' },
  };
  if (rootFolderId) metadata.parents = [rootFolderId];

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: JSON_MIME_TYPE }));
  form.append('file', new Blob([content], { type: JSON_MIME_TYPE }));

  const res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) throw await readError(res, 'Erro ao criar o arquivo de biblioteca no Google Drive.');
  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * Grava o estado completo da biblioteca (referências, pastas e tombstones) no Google Drive.
 */
export async function saveReferenceLibraryToDrive(
  state: LibraryStateSnapshot,
  accessToken: string,
  fileId?: string,
): Promise<string> {
  const content = serializeReferenceLibraryPayload(state);
  if (fileId) {
    const res = await fetch(
      `${DRIVE_UPLOAD_URL}/${encodeURIComponent(fileId)}?uploadType=media&fields=id`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': JSON_MIME_TYPE },
        body: content,
      },
    );
    if (res.ok) return fileId;
    if (res.status !== 404) {
      throw await readError(res, 'Erro ao atualizar a biblioteca no Google Drive.');
    }
  }
  return createReferenceLibraryFile(content, accessToken);
}

export async function deleteReferenceLibraryDriveFile(
  fileId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) {
    throw await readError(res, 'Erro ao excluir o arquivo de biblioteca no Google Drive.');
  }
}

export async function deleteAllReferenceLibraryDriveFiles(accessToken: string): Promise<void> {
  if (isMockDriveToken(accessToken)) return;
  const files = await listReferenceLibraryDriveFiles(accessToken);
  for (const file of files) {
    await deleteReferenceLibraryDriveFile(file.id, accessToken);
  }
}
