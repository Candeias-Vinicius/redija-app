import React, { useMemo } from 'react';
import { ArrowRight, Download, History, Loader2 } from 'lucide-react';
import type { DocumentProject } from '@/types/document';
import { ProjectCover } from './ProjectCover';
import { formatRelativeTime, projectStats, templateBadge, templateLabel } from './homeUtils';

interface ContinueCardProps {
  project: DocumentProject;
  isDownloading: boolean;
  onOpen: (project: DocumentProject) => void;
  onDownloadPdf: (project: DocumentProject) => void;
}

const numberFormat = new Intl.NumberFormat('pt-BR');

function plural(count: number, singular: string, pluralForm: string): string {
  return `${numberFormat.format(count)} ${count === 1 ? singular : pluralForm}`;
}

/**
 * "Continuar de onde parou": texto e ações à esquerda; à direita, a capa do trabalho
 * grande, levemente inclinada e cortada pela borda inferior (como uma folha saindo
 * da pasta). A capa ocupa a altura do card de forma intencional, sem vãos.
 */
export const ContinueCard: React.FC<ContinueCardProps> = ({
  project,
  isDownloading,
  onOpen,
  onDownloadPdf,
}) => {
  const stats = useMemo(() => projectStats(project), [project]);
  const shortLabel = templateLabel(project.templateType).replace(/\s*\(.*\)$/, '');

  return (
    <article className="group relative grid min-w-0 grid-cols-[minmax(0,1fr)] sm:min-h-52 sm:grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
      <div className="flex min-w-0 flex-col justify-center gap-2.5 p-5 sm:p-6">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-brand-400">
          <History className="w-4 h-4" aria-hidden="true" />
          Continuar de onde parou
        </p>
        <h2 className="text-lg sm:text-xl font-semibold leading-snug text-fg line-clamp-2 break-words">
          {project.name}
        </h2>
        <p className="text-sm text-fg-muted">
          {shortLabel} · {templateBadge(project.templateType)} · editado{' '}
          {formatRelativeTime(project.updatedAt)}
        </p>

        <ul className="flex flex-wrap gap-1.5" aria-label="Resumo do trabalho">
          {[
            plural(stats.words, 'palavra', 'palavras'),
            plural(stats.sections, 'seção', 'seções'),
            plural(stats.references, 'referência', 'referências'),
          ].map((item) => (
            <li
              key={item}
              className="rounded-md bg-surface-sunken px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300"
            >
              {item}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onOpen(project)}
            className="touch-target inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-800"
          >
            Abrir trabalho
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDownloadPdf(project)}
            disabled={isDownloading}
            aria-label={`Baixar PDF de ${project.name}`}
            className="touch-target inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-surface-sunken disabled:opacity-60 dark:text-slate-200"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            PDF
          </button>
        </div>
      </div>

      {/* Capa recortada: decorativa (o título já está no texto); clicar também abre o trabalho.
          No mobile fica oculta: o card fica compacto e as capas aparecem no grid abaixo. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => onOpen(project)}
        className="relative hidden w-44 self-stretch overflow-hidden bg-surface-sunken sm:block xl:w-52 2xl:w-60"
      >
        <span className="absolute inset-x-[14%] top-6 block origin-top -rotate-2 shadow-lg transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:-rotate-1">
          <ProjectCover project={project} />
        </span>
      </button>
    </article>
  );
};
