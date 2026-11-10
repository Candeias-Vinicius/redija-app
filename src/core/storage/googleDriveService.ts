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

/**
 * Extrai o ID do arquivo do Google Drive a partir de uma entrada fornecida pelo usuário:
 * - Link do Redija: https://redija.app/?doc=1a2b3c... ou ?project=1a2b3c...
 * - Link do Google Drive: https://drive.google.com/file/d/1a2b3c.../view ou open?id=1a2b3c...
 * - ID puro do Drive: 1a2b3c...
 */
export function extractDriveFileIdFromInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Link Redija (com ?doc= ou ?project= ou ?join=)
  try {
    if (trimmed.includes('?')) {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://redija.app/${trimmed}`);
      const docParam =
        url.searchParams.get('doc') ||
        url.searchParams.get('project') ||
        url.searchParams.get('join') ||
        url.searchParams.get('id');
      if (docParam && /^[a-zA-Z0-9_-]{10,}$/.test(docParam)) {
        return docParam;
      }
    }
  } catch {
    // Se não for URL válida, continua para regexes
  }

  // 2. Link do Google Drive /file/d/{id}
  const driveFileMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (driveFileMatch) {
    return driveFileMatch[1];
  }

  // 3. Link do Google Drive open?id={id} ou uc?id={id}
  const driveIdParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (driveIdParamMatch) {
    return driveIdParamMatch[1];
  }

  // 4. ID bruto do Google Drive (entre 15 e 60 caracteres)
  if (/^[a-zA-Z0-9_-]{15,60}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export interface Collaborator {
  id: string; // Permission ID do Google
  displayName: string;
  emailAddress: string;
  role: 'owner' | 'writer' | 'commenter' | 'reader';
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
  role?: 'owner' | 'writer' | 'commenter' | 'reader';
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
 * Garante que a pasta principal "RedijaApp" exista no Google Drive do usuário.
 * Retorna o ID da pasta raiz "RedijaApp".
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

    // Se não encontrou, cria a pasta "RedijaApp" na raiz
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
 * Ex: "RedijaApp / Meu TCC /"
 * Retorna o ID da pasta do projeto.
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
    // 1. Busca se já existe uma pasta vinculada a este projeto por appProperties
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

    // Se não encontrou por appProperties, busca dentro da pasta RedijaApp pelo nome do projeto
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
      // Se o projeto foi renomeado, atualiza o nome da pasta também
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

    // 2. Se a pasta não existe, cria a pasta do projeto dentro de RedijaApp
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
 * Cria ou atualiza o arquivo `.redija` no Google Drive dentro da pasta estruturada do projeto.
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

  // Garante a existência da pasta dedicada do projeto dentro de RedijaApp/
  const projectFolderId = await getOrCreateProjectFolder(project, accessToken);

  // CENÁRIO A: ATUALIZAR ARQUIVO EXISTENTE NO DRIVE
  if (targetFileId) {
    // 1. Atualiza metadados (nome caso tenha mudado e vincula appProperties e pasta)
    const patchUrl = projectFolderId
      ? `https://www.googleapis.com/drive/v3/files/${targetFileId}?addParents=${projectFolderId}`
      : `https://www.googleapis.com/drive/v3/files/${targetFileId}`;

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

  // CENÁRIO B: CRIAR NOVO ARQUIVO NO DRIVE (Multipart com appProperties e pasta pai)
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
 * Salva ou atualiza a cópia em PDF do projeto no Google Drive como backup legível.
 * O RedijaApp não depende desse arquivo para funcionar (usa o .redija para edição),
 * mas ele permite que o usuário e seus orientadores visualizem, imprimam e compartilhem
 * o documento diagramado nativamente dentro do Google Drive (inclusive no celular).
 */
export async function saveProjectPdfToDrive(
  project: DocumentProject,
  pdfBytes: Uint8Array,
  accessToken: string,
): Promise<{ fileId: string; modifiedTime: string } | null> {
  // Simulação para testes de desenvolvimento local
  if (accessToken.startsWith('mock_dev_token')) {
    return {
      fileId: `mock_pdf_${Date.now()}`,
      modifiedTime: new Date().toISOString(),
    };
  }

  const cleanName = project.name.replace(/\.redija$/i, '').trim() || 'Sem Titulo';
  const fileName = `${cleanName}.pdf`;

  // 1. Procura se já existe um PDF deste projeto no Drive
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

  // Se não encontrou por appProperties, busca pelo nome exato do arquivo .pdf
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

  // Garante a existência da pasta dedicada do projeto dentro de RedijaApp/
  const projectFolderId = await getOrCreateProjectFolder(project, accessToken);

  // CENÁRIO A: ATUALIZAR ARQUIVO PDF EXISTENTE
  if (existingFileId) {
    // Atualiza metadados / nome caso o projeto tenha sido renomeado e garante pasta pai
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

    // Atualiza os bytes do PDF
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

  // CENÁRIO B: CRIAR NOVO ARQUIVO PDF NO DRIVE (Multipart com pasta pai)
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

// Estado em memória para persistir alterações de colaboradores no modo mock de desenvolvimento
let devMockCollaborators: Collaborator[] = [
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
    role: 'commenter',
  },
];

/**
 * Convida um usuário via e-mail para ter permissão (escrita/comentário/leitura) no projeto.
 */
export async function inviteCollaborator(
  fileId: string,
  emailAddress: string,
  roleOrToken: 'writer' | 'commenter' | 'reader' | string,
  optionalToken?: string
): Promise<void> {
  const role: 'writer' | 'commenter' | 'reader' =
    optionalToken !== undefined &&
    (roleOrToken === 'writer' || roleOrToken === 'commenter' || roleOrToken === 'reader')
      ? roleOrToken
      : 'writer';
  const accessToken = optionalToken !== undefined ? optionalToken : roleOrToken;

  if (accessToken.startsWith('mock_dev_token')) {
    await new Promise((r) => setTimeout(r, 400));
    const trimmed = emailAddress.trim();
    if (!devMockCollaborators.some((c) => c.emailAddress.toLowerCase() === trimmed.toLowerCase())) {
      devMockCollaborators.push({
        id: `perm_${Date.now()}`,
        displayName: trimmed.split('@')[0],
        emailAddress: trimmed,
        role,
      });
    }
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
        role,
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
 * Atualiza o papel de permissão de um colaborador existente (ex: mudar de 'commenter' para 'writer' ou 'reader').
 */
export async function updateCollaboratorRole(
  fileId: string,
  permissionId: string,
  role: 'writer' | 'commenter' | 'reader',
  accessToken: string
): Promise<void> {
  if (accessToken.startsWith('mock_dev_token')) {
    await new Promise((r) => setTimeout(r, 200));
    const target = devMockCollaborators.find((c) => c.id === permissionId);
    if (target) {
      target.role = role;
    }
    return;
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions/${permissionId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erro ao atualizar a permissão do colaborador.');
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
    return [...devMockCollaborators];
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
    devMockCollaborators = devMockCollaborators.filter((c) => c.id !== permissionId);
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

