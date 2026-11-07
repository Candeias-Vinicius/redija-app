import React from 'react';
import {
  TemplateConfig,
  NormPresetId,
  DEFAULT_TEMPLATE_CONFIG,
  DocumentMetadata,
  Block,
} from '@/types/document';
import {
  calculateProjectImageBytes,
  validateImageUploadForProject,
} from '@/core/storage/imageQuota';
import {
  X,
  Sliders,
  Type,
  Layout,
  BookOpen,
  Upload,
  Trash2,
  RotateCcw,
  Check,
} from 'lucide-react';

interface TemplateCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TemplateConfig;
  metadata: DocumentMetadata;
  blocks?: Block[];
  onChangeConfig: (config: TemplateConfig) => void;
  onChangeMetadata: (metadata: DocumentMetadata) => void;
}

interface PresetInfo {
  id: NormPresetId;
  title: string;
  badge: string;
  description: string;
  config: Omit<TemplateConfig, 'preset'>;
}

const PRESETS: PresetInfo[] = [
  {
    id: 'abnt_classic',
    title: 'ABNT Tradicional (TCC / Monografia)',
    badge: 'NBR 14724 + 10520:2002',
    description:
      'Times New Roman 12pt, espaçamento 1,5, recuo 1,25 cm, margens 3/3/2/2 cm, citação (SILVA, 2023) em maiúsculas e títulos das referências em negrito.',
    config: {
      fontFamily: 'serif',
      fontSizePt: 12,
      lineSpacing: '1.5',
      paragraphIndentCm: 1.25,
      marginTopCm: 3,
      marginLeftCm: 3,
      marginBottomCm: 2,
      marginRightCm: 2,
      columns: 1,
      includeCoverPage: true,
      includeTitlePage: true,
      includeToc: true,
      citationStyle: 'uppercase',
      referenceHighlight: 'bold',
    },
  },
  {
    id: 'abnt_2023',
    title: 'ABNT Atualizada (NBR 10520:2023)',
    badge: 'Nova NBR 10520',
    description:
      'Segue a atualização de julho/2023 da ABNT: citações entre parênteses com apenas a inicial maiúscula (Silva, 2023) e opção de fonte sem serifa (Arial/Arimo).',
    config: {
      fontFamily: 'sans',
      fontSizePt: 12,
      lineSpacing: '1.5',
      paragraphIndentCm: 1.25,
      marginTopCm: 3,
      marginLeftCm: 3,
      marginBottomCm: 2,
      marginRightCm: 2,
      columns: 1,
      includeCoverPage: true,
      includeTitlePage: true,
      includeToc: true,
      citationStyle: 'titlecase',
      referenceHighlight: 'bold',
    },
  },
  {
    id: 'article_2col',
    title: 'Artigo Científico / Congresso (2 Colunas)',
    badge: 'NBR 6022 / SBC / IEEE',
    description:
      'Sem capa nem folha de rosto (inicia direto com título, autores e resumo na página 1) e corpo do texto diagramado em 2 colunas com fonte 10pt.',
    config: {
      fontFamily: 'serif',
      fontSizePt: 10,
      lineSpacing: '1.0',
      paragraphIndentCm: 0.75,
      marginTopCm: 2.5,
      marginLeftCm: 2,
      marginBottomCm: 2,
      marginRightCm: 2,
      columns: 2,
      includeCoverPage: false,
      includeTitlePage: false,
      includeToc: false,
      citationStyle: 'titlecase',
      referenceHighlight: 'italic',
    },
  },
  {
    id: 'apa_7',
    title: 'Estilo Internacional (APA 7ª Edição)',
    badge: 'Psicologia / Internacional',
    description:
      'Margens uniformes de 2,54 cm (1 polegada), espaçamento duplo (2,0), recuo de 1,27 cm, citação (Silva, 2023) e destaque das referências em itálico.',
    config: {
      fontFamily: 'serif',
      fontSizePt: 12,
      lineSpacing: '2.0',
      paragraphIndentCm: 1.27,
      marginTopCm: 2.54,
      marginLeftCm: 2.54,
      marginBottomCm: 2.54,
      marginRightCm: 2.54,
      columns: 1,
      includeCoverPage: true,
      includeTitlePage: false,
      includeToc: true,
      citationStyle: 'titlecase',
      referenceHighlight: 'italic',
    },
  },
];

export const TemplateCustomizerModal: React.FC<TemplateCustomizerModalProps> = ({
  isOpen,
  onClose,
  config,
  metadata,
  blocks = [],
  onChangeConfig,
  onChangeMetadata,
}) => {
  if (!isOpen) return null;

  const updateField = <K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => {
    onChangeConfig({
      ...config,
      preset: 'custom',
      [key]: value,
    });
  };

  const applyPreset = (preset: PresetInfo) => {
    onChangeConfig({
      preset: preset.id,
      ...preset.config,
    });
  };

  const handleLogoUpload = (file: File) => {
    const projectBytesWithoutLogo = calculateProjectImageBytes(blocks, {
      ...metadata,
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
        onChangeMetadata({
          ...metadata,
          institutionLogoDataUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
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
                Escolha uma norma pronta ou ajuste fonte, margens, colunas, capa e estilo de citação
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo rolável */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* 1. Presets de Normas */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
              1. Escolha um Padrão de Norma (ou personalize abaixo)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESETS.map((preset) => {
                const isSelected = config.preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                        : 'border-neutral-200 hover:border-emerald-400 hover:bg-neutral-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-xs text-neutral-900">{preset.title}</span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <span className="inline-block text-[10px] font-semibold bg-neutral-200/80 text-neutral-700 px-1.5 py-0.5 rounded mb-1.5">
                        {preset.badge}
                      </span>
                      <p className="text-[11px] text-neutral-600 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Identidade da Capa e Brasão da Universidade */}
          <div className="border-t border-neutral-200 pt-5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              2. Estrutura de Páginas & Brasão da Universidade
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                <span className="block text-xs font-semibold text-neutral-800 mb-1">
                  Elementos Automáticos do Documento
                </span>
                <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeCoverPage}
                    onChange={(e) => updateField('includeCoverPage', e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Gerar Capa (NBR 14724)
                </label>
                <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeTitlePage}
                    onChange={(e) => updateField('includeTitlePage', e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Gerar Folha de Rosto com Natureza e Orientador
                </label>
                <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeToc}
                    onChange={(e) => updateField('includeToc', e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  Gerar Sumário Automático (NBR 6027)
                </label>
              </div>

              <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 flex flex-col justify-between">
                <div>
                  <span className="block text-xs font-semibold text-neutral-800 mb-1">
                    Brasão / Logotipo da Universidade (Opcional)
                  </span>
                  <p className="text-[11px] text-neutral-500 mb-2">
                    Exibido centralizado no topo da capa (ou no cabeçalho do artigo).
                  </p>
                </div>

                {metadata.institutionLogoDataUrl ? (
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-neutral-200">
                    <img
                      src={metadata.institutionLogoDataUrl}
                      alt="Logo da instituição"
                      className="h-10 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onChangeMetadata({ ...metadata, institutionLogoDataUrl: undefined })
                      }
                      className="flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-neutral-300 rounded-lg bg-white hover:border-emerald-500 hover:bg-emerald-50/30 cursor-pointer text-xs font-medium text-neutral-700 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Enviar Brasão / Logo (PNG, JPG)</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* 3. Tipografia e Espaçamento */}
          <div className="border-t border-neutral-200 pt-5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
              <Type className="w-3.5 h-3.5 text-emerald-600" />
              3. Tipografia, Espaçamento e Colunas
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Família da Fonte
                </label>
                <select
                  value={config.fontFamily}
                  onChange={(e) =>
                    updateField('fontFamily', e.target.value as TemplateConfig['fontFamily'])
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                >
                  <option value="serif">Times New Roman (Tinos)</option>
                  <option value="sans">Arial / Sem Serifa (Arimo)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Tamanho do Corpo
                </label>
                <select
                  value={config.fontSizePt}
                  onChange={(e) =>
                    updateField(
                      'fontSizePt',
                      Number(e.target.value) as TemplateConfig['fontSizePt'],
                    )
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                >
                  <option value={12}>12 pt (Padrão ABNT)</option>
                  <option value={11}>11 pt</option>
                  <option value={10}>10 pt (Artigos)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Entrelinha (Espaçamento)
                </label>
                <select
                  value={config.lineSpacing}
                  onChange={(e) =>
                    updateField('lineSpacing', e.target.value as TemplateConfig['lineSpacing'])
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                >
                  <option value="1.5">1,5 linhas (ABNT)</option>
                  <option value="1.0">Simples (1,0)</option>
                  <option value="2.0">Duplo (2,0)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Colunas do Texto
                </label>
                <select
                  value={config.columns}
                  onChange={(e) =>
                    updateField('columns', Number(e.target.value) as TemplateConfig['columns'])
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                >
                  <option value={1}>1 Coluna (Monografia/TCC)</option>
                  <option value={2}>2 Colunas (Artigo/Congresso)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. Margens e Recuo de Parágrafo */}
          <div className="border-t border-neutral-200 pt-5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
              <Layout className="w-3.5 h-3.5 text-emerald-600" />
              4. Margens da Folha A4 e Recuo de Parágrafo (em cm)
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Recuo 1ª Linha (cm)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="5"
                  value={config.paragraphIndentCm}
                  onChange={(e) => updateField('paragraphIndentCm', Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Margem Superior
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="6"
                  value={config.marginTopCm}
                  onChange={(e) => updateField('marginTopCm', Number(e.target.value) || 3)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Margem Esquerda
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="6"
                  value={config.marginLeftCm}
                  onChange={(e) => updateField('marginLeftCm', Number(e.target.value) || 3)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Margem Inferior
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="6"
                  value={config.marginBottomCm}
                  onChange={(e) => updateField('marginBottomCm', Number(e.target.value) || 2)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Margem Direita
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="6"
                  value={config.marginRightCm}
                  onChange={(e) => updateField('marginRightCm', Number(e.target.value) || 2)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* 5. Estilo de Citações e Referências */}
          <div className="border-t border-neutral-200 pt-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
              5. Estilo de Citações e Lista de Referências
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Caixa do Autor nas Citações entre Parênteses
                </label>
                <select
                  value={config.citationStyle}
                  onChange={(e) =>
                    updateField(
                      'citationStyle',
                      e.target.value as TemplateConfig['citationStyle'],
                    )
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                >
                  <option value="uppercase">MAIÚSCULAS: (SILVA, 2023) [NBR 10520:2002]</option>
                  <option value="titlecase">
                    Inicial Maiúscula: (Silva, 2023) [NBR 10520:2023]
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Destaque dos Títulos nas Referências Finais
                </label>
                <select
                  value={config.referenceHighlight}
                  onChange={(e) =>
                    updateField(
                      'referenceHighlight',
                      e.target.value as TemplateConfig['referenceHighlight'],
                    )
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                >
                  <option value="bold">Negrito (Padrão ABNT NBR 6023)</option>
                  <option value="italic">Itálico (Costume de algumas universidades / APA)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onChangeConfig(DEFAULT_TEMPLATE_CONFIG)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão ABNT
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
          >
            Aplicar e Atualizar PDF
          </button>
        </div>
      </div>
    </div>
  );
};
