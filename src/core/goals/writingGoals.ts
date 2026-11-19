// =====================================================================
// RedijaApp — Domínio de Prazos, Metas e Histórico Diário (RDJ-06)
// Cálculos 100% locais no navegador, sem servidor externo.
// =====================================================================

import {
  Block,
  DailyTargetLock,
  DailyWritingLogEntry,
  DocumentProject,
  WritingGoals,
  WritingGoalUnit,
  WritingMilestone,
} from '@/types/document';
import { countWords } from '@/core/transpiler/abntLinter';
import { stripHtmlTags } from '@/core/transpiler/escape';

/** Regra de negócio (RDJ-06 / RDJ-11): dia ativo = pelo menos 50 palavras líquidas no fuso local. */
export const ACTIVE_DAY_MIN_WORDS = 50;

export const DEFAULT_REMINDER_TIME = '20:00';

export const PAST_DEADLINE_ERROR = 'A data de entrega deve ser hoje ou depois';

export interface ChapterWordStat {
  blockId: string;
  title: string;
  words: number;
  chapterIndex: number;
}

export interface DailyChartPoint {
  date: string;
  shortLabel: string;
  fullLabel: string;
  netWords: number;
  totalWords: number | null;
  isActive: boolean;
  isToday: boolean;
}

export type GoalBannerState =
  | 'unconfigured'
  | 'deadline_passed'
  | 'total_reached'
  | 'today_reached'
  | 'in_progress'
  | 'deadline_only';

export interface WritingGoalStatus {
  state: GoalBannerState;
  hasDeadline: boolean;
  hasTarget: boolean;
  isDeadlinePassed: boolean;
  isTotalGoalReached: boolean;
  isTodayGoalReached: boolean;
  remainingDays: number | null;
  targetUnit: WritingGoalUnit;
  targetValue: number | null;
  currentWords: number;
  textualPages: number | undefined;
  currentTotal: number;
  progressPct: number;
  dailyTarget: number | null;
  todayNetWords: number;
  todayRemaining: number | null;
  todayProgressPct: number;
  statusMessage: string;
}

/**
 * Formata uma instância Date para chave local YYYY-MM-DD (sem deslocamento UTC).
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte uma chave YYYY-MM-DD em Date no meio-dia local (evita bugs de horário de verão).
 */
export function parseLocalDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

/**
 * Soma (ou subtrai) dias corridos a uma chave YYYY-MM-DD no calendário local.
 */
export function addLocalDays(dateKey: string, deltaDays: number): string {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) return dateKey;
  parsed.setDate(parsed.getDate() + deltaDays);
  return getLocalDateKey(parsed);
}

/**
 * Diferença em dias corridos (toDateKey - fromDateKey).
 * Ex.: diffLocalDays('2026-03-01', '2026-03-01') === 0.
 */
export function diffLocalDays(fromDateKey: string, toDateKey: string): number {
  const from = parseLocalDateKey(fromDateKey);
  const to = parseLocalDateKey(toDateKey);
  if (!from || !to) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

export function formatDatePtBr(dateKey: string): string {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) return dateKey;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatShortDatePtBr(dateKey: string): string {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) return dateKey;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Valida a data de entrega (RDJ-06.1 Cenário 2).
 * Retorna mensagem de erro se for anterior a hoje, ou null se válida.
 */
export function validateDeadlineDate(
  dateKey: string | undefined,
  todayKey: string = getLocalDateKey(),
): string | null {
  if (!dateKey || !dateKey.trim()) return null;
  const trimmed = dateKey.trim();
  if (!parseLocalDateKey(trimmed)) {
    return 'Informe uma data válida.';
  }
  if (trimmed < todayKey) {
    return PAST_DEADLINE_ERROR;
  }
  return null;
}

export function isMilestoneAfterDeadline(dueDate: string, deadlineDate?: string): boolean {
  if (!dueDate || !deadlineDate) return false;
  return dueDate > deadlineDate;
}

export function isMilestoneOverdue(
  milestone: WritingMilestone,
  todayKey: string = getLocalDateKey(),
): boolean {
  if (milestone.completed) return false;
  if (!milestone.dueDate) return false;
  return milestone.dueDate < todayKey;
}

/**
 * Conta o total de palavras do projeto usando a mesma função `countWords` do linter.
 */
export function countProjectWords(blocks: Block[]): number {
  return blocks.reduce((acc, block) => acc + countWords(block.content), 0);
}

/**
 * Agrupa a contagem de palavras por capítulo (títulos de nível 1 — `h1`).
 */
export function getChapterWordStats(blocks: Block[]): ChapterWordStat[] {
  const chapters: ChapterWordStat[] = [];
  let current: ChapterWordStat | null = null;

  for (const block of blocks) {
    if (block.type === 'h1') {
      const cleanTitle = stripHtmlTags(block.content).trim() || `Capítulo ${chapters.length + 1}`;
      current = {
        blockId: block.id,
        title: cleanTitle,
        words: countWords(block.content),
        chapterIndex: chapters.length + 1,
      };
      chapters.push(current);
    } else if (current) {
      current.words += countWords(block.content);
    }
  }

  return chapters;
}

/**
 * Estima a contagem de páginas textuais a partir do total de páginas do último PDF compilado,
 * descontando elementos pré-textuais habilitados em modelos monográficos (ABNT).
 */
export function estimateTextualPages(
  compiledTotalPages: number | undefined,
  project: Pick<DocumentProject, 'templateConfig' | 'metadata'>,
): number | undefined {
  if (compiledTotalPages === undefined || !Number.isFinite(compiledTotalPages)) {
    return undefined;
  }
  if (compiledTotalPages <= 0) return 0;

  const cfg = project.templateConfig;
  const meta = project.metadata;
  let preTextualPages = 0;

  if (cfg?.includeCoverPage) preTextualPages += 1;
  if (cfg?.includeTitlePage) preTextualPages += 1;
  if (meta.includeApprovalPage) preTextualPages += 1;
  if (meta.dedicatory?.trim()) preTextualPages += 1;
  if (meta.acknowledgments?.trim()) preTextualPages += 1;
  if (meta.epigraph?.trim()) preTextualPages += 1;
  if (cfg?.includeCoverPage || cfg?.includeTitlePage) {
    if (meta.abstract?.trim()) preTextualPages += 1;
    if (meta.foreignAbstract?.trim()) preTextualPages += 1;
  }
  if (meta.includeFiguresList) preTextualPages += 1;
  if (meta.includeTablesList) preTextualPages += 1;
  if (meta.includeBoxesList) preTextualPages += 1;
  if (meta.abbreviations?.trim()) preTextualPages += 1;
  if (meta.symbols?.trim()) preTextualPages += 1;
  if (cfg?.includeToc) preTextualPages += 1;

  if (preTextualPages >= compiledTotalPages) {
    return 1;
  }
  return Math.max(1, compiledTotalPages - preTextualPages);
}

/**
 * Cria um objeto WritingGoals padrão vazio.
 */
export function createEmptyWritingGoals(): WritingGoals {
  return {
    targetUnit: 'words',
    milestones: [],
    dailyHistory: [],
  };
}

/**
 * Retorna o último registro de histórico anterior ao dia informado (se existir).
 */
export function getLastHistoryEntryBefore(
  history: DailyWritingLogEntry[],
  dateKey: string,
): DailyWritingLogEntry | undefined {
  let latest: DailyWritingLogEntry | undefined;
  for (const entry of history) {
    if (entry.date < dateKey && (!latest || entry.date > latest.date)) {
      latest = entry;
    }
  }
  return latest;
}

/**
 * Calcula as palavras líquidas de hoje.
 * Regra (RDJ-06.3): palavras líquidas do dia = total atual − total no fim do último dia registrado
 * (ou baselineWords quando ainda não há dias anteriores registrados).
 */
export function computeTodayNetWords(
  goals: WritingGoals | undefined,
  currentWords: number,
  todayKey: string = getLocalDateKey(),
): number {
  const history = goals?.dailyHistory ?? [];
  const prevEntry = getLastHistoryEntryBefore(history, todayKey);
  if (prevEntry) {
    return currentWords - prevEntry.totalWords;
  }
  if (goals?.baselineWords !== undefined) {
    return currentWords - goals.baselineWords;
  }
  const todayEntry = history.find((e) => e.date === todayKey);
  if (todayEntry) {
    return todayEntry.netWords;
  }
  return 0;
}

/**
 * Calcula ou preserva a meta diária fixada na primeira abertura do dia (RDJ-06.2).
 * Só recalcula se:
 * - não existe lock para hoje, OU
 * - o usuário mudou o prazo, a meta total ou a unidade.
 */
export function resolveDailyTargetLock(
  goals: WritingGoals | undefined,
  currentTotal: number,
  todayKey: string = getLocalDateKey(),
): DailyTargetLock | undefined {
  if (!goals?.deadlineDate || !goals.targetValue || goals.targetValue <= 0) {
    return undefined;
  }
  const remainingDays = diffLocalDays(todayKey, goals.deadlineDate) + 1;
  if (remainingDays <= 0) {
    return undefined;
  }

  const existing = goals.dailyTargetLock;
  if (
    existing &&
    existing.date === todayKey &&
    existing.unit === goals.targetUnit &&
    existing.deadlineDate === goals.deadlineDate &&
    existing.totalTarget === goals.targetValue
  ) {
    return existing;
  }

  const remaining = Math.max(0, goals.targetValue - currentTotal);
  const target = remaining === 0 ? 0 : Math.ceil(remaining / remainingDays);

  return {
    date: todayKey,
    target,
    unit: goals.targetUnit,
    deadlineDate: goals.deadlineDate,
    totalTarget: goals.targetValue,
  };
}

function formatUnitCount(count: number, unit: WritingGoalUnit): string {
  const formatted = count.toLocaleString('pt-BR');
  if (unit === 'pages') {
    return count === 1 ? '1 página' : `${formatted} páginas`;
  }
  return count === 1 ? '1 palavra' : `${formatted} palavras`;
}

/**
 * Avalia o estado completo das metas de escrita para exibição no painel, header e lembretes.
 */
export function evaluateWritingGoalStatus(
  goals: WritingGoals | undefined,
  currentWords: number,
  compiledTextualPages?: number,
  todayKey: string = getLocalDateKey(),
): WritingGoalStatus {
  const targetUnit: WritingGoalUnit = goals?.targetUnit ?? 'words';
  const targetValue = goals?.targetValue && goals.targetValue > 0 ? goals.targetValue : null;
  const textualPages = compiledTextualPages ?? goals?.lastCompiledTextualPages;
  const currentTotal = targetUnit === 'pages' ? (textualPages ?? 0) : currentWords;

  const hasDeadline = Boolean(goals?.deadlineDate);
  const hasTarget = targetValue !== null;
  const remainingDays = goals?.deadlineDate
    ? diffLocalDays(todayKey, goals.deadlineDate) + 1
    : null;
  const isDeadlinePassed = remainingDays !== null && remainingDays <= 0;
  const isTotalGoalReached = targetValue !== null && currentTotal >= targetValue;

  const progressPct =
    targetValue !== null && targetValue > 0
      ? Math.min(100, Math.max(0, Math.round((currentTotal / targetValue) * 100)))
      : 0;

  const todayNetWords = computeTodayNetWords(goals, currentWords, todayKey);

  // Meta diária fixada para hoje (se houver prazo futuro/hoje e meta total ainda não atingida)
  const lock =
    !isDeadlinePassed && !isTotalGoalReached
      ? resolveDailyTargetLock(goals, currentTotal, todayKey)
      : undefined;
  const dailyTarget = lock ? lock.target : null;

  // Para meta em palavras, progresso do dia compara palavras líquidas de hoje com dailyTarget.
  // Para meta em páginas, mostra quantas páginas faltam no total dividido pelos dias (ou se já atingiu).
  const todayProgressValue = targetUnit === 'words' ? Math.max(0, todayNetWords) : 0;
  const todayRemaining =
    dailyTarget !== null && targetUnit === 'words'
      ? Math.max(0, dailyTarget - todayProgressValue)
      : dailyTarget;

  const isTodayGoalReached =
    !isTotalGoalReached &&
    !isDeadlinePassed &&
    dailyTarget !== null &&
    dailyTarget > 0 &&
    targetUnit === 'words' &&
    todayNetWords >= dailyTarget;

  const todayProgressPct =
    dailyTarget !== null && dailyTarget > 0 && targetUnit === 'words'
      ? Math.min(100, Math.max(0, Math.round((Math.max(0, todayNetWords) / dailyTarget) * 100)))
      : isTodayGoalReached
        ? 100
        : 0;

  let state: GoalBannerState;
  let statusMessage: string;

  if (!hasDeadline && !hasTarget) {
    state = 'unconfigured';
    statusMessage = 'Defina um prazo e uma meta para acompanhar seu progresso diário.';
  } else if (isTotalGoalReached) {
    state = 'total_reached';
    statusMessage = 'Meta total atingida';
  } else if (isDeadlinePassed) {
    state = 'deadline_passed';
    statusMessage = 'Prazo encerrado';
  } else if (isTodayGoalReached) {
    state = 'today_reached';
    statusMessage = 'Meta de hoje concluída';
  } else if (dailyTarget !== null && dailyTarget > 0) {
    state = 'in_progress';
    const remaining = todayRemaining ?? dailyTarget;
    statusMessage =
      remaining === 1
        ? `Falta ${formatUnitCount(1, targetUnit)} para a meta de hoje`
        : `Faltam ${formatUnitCount(remaining, targetUnit)} para a meta de hoje`;
  } else if (hasDeadline) {
    state = 'deadline_only';
    statusMessage =
      remainingDays === 1
        ? 'Entrega hoje — defina uma meta total para calcular o ritmo diário.'
        : `Faltam ${remainingDays} dias para a entrega.`;
  } else {
    state = 'unconfigured';
    statusMessage = 'Defina a data de entrega para calcular sua meta diária.';
  }

  return {
    state,
    hasDeadline,
    hasTarget,
    isDeadlinePassed,
    isTotalGoalReached,
    isTodayGoalReached,
    remainingDays,
    targetUnit,
    targetValue,
    currentWords,
    textualPages,
    currentTotal,
    progressPct,
    dailyTarget,
    todayNetWords,
    todayRemaining,
    todayProgressPct,
    statusMessage,
  };
}

/**
 * Registra o snapshot de palavras do dia atual no histórico (chamado no salvamento do projeto).
 * Mantém a regra: netWords = totalWords - totalWords do último dia registrado anterior (ou baselineWords).
 */
export function recordDailyWritingSnapshot(
  goals: WritingGoals | undefined,
  totalWords: number,
  now: Date = new Date(),
): WritingGoals {
  const base: WritingGoals = goals
    ? {
        ...goals,
        milestones: [...goals.milestones],
        dailyHistory: [...goals.dailyHistory],
      }
    : createEmptyWritingGoals();

  const todayKey = getLocalDateKey(now);
  const prevEntry = getLastHistoryEntryBefore(base.dailyHistory, todayKey);

  let baselineWords = base.baselineWords;
  let baselineDate = base.baselineDate;
  if (!prevEntry && baselineWords === undefined) {
    baselineWords = totalWords;
    baselineDate = todayKey;
  }

  const referenceTotal = prevEntry ? prevEntry.totalWords : (baselineWords ?? totalWords);
  const netWords = totalWords - referenceTotal;
  const isoNow = now.toISOString();

  const existingIndex = base.dailyHistory.findIndex((entry) => entry.date === todayKey);
  const nextEntry: DailyWritingLogEntry = {
    date: todayKey,
    totalWords,
    netWords,
    updatedAt: isoNow,
  };

  if (existingIndex >= 0) {
    base.dailyHistory[existingIndex] = nextEntry;
  } else {
    base.dailyHistory.push(nextEntry);
    base.dailyHistory.sort((a, b) => a.date.localeCompare(b.date));
  }

  // Garante que a meta diária do dia fique fixada na primeira abertura/salvamento do dia
  const currentTotal =
    base.targetUnit === 'pages' ? (base.lastCompiledTextualPages ?? 0) : totalWords;
  const nextLock = resolveDailyTargetLock(base, currentTotal, todayKey);

  return {
    ...base,
    ...(baselineWords !== undefined ? { baselineWords } : {}),
    ...(baselineDate ? { baselineDate } : {}),
    ...(nextLock ? { dailyTargetLock: nextLock } : {}),
  };
}

/**
 * Inicializa o baseline de palavras de um projeto recém-importado (RDJ-06.3 Cenário 5),
 * evitando que o conteúdo importado conte como palavras escritas no dia.
 */
export function initializeImportedProjectGoals(
  project: DocumentProject,
  now: Date = new Date(),
): DocumentProject {
  if (project.writingGoals && project.writingGoals.dailyHistory.length > 0) {
    return project;
  }
  const initialWords = countProjectWords(project.blocks);
  const todayKey = getLocalDateKey(now);
  const existing = project.writingGoals ?? createEmptyWritingGoals();
  return {
    ...project,
    writingGoals: {
      ...existing,
      baselineWords: initialWords,
      baselineDate: todayKey,
    },
  };
}

/**
 * Gera a série dos últimos 30 dias (terminando em todayKey) para o gráfico de barras.
 */
export function getLast30DaysHistory(
  goals: WritingGoals | undefined,
  todayKey: string = getLocalDateKey(),
): DailyChartPoint[] {
  const byDate = new Map<string, DailyWritingLogEntry>();
  for (const entry of goals?.dailyHistory ?? []) {
    byDate.set(entry.date, entry);
  }

  const points: DailyChartPoint[] = [];
  for (let offset = -29; offset <= 0; offset++) {
    const date = addLocalDays(todayKey, offset);
    const entry = byDate.get(date);
    const netWords = entry?.netWords ?? 0;
    points.push({
      date,
      shortLabel: formatShortDatePtBr(date),
      fullLabel: formatDatePtBr(date),
      netWords,
      totalWords: entry?.totalWords ?? null,
      isActive: netWords >= ACTIVE_DAY_MIN_WORDS,
      isToday: date === todayKey,
    });
  }
  return points;
}
