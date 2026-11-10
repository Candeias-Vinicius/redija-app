import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DriveAccessError,
  getDriveFileModifiedTime,
  saveProjectToDrive,
  saveProjectPdfToDrive,
  getOrCreateRedijaAppRootFolder,
  getOrCreateProjectFolder,
  loadProjectFromDrive,
  loadSharedProjectFromDrive,
  listDriveProjects,
  inviteCollaborator,
  listCollaborators,
} from '../googleDriveService';
import { createProjectFromTemplate } from '../projectTemplates';

describe('Google Drive Service (BYOS, Pastas Estruturadas & Colaboração)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('obtém ou cria a pasta raiz RedijaApp no Google Drive', async () => {
    const fakeToken = 'token_abc';

    // 1. Não encontra pasta existente
    // 2. Cria pasta na raiz do Drive
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'created_root_folder_id' }),
      } as Response);

    const folderId = await getOrCreateRedijaAppRootFolder(fakeToken);
    expect(folderId).toBe('created_root_folder_id');
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    const [createUrl, createOpts] = fetchSpy.mock.calls[1];
    expect(createUrl).toContain('https://www.googleapis.com/drive/v3/files');
    expect(createOpts?.method).toBe('POST');
    const body = JSON.parse(createOpts?.body as string);
    expect(body.name).toBe('RedijaApp');
    expect(body.mimeType).toBe('application/vnd.google-apps.folder');
  });

  it('garante que a pasta do projeto seja criada dentro da pasta RedijaApp', async () => {
    const mockProject = createProjectFromTemplate('tcc', 'Meu TCC de Engenharia');
    const fakeToken = 'token_abc';

    // 1. Busca pasta RedijaApp (encontra)
    // 2. Busca pasta do projeto por appProperties (não encontra)
    // 3. Busca pasta do projeto por nome (não encontra)
    // 4. Cria pasta do projeto dentro de RedijaApp
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [{ id: 'root_redija_id', name: 'RedijaApp' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ files: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'project_folder_123' }),
      } as Response);

    const folderId = await getOrCreateProjectFolder(mockProject, fakeToken);
    expect(folderId).toBe('project_folder_123');
    expect(fetchSpy).toHaveBeenCalledTimes(4);

    const [createUrl, createOpts] = fetchSpy.mock.calls[3];
    expect(createUrl).toContain('https://www.googleapis.com/drive/v3/files');
    const body = JSON.parse(createOpts?.body as string);
    expect(body.name).toBe('Meu TCC de Engenharia');
    expect(body.parents).toEqual(['root_redija_id']);
    expect(body.appProperties.redijaProjectId).toBe(mockProject.id);
  });

  it('salva o arquivo .redija dentro da pasta estruturada do projeto via POST multipart', async () => {
    const mockProject = createProjectFromTemplate('tcc', 'Meu Trabalho');
    const fakeToken = 'token_abc';

    // Mock flexível de fetch baseado em URL
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method || 'GET';

      // 1. Busca arquivo .redija existente
      if (url.includes('/drive/v3/files?') && url.includes('redijaProjectId') && !url.includes('folder')) {
        return { ok: true, json: async () => ({ files: [] }) } as Response;
      }
      if (url.includes('/drive/v3/files?') && url.includes("name = 'Meu Trabalho.redija'")) {
        return { ok: true, json: async () => ({ files: [] }) } as Response;
      }

      // 2. Pasta raiz RedijaApp
      if (url.includes("name = 'RedijaApp'")) {
        return { ok: true, json: async () => ({ files: [{ id: 'root_id', name: 'RedijaApp' }] }) } as Response;
      }

      // 3. Pasta do projeto
      if (url.includes('redijaProjectId') && url.includes('folder')) {
        return { ok: true, json: async () => ({ files: [{ id: 'proj_folder_id', name: 'Meu Trabalho' }] }) } as Response;
      }

      // 4. Criação do arquivo .redija multipart
      if (url.includes('/upload/drive/v3/files?uploadType=multipart') && method === 'POST') {
        return { ok: true, json: async () => ({ id: 'drive_file_abc', modifiedTime: '2026-11-07T04:00:00Z' }) } as Response;
      }

      return { ok: true, json: async () => ({}) } as Response;
    });

    const result = await saveProjectToDrive(mockProject, fakeToken);
    expect(result.fileId).toBe('drive_file_abc');

    // Verifica que o multipart enviou parents com a pasta do projeto
    const multipartCall = fetchSpy.mock.calls.find((call) =>
      String(call[0]).includes('/upload/drive/v3/files?uploadType=multipart'),
    );
    expect(multipartCall).toBeDefined();
  });

  it('atualiza arquivo existente no Drive via PATCH mantendo vínculo com a pasta', async () => {
    const mockProject = createProjectFromTemplate('artigo', 'Artigo Publicado');
    mockProject.driveFileId = 'existing_file_999';
    const fakeToken = 'token_abc';

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method || 'GET';

      // Pasta RedijaApp e pasta do projeto
      if (url.includes("name = 'RedijaApp'")) {
        return { ok: true, json: async () => ({ files: [{ id: 'root_id', name: 'RedijaApp' }] }) } as Response;
      }
      if (url.includes('folder')) {
        return { ok: true, json: async () => ({ files: [{ id: 'proj_folder_id', name: 'Artigo Publicado' }] }) } as Response;
      }

      // PATCH metadata
      if (url.includes('/drive/v3/files/existing_file_999') && method === 'PATCH') {
        return { ok: true, json: async () => ({}) } as Response;
      }

      // PATCH media
      if (url.includes('/upload/drive/v3/files/existing_file_999') && method === 'PATCH') {
        return { ok: true, json: async () => ({ id: 'existing_file_999' }) } as Response;
      }

      return { ok: true, json: async () => ({}) } as Response;
    });

    const result = await saveProjectToDrive(mockProject, fakeToken);
    expect(result.fileId).toBe('existing_file_999');
  });

  it('salva cópia em PDF dentro da pasta do projeto no Drive via POST multipart', async () => {
    const mockProject = createProjectFromTemplate('tcc', 'Meu Trabalho');
    const fakePdfBytes = new Uint8Array([37, 80, 68, 70]);
    const fakeToken = 'token_abc';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method || 'GET';

      // 1. Busca se já existe PDF (não encontra)
      if (url.includes('isRedijaPdf') && method === 'GET') {
        return { ok: true, json: async () => ({ files: [] }) } as Response;
      }
      if (url.includes('mimeType = %27application%2Fpdf%27') && method === 'GET') {
        return { ok: true, json: async () => ({ files: [] }) } as Response;
      }

      // 2. Pasta raiz e pasta do projeto
      if (url.includes("name = 'RedijaApp'")) {
        return { ok: true, json: async () => ({ files: [{ id: 'root_id', name: 'RedijaApp' }] }) } as Response;
      }
      if (url.includes('folder')) {
        return { ok: true, json: async () => ({ files: [{ id: 'proj_folder_id', name: 'Meu Trabalho' }] }) } as Response;
      }

      // 3. Criação do PDF multipart
      if (url.includes('/upload/drive/v3/files?uploadType=multipart') && method === 'POST') {
        return { ok: true, json: async () => ({ id: 'pdf_drive_id_123', modifiedTime: '2026-11-07T05:00:00Z' }) } as Response;
      }

      return { ok: true, json: async () => ({}) } as Response;
    });

    const result = await saveProjectPdfToDrive(mockProject, fakePdfBytes, fakeToken);
    expect(result?.fileId).toBe('pdf_drive_id_123');
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('atualiza arquivo PDF existente no Drive via PATCH media', async () => {
    const mockProject = createProjectFromTemplate('tcc', 'Meu Trabalho');
    const fakePdfBytes = new Uint8Array([37, 80, 68, 70]);
    const fakeToken = 'token_abc';

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method || 'GET';

      // Encontra PDF existente
      if (url.includes('isRedijaPdf') && method === 'GET') {
        return { ok: true, json: async () => ({ files: [{ id: 'pdf_existing_id', modifiedTime: '2026-11-07T03:00:00Z' }] }) } as Response;
      }

      // Pasta RedijaApp e do projeto
      if (url.includes("name = 'RedijaApp'")) {
        return { ok: true, json: async () => ({ files: [{ id: 'root_id', name: 'RedijaApp' }] }) } as Response;
      }
      if (url.includes('folder')) {
        return { ok: true, json: async () => ({ files: [{ id: 'proj_folder_id', name: 'Meu Trabalho' }] }) } as Response;
      }

      // PATCH metadata
      if (url.includes('/drive/v3/files/pdf_existing_id') && method === 'PATCH') {
        return { ok: true, json: async () => ({}) } as Response;
      }

      // PATCH media
      if (url.includes('/upload/drive/v3/files/pdf_existing_id') && method === 'PATCH') {
        return { ok: true, json: async () => ({ id: 'pdf_existing_id' }) } as Response;
      }

      return { ok: true, json: async () => ({}) } as Response;
    });

    const result = await saveProjectPdfToDrive(mockProject, fakePdfBytes, fakeToken);
    expect(result?.fileId).toBe('pdf_existing_id');
  });

  it('carrega e valida projeto a partir do Drive', async () => {
    const mockProject = createProjectFromTemplate('relatorio', 'Relatório Técnico');
    const fakeBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      project: mockProject,
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => fakeBackup,
    } as Response);

    const loaded = await loadProjectFromDrive('drive_file_456', 'mock_token');
    expect(loaded.id).toBe(mockProject.id);
    expect(loaded.name).toBe('Relatório Técnico');
    expect(loaded.driveFileId).toBe('drive_file_456');
    expect(loaded.driveSyncedAt).toBeDefined();
  });

  it('lista projetos identificando próprios vs compartilhados', async () => {
    const mockFilesResponse = {
      files: [
        {
          id: 'file_own',
          name: 'TCC Final.redija',
          modifiedTime: '2026-11-07T03:00:00Z',
          sharedWithMeTime: null,
          owners: [{ displayName: 'Eu Mesmo', emailAddress: 'eu@gmail.com' }],
        },
        {
          id: 'file_shared',
          name: 'Artigo Grupo.redija',
          modifiedTime: '2026-11-07T02:00:00Z',
          sharedWithMeTime: '2026-11-06T12:00:00Z',
          sharingUser: { displayName: 'Colega de Grupo', emailAddress: 'colega@gmail.com' },
          owners: [{ displayName: 'Colega de Grupo', emailAddress: 'colega@gmail.com' }],
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockFilesResponse,
    } as Response);

    const list = await listDriveProjects('mock_token');
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('file_own');
    expect(list[0].isSharedWithMe).toBe(false);
    expect(list[1].id).toBe('file_shared');
    expect(list[1].isSharedWithMe).toBe(true);
    expect(list[1].sharedBy?.email).toBe('colega@gmail.com');
  });

  it('convida colaborador com role writer via permissions API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'new_permission_id' }),
    } as Response);

    await inviteCollaborator('file_xyz', 'orientador@universidade.edu.br', 'token_123');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain('https://www.googleapis.com/drive/v3/files/file_xyz/permissions');
    expect(options?.method).toBe('POST');
    const parsedBody = JSON.parse(options?.body as string);
    expect(parsedBody.role).toBe('writer');
    expect(parsedBody.emailAddress).toBe('orientador@universidade.edu.br');
  });

  it('lista colaboradores existentes no arquivo do Google Drive', async () => {
    const mockPermissions = {
      permissions: [
        {
          id: 'perm_owner',
          displayName: 'Dono do Trabalho',
          emailAddress: 'dono@gmail.com',
          role: 'owner',
        },
        {
          id: 'perm_collab',
          displayName: 'Colega de Grupo',
          emailAddress: 'colega@gmail.com',
          role: 'writer',
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockPermissions,
    } as Response);

    const list = await listCollaborators('file_xyz', 'mock_token');
    expect(list).toHaveLength(2);
    expect(list[0].role).toBe('owner');
    expect(list[1].role).toBe('writer');
    expect(list[1].emailAddress).toBe('colega@gmail.com');
  });

  it('bloqueia envio no Drive quando shareRole é somente leitura (reader/commenter)', async () => {
    const readOnlyProj = createProjectFromTemplate('tcc', 'Trabalho Leitura');
    readOnlyProj.driveFileId = 'shared_ro_file';
    readOnlyProj.isSharedWithMe = true;
    readOnlyProj.shareRole = 'reader';

    await expect(saveProjectToDrive(readOnlyProj, 'token_ro')).rejects.toMatchObject({
      name: 'DriveAccessError',
      code: 'READ_ONLY',
    });

    const pdfRes = await saveProjectPdfToDrive(
      readOnlyProj,
      new Uint8Array([37, 80, 68, 70]),
      'token_ro',
    );
    expect(pdfRes).toBeNull();
  });

  it('atualiza arquivo compartilhado diretamente por uploadType=media sem addParents e higieniza payload canônico', async () => {
    const sharedWriterProj = createProjectFromTemplate('artigo', 'Artigo Compartilhado');
    sharedWriterProj.driveFileId = 'shared_writer_123';
    sharedWriterProj.isSharedWithMe = true;
    sharedWriterProj.shareRole = 'writer';
    sharedWriterProj.ownerEmail = 'coautor@uf.br';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'shared_writer_123',
        modifiedTime: '2026-11-09T12:00:00Z',
      }),
    } as Response);

    const res = await saveProjectToDrive(sharedWriterProj, 'token_writer');
    expect(res.fileId).toBe('shared_writer_123');
    expect(res.collabSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);

    // Apenas 1 PATCH direto de mídia sem consultar pastas ou addParents
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/upload/drive/v3/files/shared_writer_123?uploadType=media');
    expect(String(url)).not.toContain('addParents');

    const sentBackup = JSON.parse(String(init?.body));
    expect(sentBackup.project.collabSecret).toBe(res.collabSecret);
    expect(sentBackup.project.shareRole).toBeUndefined();
    expect(sentBackup.project.isSharedWithMe).toBeUndefined();
    expect(sentBackup.project.ownerEmail).toBeUndefined();
  });

  it('carrega projeto compartilhado inferindo role reader, bloqueando PDF e sinalizando 404 NOT_FOUND_OR_SCOPE', async () => {
    const sampleProj = createProjectFromTemplate('tcc', 'TCC Compartilhado');

    // 1. Metadata indicando leitor + download do arquivo .redija
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'shared_ro_99',
          name: 'TCC Compartilhado.redija',
          mimeType: 'application/json',
          modifiedTime: '2026-11-09T10:00:00Z',
          capabilities: { canEdit: false, canComment: false },
          owners: [{ displayName: 'Dono', emailAddress: 'dono@uf.br' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: 1,
          exportedAt: '2026-11-09T10:00:00Z',
          project: sampleProj,
        }),
      } as Response);

    const loaded = await loadSharedProjectFromDrive('shared_ro_99', 'token_ok', 'leitor@uf.br');
    expect(loaded.shareRole).toBe('reader');
    expect(loaded.isSharedWithMe).toBe(true);
    expect(loaded.sharedBy?.email).toBe('dono@uf.br');

    // 2. Tentativa de abrir PDF compartilhado deve falhar com INVALID_FORMAT
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'shared_pdf_1',
        name: 'Artigo.pdf',
        mimeType: 'application/pdf',
      }),
    } as Response);

    await expect(loadSharedProjectFromDrive('shared_pdf_1', 'token_ok')).rejects.toMatchObject({
      name: 'DriveAccessError',
      code: 'INVALID_FORMAT',
    });

    // 3. HTTP 404 (escopo drive.file ainda não concedido) -> NOT_FOUND_OR_SCOPE
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: 'File not found' } }),
    } as Response);

    await expect(loadSharedProjectFromDrive('shared_hidden', 'token_ok')).rejects.toBeInstanceOf(
      DriveAccessError,
    );
  });

  it('envia emailMessage com link direto e consulta getDriveFileModifiedTime corretamente', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'perm_1' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ modifiedTime: '2026-11-09T18:30:00.000Z' }),
      } as Response);

    await inviteCollaborator('file_99', 'revisor@uf.br', 'tok', {
      role: 'reader',
      projectName: 'TCC Redes',
      shareUrl: 'https://redija.app/?driveFileId=file_99',
    });

    const [inviteUrl, inviteInit] = fetchSpy.mock.calls[0];
    expect(String(inviteUrl)).toContain('emailMessage=');
    expect(decodeURIComponent(String(inviteUrl))).toContain('https://redija.app/?driveFileId=file_99');
    expect(JSON.parse(String(inviteInit?.body)).role).toBe('reader');

    const modified = await getDriveFileModifiedTime('file_99', 'tok');
    expect(modified).toBe('2026-11-09T18:30:00.000Z');
  });
});
