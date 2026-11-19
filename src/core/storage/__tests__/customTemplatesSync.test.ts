import 'fake-indexeddb/auto';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, type StoredCustomTemplate } from '../db';
import {
  addCustomTemplate,
  flushCustomTemplates,
  getCustomTemplates,
  loadCustomTemplates,
  removeCustomTemplate,
  resetCustomTemplatesForTests,
  restoreCustomTemplate,
} from '../customTemplates';
import { parseCustomTemplatesPayload, serializeCustomTemplatesPayload } from '../customTemplatesMerge';
import { syncCustomTemplatesWithDrive } from '../customTemplatesSync';
import { listDriveProjects } from '../googleDriveService';
import { createFakeDrive, installMemoryLocalStorage, type FakeDrive } from './fakeDrive';

const ACCOUNT = 'aluno@gmail.com';
const TOKEN = 'token-real';
let drive: FakeDrive;

beforeAll(() => {
  installMemoryLocalStorage();
});

beforeEach(async () => {
  await flushCustomTemplates();
  resetCustomTemplatesForTests();
  await db.customTemplates.clear();
  drive = createFakeDrive();
  vi.spyOn(globalThis, 'fetch').mockImplementation(drive.fetch);
  await loadCustomTemplates();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Guarda o IndexedDB do "aparelho" atual. */
async function snapshotDevice(): Promise<StoredCustomTemplate[]> {
  await flushCustomTemplates();
  return db.customTemplates.toArray();
}

/** Simula abrir o app em outro aparelho (ou voltar a um), com o IndexedDB dele. */
async function switchToDevice(rows: StoredCustomTemplate[] = []): Promise<void> {
  await flushCustomTemplates();
  resetCustomTemplatesForTests();
  await db.customTemplates.clear();
  if (rows.length > 0) await db.customTemplates.bulkPut(rows);
  await loadCustomTemplates();
}

function remoteTemplates() {
  const files = drive.templateFiles();
  expect(files).toHaveLength(1);
  return parseCustomTemplatesPayload(files[0].content);
}

describe('Sincronização dos modelos personalizados com o Drive', () => {
  it('cria redija-modelos.json na pasta RedijaApp, marcado com appProperties', async () => {
    addCustomTemplate(ACCOUNT, { name: 'IEEE', packageId: '@preview/charged-ieee:0.1.4' });
    const result = await syncCustomTemplatesWithDrive(ACCOUNT, TOKEN);

    expect(result).toMatchObject({ status: 'synced', uploaded: true });
    const [file] = drive.templateFiles();
    expect(file.name).toBe('redija-modelos.json');
    expect(file.appProperties).toEqual({ isRedijaCustomTemplates: 'true' });
    const folder = drive.files.get(file.parents[0]);
    expect(folder?.name).toBe('RedijaApp');
    expect(remoteTemplates().map((t) => t.name)).toEqual(['IEEE']);
  });

  it('não cria arquivo no Drive quando a conta não tem modelos', async () => {
    const result = await syncCustomTemplatesWithDrive(ACCOUNT, TOKEN);
    expect(result.uploaded).toBe(false);
    expect(drive.templateFiles()).toHaveLength(0);
  });

  it('um modelo adicionado num aparelho aparece no outro, e a remoção também chega', async () => {
    // Aparelho A adiciona e sincroniza
    const added = addCustomTemplate(ACCOUNT, { name: 'IEEE', packageId: '@preview/charged-ieee:0.1.4' });
    await syncCustomTemplatesWithDrive(ACCOUNT, TOKEN);
    const deviceA = await snapshotDevice();

    // Aparelho B (navegador novo) recebe ao entrar com o Google
    await switchToDevice();
    expect(getCustomTemplates(ACCOUNT)).toEqual([]);
    const onB = await syncCustomTemplatesWithDrive(ACCOUNT, TOKEN);
    expect(onB.changedLocal).toBe(true);
    expect(getCustomTemplates(ACCOUNT).map((t) => [t.id, t.name])).toEqual([[added.id, 'IEEE']]);

    // B remove; o arquivo do Drive passa a ter a marca de exclusão
    removeCustomTemplate(ACCOUNT, added.id);
    await syncCustomTemplatesWithDrive(ACCOUNT, TOKEN);
    expect(remoteTemplates()[0].deletedAt).not.toBeNull();
    const deviceB = await snapshotDevice();

    // A ainda tinha o modelo: a sincronização remove em vez de ressuscitar
    await switchToDevice(deviceA);
    expect(getCustomTemplates(ACCOUNT)).toHaveLength(1);
    await syncCustomTemplatesWithDrive(ACCOUNT, TOKEN);
    expect(getCustomTemplates(ACCOUNT)).toEqual([]);
    expect(remoteTemplates()[0].deletedAt).not.toBeNull();

    // "Desfazer" em A volta a valer em B
    const removed = remoteTemplates()[0];
    restoreCustomTemplate(ACCOUNT, removed);
    await syncCustomTemplatesWithDrive(ACCOUNT, TOKEN);
    await switchToDevice(deviceB);
    expect(getCustomTemplates(ACCOUNT)).toEqual([]);
    await syncCustomTemplatesWithDrive(ACCOUNT, TOKEN);
    expect(getCustomTemplates(ACCOUNT).map((t) => t.id)).toEqual([added.id]);
  });

  it('mescla os dois lados quando os dois aparelhos adicionaram modelos diferentes', async () => {
    drive.addFile({
      id: 'existente',
      name: 'redija-modelos.json',
      appProperties: { isRedijaCustomTemplates: 'true' },
      content: serializeCustomTemplatesPayload([
        {
          id: 'remoto',
          name: 'Slides',
          packageId: '@preview/touying:0.5.3',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          deletedAt: null,
        },
      ]),
    });
    addCustomTemplate(ACCOUNT, { name: 'IEEE', packageId: '@preview/charged-ieee:0.1.4' });

    const result = await syncCustomTemplatesWithDrive(ACCOUNT, TOKEN);
    expect(result).toMatchObject({ changedLocal: true, uploaded: true });
    expect(getCustomTemplates(ACCOUNT).map((t) => t.name)).toEqual(['Slides', 'IEEE']);
    expect(drive.templateFiles().map((f) => f.id)).toEqual(['existente']);
    expect(remoteTemplates().map((t) => t.name)).toEqual(['Slides', 'IEEE']);
  });

  it('junta cópias duplicadas do arquivo (criadas ao mesmo tempo) no mais antigo', async () => {
    const make = (id: string, name: string, packageId: string) =>
      serializeCustomTemplatesPayload([
        { id, name, packageId, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: null },
      ]);
    drive.addFile({ id: 'antigo', name: 'redija-modelos.json', appProperties: { isRedijaCustomTemplates: 'true' }, content: make('x', 'X', '@preview/touying:0.5.3') });
    drive.addFile({ id: 'novo', name: 'redija-modelos.json', appProperties: { isRedijaCustomTemplates: 'true' }, content: make('y', 'Y', '@preview/charged-ieee:0.1.4') });

    await syncCustomTemplatesWithDrive(ACCOUNT, TOKEN);
    expect(drive.templateFiles().map((f) => f.id)).toEqual(['antigo']);
    expect(remoteTemplates().map((t) => t.id).sort()).toEqual(['x', 'y']);
    expect(getCustomTemplates(ACCOUNT)).toHaveLength(2);
  });

  it('chamadas simultâneas não se sobrepõem e a alteração feita no meio também é enviada', async () => {
    addCustomTemplate(ACCOUNT, { name: 'IEEE', packageId: '@preview/charged-ieee:0.1.4' });
    const first = syncCustomTemplatesWithDrive(ACCOUNT, TOKEN);
    addCustomTemplate(ACCOUNT, { name: 'Slides', packageId: '@preview/touying:0.5.3' });
    const second = syncCustomTemplatesWithDrive(ACCOUNT, TOKEN);
    expect(second).toBe(first);
    await first;
    expect(drive.templateFiles()).toHaveLength(1);
    // Adicionados no mesmo milissegundo: a ordem entre os dois não importa aqui
    expect(remoteTemplates().map((t) => t.name).sort()).toEqual(['IEEE', 'Slides']);
  });

  it('a listagem de projetos .redija ignora o arquivo de modelos', async () => {
    drive.addFile({ id: 'modelos', name: 'redija-modelos.json', appProperties: { isRedijaCustomTemplates: 'true' } });
    drive.addFile({ id: 'tcc', name: 'TCC.redija', appProperties: { redijaProjectId: 'p1' } });
    // O Drive real pode casar `name contains '.redija'` com os dois arquivos
    vi.mocked(globalThis.fetch).mockImplementationOnce(async () =>
      new Response(
        JSON.stringify({
          files: [...drive.files.values()].map((f) => ({ id: f.id, name: f.name, modifiedTime: f.modifiedTime, appProperties: f.appProperties })),
        }),
      ),
    );
    const projects = await listDriveProjects(TOKEN);
    expect(projects.map((p) => p.id)).toEqual(['tcc']);
  });
});

describe('Isolamento do perfil local na sincronização', () => {
  it('o perfil local nunca toca no Drive', async () => {
    addCustomTemplate('local', { name: 'Offline', packageId: '@preview/touying:0.5.3' });
    const result = await syncCustomTemplatesWithDrive('local', TOKEN);
    expect(result.status).toBe('skipped');
    expect(drive.requests).toEqual([]);
    expect(getCustomTemplates('local')).toHaveLength(1);
  });

  it('o Usuário Demonstração (token simulado) não chama a rede', async () => {
    addCustomTemplate(ACCOUNT, { name: 'IEEE', packageId: '@preview/charged-ieee:0.1.4' });
    const result = await syncCustomTemplatesWithDrive(ACCOUNT, 'mock_dev_token_xyz');
    expect(result.status).toBe('skipped');
    expect(drive.requests).toEqual([]);
  });

  it('os modelos do perfil local não são enviados nem mesclados na conta Google', async () => {
    addCustomTemplate('local', { name: 'Offline', packageId: '@preview/touying:0.5.3' });
    addCustomTemplate(ACCOUNT, { name: 'Da conta', packageId: '@preview/charged-ieee:0.1.4' });
    drive.addFile({
      id: 'existente',
      name: 'redija-modelos.json',
      appProperties: { isRedijaCustomTemplates: 'true' },
      content: serializeCustomTemplatesPayload([
        {
          id: 'remoto',
          name: 'Do outro aparelho',
          packageId: '@preview/postercise:0.2.0',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          deletedAt: null,
        },
      ]),
    });

    await syncCustomTemplatesWithDrive(ACCOUNT, TOKEN);

    expect(remoteTemplates().map((t) => t.name)).toEqual(['Do outro aparelho', 'Da conta']);
    expect(getCustomTemplates('local').map((t) => t.name)).toEqual(['Offline']);
    expect(getCustomTemplates(ACCOUNT).map((t) => t.name)).toEqual(['Do outro aparelho', 'Da conta']);
    const localRows = await db.customTemplates.where('ownerEmail').equals('local').toArray();
    expect(localRows.map((r) => r.name)).toEqual(['Offline']);
  });
});
