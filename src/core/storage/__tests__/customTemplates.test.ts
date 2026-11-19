import 'fake-indexeddb/auto';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import {
  addCustomTemplate,
  findCustomTemplateByPackage,
  flushCustomTemplates,
  getCustomTemplateRecords,
  getCustomTemplates,
  isSyncableTemplatesOwner,
  LEGACY_STORAGE_PREFIX,
  loadCustomTemplates,
  purgeCustomTemplatesForOwner,
  removeCustomTemplate,
  resetCustomTemplatesForTests,
  restoreCustomTemplate,
  subscribeCustomTemplateMutations,
  subscribeCustomTemplates,
} from '../customTemplates';
import { installMemoryLocalStorage } from './fakeDrive';

const ACCOUNT = 'aluno@gmail.com';
let storage: Map<string, string>;

beforeAll(() => {
  storage = installMemoryLocalStorage();
});

beforeEach(async () => {
  await flushCustomTemplates();
  resetCustomTemplatesForTests();
  storage.clear();
  await db.customTemplates.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Migração dos modelos do localStorage para o IndexedDB', () => {
  it('migra cada perfil uma vez, preserva o dono e apaga as chaves antigas', async () => {
    storage.set(
      `${LEGACY_STORAGE_PREFIX}local`,
      JSON.stringify([
        { id: 'l1', name: 'Pôster local', packageId: '@preview/postercise:0.2.0', createdAt: '2026-02-01T10:00:00.000Z' },
      ]),
    );
    storage.set(
      `${LEGACY_STORAGE_PREFIX}${ACCOUNT}`,
      JSON.stringify([
        { id: 'g1', name: 'IEEE', packageId: '@preview/charged-ieee:0.1.4', createdAt: '2026-02-02T10:00:00.000Z' },
        { id: 'g2', name: 'Slides', packageId: '@preview/touying:0.5.3', createdAt: '2026-02-03T10:00:00.000Z' },
        { id: 'quebrado', name: 'Sem pacote' },
      ]),
    );
    storage.set('redija:beta_notice_dismissed', 'true');

    await loadCustomTemplates();

    expect(getCustomTemplates('local').map((t) => t.id)).toEqual(['l1']);
    expect(getCustomTemplates(ACCOUNT).map((t) => t.id)).toEqual(['g1', 'g2']);
    expect(getCustomTemplates(ACCOUNT)[0]).toMatchObject({
      updatedAt: '2026-02-02T10:00:00.000Z',
      deletedAt: null,
    });

    const rows = await db.customTemplates.orderBy('id').toArray();
    expect(rows.map((r) => [r.id, r.ownerEmail])).toEqual([
      ['g1', ACCOUNT],
      ['g2', ACCOUNT],
      ['l1', 'local'],
    ]);
    expect([...storage.keys()]).toEqual(['redija:beta_notice_dismissed']);

    // Uma segunda abertura do app não duplica nada
    resetCustomTemplatesForTests();
    await loadCustomTemplates();
    expect(await db.customTemplates.count()).toBe(3);
    expect(getCustomTemplates(ACCOUNT)).toHaveLength(2);
  });

  it('não sobrescreve uma versão mais nova que já está no IndexedDB', async () => {
    await db.customTemplates.put({
      id: 'g1',
      ownerEmail: ACCOUNT,
      name: 'Nome novo',
      packageId: '@preview/charged-ieee:0.1.4',
      createdAt: '2026-02-02T10:00:00.000Z',
      updatedAt: '2026-02-10T10:00:00.000Z',
      deletedAt: null,
    });
    storage.set(
      `${LEGACY_STORAGE_PREFIX}${ACCOUNT}`,
      JSON.stringify([
        { id: 'g1', name: 'Nome antigo', packageId: '@preview/charged-ieee:0.1.4', createdAt: '2026-02-02T10:00:00.000Z' },
      ]),
    );

    await loadCustomTemplates();
    expect(getCustomTemplates(ACCOUNT).map((t) => t.name)).toEqual(['Nome novo']);
    expect(storage.size).toBe(0);
  });

  it('descarta chave antiga corrompida sem quebrar o carregamento', async () => {
    storage.set(`${LEGACY_STORAGE_PREFIX}local`, '{não é json');
    await loadCustomTemplates();
    expect(getCustomTemplates('local')).toEqual([]);
    expect(storage.size).toBe(0);
  });
});

describe('Modelos personalizados no IndexedDB', () => {
  it('mantém a mesma referência até a próxima alteração e avisa os inscritos', async () => {
    await loadCustomTemplates();
    const listener = vi.fn();
    const unsubscribe = subscribeCustomTemplates(listener);

    const before = getCustomTemplates(ACCOUNT);
    expect(getCustomTemplates(ACCOUNT)).toBe(before);

    addCustomTemplate(ACCOUNT, { name: ' Artigo IEEE ', packageId: '@preview/charged-ieee:0.1.4' });
    const after = getCustomTemplates(ACCOUNT);
    expect(after).not.toBe(before);
    expect(getCustomTemplates(ACCOUNT)).toBe(after);
    expect(after[0].name).toBe('Artigo IEEE');
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('remover deixa marca de exclusão e "Desfazer" limpa o deletedAt e atualiza o updatedAt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-01T12:00:00.000Z'));
    await loadCustomTemplates();

    const added = addCustomTemplate(ACCOUNT, { name: 'IEEE', packageId: '@preview/charged-ieee:0.1.4' });
    vi.setSystemTime(new Date('2026-04-01T12:05:00.000Z'));
    const removed = removeCustomTemplate(ACCOUNT, added.id);
    expect(removed?.id).toBe(added.id);
    expect(getCustomTemplates(ACCOUNT)).toEqual([]);
    expect(findCustomTemplateByPackage(ACCOUNT, '@preview/charged-ieee:0.1.4')).toBeUndefined();

    const tombstone = getCustomTemplateRecords(ACCOUNT)[0];
    expect(tombstone.deletedAt).toBe('2026-04-01T12:05:00.000Z');
    expect(tombstone.updatedAt).toBe('2026-04-01T12:05:00.000Z');

    vi.setSystemTime(new Date('2026-04-01T12:05:03.000Z'));
    restoreCustomTemplate(ACCOUNT, removed!);
    const restored = getCustomTemplates(ACCOUNT)[0];
    expect(restored).toMatchObject({ id: added.id, deletedAt: null, updatedAt: '2026-04-01T12:05:03.000Z' });

    await flushCustomTemplates();
    expect(await db.customTemplates.get(added.id)).toMatchObject({
      ownerEmail: ACCOUNT,
      deletedAt: null,
      updatedAt: '2026-04-01T12:05:03.000Z',
    });
  });

  it('adicionar de novo um pacote removido reaproveita o registro (a lista não cresce)', async () => {
    await loadCustomTemplates();
    const first = addCustomTemplate(ACCOUNT, { name: 'IEEE', packageId: '@preview/charged-ieee:0.1.4' });
    removeCustomTemplate(ACCOUNT, first.id);
    const again = addCustomTemplate(ACCOUNT, { name: 'IEEE de novo', packageId: '@preview/charged-ieee:0.1.4' });

    expect(again.id).toBe(first.id);
    expect(getCustomTemplateRecords(ACCOUNT)).toHaveLength(1);
    expect(getCustomTemplates(ACCOUNT)[0]).toMatchObject({ name: 'IEEE de novo', deletedAt: null });
  });

  it('persiste no IndexedDB e recarrega na próxima abertura do app', async () => {
    await loadCustomTemplates();
    addCustomTemplate(ACCOUNT, { name: 'IEEE', packageId: '@preview/charged-ieee:0.1.4' });
    await flushCustomTemplates();

    resetCustomTemplatesForTests();
    expect(getCustomTemplates(ACCOUNT)).toEqual([]);
    await loadCustomTemplates();
    expect(getCustomTemplates(ACCOUNT).map((t) => t.name)).toEqual(['IEEE']);
  });
});

describe('Isolamento do perfil local', () => {
  it('modelos do perfil local não aparecem na conta Google (e vice-versa)', async () => {
    await loadCustomTemplates();
    addCustomTemplate('local', { name: 'Só neste navegador', packageId: '@preview/touying:0.5.3' });
    addCustomTemplate(ACCOUNT, { name: 'Da conta', packageId: '@preview/charged-ieee:0.1.4' });

    expect(getCustomTemplates('local').map((t) => t.name)).toEqual(['Só neste navegador']);
    expect(getCustomTemplates(ACCOUNT).map((t) => t.name)).toEqual(['Da conta']);
    expect(findCustomTemplateByPackage(ACCOUNT, '@preview/touying:0.5.3')).toBeUndefined();
  });

  it('só contas Google são sincronizáveis', () => {
    expect(isSyncableTemplatesOwner('local')).toBe(false);
    expect(isSyncableTemplatesOwner('')).toBe(false);
    expect(isSyncableTemplatesOwner(null)).toBe(false);
    expect(isSyncableTemplatesOwner(ACCOUNT)).toBe(true);
  });

  it('avisa o dono de cada alteração feita pelo usuário', async () => {
    await loadCustomTemplates();
    const owners: string[] = [];
    const unsubscribe = subscribeCustomTemplateMutations((owner) => owners.push(owner));
    const local = addCustomTemplate('local', { name: 'A', packageId: '@preview/touying:0.5.3' });
    removeCustomTemplate('local', local.id);
    addCustomTemplate(ACCOUNT, { name: 'B', packageId: '@preview/charged-ieee:0.1.4' });
    unsubscribe();
    expect(owners).toEqual(['local', 'local', ACCOUNT]);
  });

  it('a exclusão de conta apaga só os modelos daquela conta', async () => {
    await loadCustomTemplates();
    addCustomTemplate('local', { name: 'Local', packageId: '@preview/touying:0.5.3' });
    addCustomTemplate(ACCOUNT, { name: 'Conta', packageId: '@preview/charged-ieee:0.1.4' });
    await flushCustomTemplates();

    await purgeCustomTemplatesForOwner(ACCOUNT);
    expect(getCustomTemplates(ACCOUNT)).toEqual([]);
    expect(getCustomTemplates('local')).toHaveLength(1);
    expect((await db.customTemplates.toArray()).map((r) => r.ownerEmail)).toEqual(['local']);
  });
});
