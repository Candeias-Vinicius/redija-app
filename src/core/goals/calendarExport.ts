// =====================================================================
// RedijaApp — Exportação de Prazos e Marcos para Agenda (RDJ-06.4)
// Gera arquivo iCalendar (.ics — RFC 5545) e link do Google Agenda no navegador.
// =====================================================================

import { DocumentProject } from '@/types/document';
import { triggerBlobDownload } from '@/core/typst/projectCompiler';
import { addLocalDays, formatDatePtBr } from './writingGoals';

function toIcsDateValue(dateKey: string): string {
  return dateKey.replace(/-/g, '');
}

function toIcsUtcTimestamp(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mi = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

/**
 * Escapa caracteres especiais conforme RFC 5545 seção 3.3.11 (TEXT).
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/**
 * Quebra linhas acima de 75 octetos conforme RFC 5545 seção 3.1 (folding).
 */
function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;

  for (const ch of line) {
    const chBytes = encoder.encode(ch).length;
    const limit = chunks.length === 0 ? 75 : 74; // linhas continuadas têm 1 espaço inicial
    if (currentBytes + chBytes > limit && current.length > 0) {
      chunks.push(current);
      current = ch;
      currentBytes = chBytes;
    } else {
      current += ch;
      currentBytes += chBytes;
    }
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks.join('\r\n ');
}

function sanitizeUidSegment(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, '-');
  return cleaned || 'item';
}

function resolveSequence(isoTimestamp?: string): number {
  if (!isoTimestamp) return 1;
  const ms = Date.parse(isoTimestamp);
  if (!Number.isFinite(ms) || ms <= 0) return 1;
  return Math.max(1, Math.floor(ms / 1000));
}

function buildAllDayVevent(params: {
  uid: string;
  dateKey: string;
  summary: string;
  description: string;
  alarmDescription: string;
  dtstamp: string;
  sequence: number;
}): string[] {
  const startDate = toIcsDateValue(params.dateKey);
  const endDate = toIcsDateValue(addLocalDays(params.dateKey, 1));

  return [
    'BEGIN:VEVENT',
    `UID:${params.uid}`,
    `DTSTAMP:${params.dtstamp}`,
    `LAST-MODIFIED:${params.dtstamp}`,
    `SEQUENCE:${params.sequence}`,
    `DTSTART;VALUE=DATE:${startDate}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:${escapeIcsText(params.summary)}`,
    `DESCRIPTION:${escapeIcsText(params.description)}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-P1D',
    `DESCRIPTION:${escapeIcsText(params.alarmDescription)}`,
    'END:VALARM',
    'END:VEVENT',
  ];
}

function resolveProjectLabel(project: Pick<DocumentProject, 'name' | 'metadata'>): string {
  return project.metadata.title?.trim() || project.name?.trim() || 'Trabalho Acadêmico';
}

/**
 * Gera o conteúdo iCalendar (.ics — RFC 5545) com o prazo principal e todos os marcos.
 * Retorna string vazia se não houver prazo nem marcos.
 */
export function buildProjectCalendarIcs(
  project: Pick<DocumentProject, 'id' | 'name' | 'metadata' | 'writingGoals'>,
  now: Date = new Date(),
): string {
  const goals = project.writingGoals;
  if (!goals?.deadlineDate) {
    return '';
  }

  const projectLabel = resolveProjectLabel(project);
  const projectUid = sanitizeUidSegment(project.id);
  const dtstamp = toIcsUtcTimestamp(now);
  const deadlineWord = goals.deadlineLabel === 'defesa' ? 'Defesa' : 'Entrega';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RedijaApp//Prazos e Metas//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(`Redija — ${projectLabel}`)}`,
  ];

  const targetNote =
    goals.targetValue && goals.targetValue > 0
      ? `Meta total: ${goals.targetValue.toLocaleString('pt-BR')} ${goals.targetUnit === 'pages' ? 'páginas' : 'palavras'}. `
      : '';

  lines.push(
    ...buildAllDayVevent({
      uid: `redija-${projectUid}-deadline@redija.app`,
      dateKey: goals.deadlineDate,
      summary: `${deadlineWord}: ${projectLabel}`,
      description: `${targetNote}Prazo de ${deadlineWord.toLowerCase()} definido no Redija para ${formatDatePtBr(goals.deadlineDate)}.`,
      alarmDescription: `Amanhã é a data de ${deadlineWord.toLowerCase()} de "${projectLabel}".`,
      dtstamp,
      sequence: resolveSequence(goals.updatedAt),
    }),
  );

  for (const milestone of goals.milestones) {
    if (!milestone.dueDate) continue;
    const milestoneUid = sanitizeUidSegment(milestone.id);
    lines.push(
      ...buildAllDayVevent({
        uid: `redija-${projectUid}-milestone-${milestoneUid}@redija.app`,
        dateKey: milestone.dueDate,
        summary: `Marco (${projectLabel}): ${milestone.title}`,
        description: `Marco do capítulo "${milestone.title}" no trabalho "${projectLabel}" (${formatDatePtBr(milestone.dueDate)}).`,
        alarmDescription: `Amanhã vence o marco "${milestone.title}" em "${projectLabel}".`,
        dtstamp,
        sequence: resolveSequence(milestone.updatedAt ?? goals.updatedAt),
      }),
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

/**
 * Monta o link direto para criar o evento da entrega no Google Agenda (RDJ-06.4 Cenário 3).
 */
export function buildGoogleCalendarUrl(
  project: Pick<DocumentProject, 'name' | 'metadata' | 'writingGoals'>,
): string | null {
  const goals = project.writingGoals;
  if (!goals?.deadlineDate) return null;

  const projectLabel = resolveProjectLabel(project);
  const deadlineWord = goals.deadlineLabel === 'defesa' ? 'Defesa' : 'Entrega';
  const start = toIcsDateValue(goals.deadlineDate);
  const end = toIcsDateValue(addLocalDays(goals.deadlineDate, 1));
  const targetNote =
    goals.targetValue && goals.targetValue > 0
      ? `Meta total: ${goals.targetValue.toLocaleString('pt-BR')} ${goals.targetUnit === 'pages' ? 'páginas' : 'palavras'}.\n`
      : '';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${deadlineWord}: ${projectLabel}`,
    dates: `${start}/${end}`,
    details: `${targetNote}Prazo de ${deadlineWord.toLowerCase()} definido no Redija.`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Baixa o arquivo .ics diretamente no navegador.
 */
export function downloadProjectCalendarIcs(
  project: Pick<DocumentProject, 'id' | 'name' | 'metadata' | 'writingGoals'>,
): boolean {
  const content = buildProjectCalendarIcs(project);
  if (!content) return false;
  const slug = (project.name || 'redija-prazos')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  triggerBlobDownload(blob, `${slug || 'redija'}-prazos.ics`);
  return true;
}
