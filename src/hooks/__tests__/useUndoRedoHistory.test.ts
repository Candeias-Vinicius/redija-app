import { describe, it, expect } from 'vitest';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';
import {
  applyHistorySnapshot,
  areSnapshotsSameReference,
  toHistorySnapshot,
} from '../useUndoRedoHistory';

describe('useUndoRedoHistory helpers', () => {
  it('captura snapshot e reaplica preservando metadados de armazenamento e identidade', () => {
    const project = createProjectFromTemplate('tcc', 'Monografia Original');
    project.driveFileId = 'drive-123';
    project.ownerEmail = 'aluno@uf.br';

    const originalSnapshot = toHistorySnapshot(project);

    const modifiedProject = {
      ...project,
      name: 'Monografia Renomeada',
      metadata: {
        ...project.metadata,
        title: 'Novo Título Alterado',
      },
      blocks: [
        ...project.blocks,
        { id: 'new-block', type: 'paragraph' as const, content: '<p>Parágrafo novo</p>' },
      ],
    };

    const restored = applyHistorySnapshot(modifiedProject, originalSnapshot);
    expect(restored.id).toBe(modifiedProject.id);
    expect(restored.name).toBe('Monografia Renomeada');
    expect(restored.driveFileId).toBe('drive-123');
    expect(restored.ownerEmail).toBe('aluno@uf.br');
    expect(restored.metadata.title).toBe(project.metadata.title);
    expect(restored.blocks).toHaveLength(project.blocks.length);
  });

  it('mantém templateType atual caso snapshot antigo não defina templateType', () => {
    const project = createProjectFromTemplate('artigo');
    const snapshot = toHistorySnapshot(project);
    snapshot.templateType = undefined;

    const restored = applyHistorySnapshot(project, snapshot);
    expect(restored.templateType).toBe('artigo');
  });

  it('identifica snapshots com as mesmas referências de objeto para evitar duplicação em StrictMode', () => {
    const project = createProjectFromTemplate('tcc');
    const s1 = toHistorySnapshot(project);
    const s2 = toHistorySnapshot(project);

    expect(areSnapshotsSameReference(s1, s2)).toBe(true);

    const s3 = toHistorySnapshot({
      ...project,
      references: [...project.references],
    });
    expect(areSnapshotsSameReference(s1, s3)).toBe(false);
  });

  it('remove tombstones de blocos que foram restaurados pelo Undo', () => {
    const project = createProjectFromTemplate('artigo');
    const removedBlock = project.blocks[project.blocks.length - 1];
    const snapshotWithRemovedBlock = toHistorySnapshot(project);

    const projectAfterDelete = {
      ...project,
      blocks: project.blocks.slice(0, -1),
      deletedBlockTimestamps: {
        [removedBlock.id]: 999999,
        other_deleted: 888888,
      },
    };

    const restored = applyHistorySnapshot(projectAfterDelete, snapshotWithRemovedBlock);
    expect(restored.deletedBlockTimestamps).toEqual({ other_deleted: 888888 });
  });
});
