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
import { PanelLeftClose, SlidersHorizontal } from 'lucide-react';

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
  onOpenAbntGuide?: () => void;
  onOpenGuide?: (mode: ContextualGuideMode) => void;
  onRemoveReference: (id: string) => void;
  onMinimize?: () => void;
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
  onOpenAbntGuide,
  onOpenGuide,
  onRemoveReference,
  onMinimize,
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
        style={isFullBleed ? undefined : { width: `${widthPx}px` }}
        className={`border-r border-neutral-200 bg-white flex flex-col h-full overflow-y-auto min-w-0 ${
          isFullBleed ? 'flex-1 w-full' : 'shrink-0'
        }`}
      >
        <div className="p-3.5 border-b border-neutral-100 flex items-start justify-between gap-2 sticky top-0 bg-white z-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                {capabilities.headerTitle}
              </h2>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                  capabilities.isModified
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : capabilities.isAbntFamily
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                }`}
              >
                {capabilities.badgeLabel}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">{capabilities.headerSubtitle}</p>
            {onChangeSidebarConfig && (
              <button
                type="button"
                onClick={() => setIsFieldCustomizerOpen(true)}
                className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-neutral-200 bg-neutral-50 hover:bg-emerald-50 hover:border-emerald-300 text-[10px] font-medium text-neutral-600 hover:text-emerald-700 transition-colors"
                title="Escolher quais campos de metadados ficam visíveis nesta barra lateral"
              >
                <SlidersHorizontal className="w-3 h-3 text-emerald-600" />
                <span>Personalizar Campos</span>
              </button>
            )}
          </div>
          {onMinimize && (
            <button
              type="button"
              onClick={onMinimize}
              className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0"
              title="Minimizar aba lateral esquerda"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="divide-y divide-neutral-100 flex-1 pb-12">
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
