import { describe, expect, it } from 'vitest';
import { parseUniverseInput, suggestTemplateName } from '../universeInput';

describe('parseUniverseInput', () => {
  it('aceita a linha de importação copiada do Typst Universe', () => {
    expect(parseUniverseInput('#import "@preview/charged-ieee:0.1.4": ieee')).toEqual({
      ok: true,
      namespace: 'preview',
      name: 'charged-ieee',
      version: '0.1.4',
      packageId: '@preview/charged-ieee:0.1.4',
    });
  });

  it('aceita o comando typst init e o identificador puro', () => {
    expect(parseUniverseInput('typst init @preview/modern-cv:0.7.0')).toMatchObject({
      ok: true,
      packageId: '@preview/modern-cv:0.7.0',
    });
    expect(parseUniverseInput('  @preview/charged-ieee:0.1.4 ')).toMatchObject({
      ok: true,
      packageId: '@preview/charged-ieee:0.1.4',
    });
    expect(parseUniverseInput('charged-ieee:0.1.4')).toMatchObject({
      ok: true,
      packageId: '@preview/charged-ieee:0.1.4',
    });
  });

  it('pede a versão quando recebe só o link da página do pacote', () => {
    expect(parseUniverseInput('https://typst.app/universe/package/charged-ieee')).toEqual({
      ok: false,
      reason: 'missing-version',
      name: 'charged-ieee',
    });
  });

  it('rejeita texto vazio ou sem pacote', () => {
    expect(parseUniverseInput('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(parseUniverseInput('modelo bonito')).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('suggestTemplateName', () => {
  it('usa o título de modelos conhecidos', () => {
    expect(suggestTemplateName('charged-ieee')).toBe('IEEE Conference Article');
  });

  it('formata nomes desconhecidos mantendo siglas em maiúsculas', () => {
    expect(suggestTemplateName('tese-ufrj-abnt')).toBe('Tese UFRJ ABNT');
  });
});
