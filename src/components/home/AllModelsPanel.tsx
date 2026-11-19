import React from 'react';
import { Globe, Plus, Upload, X } from 'lucide-react';
import type { DocumentProject, ProjectTemplateType } from '@/types/document';
import type { CustomTemplate } from '@/core/storage/customTemplates';
import { PROJECT_TEMPLATES } from '@/core/storage/projectTemplates';
import { parsePackageId } from '@/core/universe/virtualPackage';
import { ProjectCover } from './ProjectCover';
import { CustomTemplateCover } from './CustomTemplateCover';

export const ALL_MODELS_PANEL_ID = 'home-all-models';
export const NEW_PROJECT_NAME_INPUT_ID = 'home-new-project-name';

const TILE =
  'group/tile flex h-full w-full flex-col items-stretch gap-2 rounded-xl border border-line bg-surface-muted dark:bg-surface p-2.5 text-left hover:border-brand-600 hover:shadow-sm transition-colors';

/** Modelos internos exibidos como capas (o "Typst Universe" genérico virou "Buscar novos modelos"). */
const BUILT_IN = PROJECT_TEMPLATES.filter((t) => t.type !== 'universe_custom' && t.type !== 'em_branco');

function coverFor(type: ProjectTemplateType, title: string): Pick<DocumentProject, 'name' | 'templateType' | 'metadata'> {
  return { name: title, templateType: type, metadata: { title } as DocumentProject['metadata'] };
}

interface AllModelsPanelProps {
  customTemplates: CustomTemplate[];
  highlightId?: string | null;
  projectName: string;
  nameTaken: boolean;
  onProjectNameChange: (value: string) => void;
  onCreate: (type: ProjectTemplateType) => void;
  onCreateFromCustom: (template: CustomTemplate) => void;
  onRemoveCustom: (template: CustomTemplate) => void;
  onOpenUniverse: () => void;
  onImport: () => void;
  onClose: () => void;
}

/**
 * "Mais modelos" expandido: todos os modelos como capas, os modelos personalizados do
 * usuário (pacotes do Typst Universe com nome próprio) e o atalho para buscar novos.
 * Clicar num modelo cria o trabalho na hora, com o nome digitado (ou um nome padrão).
 */
export const AllModelsPanel: React.FC<AllModelsPanelProps> = ({
  customTemplates,
  highlightId,
  projectName,
  nameTaken,
  onProjectNameChange,
  onCreate,
  onCreateFromCustom,
  onRemoveCustom,
  onOpenUniverse,
  onImport,
  onClose,
}) => (
  <section
    id={ALL_MODELS_PANEL_ID}
    aria-labelledby="all-models-title"
    className="scroll-mt-4 rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 id="all-models-title" className="text-base font-semibold text-fg">
          Todos os modelos
        </h2>
        <p className="mt-0.5 text-sm text-fg-muted">
          Clique em um modelo para criar o trabalho. Os modelos que você adicionar ficam salvos aqui.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar todos os modelos"
        className="touch-target flex items-center justify-center rounded-md p-1.5 text-slate-500 hover:bg-surface-sunken hover:text-slate-800 dark:hover:text-slate-100"
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    <div className="mt-4 max-w-md">
      <label htmlFor={NEW_PROJECT_NAME_INPUT_ID} className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
        Nome do novo trabalho <span className="font-normal text-fg-muted">(opcional)</span>
      </label>
      <input
        id={NEW_PROJECT_NAME_INPUT_ID}
        type="text"
        value={projectName}
        onChange={(e) => onProjectNameChange(e.target.value)}
        placeholder="Ex: TCC Engenharia de Software 2026"
        aria-invalid={nameTaken}
        aria-describedby={nameTaken ? `${NEW_PROJECT_NAME_INPUT_ID}-error` : undefined}
        className={`w-full rounded-lg border bg-surface px-3 py-2 text-sm focus:outline-none ${
          nameTaken ? 'border-red-500' : 'border-slate-300'
        }`}
      />
      {nameTaken && (
        <p id={`${NEW_PROJECT_NAME_INPUT_ID}-error`} className="mt-1 text-xs text-red-700 dark:text-red-400">
          Já existe um trabalho com esse nome. Escolha outro.
        </p>
      )}
    </div>

    <h3 className="mt-5 text-sm font-semibold text-fg">Modelos do Redija</h3>
    <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(132px,1fr))]">
      <li>
        <button type="button" onClick={() => onCreate('em_branco')} className={TILE} aria-label="Criar Em branco">
          <span className="flex aspect-[1/1.414] w-full items-center justify-center rounded-[2px] border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 group-hover/tile:border-brand-600 group-hover/tile:text-brand-700">
            <Plus className="w-7 h-7" />
          </span>
          <span className="text-sm font-semibold text-fg leading-tight">Em branco</span>
        </button>
      </li>
      {BUILT_IN.map((tpl) => (
        <li key={tpl.type}>
          <button type="button" onClick={() => onCreate(tpl.type)} className={TILE} aria-label={`Criar ${tpl.label}`}>
            <ProjectCover project={coverFor(tpl.type, tpl.label)} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-fg leading-tight line-clamp-2">
                {tpl.label.replace(/\s*\(.*\)$/, '')}
              </span>
              <span className="mt-0.5 block font-mono text-[0.7rem] font-semibold uppercase text-fg-muted">
                {tpl.badge}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>

    <h3 className="mt-6 text-sm font-semibold text-fg">Seus modelos</h3>
    {customTemplates.length === 0 && (
      <p className="mt-0.5 text-sm text-fg-muted">
        Você ainda não adicionou modelos. Busque no Typst Universe e eles passam a aparecer aqui.
      </p>
    )}
    <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(132px,1fr))]">
      {customTemplates.map((tpl) => {
        const parsed = parsePackageId(tpl.packageId);
        const isNew = tpl.id === highlightId;
        return (
          <li key={tpl.id} className="group/custom relative">
            <button
              type="button"
              onClick={() => onCreateFromCustom(tpl)}
              className={`${TILE} ${isNew ? 'border-brand-600 ring-2 ring-brand-600/30' : ''}`}
              aria-label={`Criar ${tpl.name}`}
            >
              <CustomTemplateCover template={tpl} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-fg leading-tight line-clamp-2">{tpl.name}</span>
                <span
                  className="mt-0.5 block truncate font-mono text-[0.7rem] font-semibold text-fg-muted"
                  title={tpl.packageId}
                >
                  {parsed.name} {parsed.version}
                </span>
              </span>
              {isNew && (
                <span className="absolute left-2 top-2 rounded-md bg-brand-700 px-1.5 py-0.5 text-[0.7rem] font-semibold text-white">
                  Novo
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onRemoveCustom(tpl)}
              aria-label={`Remover modelo ${tpl.name}`}
              title="Remover modelo"
              className="touch-target absolute right-1.5 top-1.5 flex items-center justify-center rounded-full bg-surface/95 p-1 text-slate-600 shadow-sm ring-1 ring-black/10 hover:text-red-700 dark:text-slate-300 dark:hover:text-red-400 pointer-fine:opacity-0 pointer-fine:group-hover/custom:opacity-100 pointer-fine:focus-visible:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        );
      })}
      <li>
        <button type="button" onClick={onOpenUniverse} className={TILE}>
          <span className="flex aspect-[1/1.414] w-full flex-col items-center justify-center gap-2 rounded-[2px] border-2 border-dashed border-brand-600/50 bg-brand-50/60 dark:bg-brand-950/30 px-2 text-center text-brand-800 dark:text-brand-300">
            <Globe className="w-7 h-7" />
            <span className="text-xs font-medium leading-tight">Typst Universe</span>
          </span>
          <span className="text-sm font-semibold text-fg leading-tight">Buscar novos modelos</span>
        </button>
      </li>
    </ul>

    <div className="mt-5 border-t border-line pt-3">
      <button
        type="button"
        onClick={onImport}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-brand-700 dark:hover:text-brand-400"
      >
        <Upload className="w-4 h-4" />
        Importar arquivo <span className="text-fg-muted font-normal">(.docx, .tex, .typ, .zip)</span>
      </button>
    </div>
  </section>
);
