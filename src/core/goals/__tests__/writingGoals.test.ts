import { describe, it, expect } from 'vitest';
import {
  ACTIVE_DAY_MIN_WORDS,
  PAST_DEADLINE_ERROR,
  computeTodayNetWords,
  countProjectWords,
  createEmptyWritingGoals,
  estimateTextualPages,
  evaluateWritingGoalStatus,
  getChapterWordStats,
  getLast30DaysHistory,
  initializeImportedProjectGoals,
  isMilestoneAfterDeadline,
  isMilestoneOverdue,
  recordDailyWritingSnapshot,
  resolveDailyTargetLock,
  validateDeadlineDate,
} from '../writingGoals';
import { normalizeProject } from '@/core/storage/schemaNormalizer';
import { Block, DocumentProject, WritingGoals } from '@/types/document';

function makeBlock(id: string, type: Block['type'], content: string): Block {
  return { id, type, content };
}

function makeProject(blocks: Block[], writingGoals?: WritingGoals): DocumentProject {
  return normalizeProject({
    id: 'proj-goals-1',
    name: 'Meu TCC',
    metadata: { title: 'Meu TCC', author: 'Estudante', institution: 'UF' },
    blocks,
    references: [],
    writingGoals,
  });
}

describe('RDJ-06.1 — Prazo, meta e marcos', () => {
  it('rejeita data de entrega anterior a hoje com a mensagem exata', () => {
    expect(validateDeadlineDate('2026-03-09', '2026-03-10')).toBe(PAST_DEADLINE_ERROR);
    expect(validateDeadlineDate('2026-03-10', '2026-03-10')).toBeNull();
    expect(validateDeadlineDate('2026-04-01', '2026-03-10')).toBeNull();
  });

  it('detecta quando um marco está depois da data de entrega', () => {
    expect(isMilestoneAfterDeadline('2026-05-15', '2026-05-10')).toBe(true);
    expect(isMilestoneAfterDeadline('2026-05-10', '2026-05-10')).toBe(false);
    expect(isMilestoneAfterDeadline('2026-05-01', '2026-05-10')).toBe(false);
  });

  it('retorna estado unconfigured quando o projeto não tem prazo nem meta', () => {
    const status = evaluateWritingGoalStatus(undefined, 1200, undefined, '2026-03-10');
    expect(status.state).toBe('unconfigured');
    expect(status.hasDeadline).toBe(false);
    expect(status.hasTarget).toBe(false);
  });

  it('estima páginas textuais descontando pré-textuais habilitados', () => {
    const proj = makeProject([]);
    // DEFAULT_TEMPLATE_CONFIG tem capa + folha de rosto + sumário = 3 pré-textuais
    expect(estimateTextualPages(25, proj)).toBe(22);
    expect(estimateTextualPages(0, proj)).toBe(0);
    expect(estimateTextualPages(undefined, proj)).toBeUndefined();
  });

  it('preserva writingGoals corretamente no normalizeProject', () => {
    const proj = makeProject([], {
      deadlineDate: '2026-06-30',
      deadlineLabel: 'defesa',
      targetUnit: 'words',
      targetValue: 20000,
      milestones: [
        {
          id: 'm1',
          chapterBlockId: 'b1',
          title: 'Referencial Teórico',
          dueDate: '2026-05-10',
          completed: false,
          updatedAt: '2026-03-10T10:00:00.000Z',
        },
      ],
      dailyHistory: [
        {
          date: '2026-03-10',
          totalWords: 8000,
          netWords: 450,
          updatedAt: '2026-03-10T18:00:00.000Z',
        },
      ],
      reminder: {
        enabled: true,
        time: '20:00',
      },
      lastCompiledTextualPages: 32,
      updatedAt: '2026-03-10T18:00:00.000Z',
    });

    expect(proj.writingGoals?.deadlineDate).toBe('2026-06-30');
    expect(proj.writingGoals?.deadlineLabel).toBe('defesa');
    expect(proj.writingGoals?.targetValue).toBe(20000);
    expect(proj.writingGoals?.milestones).toHaveLength(1);
    expect(proj.writingGoals?.dailyHistory).toHaveLength(1);
    expect(proj.writingGoals?.reminder?.time).toBe('20:00');
    expect(proj.writingGoals?.lastCompiledTextualPages).toBe(32);
  });
});

describe('RDJ-06.2 — Meta diária e progresso do dia', () => {
  it('Cenário 1: meta 20.000, atual 8.000, faltam 30 dias contando hoje -> meta de hoje = 400', () => {
    const goals: WritingGoals = {
      ...createEmptyWritingGoals(),
      deadlineDate: '2026-03-30', // de 01/03 até 30/03 = 30 dias contando hoje
      targetUnit: 'words',
      targetValue: 20000,
      baselineWords: 8000,
      baselineDate: '2026-03-01',
    };

    const status = evaluateWritingGoalStatus(goals, 8000, undefined, '2026-03-01');
    expect(status.remainingDays).toBe(30);
    expect(status.dailyTarget).toBe(400);
    expect(status.statusMessage).toBe('Faltam 400 palavras para a meta de hoje');
  });

  it('Cenário 2: meta de hoje é 400 e já escreveu 250 líquidas -> "Faltam 150 palavras para a meta de hoje"', () => {
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

    const status = evaluateWritingGoalStatus(goals, 8250, undefined, '2026-03-01');
    expect(status.todayNetWords).toBe(250);
    expect(status.todayRemaining).toBe(150);
    expect(status.statusMessage).toBe('Faltam 150 palavras para a meta de hoje');
  });

  it('Cenário 3: quando atinge ou passa a meta do dia -> "Meta de hoje concluída"', () => {
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

    const status = evaluateWritingGoalStatus(goals, 8420, undefined, '2026-03-01');
    expect(status.isTodayGoalReached).toBe(true);
    expect(status.state).toBe('today_reached');
    expect(status.statusMessage).toBe('Meta de hoje concluída');
  });

  it('Cenário 4: mantém a meta fixada durante o dia e recalcula no dia seguinte após dias parados', () => {
    const goals: WritingGoals = {
      ...createEmptyWritingGoals(),
      deadlineDate: '2026-03-30',
      targetUnit: 'words',
      targetValue: 20000,
      dailyTargetLock: {
        date: '2026-03-01',
        target: 400,
        unit: 'words',
        deadlineDate: '2026-03-30',
        totalTarget: 20000,
      },
    };

    // Mesmo dia: não muda mesmo escrevendo mais
    const sameDayLock = resolveDailyTargetLock(goals, 8300, '2026-03-01');
    expect(sameDayLock?.target).toBe(400);

    // 3 dias depois (04/03 -> faltam 27 dias contando hoje): recalcula (12000 / 27 = 445)
    const afterIdleLock = resolveDailyTargetLock(goals, 8000, '2026-03-04');
    expect(afterIdleLock?.date).toBe('2026-03-04');
    expect(afterIdleLock?.target).toBe(Math.ceil(12000 / 27));
  });

  it('Cenário 5: prazo encerrado exibe "Prazo encerrado"', () => {
    const goals: WritingGoals = {
      ...createEmptyWritingGoals(),
      deadlineDate: '2026-03-01',
      targetUnit: 'words',
      targetValue: 20000,
    };

    const status = evaluateWritingGoalStatus(goals, 8000, undefined, '2026-03-05');
    expect(status.isDeadlinePassed).toBe(true);
    expect(status.state).toBe('deadline_passed');
    expect(status.statusMessage).toBe('Prazo encerrado');
  });

  it('Cenário 6: meta total atingida exibe "Meta total atingida"', () => {
    const goals: WritingGoals = {
      ...createEmptyWritingGoals(),
      deadlineDate: '2026-03-30',
      targetUnit: 'words',
      targetValue: 20000,
    };

    const status = evaluateWritingGoalStatus(goals, 20500, undefined, '2026-03-10');
    expect(status.isTotalGoalReached).toBe(true);
    expect(status.state).toBe('total_reached');
    expect(status.statusMessage).toBe('Meta total atingida');
  });
});

describe('RDJ-06.3 — Progresso por capítulo, marcos atrasados e histórico diário', () => {
  it('agrupa palavras por capítulo (títulos h1) usando a mesma contagem do linter', () => {
    const blocks = [
      makeBlock('b1', 'h1', 'Introdução'),
      makeBlock('b2', 'paragraph', '<p>Este trabalho apresenta uma proposta inovadora.</p>'),
      makeBlock('b3', 'h1', 'Referencial Teórico'),
      makeBlock('b4', 'paragraph', 'Segundo autores clássicos a metodologia é essencial.'),
    ];

    const stats = getChapterWordStats(blocks);
    expect(stats).toHaveLength(2);
    expect(stats[0]).toMatchObject({ blockId: 'b1', title: 'Introdução', words: 7 });
    expect(stats[1]).toMatchObject({ blockId: 'b3', title: 'Referencial Teórico', words: 9 });
    expect(countProjectWords(blocks)).toBe(16);
  });

  it('destaca marco atrasado quando a data passou e não está concluído', () => {
    expect(
      isMilestoneOverdue(
        { id: 'm1', title: 'Introdução', dueDate: '2026-03-05', completed: false },
        '2026-03-10',
      ),
    ).toBe(true);

    expect(
      isMilestoneOverdue(
        { id: 'm1', title: 'Introdução', dueDate: '2026-03-05', completed: true },
        '2026-03-10',
      ),
    ).toBe(false);
  });

  it('Cenário 5: projeto importado de 10.000 palavras não conta como escritas no dia', () => {
    const tenThousandWords = Array.from({ length: 10000 }, (_, i) => `palavra${i}`).join(' ');
    const imported = makeProject([makeBlock('b1', 'paragraph', tenThousandWords)]);
    const prepared = initializeImportedProjectGoals(imported, new Date(2026, 2, 10, 10, 0, 0));

    expect(prepared.writingGoals?.baselineWords).toBe(10000);
    expect(computeTodayNetWords(prepared.writingGoals, 10000, '2026-03-10')).toBe(0);

    // Após escrever 120 palavras no mesmo dia, o líquido do dia é exatamente 120
    const updatedGoals = recordDailyWritingSnapshot(
      prepared.writingGoals,
      10120,
      new Date(2026, 2, 10, 15, 0, 0),
    );
    expect(updatedGoals.dailyHistory[0].netWords).toBe(120);
  });

  it('gera 30 dias de histórico destacando dias ativos (>= 50 palavras líquidas)', () => {
    const goals: WritingGoals = {
      ...createEmptyWritingGoals(),
      dailyHistory: [
        {
          date: '2026-03-08',
          totalWords: 1040,
          netWords: 40, // abaixo de 50 -> não ativo
          updatedAt: '2026-03-08T20:00:00.000Z',
        },
        {
          date: '2026-03-09',
          totalWords: 1090,
          netWords: ACTIVE_DAY_MIN_WORDS, // exatamente 50 -> ativo
          updatedAt: '2026-03-09T20:00:00.000Z',
        },
        {
          date: '2026-03-10',
          totalWords: 1500,
          netWords: 410,
          updatedAt: '2026-03-10T20:00:00.000Z',
        },
      ],
    };

    const points = getLast30DaysHistory(goals, '2026-03-10');
    expect(points).toHaveLength(30);
    expect(points[points.length - 1].date).toBe('2026-03-10');
    expect(points[points.length - 1].isToday).toBe(true);
    expect(points[points.length - 1].isActive).toBe(true);

    const day8 = points.find((p) => p.date === '2026-03-08');
    const day9 = points.find((p) => p.date === '2026-03-09');
    expect(day8?.isActive).toBe(false);
    expect(day9?.isActive).toBe(true);
  });
});
