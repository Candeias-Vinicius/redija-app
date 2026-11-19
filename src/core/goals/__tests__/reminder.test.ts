import { describe, it, expect } from 'vitest';
import { shouldTriggerDailyReminder } from '@/hooks/useWritingGoalReminder';
import { createEmptyWritingGoals, evaluateWritingGoalStatus } from '../writingGoals';
import { WritingGoals } from '@/types/document';

function makeInProgressStatus(currentWords: number) {
  const goals: WritingGoals = {
    ...createEmptyWritingGoals(),
    deadlineDate: '2026-03-30',
    targetUnit: 'words',
    targetValue: 20000,
    baselineWords: 8000,
    baselineDate: '2026-03-01',
    dailyTargetLock: {
      date: '2026-03-01',
      target: 400,
      unit: 'words',
      deadlineDate: '2026-03-30',
      totalTarget: 20000,
    },
  };
  return evaluateWritingGoalStatus(goals, currentWords, undefined, '2026-03-01');
}

describe('RDJ-06.5 — Lembrete diário com o app aberto', () => {
  it('Cenário 2: dispara no horário escolhido quando permissão concedida e meta não atingida', () => {
    const status = makeInProgressStatus(8250);
    expect(status.statusMessage).toBe('Faltam 150 palavras para a meta de hoje');

    // Antes das 20:00 -> não dispara
    expect(
      shouldTriggerDailyReminder({
        reminder: { enabled: true, time: '20:00' },
        goalStatus: status,
        permission: 'granted',
        now: new Date(2026, 2, 1, 19, 59, 0),
      }),
    ).toBe(false);

    // Às 20:00 -> dispara
    expect(
      shouldTriggerDailyReminder({
        reminder: { enabled: true, time: '20:00' },
        goalStatus: status,
        permission: 'granted',
        now: new Date(2026, 2, 1, 20, 0, 0),
      }),
    ).toBe(true);
  });

  it('Cenário 3: não dispara se a meta de hoje já foi atingida', () => {
    const reachedStatus = makeInProgressStatus(8400);
    expect(reachedStatus.isTodayGoalReached).toBe(true);

    expect(
      shouldTriggerDailyReminder({
        reminder: { enabled: true, time: '20:00' },
        goalStatus: reachedStatus,
        permission: 'granted',
        now: new Date(2026, 2, 1, 20, 5, 0),
      }),
    ).toBe(false);
  });

  it('Cenário 4: não dispara quando permissão foi negada ou lembrete está desligado', () => {
    const status = makeInProgressStatus(8100);

    expect(
      shouldTriggerDailyReminder({
        reminder: { enabled: true, time: '20:00' },
        goalStatus: status,
        permission: 'denied',
        now: new Date(2026, 2, 1, 20, 30, 0),
      }),
    ).toBe(false);

    expect(
      shouldTriggerDailyReminder({
        reminder: { enabled: false, time: '20:00' },
        goalStatus: status,
        permission: 'granted',
        now: new Date(2026, 2, 1, 20, 30, 0),
      }),
    ).toBe(false);
  });

  it('envia no máximo 1 lembrete por dia (respeita lastNotifiedDate)', () => {
    const status = makeInProgressStatus(8100);

    expect(
      shouldTriggerDailyReminder({
        reminder: { enabled: true, time: '20:00', lastNotifiedDate: '2026-03-01' },
        goalStatus: status,
        permission: 'granted',
        now: new Date(2026, 2, 1, 21, 0, 0),
      }),
    ).toBe(false);
  });
});
