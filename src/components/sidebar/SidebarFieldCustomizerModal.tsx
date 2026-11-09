import React, { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  RotateCcw,
  Check,
  Info,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { SidebarConfig } from '@/types/document';
import {
  ConfigurableFieldId,
  FIELD_CATEGORY_LABELS,
  MetadataFieldCategory,
  buildSidebarConfigFromSelection,
  getFieldsByCategory,
} from '@/core/templates/fieldRegistry';
import { TemplateCapabilities } from '@/core/templates/templateCapabilities';

interface SidebarFieldCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  capabilities: TemplateCapabilities;
  onSave: (sidebarConfig?: SidebarConfig) => void;
}

interface SidebarFieldCustomizerInnerProps {
  onClose: () => void;
  capabilities: TemplateCapabilities;
  onSave: (sidebarConfig?: SidebarConfig) => void;
}

const CATEGORIES_ORDER: MetadataFieldCategory[] = [
  'identificacao',
  'resumo',
  'pre_textual',
  'pos_textual',
];

const SidebarFieldCustomizerInner: React.FC<SidebarFieldCustomizerInnerProps> = ({
  onClose,
  capabilities,
  onSave,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<ConfigurableFieldId>>(
    () => new Set(capabilities.visibleFieldIds),
  );

  const fieldsByCategory = getFieldsByCategory();
  const baseSet = new Set<ConfigurableFieldId>(capabilities.baseFieldIds);
  const previewConfig = buildSidebarConfigFromSelection(capabilities.baseFieldIds, selectedIds);
  const willCustomize = Boolean(previewConfig?.isCustomized);

  const toggleField = (id: ConfigurableFieldId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRestoreDefaults = () => {
    onSave(undefined);
    onClose();
  };

  const handleSave = () => {
    const nextConfig = buildSidebarConfigFromSelection(capabilities.baseFieldIds, selectedIds);
    onSave(nextConfig);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-sm">
                Personalizar Campos da Barra Lateral
              </h3>
              <p className="text-xs text-neutral-500">
                Inclua ou oculte campos conforme a exigência da sua faculdade, edital ou congresso
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-200/60"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Aviso de integridade e modo Modificado */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              willCustomize && capabilities.isAbntFamily
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}
          >
            {willCustomize && capabilities.isAbntFamily ? (
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 text-[11px] leading-relaxed">
              <p>
                <strong>Zero perda de dados:</strong> ocultar um campo aqui nunca apaga o conteúdo já
                digitado. Se houver texto salvo em campos ocultos, ele fica protegido na gaveta{' '}
                <em>&ldquo;Campos preservados&rdquo;</em>.
              </p>
              {capabilities.isAbntFamily && (
                <p>
                  {willCustomize ? (
                    <>
                      Com alterações em relação ao padrão do modelo, o indicador muda para{' '}
                      <strong>{capabilities.modifiedBadge}</strong> e a verificação estrita da ABNT é
                      pausada para evitar alertas conflitantes.
                    </>
                  ) : (
                    <>
                      Selecionando exatamente os campos originais do modelo, o projeto permanece no modo
                      oficial <strong>{capabilities.defaultBadge}</strong> com verificador estrito ativo.
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Aviso específico de template fixo vs flexível (Q3 PDF Sync) */}
          <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-600 flex items-start gap-2">
            {capabilities.supportsSidebarFieldPdfSync ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Sincronizado com o PDF:</strong> neste modelo flexível, campos ocultados
                  também são omitidos na compilação do PDF e campos adicionados passam a aparecer no
                  documento quando preenchidos.
                </span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Layout de conferência/pacote ({capabilities.badgeLabel}):</strong>{' '}
                  personalizar os campos altera apenas os formulários da barra lateral para consulta e
                  preenchimento, preservando fielmente a diagramação oficial exigida no PDF.
                </span>
              </>
            )}
          </div>

          {/* Grupos de Campos */}
          <div className="space-y-4">
            {CATEGORIES_ORDER.map((category) => {
              const fields = fieldsByCategory[category];
              return (
                <div
                  key={category}
                  className="border border-neutral-200 rounded-xl overflow-hidden bg-white"
                >
                  <div className="px-3.5 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-700">
                      {FIELD_CATEGORY_LABELS[category]}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-medium">
                      {fields.filter((f) => selectedIds.has(f.id)).length} / {fields.length} ativos
                    </span>
                  </div>
                  <div className="divide-y divide-neutral-100">
                    {fields.map((field) => {
                      const checked = selectedIds.has(field.id);
                      const isDefault = baseSet.has(field.id);
                      return (
                        <label
                          key={field.id}
                          className="flex items-start gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-neutral-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleField(field.id)}
                            className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-neutral-800">
                                {field.label}
                              </span>
                              {isDefault && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Padrão
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-500 leading-snug mt-0.5">
                              {field.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão do Modelo</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-200/60 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar Campos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SidebarFieldCustomizerModal: React.FC<SidebarFieldCustomizerModalProps> = ({
  isOpen,
  onClose,
  capabilities,
  onSave,
}) => {
  if (!isOpen) return null;
  return (
    <SidebarFieldCustomizerInner
      onClose={onClose}
      capabilities={capabilities}
      onSave={onSave}
    />
  );
};
