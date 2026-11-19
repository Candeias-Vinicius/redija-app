import { useEffect } from 'react';
import { WritingReminderConfig } from '@/types/document';
import {
  DEFAULT_REMINDER_TIME,
  getLocalDateKey,
  type WritingGoalStatus,
} from '@/core/goals/writingGoals';

export type NotificationPermissionState = NotificationPermission | 'unsupported';

export function getNotificationPermissionState(): NotificationPermissionState {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
}

export function isTimeReached(reminderTime: string, now: Date): boolean {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(reminderTime.trim());
  if (!match) return false;
  const targetMinutes = Number(match[1]) * 60 + Number(match[2]);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= targetMinutes;
}

export interface ReminderEvaluationInput {
  reminder?: WritingReminderConfig;
  goalStatus: WritingGoalStatus;
  permission: NotificationPermissionState;
  now?: Date;
}

/**
 * Decide se o lembrete diário deve ser disparado agora (RDJ-06.5).
 * - Nunca dispara sem permissão concedida.
 * - Nunca dispara se a meta de hoje ou total já foi atingida, ou se o prazo encerrou.
 * - Máximo de 1 lembrete por dia (via `lastNotifiedDate`).
 */
export function shouldTriggerDailyReminder({
  reminder,
  goalStatus,
  permission,
  now = new Date(),
}: ReminderEvaluationInput): boolean {
  if (!reminder?.enabled) return false;
  if (permission !== 'granted') return false;
  if (goalStatus.state !== 'in_progress') return false;
  if (goalStatus.isTodayGoalReached || goalStatus.isTotalGoalReached || goalStatus.isDeadlinePassed) {
    return false;
  }
  if (!goalStatus.dailyTarget || goalStatus.dailyTarget <= 0) return false;

  const todayKey = getLocalDateKey(now);
  if (reminder.lastNotifiedDate === todayKey) return false;

  const targetTime = reminder.time || DEFAULT_REMINDER_TIME;
  return isTimeReached(targetTime, now);
}

interface UseWritingGoalReminderOptions {
  projectName: string;
  reminder?: WritingReminderConfig;
  goalStatus: WritingGoalStatus;
  onMarkReminderNotified: (dateKey: string) => void;
}

/**
 * Hook que monitora o horário do lembrete diário com o app aberto.
 * IMPORTANTE: nunca solicita permissão de notificação automaticamente ao montar.
 */
export function useWritingGoalReminder({
  projectName,
  reminder,
  goalStatus,
  onMarkReminderNotified,
}: UseWritingGoalReminderOptions): void {
  useEffect(() => {
    if (!reminder?.enabled) return;

    const checkAndNotify = () => {
      const permission = getNotificationPermissionState();
      const now = new Date();
      if (
        !shouldTriggerDailyReminder({
          reminder,
          goalStatus,
          permission,
          now,
        })
      ) {
        return;
      }

      const todayKey = getLocalDateKey(now);
      try {
        new Notification(`Redija — ${projectName}`, {
          body: goalStatus.statusMessage,
          tag: `redija-daily-goal-${todayKey}`,
        });
        onMarkReminderNotified(todayKey);
      } catch {
        // Alguns navegadores bloqueiam Notification fora de contexto seguro; ignora silenciosamente.
      }
    };

    checkAndNotify();
    const intervalId = window.setInterval(checkAndNotify, 30_000);
    return () => window.clearInterval(intervalId);
  }, [projectName, reminder, goalStatus, onMarkReminderNotified]);
}
