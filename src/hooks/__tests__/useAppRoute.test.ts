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
});
