import { describe, it, expect } from 'vitest';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';
import { getProjectContentSignature } from '../useDriveSyncOrchestrator';

describe('useDriveSyncOrchestrator helpers', () => {
  it('getProjectContentSignature ignora metadados voláteis e detecta mudanças reais de conteúdo', () => {
    const base = createProjectFromTemplate('artigo', 'Artigo Redes');
    const updatedTimestampOnly = {
      ...base,
      updatedAt: '2026-12-01T10:00:00.000Z',
      driveSyncedAt: '2026-12-01T10:01:00.000Z',
    };

    expect(getProjectContentSignature(base)).toBe(getProjectContentSignature(updatedTimestampOnly));

    const contentChanged = {
      ...base,
      metadata: {
        ...base.metadata,
        title: 'Título Revisado',
      },
    };
    expect(getProjectContentSignature(base)).not.toBe(getProjectContentSignature(contentChanged));

    // Tombstones e timestamps estruturais devem invalidar a assinatura para sincronizar no Drive
    const tombstoneChanged = {
      ...base,
      deletedBlockTimestamps: { old_blk: 1731100000000 },
      blocksOrderUpdatedAt: 1731100000000,
    };
    expect(getProjectContentSignature(base)).not.toBe(
      getProjectContentSignature(tombstoneChanged),
    );
  });
});
