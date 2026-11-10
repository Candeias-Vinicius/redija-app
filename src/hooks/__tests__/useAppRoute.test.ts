import { describe, it, expect } from 'vitest';
import { resolveRouteFromLocation } from '../useAppRoute';

describe('resolveRouteFromLocation', () => {
  it('resolve "/" como rota principal da aplicação', () => {
    expect(resolveRouteFromLocation('/', '', '')).toEqual({ route: 'app' });
  });

  it('resolve "/docs" e subcaminhos com ou sem barra final', () => {
    expect(resolveRouteFromLocation('/docs', '', '')).toEqual({
      route: 'docs',
      sectionId: undefined,
    });
    expect(resolveRouteFromLocation('/docs/', '', '#normas-abnt')).toEqual({
      route: 'docs',
      sectionId: 'normas-abnt',
    });
    expect(resolveRouteFromLocation('/docs/normas-abnt', '', '')).toEqual({
      route: 'docs',
      sectionId: 'normas-abnt',
    });
  });

  it('aceita fallbacks ?docs, ?view=docs e #docs para compatibilidade estática', () => {
    expect(resolveRouteFromLocation('/', '?docs=1', '')).toEqual({
      route: 'docs',
      sectionId: undefined,
    });
    expect(resolveRouteFromLocation('/', '?view=docs&section=codigo-aberto', '')).toEqual({
      route: 'docs',
      sectionId: 'codigo-aberto',
    });
    expect(resolveRouteFromLocation('/', '', '#docs:importacao-exportacao')).toEqual({
      route: 'docs',
      sectionId: 'importacao-exportacao',
    });
  });

  it('extrai sharedDocId de parâmetros ?doc, ?project e ?join', () => {
    expect(resolveRouteFromLocation('/', '?doc=1a2b3c4d5e', '')).toEqual({
      route: 'app',
      sharedDocId: '1a2b3c4d5e',
    });
    expect(resolveRouteFromLocation('/', '?project=xyz987', '')).toEqual({
      route: 'app',
      sharedDocId: 'xyz987',
    });
    expect(resolveRouteFromLocation('/', '?join=room123', '')).toEqual({
      route: 'app',
      sharedDocId: 'room123',
    });
  });
});
