// =====================================================================
// RedijaApp — Mesclagem de Metas, Marcos e Histórico Diário (RDJ-06.3)
// =====================================================================

import {
  DailyWritingLogEntry,
  WritingGoals,
  WritingMilestone,
} from '@/types/document';

function toTimestampMs(iso?: string): number {
  if (!iso) return 0;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Mescla o histórico diário de dois dispositivos.
 * Regra (RDJ-06.3): para cada dia (`date`), prevalece o registro mais recente (`updatedAt`).
 */
export function mergeDailyHistory(
  localHistory: DailyWritingLogEntry[],
  remoteHistory: DailyWritingLogEntry[],
): DailyWritingLogEntry[] {
  const byDate = new Map<string, DailyWritingLogEntry>();

  for (const entry of localHistory) {
    const existing = byDate.get(entry.date);
    if (!existing || toTimestampMs(entry.updatedAt) >= toTimestampMs(existing.updatedAt)) {
      byDate.set(entry.date, entry);
    }
  }

  for (const entry of remoteHistory) {
    const existing = byDate.get(entry.date);
    if (!existing) {
      byDate.set(entry.date, entry);
      continue;
    }
    const remoteMs = toTimestampMs(entry.updatedAt);
    const localMs = toTimestampMs(existing.updatedAt);
    if (remoteMs > localMs) {
      byDate.set(entry.date, entry);
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Mescla marcos por ID mantendo a edição mais recente e preservando marcos únicos de ambos.
 */
export function mergeMilestones(
  localMilestones: WritingMilestone[],
  remoteMilestones: WritingMilestone[],
): WritingMilestone[] {
  const byId = new Map<string, WritingMilestone>();
  const order: string[] = [];

  for (const m of localMilestones) {
    byId.set(m.id, m);
    order.push(m.id);
  }

  for (const m of remoteMilestones) {
    const existing = byId.get(m.id);
    if (!existing) {
      byId.set(m.id, m);
      order.push(m.id);
      continue;
    }
    if (toTimestampMs(m.updatedAt) > toTimestampMs(existing.updatedAt)) {
      byId.set(m.id, m);
    }
  }

  return order.map((id) => byId.get(id)!);
}

/**
 * Mescla `writingGoals` entre a cópia local e a remota do Google Drive.
 */
export function mergeWritingGoals(
  local?: WritingGoals,
  remote?: WritingGoals,
): WritingGoals | undefined {
  if (!local && !remote) return undefined;
  if (!local) return remote;
  if (!remote) return local;

  const localUpdated = toTimestampMs(local.updatedAt);
  const remoteUpdated = toTimestampMs(remote.updatedAt);
  const primary = remoteUpdated > localUpdated ? remote : local;
  const secondary = primary === remote ? local : remote;

  const dailyHistory = mergeDailyHistory(local.dailyHistory, remote.dailyHistory);
  const milestones = mergeMilestones(local.milestones, remote.milestones);

  // Baseline: preserva o mais antigo (ou o que existir) para não distorcer o primeiro dia
  let baselineWords = primary.baselineWords;
  let baselineDate = primary.baselineDate;
  if (baselineWords === undefined && secondary.baselineWords !== undefined) {
    baselineWords = secondary.baselineWords;
    baselineDate = secondary.baselineDate;
  } else if (
    primary.baselineDate &&
    secondary.baselineDate &&
    secondary.baselineDate < primary.baselineDate &&
    secondary.baselineWords !== undefined
  ) {
    baselineWords = secondary.baselineWords;
    baselineDate = secondary.baselineDate;
  }

  // dailyTargetLock: prefere o de data mais recente
  const dailyTargetLock =
    primary.dailyTargetLock && secondary.dailyTargetLock
      ? secondary.dailyTargetLock.date > primary.dailyTargetLock.date
        ? secondary.dailyTargetLock
        : primary.dailyTargetLock
      : (primary.dailyTargetLock ?? secondary.dailyTargetLock);

  return {
    ...(primary.deadlineDate ?? secondary.deadlineDate
      ? { deadlineDate: primary.deadlineDate ?? secondary.deadlineDate }
      : {}),
    ...(primary.deadlineLabel ?? secondary.deadlineLabel
      ? { deadlineLabel: primary.deadlineLabel ?? secondary.deadlineLabel }
      : {}),
    targetUnit: primary.targetUnit ?? secondary.targetUnit ?? 'words',
    ...(primary.targetValue ?? secondary.targetValue
      ? { targetValue: primary.targetValue ?? secondary.targetValue }
      : {}),
    milestones,
    dailyHistory,
    ...(baselineWords !== undefined ? { baselineWords } : {}),
    ...(baselineDate ? { baselineDate } : {}),
    ...(dailyTargetLock ? { dailyTargetLock } : {}),
    ...(primary.reminder ?? secondary.reminder
      ? { reminder: primary.reminder ?? secondary.reminder }
      : {}),
    ...(primary.lastCompiledTextualPages ?? secondary.lastCompiledTextualPages
      ? {
          lastCompiledTextualPages:
            primary.lastCompiledTextualPages ?? secondary.lastCompiledTextualPages,
        }
      : {}),
    ...(primary.updatedAt ?? secondary.updatedAt
      ? { updatedAt: primary.updatedAt ?? secondary.updatedAt }
      : {}),
  };
}
