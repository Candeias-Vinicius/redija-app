import React, { useRef, useState } from 'react';
import {
  Block,
  CitationFormat,
  DEFAULT_TEMPLATE_CONFIG,
  DocumentMetadata,
  ProjectTemplateType,
  TemplateConfig,
} from '@/types/document';
import {
  calculateProjectImageBytes,
  validateImageUploadForProject,
} from '@/core/storage/imageQuota';
import { RotateCcw, Sliders, X } from 'lucide-react';
import {
  CustomizerTabId,
  MODAL_TABS,
  PresetInfo,
  TemplateCustomizerApplyPayload,
  parseUniverseEntrypoint,
  resolveDraftTemplateType,
} from './customizer/presets';
import { CustomizerPresetsTab } from './customizer/CustomizerPresetsTab';
import { CustomizerTypographyTab } from './customizer/CustomizerTypographyTab';
import { CustomizerPageTab } from './customizer/CustomizerPageTab';
import { CustomizerCitationsTab } from './customizer/CustomizerCitationsTab';
import { CustomizerStructureTab } from './customizer/CustomizerStructureTab';

export type { TemplateCustomizerApplyPayload };

interface TemplateCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TemplateConfig;
  metadata: DocumentMetadata;
  templateType?: ProjectTemplateType;
  blocks?: Block[];
  onApply?: (payload: TemplateCustomizerApplyPayload) => void;
  onChangeConfig?: (config: TemplateConfig) => void;
  onChangeMetadata?: (metadata: DocumentMetadata) => void;
}

export const TemplateCustomizerModal: React.FC<TemplateCustomizerModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <TemplateCustomizerModalContent {...props} />;
};

const TemplateCustomizerModalContent: React.FC<TemplateCustomizerModalProps> = ({
  onClose,
  config: initialConfig,
  metadata: initialMetadata,
  templateType: initialTemplateType,
  blocks = [],
  onApply,
  onChangeConfig,
  onChangeMetadata,
}) => {
  const [activeTab, setActiveTab] = useState<CustomizerTabId>('presets');
  const [draftConfig, setDraftConfig] = useState<TemplateConfig>(() => ({ ...initialConfig }));
  const [draftMetadata, setDraftMetadata] = useState<DocumentMetadata>(() => ({
    ...initialMetadata,
  }));
  const [draftTemplateType, setDraftTemplateType] = useState<ProjectTemplateType>(() =>
    resolveDraftTemplateType(initialConfig, initialTemplateType),
  );
  const initialIsUniverse =
    initialConfig.preset === 'universe_custom' ||
    (initialConfig.preset === 'custom' && initialTemplateType === 'universe_custom');
  const [showUniverseExplorer, setShowUniverseExplorer] = useState<boolean>(initialIsUniverse);
  const preUniverseRef = useRef<{
    config: TemplateConfig;
    templateType: ProjectTemplateType;
  }>({
    config: { ...initialConfig },
    templateType: resolveDraftTemplateType(initialConfig, initialTemplateType),
  });
  const universeConnectorRef = useRef<HTMLDivElement>(null);

  const isUniverseSelected =
    draftConfig.preset === 'universe_custom' ||
    (draftConfig.preset === 'custom' && draftTemplateType === 'universe_custom');
  const isPosterActive =
    draftConfig.preset === 'poster' ||
    (draftConfig.preset === 'custom' && draftTemplateType === 'poster');

  const updateField = <K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => {
    setDraftConfig((prev) => ({
      ...prev,
      preset: 'custom',
      [key]: value,
    }));
  };

  const handleCitationFormatChange = (nextFormat: CitationFormat) => {
    const syncedStyle: 'uppercase' | 'titlecase' =
      nextFormat === 'abnt_titlecase' || nextFormat === 'author_date'
        ? 'titlecase'
        : 'uppercase';
    setDraftConfig((prev) => ({
      ...prev,
      preset: 'custom',
      citationFormat: nextFormat,
      citationStyle: syncedStyle,
    }));
  };

  const applyPreset = (preset: PresetInfo) => {
    const nextConfig: TemplateConfig = {
      preset: preset.id,
      ...preset.config,
    };
    const nextType = resolveDraftTemplateType(nextConfig, draftTemplateType);
    setDraftConfig(nextConfig);
    setDraftTemplateType(nextType);
    setShowUniverseExplorer(false);
    preUniverseRef.current = { config: nextConfig, templateType: nextType };
  };

  const toggleUniverseExplorer = () => {
    if (!showUniverseExplorer) {
      setShowUniverseExplorer(true);
      requestAnimationFrame(() => {
        universeConnectorRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      });
    } else if (!isUniverseSelected) {
      setShowUniverseExplorer(false);
    }
  };

  const handleUniversePackageInput = (nextPkg: string) => {
    const trimmed = nextPkg.trim();
    if (!trimmed) {
      if (preUniverseRef.current.templateType !== 'universe_custom') {
        setDraftConfig({
          ...preUniverseRef.current.config,
          universePackage: '',
          universeEntrypoint: undefined,
        });
        setDraftTemplateType(preUniverseRef.current.templateType);
      } else {
        setDraftConfig((prev) => ({
          ...prev,
          universePackage: '',
        }));
      }
      return;
    }

    if (!isUniverseSelected) {
      preUniverseRef.current = {
        config: draftConfig,
        templateType: draftTemplateType,
      };
    }

    const nextEntrypoint = parseUniverseEntrypoint(trimmed, draftConfig.universeEntrypoint);
    setDraftConfig((prev) => ({
      ...prev,
      universePackage: nextPkg,
      universeEntrypoint: nextEntrypoint,
      preset: 'universe_custom',
    }));
    setDraftTemplateType('universe_custom');
  };

  const handleSelectUniverseChip = (pkgId: string, entrypoint: string) => {
    if (!isUniverseSelected) {
      preUniverseRef.current = {
        config: draftConfig,
        templateType: draftTemplateType,
      };
    }
    setDraftConfig((prev) => ({
      ...prev,
      universePackage: pkgId,
      universeEntrypoint: entrypoint,
      preset: 'universe_custom',
    }));
    setDraftTemplateType('universe_custom');
    setShowUniverseExplorer(true);
  };

  const handleLogoUpload = (file: File) => {
    const projectBytesWithoutLogo = calculateProjectImageBytes(blocks, {
      ...draftMetadata,
      institutionLogoDataUrl: undefined,
    });
    const check = validateImageUploadForProject(file, projectBytesWithoutLogo);
    if (!check.valid) {
      alert(check.error);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraftMetadata((prev) => ({
          ...prev,
          institutionLogoDataUrl: reader.result as string,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setDraftMetadata((prev) => ({
      ...prev,
      institutionLogoDataUrl: undefined,
    }));
  };

  const handleRestoreDefaults = () => {
    const restoredConfig: TemplateConfig = { ...DEFAULT_TEMPLATE_CONFIG };
    const restoredType = resolveDraftTemplateType(
      restoredConfig,
      draftTemplateType === 'universe_custom' ||
        draftTemplateType === 'sbc' ||
        draftTemplateType === 'ieee' ||
        draftTemplateType === 'poster'
        ? 'tcc'
        : draftTemplateType,
    );
    setDraftConfig(restoredConfig);
    setDraftTemplateType(restoredType);
    setShowUniverseExplorer(false);
    preUniverseRef.current = { config: restoredConfig, templateType: restoredType };
  };

  const handleApply = () => {
    if (onApply) {
      onApply({
        config: draftConfig,
        metadata: draftMetadata,
        selectedTemplateType: draftTemplateType,
      });
    } else {
      onChangeConfig?.(draftConfig);
      onChangeMetadata?.(draftMetadata);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-sm">
                Personalizar Norma, Template e Layout da Faculdade
              </h3>
              <p className="text-xs text-neutral-500">
                Escolha um modelo base e personalize tipografia, página, cabeçalhos e bibliografia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-200/60"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de 5 Abas */}
        <div
          role="tablist"
          aria-label="Seções de configuração do template"
          className="px-4 pt-2 border-b border-neutral-200 bg-neutral-50/70 flex flex-wrap md:flex-nowrap items-center gap-1 shrink-0"
        >
          {MODAL_TABS.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap rounded-t-lg ${
                  selected
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/80'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Conteúdo da Aba Ativa */}
        <div role="tabpanel" className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'presets' && (
            <CustomizerPresetsTab
              config={draftConfig}
              isPosterActive={isPosterActive}
              isUniverseSelected={isUniverseSelected}
              showUniverseExplorer={showUniverseExplorer}
              universeConnectorRef={universeConnectorRef}
              onApplyPreset={applyPreset}
              onOpenPosterStructureTab={() => setActiveTab('structure')}
              onToggleUniverseExplorer={toggleUniverseExplorer}
              onUniversePackageInput={handleUniversePackageInput}
              onSelectUniverseChip={handleSelectUniverseChip}
            />
          )}

          {activeTab === 'typography' && (
            <CustomizerTypographyTab config={draftConfig} onUpdateField={updateField} />
          )}

          {activeTab === 'page' && (
            <CustomizerPageTab config={draftConfig} onUpdateField={updateField} />
          )}

          {activeTab === 'citations' && (
            <CustomizerCitationsTab
              config={draftConfig}
              onUpdateField={updateField}
              onCitationFormatChange={handleCitationFormatChange}
            />
          )}

          {activeTab === 'structure' && (
            <CustomizerStructureTab
              config={draftConfig}
              metadata={draftMetadata}
              onUpdateField={updateField}
              onLogoUpload={handleLogoUpload}
              onRemoveLogo={handleRemoveLogo}
            />
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão ABNT
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              Aplicar e Atualizar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
