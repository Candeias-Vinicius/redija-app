// =====================================================================
// RedijaApp — Serviço Google Drive API v3 (CRUD de Projetos e Colaboração)
// =====================================================================

import { DocumentProject, RedijaBackupFile, ShareRole } from '@/types/document';
import {
  generateCollabSecret,
  isValidCollabSecret,
} from '@/core/collaboration/collabCrypto';
import { normalizeProject } from './schemaNormalizer';
import { createProjectFromTemplate } from './projectTemplates';

const REDIJA_MIME_TYPE = 'application/json';
const BACKUP_VERSION = 1;

export type DriveAccessErrorCode =
  | 'NOT_FOUND_OR_SCOPE'
  | 'AUTH_EXPIRED'
  | 'INVALID_FORMAT'
  | 'READ_ONLY'
  | 'NETWORK';

export class DriveAccessError extends Error {
  public readonly code: DriveAccessErrorCode;
  public readonly status?: number;

  constructor(message: string, code: DriveAccessErrorCode, status?: number) {
    super(message);
    this.name = 'DriveAccessError';
    this.code = code;
    this.status = status;
  }
}

export interface DriveProjectSummary {
  id: string; // Google Drive fileId
  name: string;
  modifiedTime: string;
  isSharedWithMe: boolean;
  canEdit?: boolean;
  role?: ShareRole;
  sharedBy?: {
    name?: string;
    email?: string;
    photoLink?: string;
  };
}

export interface Collaborator {
  id: string; // Permission ID do Google
  displayName: string;
  emailAddress: string;
  role: ShareRole;
  type?: 'user' | 'group' | 'domain' | 'anyone';
  photoLink?: string;
}

interface GoogleDriveApiFile {
  id: string;
  name: string;
  modifiedTime: string;
  trashed?: boolean;
  mimeType?: string;
  ownedByMe?: boolean;
  sharedWithMeTime?: string;
  sharingUser?: { displayName?: string; emailAddress?: string; photoLink?: string };
  owners?: { displayName?: string; emailAddress?: string; photoLink?: string }[];
  capabilities?: {
    canEdit?: boolean;
    canComment?: boolean;
  };
}

interface GoogleDrivePermissionApi {
  id: string;
  type?: 'user' | 'group' | 'domain' | 'anyone';
  displayName?: string;
  emailAddress?: string;
  role?: ShareRole;
  photoLink?: string;
}

function buildCanonicalUploadProject(
  project: DocumentProject,
  collabSecret: string,
): DocumentProject {
  const sanitized: DocumentProject = {
    ...project,
    collabSecret,
  };
  delete sanitized.isSharedWithMe;
  delete sanitized.sharedBy;
  delete sanitized.shareRole;
  delete sanitized.ownerEmail;
  return sanitized;
}

function deriveShareRoleFromMetadata(
  meta: GoogleDriveApiFile,
  currentUserEmail?: string,
): ShareRole {
  const ownerEmail = meta.owners?.[0]?.emailAddress?.toLowerCase();
  const isOwned =
    typeof meta.ownedByMe === 'boolean'
      ? meta.ownedByMe
      : Boolean(
          currentUserEmail && ownerEmail && ownerEmail === currentUserEmail.trim().toLowerCase(),
        );

  if (isOwned && !meta.sharedWithMeTime) {
    return 'owner';
  }
  if (meta.capabilities?.canEdit === false) {
    return meta.capabilities?.canComment ? 'commenter' : 'reader';
  }
  return 'writer';
}

/**
 * Busca no Google Drive se já existe um arquivo .redija correspondente a este projeto.
 */
export async function findDriveFileForProject(
  project: DocumentProject,
  accessToken: string,
): Promise<{ id: string; modifiedTime: string } | null> {
  if (accessToken.startsWith('mock_dev_token')) {
    return null;
  }

  const cleanName = project.name.replace(/\.redija$/i, '').trim() || 'Sem Titulo';
  const fileName = `${cleanName}.redija`;

  try {
    const propQuery = encodeURIComponent(
      `appProperties has { key='redijaProjectId' and value='${project.id}' } and trashed = false`,
    );
    const propRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${propQuery}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (propRes.ok) {
      const data = await propRes.json();
      if (data.files && data.files.length > 0) {
        return {
          id: data.files[0].id,
          modifiedTime: data.files[0].modifiedTime || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar Drive por appProperties:', err);
  }

  try {
    const safeName = fileName.replace(/'/g, "\\'");
    const nameQuery = encodeURIComponent(`name = '${safeName}' and trashed = false`);
    const nameRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${nameQuery}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (nameRes.ok) {
      const data = await nameRes.json();
      if (data.files && data.files.length > 0) {
        return {
          id: data.files[0].id,
          modifiedTime: data.files[0].modifiedTime || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar Drive por nome de arquivo:', err);
  }

  return null;
}

/**
 * Garante que a pasta principal "RedijaApp" exista no Google Drive do usuário.
 */
export async function getOrCreateRedijaAppRootFolder(
  accessToken: string,
): Promise<string | null> {
  if (accessToken.startsWith('mock_dev_token')) {
    return 'mock_root_folder_redija';
  }

  try {
    const q = encodeURIComponent(
      "name = 'RedijaApp' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'RedijaApp',
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Pasta de trabalhos acadêmicos gerenciada pelo RedijaApp',
      }),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      return created.id;
    }
  } catch (err) {
    console.warn('Erro ao obter ou criar pasta RedijaApp no Drive:', err);
  }
  return null;
}

/**
 * Garante que exista uma subpasta dedicada para o projeto dentro de "RedijaApp".
 */
export async function getOrCreateProjectFolder(
  project: DocumentProject,
  accessToken: string,
): Promise<string | null> {
  if (accessToken.startsWith('mock_dev_token')) {
    return `mock_project_folder_${project.id}`;
  }

  const rootFolderId = await getOrCreateRedijaAppRootFolder(accessToken);
  const cleanName = project.name.replace(/\.redija$/i, '').trim() || 'Sem Titulo';

  try {
    const propQuery = encodeURIComponent(
      `appProperties has { key='redijaProjectId' and value='${project.id}' } and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${propQuery}&fields=files(id,name)&pageSize=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    let existingFolderId: string | null = null;
    let existingFolderName: string | null = null;

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        existingFolderId = data.files[0].id;
        existingFolderName = data.files[0].name;
      }
    }

    if (!existingFolderId && rootFolderId) {
      const safeName = cleanName.replace(/'/g, "\\'");
      const nameQuery = encodeURIComponent(
        `'${rootFolderId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      );
      const nameSearch = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${nameQuery}&fields=files(id,name)&pageSize=1`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (nameSearch.ok) {
        const nameData = await nameSearch.json();
        if (nameData.files && nameData.files.length > 0) {
          existingFolderId = nameData.files[0].id;
          existingFolderName = nameData.files[0].name;
        }
      }
    }

    if (existingFolderId) {
      if (existingFolderName !== cleanName) {
        await fetch(`https://www.googleapis.com/drive/v3/files/${existingFolderId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: cleanName,
            appProperties: {
              redijaProjectId: project.id,
              isProjectFolder: 'true',
            },
          }),
        }).catch(() => null);
      }
      return existingFolderId;
    }

    const metadata: Record<string, unknown> = {
      name: cleanName,
      mimeType: 'application/vnd.google-apps.folder',
      description: `Pasta de arquivos do trabalho ${cleanName}`,
      appProperties: {
        redijaProjectId: project.id,
        isProjectFolder: 'true',
      },
    };
    if (rootFolderId) {
      metadata.parents = [rootFolderId];
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      return created.id;
    }
  } catch (err) {
    console.warn('Erro ao obter ou criar pasta do projeto no Drive:', err);
  }

  return rootFolderId;
}

/**
 * Cria ou atualiza o arquivo `.redija` no Google Drive.
 * Em arquivos compartilhados (`isSharedWithMe`), nunca tenta mover pastas (`addParents`)
 * nem recriar duplicatas — atualiza apenas o conteúdo quando permitido (`writer`).
 */
export async function saveProjectToDrive(
  project: DocumentProject,
  accessToken: string,
): Promise<{ fileId: string; modifiedTime: string; collabSecret: string }> {
  if (project.shareRole === 'reader' || project.shareRole === 'commenter') {
    throw new DriveAccessError(
      'Este projeto foi compartilhado em modo somente leitura. Duplique-o para editar sua própria cópia.',
      'READ_ONLY',
      403,
    );
  }

  const collabSecret = isValidCollabSecret(project.collabSecret)
    ? project.collabSecret
    : generateCollabSecret();

  if (accessToken.startsWith('mock_dev_token')) {
    await new Promise((r) => setTimeout(r, 250));
    return {
      fileId: project.driveFileId || `mock_drive_file_${Date.now()}`,
      modifiedTime: new Date().toISOString(),
      collabSecret,
    };
  }

  const canonicalProject = buildCanonicalUploadProject(project, collabSecret);
  const backupPayload: RedijaBackupFile = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    project: canonicalProject,
  };

  const fileContent = JSON.stringify(backupPayload, null, 2);
  const cleanName = project.name.replace(/\.redija$/i, '').trim() || 'Sem Titulo';
  const fileName = `${cleanName}.redija`;

  let targetFileId = project.driveFileId;

  if (!targetFileId && !project.isSharedWithMe) {
    const existing = await findDriveFileForProject(project, accessToken);
    if (existing) {
      targetFileId = existing.id;
    }
  }

  // CENÁRIO S: Arquivo compartilhado de terceiros -> atualiza mídia diretamente sem addParents
  if (project.isSharedWithMe && targetFileId) {
    const updateSharedRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(targetFileId)}?uploadType=media&supportsAllDrives=true&fields=id,modifiedTime`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': REDIJA_MIME_TYPE,
        },
        body: fileContent,
      },
    );

    if (updateSharedRes.ok) {
      const data = await updateSharedRes.json().catch(() => ({}));
      return {
        fileId: data.id || targetFileId,
        modifiedTime: data.modifiedTime || new Date().toISOString(),
        collabSecret,
      };
    }

    if (updateSharedRes.status === 401) {
      throw new DriveAccessError('Sessão Google expirada.', 'AUTH_EXPIRED', 401);
    }
    if (updateSharedRes.status === 403) {
      throw new DriveAccessError(
        'Sem permissão de escrita no arquivo compartilhado do Google Drive.',
        'READ_ONLY',
        403,
      );
    }
    if (updateSharedRes.status === 404) {
      throw new DriveAccessError(
        'Arquivo compartilhado não encontrado ou acesso revogado no Google Drive.',
        'NOT_FOUND_OR_SCOPE',
        404,
      );
    }

    const err = await updateSharedRes.json().catch(() => ({}));
    throw new DriveAccessError(
      err.error?.message || 'Falha ao atualizar arquivo compartilhado no Google Drive.',
      'NETWORK',
      updateSharedRes.status,
    );
  }

  // Projetos próprios: organiza dentro de RedijaApp/<Nome do Projeto>/
  const projectFolderId = await getOrCreateProjectFolder(project, accessToken);

  // CENÁRIO A: Atualizar arquivo próprio existente
  if (targetFileId) {
    const patchUrl = projectFolderId
      ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(targetFileId)}?addParents=${encodeURIComponent(projectFolderId)}&supportsAllDrives=true`
      : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(targetFileId)}?supportsAllDrives=true`;

    const patchMetaRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: fileName,
        appProperties: {
          redijaProjectId: project.id,
        },
      }),
    });

    if (patchMetaRes.ok) {
      const updateRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(targetFileId)}?uploadType=media&supportsAllDrives=true&fields=id,modifiedTime`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': REDIJA_MIME_TYPE,
          },
          body: fileContent,
        },
      );

      if (updateRes.ok) {
        const data = await updateRes.json().catch(() => ({}));
        return {
          fileId: data.id || targetFileId,
          modifiedTime: data.modifiedTime || new Date().toISOString(),
          collabSecret,
        };
      }
      if (updateRes.status === 401) {
        throw new DriveAccessError('Sessão Google expirada.', 'AUTH_EXPIRED', 401);
      }
    } else if (patchMetaRes.status === 401) {
      throw new DriveAccessError('Sessão Google expirada.', 'AUTH_EXPIRED', 401);
    } else if (patchMetaRes.status !== 404) {
      const err = await patchMetaRes.json().catch(() => ({}));
      throw new DriveAccessError(
        err.error?.message || 'Falha ao sincronizar alterações no Google Drive.',
        'NETWORK',
        patchMetaRes.status,
      );
    }
  }

  // CENÁRIO B: Criar novo arquivo no Drive (Multipart com pasta pai)
  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType: REDIJA_MIME_TYPE,
    description: 'Documento científico criado com RedijaApp',
    appProperties: {
      redijaProjectId: project.id,
    },
  };
  if (projectFolderId) {
    metadata.parents = [projectFolderId];
  }

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: REDIJA_MIME_TYPE }));

  const createRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  );

  if (!createRes.ok) {
    if (createRes.status === 401) {
      throw new DriveAccessError('Sessão Google expirada.', 'AUTH_EXPIRED', 401);
    }
    const err = await createRes.json().catch(() => ({}));
    throw new DriveAccessError(
      err.error?.message || 'Falha ao criar arquivo no Google Drive.',
      'NETWORK',
      createRes.status,
    );
  }

  const data = await createRes.json();
  return {
    fileId: data.id,
    modifiedTime: data.modifiedTime || new Date().toISOString(),
    collabSecret,
  };
}

/**
 * Salva ou atualiza a cópia em PDF do projeto no Google Drive como backup legível.
 * Para projetos compartilhados de terceiros, retorna `null` sem criar cópias paralelas indesejadas.
 */
export async function saveProjectPdfToDrive(
  project: DocumentProject,
  pdfBytes: Uint8Array,
  accessToken: string,
): Promise<{ fileId: string; modifiedTime: string } | null> {
  if (project.isSharedWithMe) {
    return null;
  }

  if (accessToken.startsWith('mock_dev_token')) {
    return {
      fileId: `mock_pdf_${Date.now()}`,
      modifiedTime: new Date().toISOString(),
    };
  }

  const cleanName = project.name.replace(/\.redija$/i, '').trim() || 'Sem Titulo';
  const fileName = `${cleanName}.pdf`;

  let existingFileId: string | null = null;
  try {
    const propQuery = encodeURIComponent(
      `appProperties has { key='redijaProjectId' and value='${project.id}' } and appProperties has { key='isRedijaPdf' and value='true' } and trashed = false`,
    );
    const propRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${propQuery}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (propRes.ok) {
      const data = await propRes.json();
      if (data.files && data.files.length > 0) {
        existingFileId = data.files[0].id;
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar PDF por appProperties no Drive:', err);
  }

  if (!existingFileId) {
    try {
      const safeName = fileName.replace(/'/g, "\\'");
      const nameQuery = encodeURIComponent(
        `name = '${safeName}' and mimeType = 'application/pdf' and trashed = false`,
      );
      const nameRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${nameQuery}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (nameRes.ok) {
        const data = await nameRes.json();
        if (data.files && data.files.length > 0) {
          existingFileId = data.files[0].id;
        }
      }
    } catch (err) {
      console.warn('Erro ao buscar PDF por nome no Drive:', err);
    }
  }

  const projectFolderId = await getOrCreateProjectFolder(project, accessToken);

  if (existingFileId) {
    const patchUrl = projectFolderId
      ? `https://www.googleapis.com/drive/v3/files/${existingFileId}?addParents=${projectFolderId}`
      : `https://www.googleapis.com/drive/v3/files/${existingFileId}`;

    await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: fileName,
        appProperties: {
          redijaProjectId: project.id,
          isRedijaPdf: 'true',
        },
      }),
    }).catch(() => null);

    const updateRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/pdf',
        },
        body: new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' }),
      },
    );

    if (updateRes.ok) {
      const data = await updateRes.json().catch(() => ({}));
      return { fileId: data.id || existingFileId, modifiedTime: new Date().toISOString() };
    }
  }

  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType: 'application/pdf',
    description: 'Documento acadêmico ABNT gerado pelo RedijaApp (visualizável no Google Drive)',
    appProperties: {
      redijaProjectId: project.id,
      isRedijaPdf: 'true',
    },
  };
  if (projectFolderId) {
    metadata.parents = [projectFolderId];
  }

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' }));

  const createRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    },
  );

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    console.warn('Não foi possível salvar a cópia PDF no Drive:', err);
    return null;
  }

  const data = await createRes.json();
  return { fileId: data.id, modifiedTime: data.modifiedTime || new Date().toISOString() };
}

/**
 * Lista os projetos .redija acessíveis ao aplicativo no Google Drive (próprios e abertos via Picker).
 */
export async function listDriveProjects(accessToken: string): Promise<DriveProjectSummary[]> {
  if (accessToken.startsWith('mock_dev_token')) {
    return [
      {
        id: 'mock_drive_file_1',
        name: 'Trabalho de Conclusão de Curso (ABNT)',
        modifiedTime: new Date().toISOString(),
        isSharedWithMe: false,
        canEdit: true,
        role: 'owner',
      },
      {
        id: 'mock_drive_file_2',
        name: 'Artigo Científico em Grupo',
        modifiedTime: new Date(Date.now() - 3600000).toISOString(),
        isSharedWithMe: true,
        canEdit: true,
        role: 'writer',
        sharedBy: {
          name: 'Prof. Orientador',
          email: 'orientador@universidade.edu.br',
        },
      },
    ];
  }

  const query = encodeURIComponent("name contains '.redija' and trashed = false");
  const fields = encodeURIComponent(
    'files(id, name, modifiedTime, ownedByMe, sharedWithMeTime, sharingUser, owners, capabilities(canEdit, canComment))',
  );

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new DriveAccessError('Sessão Google expirada.', 'AUTH_EXPIRED', 401);
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao consultar projetos do Google Drive.');
  }

  const data = await response.json();

  return (data.files || []).map((f: GoogleDriveApiFile) => {
    const isShared =
      typeof f.ownedByMe === 'boolean' ? !f.ownedByMe : Boolean(f.sharedWithMeTime);
    const owner = f.owners?.[0];
    const sharing = f.sharingUser;
    const canEdit = f.capabilities?.canEdit !== false;
    const role: ShareRole = !isShared
      ? 'owner'
      : canEdit
        ? 'writer'
        : f.capabilities?.canComment
          ? 'commenter'
          : 'reader';

    return {
      id: f.id,
      name: f.name.replace(/\.redija$/i, ''),
      modifiedTime: f.modifiedTime,
      isSharedWithMe: isShared,
      canEdit,
      role,
      sharedBy: isShared
        ? {
            name: sharing?.displayName || owner?.displayName || 'Outro usuário',
            email: sharing?.emailAddress || owner?.emailAddress || '',
            photoLink: sharing?.photoLink || owner?.photoLink || '',
          }
        : undefined,
    };
  });
}

/**
 * Consulta leve apenas para checar modifiedTime remoto no Drive (fallback quando P2P WebRTC estiver indisponível).
 */
export async function getDriveFileModifiedTime(
  fileId: string,
  accessToken: string,
): Promise<string | null> {
  if (!fileId || accessToken.startsWith('mock_dev_token')) {
    return null;
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=modifiedTime,trashed&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new DriveAccessError('Sessão Google expirada.', 'AUTH_EXPIRED', 401);
    }
    if (res.status === 403 || res.status === 404) {
      throw new DriveAccessError(
        'Sem acesso ou arquivo não encontrado no Drive.',
        'NOT_FOUND_OR_SCOPE',
        res.status,
      );
    }
    return null;
  }

  const data = (await res.json()) as { modifiedTime?: string; trashed?: boolean };
  if (data.trashed) return null;
  return data.modifiedTime || null;
}

/**
 * Baixa e decodifica um projeto `.redija` a partir do Google Drive.
 */
export async function loadProjectFromDrive(
  fileId: string,
  accessToken: string,
): Promise<DocumentProject> {
  if (accessToken.startsWith('mock_dev_token')) {
    const demo = createProjectFromTemplate(
      fileId === 'mock_drive_file_2' ? 'artigo' : 'tcc',
      fileId === 'mock_drive_file_2'
        ? 'Artigo Científico em Grupo'
        : 'Trabalho de Conclusão de Curso (ABNT)',
    );
    return {
      ...demo,
      id: `demo_${fileId}`,
      driveFileId: fileId,
      driveSyncedAt: new Date().toISOString(),
      collabSecret: 'mock_shared_demo_secret_123456',
    };
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new DriveAccessError('Sessão Google expirada.', 'AUTH_EXPIRED', 401);
    }
    if (response.status === 403 || response.status === 404) {
      throw new DriveAccessError(
        'O arquivo não está autorizado para o RedijaApp neste navegador. Selecione-o via Google Picker para abrir.',
        'NOT_FOUND_OR_SCOPE',
        response.status,
      );
    }
    const err = await response.json().catch(() => ({}));
    throw new DriveAccessError(
      err.error?.message || 'Erro ao carregar o arquivo do Google Drive.',
      'NETWORK',
      response.status,
    );
  }

  let backupData: RedijaBackupFile;
  try {
    backupData = (await response.json()) as RedijaBackupFile;
  } catch {
    throw new DriveAccessError(
      'O arquivo selecionado não é um projeto .redija válido em JSON.',
      'INVALID_FORMAT',
    );
  }

  if (!backupData || !backupData.project) {
    throw new DriveAccessError(
      'O arquivo selecionado não é um documento válido do RedijaApp. Verifique se você escolheu o arquivo .redija (e não o .pdf).',
      'INVALID_FORMAT',
    );
  }

  const loadedProject = normalizeProject(backupData.project);
  loadedProject.driveFileId = fileId;
  loadedProject.driveSyncedAt = new Date().toISOString();

  return loadedProject;
}

/**
 * Abre um projeto compartilhado ou específico pelo `fileId` resolvendo também
 * quem compartilhou (`sharedBy`), status (`isSharedWithMe`) e papel (`shareRole`).
 */
export async function loadSharedProjectFromDrive(
  fileId: string,
  accessToken: string,
  currentUserEmail?: string,
): Promise<DocumentProject> {
  if (accessToken.startsWith('mock_dev_token')) {
    const demo = createProjectFromTemplate('artigo', 'Artigo Compartilhado (Demo)');
    return {
      ...demo,
      id: `shared_${fileId}`,
      driveFileId: fileId,
      driveSyncedAt: new Date().toISOString(),
      ownerEmail: currentUserEmail,
      isSharedWithMe: true,
      sharedBy: {
        name: 'Prof. Orientador',
        email: 'orientador@universidade.edu.br',
      },
      shareRole: 'writer',
      collabSecret: 'mock_shared_demo_secret_123456',
    };
  }

  const fields = encodeURIComponent(
    'id, name, modifiedTime, trashed, mimeType, ownedByMe, sharedWithMeTime, sharingUser, owners, capabilities(canEdit, canComment)',
  );

  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${fields}&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!metaRes.ok) {
    if (metaRes.status === 401) {
      throw new DriveAccessError('Sessão Google expirada. Entre novamente.', 'AUTH_EXPIRED', 401);
    }
    if (metaRes.status === 403 || metaRes.status === 404) {
      throw new DriveAccessError(
        'Arquivo compartilhado ainda não autorizado para este navegador ou sem permissão de acesso.',
        'NOT_FOUND_OR_SCOPE',
        metaRes.status,
      );
    }
    const err = await metaRes.json().catch(() => ({}));
    throw new DriveAccessError(
      err.error?.message || 'Erro ao consultar metadados do arquivo no Drive.',
      'NETWORK',
      metaRes.status,
    );
  }

  const meta = (await metaRes.json()) as GoogleDriveApiFile;
  if (meta.trashed) {
    throw new DriveAccessError('Este projeto foi movido para a lixeira do Google Drive.', 'NOT_FOUND_OR_SCOPE', 404);
  }
  if (meta.mimeType === 'application/pdf' || meta.name?.toLowerCase().endsWith('.pdf')) {
    throw new DriveAccessError(
      'Você selecionou a cópia em PDF. Selecione o arquivo de projeto ".redija" para abrir no editor.',
      'INVALID_FORMAT',
    );
  }

  const project = await loadProjectFromDrive(fileId, accessToken);
  const role = deriveShareRoleFromMetadata(meta, currentUserEmail);
  const isShared = role !== 'owner';
  const owner = meta.owners?.[0];
  const sharing = meta.sharingUser;

  return {
    ...project,
    driveFileId: fileId,
    driveSyncedAt: meta.modifiedTime || project.driveSyncedAt,
    isSharedWithMe: isShared,
    shareRole: role,
    ...(isShared
      ? {
          sharedBy: {
            name: sharing?.displayName || owner?.displayName || 'Outro usuário',
            email: sharing?.emailAddress || owner?.emailAddress || '',
            photoLink: sharing?.photoLink || owner?.photoLink || '',
          },
        }
      : { sharedBy: undefined }),
  };
}

/**
 * Move um arquivo para a lixeira do Google Drive.
 */
export async function trashDriveProject(fileId: string, accessToken: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: true }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao mover arquivo para a lixeira no Drive.');
  }
}

/**
 * Restaura um arquivo da lixeira do Google Drive.
 */
export async function restoreDriveProject(fileId: string, accessToken: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trashed: false }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao restaurar arquivo da lixeira no Drive.');
  }
}

/**
 * Exclui permanentemente um arquivo .redija do Google Drive.
 */
export async function deleteDriveProject(fileId: string, accessToken: string): Promise<void> {
  if (accessToken.startsWith('mock_dev_token')) {
    await new Promise((r) => setTimeout(r, 150));
    return;
  }
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao excluir arquivo no Google Drive.');
  }
}

/**
 * Exclui todos os arquivos .redija do usuário no Google Drive (usado na exclusão total de conta).
 */
export async function deleteAllUserDriveProjects(accessToken: string): Promise<number> {
  if (accessToken.startsWith('mock_dev_token')) {
    await new Promise((r) => setTimeout(r, 400));
    return 2;
  }
  const projects = await listDriveProjects(accessToken);
  const ownProjects = projects.filter((p) => !p.isSharedWithMe);
  let deletedCount = 0;
  for (const p of ownProjects) {
    try {
      await deleteDriveProject(p.id, accessToken);
      deletedCount++;
    } catch (err) {
      console.warn(`Erro ao excluir arquivo ${p.id} do Drive:`, err);
    }
  }
  return deletedCount;
}

// ============================================================================
// COMPARTILHAMENTO E PERMISSÕES (Google Drive Permissions API)
// ============================================================================

export interface InviteCollaboratorOptions {
  role?: 'writer' | 'commenter' | 'reader';
  projectName?: string;
  shareUrl?: string;
}

/**
 * Convida um usuário via e-mail enviando link direto para abrir o projeto no RedijaApp.
 */
export async function inviteCollaborator(
  fileId: string,
  emailAddress: string,
  accessToken: string,
  options?: InviteCollaboratorOptions,
): Promise<void> {
  if (accessToken.startsWith('mock_dev_token')) {
    await new Promise((r) => setTimeout(r, 400));
    return;
  }

  const targetRole = options?.role ?? 'writer';
  const params = new URLSearchParams({
    sendNotificationEmail: 'true',
    supportsAllDrives: 'true',
  });

  if (options?.shareUrl || options?.projectName) {
    const projLabel = options.projectName?.trim() || 'Trabalho Acadêmico';
    const roleLabel = targetRole === 'reader' ? 'visualizar' : 'editar e colaborar';
    const message = options.shareUrl
      ? `Você foi convidado(a) para ${roleLabel} no projeto "${projLabel}" no RedijaApp.\n\nAbra diretamente pelo link:\n${options.shareUrl}\n\nSe for seu primeiro acesso a este arquivo, clique em "Selecionar no Google Drive" na guia "Compartilhados comigo" e escolha "${projLabel}.redija".`
      : `Você foi convidado(a) para ${roleLabel} no projeto "${projLabel}" no RedijaApp.`;
    params.set('emailMessage', message);
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: targetRole,
        type: 'user',
        emailAddress: emailAddress.trim(),
      }),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Não foi possível convidar este usuário.');
  }
}

/**
 * Lista os colaboradores com acesso ao projeto.
 */
export async function listCollaborators(
  fileId: string,
  accessToken: string,
): Promise<Collaborator[]> {
  if (accessToken.startsWith('mock_dev_token')) {
    return [
      {
        id: 'perm_owner',
        displayName: 'Vinicius Candeias (Você)',
        emailAddress: 'vinicandeias@gmail.com',
        role: 'owner',
        type: 'user',
      },
      {
        id: 'perm_collab_1',
        displayName: 'Prof. Dr. Orientador',
        emailAddress: 'orientador@universidade.edu.br',
        role: 'writer',
        type: 'user',
      },
    ];
  }

  const fields = encodeURIComponent(
    'permissions(id, type, displayName, emailAddress, role, photoLink)',
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?fields=${fields}&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao listar colaboradores.');
  }

  const data = await res.json();
  return (data.permissions || []).map((p: GoogleDrivePermissionApi) => ({
    id: p.id,
    displayName: p.displayName || p.emailAddress || 'Colaborador',
    emailAddress: p.emailAddress || '',
    role: p.role || 'writer',
    type: p.type,
    photoLink: p.photoLink,
  }));
}

/**
 * Remove a permissão de um colaborador.
 */
export async function removeCollaborator(
  fileId: string,
  permissionId: string,
  accessToken: string,
): Promise<void> {
  if (accessToken.startsWith('mock_dev_token')) {
    await new Promise((r) => setTimeout(r, 300));
    return;
  }
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(permissionId)}?supportsAllDrives=true`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao remover colaborador.');
  }
}
