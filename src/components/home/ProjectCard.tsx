import React, { useCallback, useId, useRef, useState } from 'react';
import {
  Cloud,
  Copy,
  Download,
  FolderSearch,
  LayoutTemplate,
  Loader2,
  MoreHorizontal,
  Pencil,
  Presentation,
  RotateCcw,
  Settings2,
  Trash2,
  Users,
} from 'lucide-react';
import type { DocumentProject } from '@/types/document';
import { getRemainingTrashDays } from '@/core/storage/db';
import { canGenerateDefenseFromProject } from '@/core/transpiler/slideGenerator';
import { useDismiss } from '@/hooks/useDismiss';
import { ProjectCover } from './ProjectCover';
import { formatRelativeTime, templateBadge } from './homeUtils';

export interface ProjectCardActions {
  onOpen: (project: DocumentProject) => void;
  onDownloadPdf: (project: DocumentProject) => void;
  onDuplicate: (project: DocumentProject) => void;
  onGenerateDefenseSlides?: (project: DocumentProject) => void;
  onGeneratePosterFromWork?: (project: DocumentProject) => void;
  onRename: (project: DocumentProject) => void;
  onShowStorage: (project: DocumentProject) => void;
  onMoveToTrash: (project: DocumentProject) => void;
}

interface ProjectCardProps extends ProjectCardActions {
  project: DocumentProject;
  view: 'grid' | 'list';
  isDownloading?: boolean;
}

const OVERLAY_BUTTON =
  // Cores repetidas em dark: para o tema escuro não clarear o ícone (ficava branco no branco)
  'flex items-center justify-center w-9 h-9 rounded-full bg-white/95 text-slate-800 dark:bg-white/95 dark:text-slate-800 shadow-md hover:bg-white hover:scale-105 transition-transform';

const MENU_ITEM =
  'touch-target w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-surface-sunken disabled:opacity-50';

/** Linha de metadados do card: modelo, última edição e origem (Drive / compartilhado). */
const ProjectMeta: React.FC<{ project: DocumentProject }> = ({ project }) => (
  <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-fg-muted">
    <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-surface-sunken text-slate-600 dark:text-slate-300">
      {templateBadge(project.templateType)}
    </span>
    <span>editado {formatRelativeTime(project.updatedAt)}</span>
    {project.isSharedWithMe ? (
      <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300">
        <Users className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{project.sharedBy?.name ? `de ${project.sharedBy.name.split(' ')[0]}` : 'compartilhado'}</span>
      </span>
    ) : (
      project.driveFileId && (
        <span className="inline-flex items-center gap-1" title="Sincronizado com o Google Drive">
          <Cloud className="w-3.5 h-3.5 text-brand-700 dark:text-brand-400" aria-hidden="true" />
          <span className="sr-only">Sincronizado com o Google Drive</span>
        </span>
      )
    )}
    {(project.sourceProjectName ||
      project.generatedFrom?.name ||
      project.generatedFrom?.sourceProjectName) && (
      <span
        className="w-full truncate text-[0.7rem] text-brand-700 dark:text-brand-400"
        title={`Gerado a partir de ${
          project.sourceProjectName ||
          project.generatedFrom?.name ||
          project.generatedFrom?.sourceProjectName
        }`}
      >
        Gerado a partir de{' '}
        {project.sourceProjectName ||
          project.generatedFrom?.name ||
          project.generatedFrom?.sourceProjectName}
      </span>
    )}
  </p>
);

/**
 * Card de um trabalho na Home. No mouse, as ações rápidas aparecem sobre a capa ao
 * passar o cursor (ou ao focar pelo teclado). Em telas de toque, ficam no menu "⋯".
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  view,
  isDownloading = false,
  onOpen,
  onDownloadPdf,
  onDuplicate,
  onGenerateDefenseSlides,
  onGeneratePosterFromWork,
  onRename,
  onShowStorage,
  onMoveToTrash,
}) => {
  const canGenerateDefense = canGenerateDefenseFromProject(project);
  const [menu, setMenuState] = useState<'settings' | 'all' | null>(null);
  // O menu abre para o lado com mais espaço (evita sair da tela na 1ª coluna do mobile)
  const [alignLeft, setAlignLeft] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const setMenu = (next: React.SetStateAction<'settings' | 'all' | null>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) setAlignLeft(rect.left + rect.width / 2 < window.innerWidth / 2);
    setMenuState(next);
  };
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const closeMenu = useCallback(() => setMenuState(null), []);
  useDismiss(menu !== null, cardRef, closeMenu, menu === 'all' ? moreButtonRef : settingsButtonRef);

  const run = (action: (p: DocumentProject) => void) => (event: React.MouseEvent) => {
    event.stopPropagation();
    setMenuState(null);
    action(project);
  };

  const menuPanel = menu && (
    <div
      id={menuId}
      className={`absolute z-30 w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface shadow-xl py-1.5 animate-in fade-in zoom-in-95 duration-100 ${
        view === 'grid' ? 'bottom-16' : 'top-full mt-1'
      } ${view === 'grid' && alignLeft ? 'left-2' : 'right-2'}`}
    >
      {menu === 'all' && (
        <>
          <button type="button" onClick={run(onDownloadPdf)} disabled={isDownloading} className={MENU_ITEM}>
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Baixar PDF</span>
          </button>
          <button type="button" onClick={run(onDuplicate)} className={MENU_ITEM}>
            <Copy className="w-4 h-4" />
            <span>Duplicar</span>
          </button>
          <div className="my-1 border-t border-line" />
        </>
      )}
      {canGenerateDefense && (onGenerateDefenseSlides || onGeneratePosterFromWork) && (
        <>
          {onGenerateDefenseSlides && (
            <button type="button" onClick={run(onGenerateDefenseSlides)} className={MENU_ITEM}>
              <Presentation className="w-4 h-4 text-brand-700 dark:text-brand-400" />
              <span>Gerar slides de defesa</span>
            </button>
          )}
          {onGeneratePosterFromWork && (
            <button type="button" onClick={run(onGeneratePosterFromWork)} className={MENU_ITEM}>
              <LayoutTemplate className="w-4 h-4 text-brand-700 dark:text-brand-400" />
              <span>Gerar pôster A0</span>
            </button>
          )}
          <div className="my-1 border-t border-line" />
        </>
      )}
      <button type="button" onClick={run(onRename)} className={MENU_ITEM}>
        <Pencil className="w-4 h-4" />
        <span>Renomear</span>
      </button>
      <button type="button" onClick={run(onShowStorage)} className={MENU_ITEM}>
        <FolderSearch className="w-4 h-4" />
        <span>Onde está guardado</span>
      </button>
      <div className="my-1 border-t border-line" />
      <button
        type="button"
        onClick={run(onMoveToTrash)}
        className={`${MENU_ITEM} !text-red-700 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-950/40`}
      >
        <Trash2 className="w-4 h-4" />
        <span>Mover para a Lixeira</span>
      </button>
    </div>
  );

  // Botão "⋯" das telas de toque (sem hover): reúne todas as ações
  const touchMenuButton = (
    <button
      ref={moreButtonRef}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setMenu((m) => (m === 'all' ? null : 'all'));
      }}
      aria-label={`Ações de ${project.name}`}
      aria-expanded={menu === 'all'}
      aria-controls={menu === 'all' ? menuId : undefined}
      className="pointer-fine:hidden touch-target flex items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-surface-sunken shrink-0"
    >
      <MoreHorizontal className="w-5 h-5" />
    </button>
  );

  // Ações rápidas do mouse: Baixar PDF, Duplicar e Configurações
  const quickActions = (
    <>
      <button
        type="button"
        onClick={run(onDownloadPdf)}
        disabled={isDownloading}
        className={OVERLAY_BUTTON}
        title="Baixar PDF"
        aria-label={`Baixar PDF de ${project.name}`}
      >
        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </button>
      <button
        type="button"
        onClick={run(onDuplicate)}
        className={OVERLAY_BUTTON}
        title="Duplicar"
        aria-label={`Duplicar ${project.name}`}
      >
        <Copy className="w-4 h-4" />
      </button>
      <button
        ref={settingsButtonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenu((m) => (m === 'settings' ? null : 'settings'));
        }}
        className={OVERLAY_BUTTON}
        title="Configurações"
        aria-label={`Configurações de ${project.name}`}
        aria-expanded={menu === 'settings'}
        aria-controls={menu === 'settings' ? menuId : undefined}
      >
        <Settings2 className="w-4 h-4" />
      </button>
    </>
  );

  if (view === 'list') {
    return (
      <li>
        <article
          ref={cardRef}
          className="group relative flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-sunken focus-within:bg-surface-sunken transition-colors"
        >
          <div className="w-10 shrink-0">
            <ProjectCover project={project} />
          </div>
          <button
            type="button"
            onClick={() => onOpen(project)}
            className="min-w-0 flex-1 text-left rounded-md"
          >
            <h3 className="text-sm font-semibold text-fg truncate">{project.name}</h3>
            <ProjectMeta project={project} />
          </button>
          <div
            className={`hidden pointer-fine:flex items-center gap-1 transition-opacity ${
              menu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            } [&>button]:w-8 [&>button]:h-8 [&>button]:bg-transparent [&>button]:shadow-none [&>button]:text-slate-600 dark:[&>button]:text-slate-300 [&>button:hover]:bg-surface`}
          >
            {quickActions}
          </div>
          {touchMenuButton}
          {menuPanel}
        </article>
      </li>
    );
  }

  return (
    <li>
      <article
        ref={cardRef}
        className="group relative flex h-full flex-col rounded-xl border border-line bg-surface shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 focus-within:border-brand-600 transition-shadow"
      >
        {/* Capa: clicar abre o trabalho; as ações rápidas aparecem por cima no hover/foco */}
        <div
          className="relative overflow-hidden rounded-t-xl bg-surface-sunken px-[14%] pt-[9%] cursor-pointer"
          onClick={() => onOpen(project)}
        >
          <ProjectCover project={project} className="translate-y-[3%]" />
          <div
            className={`absolute inset-0 hidden pointer-fine:flex flex-col items-center justify-center gap-3 bg-slate-900/55 transition-opacity ${
              menu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
            }`}
          >
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onOpen(project);
              }}
              className="px-5 py-2 rounded-full bg-brand-700 hover:bg-brand-800 text-white text-sm font-semibold shadow-md"
            >
              Abrir
            </button>
            <div className="flex items-center gap-2">{quickActions}</div>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3">
          <button
            type="button"
            onClick={() => onOpen(project)}
            className="min-w-0 flex-1 text-left rounded-md"
          >
            <h3 className="text-sm font-semibold leading-snug text-fg line-clamp-2 break-words" title={project.name}>
              {project.name}
            </h3>
            <ProjectMeta project={project} />
          </button>
          {touchMenuButton}
        </div>
        {menuPanel}
      </article>
    </li>
  );
};

interface TrashProjectCardProps {
  project: DocumentProject;
  onRestore: (project: DocumentProject) => void;
  onDeleteForever: (project: DocumentProject) => void;
}

/** Card de um trabalho na Lixeira: restaurar ou excluir de vez. */
export const TrashProjectCard: React.FC<TrashProjectCardProps> = ({
  project,
  onRestore,
  onDeleteForever,
}) => {
  const daysLeft = getRemainingTrashDays(project.deletedAt);
  return (
    <li>
      <article className="flex h-full flex-col rounded-xl border border-line bg-surface shadow-xs">
        <div className="relative overflow-hidden rounded-t-xl bg-surface-sunken px-[14%] pt-[9%] opacity-70 grayscale">
          <ProjectCover project={project} className="translate-y-[3%]" />
        </div>
        <div className="p-3 space-y-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-snug text-fg line-clamp-2 break-words" title={project.name}>
              {project.name}
            </h3>
            <p className="mt-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
              Expira em {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onRestore(project)}
              className="touch-target flex flex-1 items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar</span>
            </button>
            <button
              type="button"
              onClick={() => onDeleteForever(project)}
              className="touch-target flex flex-1 items-center justify-center gap-1 px-2.5 py-1.5 rounded-md border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir de vez</span>
            </button>
          </div>
        </div>
      </article>
    </li>
  );
};
