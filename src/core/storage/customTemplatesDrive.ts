// =====================================================================
// RedijaApp: Arquivo de modelos personalizados no Google Drive
// =====================================================================
//
// Os modelos de uma conta ficam em `RedijaApp/redija-modelos.json`, marcado com
// `appProperties: { isRedijaCustomTemplates: 'true' }` (mesmo esquema dos projetos `.redija`).
// O escopo `drive.file` só enxerga arquivos criados pelo próprio RedijaApp, em qualquer aparelho.

import {
  parseCustomTemplatesPayload,
  serializeCustomTemplatesPayload,
  type SyncedCustomTemplate,
} from './customTemplatesMerge';
import { DriveRequestError, getOrCreateRedijaAppRootFolder } from './googleDriveService';

export const CUSTOM_TEMPLATES_FILE_NAME = 'redija-modelos.json';
export const CUSTOM_TEMPLATES_APP_PROPERTY = 'isRedijaCustomTemplates';

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const JSON_MIME_TYPE = 'application/json';

export interface CustomTemplatesDriveFile {
  id: string;
  modifiedTime?: string;
  createdTime?: string;
}

/** Tokens do "Usuário Demonstração" (sem Google configurado): nada vai para a rede. */
export function isMockDriveToken(accessToken: string): boolean {
  return accessToken.startsWith('mock_dev_token');
}

async function readError(res: Response, fallback: string): Promise<DriveRequestError> {
  const body = await res.json().catch(() => ({}));
  return new DriveRequestError(fallback, res.status, body);
}

/**
 * Lista os arquivos de modelos da conta, do mais antigo para o mais novo. Normalmente há um só;
 * se dois aparelhos criaram ao mesmo tempo, todos usam o mais antigo como principal.
 */
export async function listCustomTemplatesDriveFiles(
  accessToken: string,
): Promise<CustomTemplatesDriveFile[]> {
  const q = encodeURIComponent(
    `appProperties has { key='${CUSTOM_TEMPLATES_APP_PROPERTY}' and value='true' } and trashed = false`,
  );
  const fields = encodeURIComponent('files(id, modifiedTime, createdTime)');
  const res = await fetch(
    `${DRIVE_FILES_URL}?q=${q}&fields=${fields}&orderBy=createdTime&pageSize=20`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw await readError(res, 'Erro ao consultar os modelos no Google Drive.');
  const data = (await res.json().catch(() => ({}))) as { files?: CustomTemplatesDriveFile[] };
  return [...(data.files ?? [])].sort(
    (a, b) => (a.createdTime ?? '').localeCompare(b.createdTime ?? '') || a.id.localeCompare(b.id),
  );
}

/** Baixa o conteúdo do arquivo. Arquivo apagado no meio do caminho conta como lista vazia. */
export async function loadCustomTemplatesFromDrive(
  fileId: string,
  accessToken: string,
): Promise<SyncedCustomTemplate[]> {
  const res = await fetch(`${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) return [];
  if (!res.ok) throw await readError(res, 'Erro ao baixar os modelos do Google Drive.');
  return parseCustomTemplatesPayload(await res.text());
}

async function createCustomTemplatesFile(content: string, accessToken: string): Promise<string> {
  const rootFolderId = await getOrCreateRedijaAppRootFolder(accessToken);
  const metadata: Record<string, unknown> = {
    name: CUSTOM_TEMPLATES_FILE_NAME,
    mimeType: JSON_MIME_TYPE,
    description: 'Modelos personalizados do RedijaApp (sincronizados entre seus aparelhos)',
    appProperties: { [CUSTOM_TEMPLATES_APP_PROPERTY]: 'true' },
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
  if (!res.ok) throw await readError(res, 'Erro ao criar o arquivo de modelos no Google Drive.');
  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * Grava a lista completa (inclusive removidos). Atualiza o arquivo existente ou cria um novo
 * na pasta `RedijaApp` se ele ainda não existir (ou tiver sido apagado no Drive).
 */
export async function saveCustomTemplatesToDrive(
  templates: SyncedCustomTemplate[],
  accessToken: string,
  fileId?: string,
): Promise<string> {
  const content = serializeCustomTemplatesPayload(templates);
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
      throw await readError(res, 'Erro ao atualizar os modelos no Google Drive.');
    }
  }
  return createCustomTemplatesFile(content, accessToken);
}

/** Exclui um arquivo de modelos (cópias duplicadas ou exclusão de conta). */
export async function deleteCustomTemplatesDriveFile(
  fileId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) {
    throw await readError(res, 'Erro ao excluir o arquivo de modelos no Google Drive.');
  }
}

/** Exclui todos os arquivos de modelos da conta (usado na exclusão total de conta). */
export async function deleteAllCustomTemplatesDriveFiles(accessToken: string): Promise<void> {
  if (isMockDriveToken(accessToken)) return;
  const files = await listCustomTemplatesDriveFiles(accessToken);
  for (const file of files) {
    await deleteCustomTemplatesDriveFile(file.id, accessToken);
  }
}
