import { describe, it, expect } from 'vitest';
import {
  buildProjectShareUrl,
  extractSharedDriveFileIdFromLocation,
  resolveRouteFromLocation,
} from '../useAppRoute';

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

  it('extrai e valida driveFileId de links diretos e constrói URL canônica de compartilhamento', () => {
    expect(extractSharedDriveFileIdFromLocation('?driveFileId=1AbCdEfGhIjK_9876')).toBe(
      '1AbCdEfGhIjK_9876',
    );
    expect(extractSharedDriveFileIdFromLocation('')).toBeNull();
    expect(extractSharedDriveFileIdFromLocation('?driveFileId=abc')).toBeNull(); // muito curto
    expect(extractSharedDriveFileIdFromLocation('?driveFileId=<script>alert(1)</script>')).toBeNull();

    expect(buildProjectShareUrl('file_id_1234', 'https://redija.app/')).toBe(
      'https://redija.app/?driveFileId=file_id_1234',
    );
  });
});
