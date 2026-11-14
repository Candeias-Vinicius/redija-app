import 'fake-indexeddb/auto';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { DocumentProject } from '@/types/document';
import { createProjectFromTemplate } from '../projectTemplates';
import {
  addDriveTombstone,
  planDriveTrashReconciliation,
  readDriveTombstones,
  removeDriveTombstone,
  resolveRestoredProjectName,
} from '../driveTrash';
import { pushTrashStateToDrive, purgeProjectFromDrive } from '../driveTrashSync';
import { db, getProject, purgeExpiredTrash, saveProject } from '../db';

const OWNER = 'aluno@gmail.com';

// localStorage em memória para o ambiente Node do Vitest
beforeAll(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      clear: () => store.clear(),
    },
    writable: true,
    configurable: true,
  });
});

function makeProject(overrides: Partial<DocumentProject> = {}): DocumentProject {
  return {
    ...createProjectFromTemplate('em_branco', 'Projeto'),
    ownerEmail: OWNER,
    driveFileId: 'file_1',
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown = {}): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe('planDriveTrashReconciliation', () => {
  const active = (...ids: string[]) => new Set(ids);
  const trashed = (...ids: string[]) => new Set(ids);

  it('nunca reimporta projeto que está na lixeira local e reenvia a exclusão pendente ao Drive', () => {
    const project = makeProject({ deletedAt: new Date().toISOString(), driveTrashSync: 'pending-trash' });
    const plan = planDriveTrashReconciliation([project], active('file_1'), trashed());

    expect(plan.skipFileIds.has('file_1')).toBe(true);
    expect(plan.actions).toEqual([{ kind: 'retry-drive-trash', project }]);
  });

  it('trata lixeira legada (sem estado de sincronização) como exclusão pendente', () => {
    const project = makeProject({ deletedAt: new Date().toISOString() });
    const plan = planDriveTrashReconciliation([project], active('file_1'), trashed());

    expect(plan.skipFileIds.has('file_1')).toBe(true);
    expect(plan.actions[0].kind).toBe('retry-drive-trash');
  });

  it('marca como sincronizado quando o Drive já está com o arquivo na lixeira', () => {
    const project = makeProject({ deletedAt: new Date().toISOString(), driveTrashSync: 'pending-trash' });
    const plan = planDriveTrashReconciliation([project], active(), trashed('file_1'));

    expect(plan.actions).toEqual([{ kind: 'mark-synced', project }]);
  });

  it('propaga restauração feita em outro dispositivo só quando a lixeira já estava confirmada', () => {
    const project = makeProject({ deletedAt: new Date().toISOString(), driveTrashSync: 'synced' });
    const plan = planDriveTrashReconciliation([project], active('file_1'), trashed());

    expect(plan.skipFileIds.has('file_1')).toBe(false);
    expect(plan.actions).toEqual([{ kind: 'restore-locally', project }]);
  });

  it('propaga exclusão feita em outro dispositivo para a lixeira local', () => {
    const project = makeProject();
    const plan = planDriveTrashReconciliation([project], active(), trashed('file_1'));

    expect(plan.skipFileIds.has('file_1')).toBe(true);
    expect(plan.actions).toEqual([{ kind: 'trash-locally', project }]);
  });

  it('reenvia restauração pendente e não move o projeto de volta para a lixeira', () => {
    const project = makeProject({ driveTrashSync: 'pending-restore' });
    const plan = planDriveTrashReconciliation([project], active(), trashed('file_1'));

    expect(plan.actions).toEqual([{ kind: 'retry-drive-restore', project }]);
  });

  it('mantém escondido um arquivo compartilhado que o usuário tirou da lista', () => {
    const project = makeProject({ deletedAt: new Date().toISOString(), driveTrashSync: 'local-only' });
    const plan = planDriveTrashReconciliation([project], active('file_1'), trashed());

    expect(plan.skipFileIds.has('file_1')).toBe(true);
    expect(plan.actions).toEqual([]);
  });

  it('não faz nada com projetos ativos e sincronizados', () => {
    const plan = planDriveTrashReconciliation([makeProject()], active('file_1'), trashed());
    expect(plan.actions).toEqual([]);
    expect(plan.skipFileIds.size).toBe(0);
  });
});

describe('resolveRestoredProjectName', () => {
  it('mantém o nome quando não há conflito', () => {
    expect(resolveRestoredProjectName('Meu TCC', ['Outro'])).toBe('Meu TCC');
  });

  it('adiciona sufixo quando já existe projeto ativo homônimo (sem diferenciar maiúsculas)', () => {
    expect(resolveRestoredProjectName('Meu TCC', ['meu tcc'])).toBe('Meu TCC (restaurado)');
    expect(
      resolveRestoredProjectName('Meu TCC', ['Meu TCC', 'Meu TCC (restaurado)']),
    ).toBe('Meu TCC (restaurado 2)');
  });
});

describe('Tombstones de exclusão definitiva', () => {
  beforeEach(() => localStorage.clear());

  it('grava, lê e remove marcas por usuário', () => {
    addDriveTombstone(OWNER, 'file_1', 'delete', 'proj_1');
    addDriveTombstone('outro@gmail.com', 'file_2', 'hide', 'proj_2');

    expect(Object.keys(readDriveTombstones(OWNER))).toEqual(['file_1']);
    removeDriveTombstone(OWNER, 'file_1');
    expect(readDriveTombstones(OWNER)).toEqual({});
    expect(Object.keys(readDriveTombstones('outro@gmail.com'))).toEqual(['file_2']);
  });

  it('expira marcas de exclusão antigas, mas mantém as de arquivos escondidos', () => {
    const old = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(
      `redija:driveTombstones:${OWNER}`,
      JSON.stringify({
        file_old: { mode: 'delete', projectId: 'a', at: old },
        file_hidden: { mode: 'hide', projectId: 'b', at: old },
      }),
    );
    expect(Object.keys(readDriveTombstones(OWNER))).toEqual(['file_hidden']);
  });
});

describe('Aplicação da lixeira no Google Drive', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    await db.projects.clear();
  });

  it('envia o arquivo para a lixeira do Drive e marca como sincronizado', async () => {
    const project = makeProject({ deletedAt: new Date().toISOString(), driveTrashSync: 'pending-trash' });
    await saveProject(project, false);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(200, { id: 'file_1' }))
      .mockResolvedValueOnce(jsonResponse(200, { files: [{ id: 'pdf_1' }] }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 'pdf_1' }));

    const state = await pushTrashStateToDrive(project, true, 'token');

    expect(state).toBe('synced');
    expect((await getProject(project.id))?.driveTrashSync).toBe('synced');
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://www.googleapis.com/drive/v3/files/file_1');
    expect(JSON.parse(String(opts?.body))).toEqual({ trashed: true });
    // A cópia em PDF acompanha o projeto
    expect(fetchSpy.mock.calls[2][0]).toBe('https://www.googleapis.com/drive/v3/files/pdf_1');
  });

  it('mantém pendente quando o Drive falha ou não há token', async () => {
    const project = makeProject({ deletedAt: new Date().toISOString() });
    await saveProject(project, false);

    expect(await pushTrashStateToDrive(project, true, null)).toBe('pending-trash');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse(500));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await pushTrashStateToDrive(project, true, 'token')).toBe('pending-trash');
    expect((await getProject(project.id))?.driveTrashSync).toBe('pending-trash');
  });

  it('esconde só localmente quando o usuário não tem permissão no arquivo (compartilhado)', async () => {
    const project = makeProject({ deletedAt: new Date().toISOString() });
    await saveProject(project, false);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(403, {
        error: { message: 'no', errors: [{ reason: 'insufficientFilePermissions' }] },
      }),
    );

    expect(await pushTrashStateToDrive(project, true, 'token')).toBe('local-only');
  });

  it('não confunde limite de requisições (403) com falta de permissão', async () => {
    const project = makeProject({ deletedAt: new Date().toISOString() });
    await saveProject(project, false);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(403, { error: { errors: [{ reason: 'userRateLimitExceeded' }] } }),
    );

    expect(await pushTrashStateToDrive(project, true, 'token')).toBe('pending-trash');
  });

  it('exclusão definitiva grava marca antes e só a remove quando o Drive confirma', async () => {
    const project = makeProject();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse(500));
    await purgeProjectFromDrive(OWNER, project, 'token');
    expect(readDriveTombstones(OWNER).file_1?.mode).toBe('delete');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(204, { files: [] }));
    await purgeProjectFromDrive(OWNER, project, 'token');
    expect(readDriveTombstones(OWNER)).toEqual({});
  });

  it('exclusão definitiva de arquivo compartilhado só esconde, sem chamar o Drive', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await purgeProjectFromDrive(OWNER, makeProject({ isSharedWithMe: true }), 'token');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(readDriveTombstones(OWNER).file_1?.mode).toBe('hide');
  });

  it('expurgo de 30 dias deixa marca quando o Drive nunca confirmou a lixeira', async () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    await saveProject(makeProject({ deletedAt: old, driveTrashSync: 'pending-trash' }), false);
    await saveProject(
      makeProject({ id: 'p2', driveFileId: 'file_2', deletedAt: old, driveTrashSync: 'synced' }),
      false,
    );

    expect(await purgeExpiredTrash()).toBe(2);
    expect(Object.keys(readDriveTombstones(OWNER))).toEqual(['file_1']);
  });
});
