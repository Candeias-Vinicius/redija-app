import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveProjectToDrive,
  loadProjectFromDrive,
  listDriveProjects,
  inviteCollaborator,
  listCollaborators,
} from '../googleDriveService';
import { createProjectFromTemplate } from '../projectTemplates';

describe('Google Drive Service (BYOS & Colaboração)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('cria novo arquivo no Drive via POST multipart quando o projeto não tem driveFileId e não existe no Drive', async () => {
    const mockProject = createProjectFromTemplate('tcc', 'Meu Trabalho');
    const fakeToken = 'mock_access_token_123';

    // 1. Busca por appProperties (não encontra)
    // 2. Busca por nome (não encontra)
    // 3. Criação POST multipart
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
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
        json: async () => ({ id: 'drive_file_abc', modifiedTime: '2026-11-07T04:00:00Z' }),
      } as Response);

    const result = await saveProjectToDrive(mockProject, fakeToken);

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    const [url, options] = fetchSpy.mock.calls[2];
    expect(url).toContain('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toMatchObject({
      Authorization: `Bearer ${fakeToken}`,
    });
    expect(result.fileId).toBe('drive_file_abc');
  });

  it('reaproveita e atualiza arquivo existente no Drive via PATCH quando projeto local ainda não tem driveFileId (evita duplicatas)', async () => {
    const mockProject = createProjectFromTemplate('tcc', 'Meu Trabalho');
    const fakeToken = 'mock_access_token_123';

    // 1. Busca por appProperties (encontra arquivo já criado no Drive)
    // 2. PATCH metadata
    // 3. PATCH media
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          files: [{ id: 'existing_drive_found', modifiedTime: '2026-11-07T02:00:00Z' }],
        }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'existing_drive_found' }),
      } as Response);

    const result = await saveProjectToDrive(mockProject, fakeToken);

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    const [urlPatch] = fetchSpy.mock.calls[1];
    expect(urlPatch).toContain('https://www.googleapis.com/drive/v3/files/existing_drive_found');
    expect(result.fileId).toBe('existing_drive_found');
  });

  it('atualiza arquivo existente no Drive via PATCH quando o projeto já possui driveFileId', async () => {
    const mockProject = createProjectFromTemplate('artigo', 'Artigo Publicado');
    mockProject.driveFileId = 'existing_file_999';
    const fakeToken = 'mock_access_token_123';

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response) // PATCH metadata
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'existing_file_999' }),
      } as Response); // PATCH media

    const result = await saveProjectToDrive(mockProject, fakeToken);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.fileId).toBe('existing_file_999');
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
      json: async () => ({ id: 'perm_123' }),
    } as Response);

    await inviteCollaborator('file_xyz', 'orientador@universidade.edu.br', 'mock_token');

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
});
