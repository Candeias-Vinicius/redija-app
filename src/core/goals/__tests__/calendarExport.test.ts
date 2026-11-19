import { describe, it, expect } from 'vitest';
import {
  buildGoogleCalendarUrl,
  buildProjectCalendarIcs,
} from '../calendarExport';
import { DocumentProject } from '@/types/document';
import { normalizeProject } from '@/core/storage/schemaNormalizer';

function makeProjectWithGoals(): DocumentProject {
  return normalizeProject({
    id: 'proj-abc-123',
    name: 'TCC Engenharia',
    metadata: {
      title: 'Sistema de Redação Científica',
      author: 'Estudante',
      institution: 'UF',
    },
    blocks: [],
    references: [],
    writingGoals: {
      deadlineDate: '2026-06-20',
      deadlineLabel: 'entrega',
      targetUnit: 'words',
      targetValue: 15000,
      milestones: [
        {
          id: 'ms-ref',
          title: 'Referencial Teórico',
          dueDate: '2026-05-10',
          updatedAt: '2026-03-01T12:00:00.000Z',
        },
      ],
      dailyHistory: [],
      updatedAt: '2026-03-01T12:00:00.000Z',
    },
  });
}

describe('RDJ-06.4 — Exportação para Agenda (.ics RFC 5545 e Google Agenda)', () => {
  it('gera arquivo .ics válido com eventos de dia inteiro, VALARM -P1D e UIDs estáveis', () => {
    const project = makeProjectWithGoals();
    const ics = buildProjectCalendarIcs(project, new Date('2026-03-01T12:00:00.000Z'));

    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('VERSION:2.0\r\n');
    expect(ics).toContain('END:VCALENDAR\r\n');

    // Evento da entrega (dia inteiro: 20/06 até 21/06 exclusivo)
    expect(ics).toContain('UID:redija-proj-abc-123-deadline@redija.app\r\n');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260620\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20260621\r\n');

    // Evento do marco
    expect(ics).toContain('UID:redija-proj-abc-123-milestone-ms-ref@redija.app\r\n');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260510\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20260511\r\n');

    // Lembrete um dia antes
    const alarmMatches = ics.match(/TRIGGER:-P1D/g) ?? [];
    expect(alarmMatches).toHaveLength(2);
  });

  it('mantém o mesmo UID e aumenta SEQUENCE ao reexportar após mudança de data', () => {
    const project = makeProjectWithGoals();
    const firstIcs = buildProjectCalendarIcs(project);

    const updatedProject: DocumentProject = {
      ...project,
      writingGoals: {
        ...project.writingGoals!,
        deadlineDate: '2026-06-25',
        updatedAt: '2026-03-05T15:00:00.000Z',
      },
    };
    const secondIcs = buildProjectCalendarIcs(updatedProject);

    expect(firstIcs).toContain('UID:redija-proj-abc-123-deadline@redija.app');
    expect(secondIcs).toContain('UID:redija-proj-abc-123-deadline@redija.app');
    expect(secondIcs).toContain('DTSTART;VALUE=DATE:20260625');

    const seq1 = Number(/SEQUENCE:(\d+)/.exec(firstIcs)?.[1]);
    const seq2 = Number(/SEQUENCE:(\d+)/.exec(secondIcs)?.[1]);
    expect(seq2).toBeGreaterThan(seq1);
  });

  it('gera link direto pré-preenchido para o Google Agenda', () => {
    const project = makeProjectWithGoals();
    const url = buildGoogleCalendarUrl(project);

    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.origin).toBe('https://calendar.google.com');
    expect(parsed.searchParams.get('action')).toBe('TEMPLATE');
    expect(parsed.searchParams.get('dates')).toBe('20260620/20260621');
    expect(parsed.searchParams.get('text')).toContain('Sistema de Redação Científica');
  });

  it('retorna vazio/null quando não há prazo definido', () => {
    const project = normalizeProject({
      id: 'proj-no-deadline',
      name: 'Sem Prazo',
      metadata: {},
      blocks: [],
      references: [],
    });

    expect(buildProjectCalendarIcs(project)).toBe('');
    expect(buildGoogleCalendarUrl(project)).toBeNull();
  });
});
