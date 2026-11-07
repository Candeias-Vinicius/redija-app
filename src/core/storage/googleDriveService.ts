// =====================================================================
// RedijaApp — Serviço Google Drive API v3 (CRUD de Projetos e Colaboração)
// =====================================================================

import { DocumentProject, RedijaBackupFile } from '@/types/document';

const REDIJA_MIME_TYPE = 'application/json';
const BACKUP_VERSION = 1;

export interface DriveProjectSummary {
  id: string; // Google Drive fileId
  name: string;
  modifiedTime: string;
  isSharedWithMe: boolean;
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
  role: 'owner' | 'writer' | 'reader';
  photoLink?: string;
}

interface GoogleDriveApiFile {
  id: string;
  name: string;
  modifiedTime: string;
  sharedWithMeTime?: string;
  sharingUser?: { displayName?: string; emailAddress?: string; photoLink?: string };
  owners?: { displayName?: string; emailAddress?: string; photoLink?: string }[];
}

interface GoogleDrivePermissionApi {
  id: string;
  displayName?: string;
  emailAddress?: string;
  role?: 'owner' | 'writer' | 'reader';
  photoLink?: string;
}

/**
 * Busca no Google Drive se já existe um arquivo .redija correspondente a este projeto.
 * Prioriza a busca pela propriedade appProperties (redijaProjectId) e, em seguida,
 * pelo nome exato do arquivo (.redija), evitando a criação de arquivos duplicados.
 */
export async function findDriveFileForProject(
  project: DocumentProject,
  accessToken: string
): Promise<{ id: string; modifiedTime: string } | null> {
  if (accessToken.startsWith('mock_dev_token')) {
    return null;
  }

  const cleanName = project.name.replace(/\.redija$/i, '').trim() || 'Sem Titulo';
  const fileName = `${cleanName}.redija`;

  // 1. Tenta buscar por appProperties (vínculo unívoco pelo ID do projeto)
  try {
    const propQuery = encodeURIComponent(
      `appProperties has { key='redijaProjectId' and value='${project.id}' } and trashed = false`
    );
    const propRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${propQuery}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
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

  // 2. Se não encontrou por appProperties, busca pelo nome exato do arquivo
  try {
    const safeName = fileName.replace(/'/g, "\\'");
    const nameQuery = encodeURIComponent(`name = '${safeName}' and trashed = false`);
    const nameRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${nameQuery}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
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
 * Cria ou atualiza o arquivo `.redija` no Google Drive.
 * Se o projeto já tem `driveFileId` ou já possui um arquivo com o mesmo ID/nome no Drive,
 * executa PATCH no mesmo arquivo. Caso contrário, executa POST (multipart).
 */
export async function saveProjectToDrive(
  project: DocumentProject,
  accessToken: string
): Promise<{ fileId: string; modifiedTime: string }> {
  // Simulação para testes de desenvolvimento local sem credencial configurada
  if (accessToken.startsWith('mock_dev_token')) {
    await new Promise((r) => setTimeout(r, 400));
    return {
      fileId: project.driveFileId || `mock_drive_file_${Date.now()}`,
      modifiedTime: new Date().toISOString(),
    };
  }

  const backupPayload: RedijaBackupFile = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    project,
  };

  const fileContent = JSON.stringify(backupPayload, null, 2);
  const cleanName = project.name.replace(/\.redija$/i, '').trim() || 'Sem Titulo';
  const fileName = `${cleanName}.redija`;

  let targetFileId = project.driveFileId;

  // Se o projeto local não possui driveFileId registrado, verifica antes no Drive
  // se já existe um arquivo com esse nome ou ID para reaproveitá-lo e não gerar duplicata
  if (!targetFileId) {
    const existing = await findDriveFileForProject(project, accessToken);
    if (existing) {
      targetFileId = existing.id;
    }
  }

  // CENÁRIO A: ATUALIZAR ARQUIVO EXISTENTE NO DRIVE
  if (targetFileId) {
    // 1. Atualiza metadados (nome caso tenha mudado e vincula appProperties)
    const patchMetaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${targetFileId}`, {
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
      // 2. Atualiza o conteúdo do arquivo
      const updateRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${targetFileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': REDIJA_MIME_TYPE,
          },
          body: fileContent,
        }
      );

      if (updateRes.ok) {
        const data = await updateRes.json().catch(() => ({}));
        return { fileId: data.id || targetFileId, modifiedTime: new Date().toISOString() };
      }
    } else if (patchMetaRes.status !== 404) {
      const err = await patchMetaRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Falha ao sincronizar alterações no Google Drive.');
    }
    // Se recebeu 404 (arquivo foi apagado no Drive pelo usuário), continua abaixo para recriar
  }

  // CENÁRIO B: CRIAR NOVO ARQUIVO NO DRIVE (Multipart com appProperties)
  const metadata = {
    name: fileName,
    mimeType: REDIJA_MIME_TYPE,
    description: 'Documento científico criado com RedijaApp',
    appProperties: {
      redijaProjectId: project.id,
    },
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: REDIJA_MIME_TYPE }));

  const createRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao criar arquivo no Google Drive.');
  }

  const data = await createRes.json();
  return { fileId: data.id, modifiedTime: data.modifiedTime || new Date().toISOString() };
}

/**
 * Lista todos os projetos .redija do usuário (próprios e compartilhados com ele).
 */
export async function listDriveProjects(accessToken: string): Promise<DriveProjectSummary[]> {
  if (accessToken.startsWith('mock_dev_token')) {
    return [
      {
        id: 'mock_drive_file_1',
        name: 'Trabalho de Conclusão de Curso (ABNT)',
        modifiedTime: new Date().toISOString(),
        isSharedWithMe: false,
      },
      {
        id: 'mock_drive_file_2',
        name: 'Artigo Científico em Grupo',
        modifiedTime: new Date(Date.now() - 3600000).toISOString(),
        isSharedWithMe: true,
        sharedBy: {
          name: 'Prof. Orientador',
          email: 'orientador@universidade.edu.br',
        },
      },
    ];
  }

  const query = encodeURIComponent("name contains '.redija' and trashed = false");
  const fields = encodeURIComponent(
    'files(id, name, modifiedTime, sharedWithMeTime, sharingUser, owners)'
  );

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao consultar projetos do Google Drive.');
  }

  const data = await response.json();

  return (data.files || []).map((f: GoogleDriveApiFile) => {
    const isShared = Boolean(f.sharedWithMeTime);
    const owner = f.owners?.[0];
    const sharing = f.sharingUser;

    return {
      id: f.id,
      name: f.name.replace(/\.redija$/i, ''),
      modifiedTime: f.modifiedTime,
      isSharedWithMe: isShared,
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
 * Baixa e decodifica um projeto `.redija` a partir do Google Drive.
 */
export async function loadProjectFromDrive(
  fileId: string,
  accessToken: string
): Promise<DocumentProject> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao carregar o arquivo do Google Drive.');
  }

  const backupData = (await response.json()) as RedijaBackupFile;
  if (!backupData || !backupData.project) {
    throw new Error('O arquivo selecionado não é um documento válido do RedijaApp.');
  }

  const loadedProject = backupData.project;
  loadedProject.driveFileId = fileId;
  loadedProject.driveSyncedAt = new Date().toISOString();

  return loadedProject;
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

/**
 * Convida um usuário via e-mail para ter permissão de escrita/edição no projeto.
 */
export async function inviteCollaborator(
  fileId: string,
  emailAddress: string,
  accessToken: string
): Promise<void> {
  if (accessToken.startsWith('mock_dev_token')) {
    await new Promise((r) => setTimeout(r, 400));
    return;
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'writer',
        type: 'user',
        emailAddress: emailAddress.trim(),
      }),
    }
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
  accessToken: string
): Promise<Collaborator[]> {
  if (accessToken.startsWith('mock_dev_token')) {
    return [
      {
        id: 'perm_owner',
        displayName: 'Vinicius Candeias (Você)',
        emailAddress: 'vinicandeias@gmail.com',
        role: 'owner',
      },
      {
        id: 'perm_collab_1',
        displayName: 'Prof. Dr. Orientador',
        emailAddress: 'orientador@universidade.edu.br',
        role: 'writer',
      },
    ];
  }

  const fields = encodeURIComponent('permissions(id, displayName, emailAddress, role, photoLink)');
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?fields=${fields}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
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
    photoLink: p.photoLink,
  }));
}

/**
 * Remove a permissão de um colaborador.
 */
export async function removeCollaborator(
  fileId: string,
  permissionId: string,
  accessToken: string
): Promise<void> {
  if (accessToken.startsWith('mock_dev_token')) {
    await new Promise((r) => setTimeout(r, 300));
    return;
  }
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions/${permissionId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao remover colaborador.');
  }
}

