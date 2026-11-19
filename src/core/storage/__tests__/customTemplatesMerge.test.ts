import { describe, expect, it } from 'vitest';
import {
  mergeCustomTemplateLists,
  normalizeCustomTemplate,
  parseCustomTemplatesPayload,
  serializeCustomTemplatesPayload,
  type SyncedCustomTemplate,
} from '../customTemplatesMerge';

function tpl(overrides: Partial<SyncedCustomTemplate> & { id: string }): SyncedCustomTemplate {
  return {
    name: `Modelo ${overrides.id}`,
    packageId: `@preview/pacote-${overrides.id}:0.1.0`,
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('mergeCustomTemplateLists: mesclagem item a item por updatedAt/deletedAt', () => {
  it('mantém itens que só existem de um lado e indica o que precisa ser gravado', () => {
    const a = tpl({ id: 'a' });
    const b = tpl({ id: 'b', createdAt: '2026-03-02T10:00:00.000Z', updatedAt: '2026-03-02T10:00:00.000Z' });
    const result = mergeCustomTemplateLists([a], [b]);
    expect(result.merged.map((t) => t.id)).toEqual(['a', 'b']);
    expect(result.changedLocal).toBe(true);
    expect(result.changedRemote).toBe(true);
  });

  it('não marca alterações quando os dois lados já são iguais', () => {
    const a = tpl({ id: 'a' });
    const result = mergeCustomTemplateLists([a], [{ ...a }]);
    expect(result.changedLocal).toBe(false);
    expect(result.changedRemote).toBe(false);
  });

  it('a versão com updatedAt mais recente vence (nome alterado em outro aparelho)', () => {
    const local = tpl({ id: 'a', name: 'Nome antigo' });
    const remote = tpl({ id: 'a', name: 'Nome novo', updatedAt: '2026-03-05T10:00:00.000Z' });
    const result = mergeCustomTemplateLists([local], [remote]);
    expect(result.merged).toEqual([remote]);
    expect(result.changedLocal).toBe(true);
    expect(result.changedRemote).toBe(false);
  });

  it('uma remoção feita em outro aparelho não é desfeita pela cópia local antiga', () => {
    const local = tpl({ id: 'a' });
    const remote = tpl({
      id: 'a',
      updatedAt: '2026-03-04T10:00:00.000Z',
      deletedAt: '2026-03-04T10:00:00.000Z',
    });
    const result = mergeCustomTemplateLists([local], [remote]);
    expect(result.merged[0].deletedAt).toBe('2026-03-04T10:00:00.000Z');
    expect(result.changedLocal).toBe(true);
    expect(result.changedRemote).toBe(false);
  });

  it('"Desfazer" (updatedAt mais novo, sem deletedAt) vence a marca de exclusão', () => {
    const remote = tpl({
      id: 'a',
      updatedAt: '2026-03-04T10:00:00.000Z',
      deletedAt: '2026-03-04T10:00:00.000Z',
    });
    const local = tpl({ id: 'a', updatedAt: '2026-03-04T10:00:05.000Z', deletedAt: null });
    const result = mergeCustomTemplateLists([local], [remote]);
    expect(result.merged[0].deletedAt).toBeNull();
    expect(result.changedLocal).toBe(false);
    expect(result.changedRemote).toBe(true);
  });

  it('em empate de updatedAt, a remoção vence', () => {
    const alive = tpl({ id: 'a', updatedAt: '2026-03-04T10:00:00.000Z' });
    const removed = { ...alive, deletedAt: alive.updatedAt };
    expect(mergeCustomTemplateLists([alive], [removed]).merged[0].deletedAt).not.toBeNull();
    expect(mergeCustomTemplateLists([removed], [alive]).merged[0].deletedAt).not.toBeNull();
  });

  it('o mesmo pacote adicionado em dois aparelhos fica uma vez só, e os dois convergem', () => {
    const fromA = tpl({ id: 'a', packageId: '@preview/charged-ieee:0.1.4', name: 'IEEE (A)' });
    const fromB = tpl({
      id: 'b',
      packageId: '@preview/Charged-IEEE:0.1.4',
      name: 'IEEE (B)',
      createdAt: '2026-03-01T11:00:00.000Z',
      updatedAt: '2026-03-01T11:00:00.000Z',
    });

    const onA = mergeCustomTemplateLists([fromA], [fromB]).merged;
    const onB = mergeCustomTemplateLists([fromB], [fromA]).merged;
    expect(onA).toEqual(onB);
    expect(onA.filter((t) => !t.deletedAt).map((t) => t.id)).toEqual(['a']);
    expect(onA.find((t) => t.id === 'b')?.deletedAt).toBe(fromB.updatedAt);

    // B ainda tinha a cópia viva: a marca gerada pela mesclagem vence no empate.
    expect(mergeCustomTemplateLists([fromB], onA).merged.find((t) => t.id === 'b')?.deletedAt).toBe(
      fromB.updatedAt,
    );
  });

  it('itens removidos não bloqueiam o mesmo pacote adicionado de novo', () => {
    const removed = tpl({ id: 'a', deletedAt: '2026-03-02T00:00:00.000Z', updatedAt: '2026-03-02T00:00:00.000Z' });
    const again = tpl({
      id: 'b',
      packageId: removed.packageId,
      createdAt: '2026-03-03T00:00:00.000Z',
      updatedAt: '2026-03-03T00:00:00.000Z',
    });
    const { merged } = mergeCustomTemplateLists([removed], [again]);
    expect(merged.filter((t) => !t.deletedAt).map((t) => t.id)).toEqual(['b']);
  });
});

describe('Formato do arquivo redija-modelos.json', () => {
  it('serializa e lê de volta a lista completa, inclusive marcas de exclusão', () => {
    const list = [tpl({ id: 'a' }), tpl({ id: 'b', deletedAt: '2026-03-02T00:00:00.000Z', updatedAt: '2026-03-02T00:00:00.000Z' })];
    const json = serializeCustomTemplatesPayload(list);
    expect(JSON.parse(json)).toMatchObject({ kind: 'redija-custom-templates', version: 1 });
    expect(parseCustomTemplatesPayload(json)).toEqual(list);
  });

  it('é tolerante com conteúdo vazio, corrompido ou com entradas inválidas', () => {
    expect(parseCustomTemplatesPayload('')).toEqual([]);
    expect(parseCustomTemplatesPayload('{não é json')).toEqual([]);
    expect(parseCustomTemplatesPayload({ templates: 'x' })).toEqual([]);
    const parsed = parseCustomTemplatesPayload({
      templates: [
        tpl({ id: 'ok' }),
        { id: 'sem-pacote', name: 'X' },
        { id: 'pacote-invalido', name: 'X', packageId: '"; #evil', createdAt: '2026-01-01' },
        { id: '', name: 'X', packageId: '@preview/a:0.1.0' },
      ],
    });
    expect(parsed.map((t) => t.id)).toEqual(['ok']);
  });

  it('registros antigos sem updatedAt/deletedAt usam a data de criação', () => {
    const legacy = normalizeCustomTemplate({
      id: 'old',
      name: '  Artigo da revista  ',
      packageId: '@preview/charged-ieee:0.1.4',
      createdAt: '2026-02-01T08:00:00.000Z',
    });
    expect(legacy).toEqual({
      id: 'old',
      name: 'Artigo da revista',
      packageId: '@preview/charged-ieee:0.1.4',
      createdAt: '2026-02-01T08:00:00.000Z',
      updatedAt: '2026-02-01T08:00:00.000Z',
      deletedAt: null,
    });
  });
});
