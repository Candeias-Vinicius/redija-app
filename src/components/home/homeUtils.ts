import type { DocumentProject, ProjectTemplateType } from '@/types/document';
import { PROJECT_TEMPLATES } from '@/core/storage/projectTemplates';

/** Rótulo curto do modelo exibido nos cards (ex.: "NBR 14724", "SBC"). */
export function templateBadge(type?: ProjectTemplateType): string {
  return PROJECT_TEMPLATES.find((t) => t.type === (type ?? 'tcc'))?.badge ?? 'LIVRE';
}

/** Nome do modelo por extenso. */
export function templateLabel(type?: ProjectTemplateType): string {
  return PROJECT_TEMPLATES.find((t) => t.type === (type ?? 'tcc'))?.label ?? 'Documento';
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
];

/** "há 2 horas", "ontem", "agora mesmo"... */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  const diffSeconds = Math.round((time - now) / 1000);
  if (Math.abs(diffSeconds) < 60) return 'agora mesmo';
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  for (const [unit, seconds] of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= seconds) {
      return rtf.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return 'agora mesmo';
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Busca por nome, título, autor, instituição ou modelo, sem diferenciar acentos. */
export function matchesProjectSearch(project: DocumentProject, query: string): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  const haystack = normalize(
    [
      project.name,
      project.metadata?.title,
      project.metadata?.author,
      project.metadata?.institution,
      templateLabel(project.templateType),
      templateBadge(project.templateType),
      project.sharedBy?.name,
    ]
      .filter(Boolean)
      .join(' '),
  );
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

const TEXT_BLOCKS = new Set([
  'paragraph',
  'quote_long',
  'bullet',
  'numbered',
  'footnote',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'unnumbered_heading',
]);
const HEADING_BLOCKS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'unnumbered_heading']);

export interface ProjectStats {
  words: number;
  sections: number;
  references: number;
}

/** Números do trabalho para o card "Continuar": palavras do texto, seções e referências. */
export function projectStats(project: Pick<DocumentProject, 'blocks' | 'references'>): ProjectStats {
  let words = 0;
  let sections = 0;
  for (const block of project.blocks ?? []) {
    if (HEADING_BLOCKS.has(block.type)) sections++;
    if (!TEXT_BLOCKS.has(block.type) || typeof block.content !== 'string') continue;
    const text = block.content.replace(/<[^>]+>/g, ' ');
    words += text.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  }
  return { words, sections, references: project.references?.length ?? 0 };
}

/** Nome livre para um novo trabalho: "Base", "Base (2)", "Base (3)"... */
export function uniqueProjectName(base: string, existingNames: string[]): string {
  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  const clean = base.trim();
  if (!taken.has(clean.toLowerCase())) return clean;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${clean} (${i})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${clean} (${Date.now()})`;
}

export type ProjectSort = 'recent' | 'name';

export function sortProjects(list: DocumentProject[], sort: ProjectSort): DocumentProject[] {
  const copy = [...list];
  if (sort === 'name') {
    copy.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  } else {
    copy.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }
  return copy;
}

/** Modelos para a faixa de criação: os mais usados pelo usuário primeiro, depois os padrões. */
export function quickTemplates(projects: DocumentProject[], count = 3): ProjectTemplateType[] {
  const usage = new Map<ProjectTemplateType, number>();
  for (const p of projects) {
    const type = p.templateType ?? 'tcc';
    if (type === 'em_branco' || type === 'universe_custom') continue;
    usage.set(type, (usage.get(type) ?? 0) + 1);
  }
  const ranked = [...usage.entries()].sort((a, b) => b[1] - a[1]).map(([type]) => type);
  const defaults: ProjectTemplateType[] = [
    'tcc',
    'artigo',
    'relatorio',
    'projeto_pesquisa',
    'sbc',
    'ieee',
    'poster',
  ];
  return [...new Set([...ranked, ...defaults])].slice(0, count);
}
