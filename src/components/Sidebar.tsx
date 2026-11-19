import React, { useMemo, useState } from 'react';
import {
  AcademicReference,
  DocumentMetadata,
  DocumentProject,
  SidebarConfig,
} from '@/types/document';
import { runDocumentLinter } from '@/core/transpiler/linters';
import {
  ContextualGuideMode,
  getPreservedHiddenFields,
  getTemplateCapabilities,
} from '@/core/templates/templateCapabilities';
import { SidebarLinterSection } from './sidebar/SidebarLinterSection';
import { SidebarPreservedFieldsSection } from './sidebar/SidebarPreservedFieldsSection';
import { SidebarFieldCustomizerModal } from './sidebar/SidebarFieldCustomizerModal';
import { SidebarIdentificationSection } from './sidebar/SidebarIdentificationSection';
import { SidebarPreTextualsSection } from './sidebar/SidebarPreTextualsSection';
import { SidebarAbstractSection } from './sidebar/SidebarAbstractSection';
import { SidebarReferencesSection } from './sidebar/SidebarReferencesSection';
import { SidebarPostTextualsSection } from './sidebar/SidebarPostTextualsSection';
import { PanelLeftClose, Sliders, SlidersHorizontal, Target } from 'lucide-react';
import { PaneWindowControls } from '@/components/ui/PaneWindowControls';

interface SidebarProps {
  widthPx?: number;
  isCompact?: boolean;
  project: DocumentProject;
  metadata: DocumentMetadata;
  onChangeMetadata: (meta: DocumentMetadata) => void;
  onChangeSidebarConfig?: (sidebarConfig?: SidebarConfig) => void;
  references: AcademicReference[];
  onOpenReferenceModal: () => void;
  onEditReference?: (ref: AcademicReference) => void;
  onOpenTemplateCustomizer?: () => void;
  onOpenGoalsModal?: () => void;
  onOpenAbntGuide?: () => void;
  onOpenGuide?: (mode: ContextualGuideMode) => void;
  onRemoveReference: (id: string) => void;
  onMinimize?: () => void;
  /** Deixa só este painel visível (desktop). */
  onMaximize?: () => void;
  /** Volta a exibir todos os painéis (quando este está maximizado). */
  onRestoreLayout?: () => void;
  /** Este é o único painel visível. */
  isMaximized?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  widthPx,
  isCompact = false,
  project,
  metadata,
  onChangeMetadata,
  onChangeSidebarConfig,
  references,
  onOpenReferenceModal,
  onEditReference,
  onOpenTemplateCustomizer,
  onOpenGoalsModal,
  onOpenAbntGuide,
  onOpenGuide,
  onRemoveReference,
  onMinimize,
  onMaximize,
  onRestoreLayout,
  isMaximized = false,
}) => {
  const isFullBleed = isCompact || widthPx == null;
  const [isFieldCustomizerOpen, setIsFieldCustomizerOpen] = useState(false);

  const updateField = <K extends keyof DocumentMetadata>(
    field: K,
    value: DocumentMetadata[K],
  ) => {
    onChangeMetadata({ ...metadata, [field]: value });
  };

  const capabilities = useMemo(() => getTemplateCapabilities(project), [project]);
  const preservedHiddenFields = useMemo(
    () => getPreservedHiddenFields(project, capabilities),
    [project, capabilities],
  );
  const lintReport = useMemo(
    () => runDocumentLinter(project, capabilities),
    [project, capabilities],
  );

  return (
    <>
      <aside
        aria-label="Estrutura do documento"
        style={isFullBleed ? undefined : { width: `${widthPx}px` }}
        className={`border-r border-slate-200 bg-white flex flex-col h-full overflow-y-auto min-w-0 ${
          isFullBleed ? 'flex-1 w-full' : 'shrink-0'
        }`}
      >
        <div className="p-3.5 border-b border-slate-100 flex items-start justify-between gap-2 sticky top-0 bg-white z-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {capabilities.headerTitle}
              </h2>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold border ${
                  capabilities.isModified
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : capabilities.isAbntFamily
                      ? 'bg-brand-50 text-brand-700 border-brand-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {capabilities.badgeLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{capabilities.headerSubtitle}</p>
            {(onOpenTemplateCustomizer || onChangeSidebarConfig || onOpenGoalsModal) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {onOpenTemplateCustomizer && (
                  <button
                    type="button"
                    onClick={onOpenTemplateCustomizer}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-300 text-xs font-medium text-slate-600 hover:text-brand-800 transition-colors"
                    title="Escolher padrão de layout e configurar norma, tipografia, página e citações"
                  >
                    <Sliders className="w-3 h-3 text-brand-700" />
                    <span>Norma &amp; Layout</span>
                  </button>
                )}
                {onChangeSidebarConfig && (
                  <button
                    type="button"
                    onClick={() => setIsFieldCustomizerOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-300 text-xs font-medium text-slate-600 hover:text-brand-800 transition-colors"
                    title="Escolher quais campos de metadados ficam visíveis nesta barra lateral"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-brand-700" />
                    <span>Personalizar Campos</span>
                  </button>
                )}
                {onOpenGoalsModal && (
                  <button
                    type="button"
                    onClick={onOpenGoalsModal}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-brand-50 hover:border-brand-300 text-xs font-medium text-slate-600 hover:text-brand-800 transition-colors"
                    title="Definir prazo de entrega, meta de palavras ou páginas e marcos por capítulo"
                  >
                    <Target className="w-3 h-3 text-brand-700" />
                    <span>Prazos &amp; Metas</span>
                  </button>
                )}
              </div>
            )}
          </div>
          <PaneWindowControls
            label="Estrutura"
            isMaximized={isMaximized}
            onMaximize={onMaximize}
            onRestore={onRestoreLayout}
            onMinimize={onMinimize}
            minimizeIcon={<PanelLeftClose className="w-4 h-4" />}
          />
        </div>

        <div className="divide-y divide-slate-100 flex-1 pb-12">
          <SidebarIdentificationSection
            metadata={metadata}
            templateConfig={project.templateConfig}
            capabilities={capabilities}
            onUpdateField={updateField}
            onOpenTemplateCustomizer={onOpenTemplateCustomizer}
          />

          <SidebarPreTextualsSection
            metadata={metadata}
            capabilities={capabilities}
            onUpdateField={updateField}
          />

          <SidebarAbstractSection
            metadata={metadata}
            capabilities={capabilities}
            onUpdateField={updateField}
          />

          <SidebarReferencesSection
            project={project}
            references={references}
            onOpenReferenceModal={onOpenReferenceModal}
            onEditReference={onEditReference}
            onOpenTemplateCustomizer={onOpenTemplateCustomizer}
            onRemoveReference={onRemoveReference}
          />

          <SidebarPostTextualsSection
            metadata={metadata}
            capabilities={capabilities}
            onUpdateField={updateField}
          />

          <SidebarPreservedFieldsSection
            fields={preservedHiddenFields}
            templateBadgeLabel={capabilities.badgeLabel}
          />

          <SidebarLinterSection
            capabilities={capabilities}
            lintReport={lintReport}
            onOpenGuide={
              onOpenGuide ?? (onOpenAbntGuide ? () => onOpenAbntGuide() : undefined)
            }
          />
        </div>
      </aside>

      {onChangeSidebarConfig && (
        <SidebarFieldCustomizerModal
          isOpen={isFieldCustomizerOpen}
          onClose={() => setIsFieldCustomizerOpen(false)}
          capabilities={capabilities}
          onSave={onChangeSidebarConfig}
        />
      )}
    </>
  );
};
