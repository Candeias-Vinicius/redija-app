import { describe, it, expect } from 'vitest';
import { mergeDailyHistory, mergeWritingGoals } from '../mergeWritingGoals';
import { autoMergeProjects } from '@/core/storage/projectMerger';
import { normalizeProject } from '@/core/storage/schemaNormalizer';
import { WritingGoals } from '@/types/document';

describe('RDJ-06.3 — Merge de histórico diário e metas entre dispositivos', () => {
  it('mantém o registro mais recente de cada dia ao mesclar dois dispositivos', () => {
    const merged = mergeDailyHistory(
      [
        {
          date: '2026-03-09',
          totalWords: 1000,
          netWords: 200,
          updatedAt: '2026-03-09T18:00:00.000Z',
        },
        {
          date: '2026-03-10',
          totalWords: 1300,
          netWords: 300,
          updatedAt: '2026-03-10T14:00:00.000Z',
        },
      ],
      [
        {
          date: '2026-03-10',
          totalWords: 1550,
          netWords: 550,
          updatedAt: '2026-03-10T21:00:00.000Z', // mais recente
        },
        {
          date: '2026-03-11',
          totalWords: 1800,
          netWords: 250,
          updatedAt: '2026-03-11T19:00:00.000Z',
        },
      ],
    );

    expect(merged).toHaveLength(3);
    expect(merged.map((e) => e.date)).toEqual(['2026-03-09', '2026-03-10', '2026-03-11']);
    expect(merged[1].totalWords).toBe(1550);
    expect(merged[1].netWords).toBe(550);
  });

  it('mescla marcos e histórico dentro do autoMergeProjects', () => {
    const localGoals: WritingGoals = {
      deadlineDate: '2026-06-30',
      targetUnit: 'words',
      targetValue: 20000,
      milestones: [
        {
          id: 'm1',
          title: 'Introdução',
          dueDate: '2026-04-01',
          completed: true,
          updatedAt: '2026-03-10T20:00:00.000Z',
        },
      ],
      dailyHistory: [
        {
          date: '2026-03-10',
          totalWords: 1200,
          netWords: 200,
          updatedAt: '2026-03-10T15:00:00.000Z',
        },
      ],
      updatedAt: '2026-03-10T20:00:00.000Z',
    };

    const remoteGoals: WritingGoals = {
      deadlineDate: '2026-06-30',
      targetUnit: 'words',
      targetValue: 20000,
      milestones: [
        {
          id: 'm1',
          title: 'Introdução',
          dueDate: '2026-04-01',
          completed: false,
          updatedAt: '2026-03-09T10:00:00.000Z',
        },
        {
          id: 'm2',
          title: 'Metodologia',
          dueDate: '2026-05-01',
          completed: false,
          updatedAt: '2026-03-10T21:00:00.000Z',
        },
      ],
      dailyHistory: [
        {
          date: '2026-03-10',
          totalWords: 1450,
          netWords: 450,
          updatedAt: '2026-03-10T21:30:00.000Z',
        },
      ],
      updatedAt: '2026-03-10T19:00:00.000Z',
    };

    const local = normalizeProject({
      id: 'proj-sync',
      name: 'TCC',
      metadata: {},
      blocks: [],
      references: [],
      writingGoals: localGoals,
    });
    const remote = normalizeProject({
      id: 'proj-sync',
      name: 'TCC',
      metadata: {},
      blocks: [],
      references: [],
      writingGoals: remoteGoals,
    });

    const { mergedProject, hasMergedRemoteChanges } = autoMergeProjects(local, remote);
    expect(hasMergedRemoteChanges).toBe(true);
    expect(mergedProject.writingGoals?.milestones).toHaveLength(2);
    expect(mergedProject.writingGoals?.milestones.find((m) => m.id === 'm1')?.completed).toBe(true);
    expect(mergedProject.writingGoals?.dailyHistory[0].totalWords).toBe(1450);

    // Também garante idempotência quando apenas um lado tem writingGoals
    expect(mergeWritingGoals(undefined, remoteGoals)).toEqual(remoteGoals);
    expect(mergeWritingGoals(localGoals, undefined)).toEqual(localGoals);
  });
});
