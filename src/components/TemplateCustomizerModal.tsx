import React, { useState } from 'react';
import {
  TemplateConfig,
  NormPresetId,
  DEFAULT_TEMPLATE_CONFIG,
  DocumentMetadata,
  Block,
  CitationFormat,
  FontFamilyId,
  ReferenceAlignment,
  ReferenceHighlight,
  ReferenceSpacing,
  ReferenceOrdering,
  ReferenceEntryFormat,
  BibliographyEngine,
  CslStyle,
  PaperSize,
  PageOrientation,
  DocumentLanguage,
  BodyAlignment,
  PageNumberingPosition,
  HeadingNumberingStyle,
  AcademicReference,
} from '@/types/document';
import {
  FONT_CATALOG,
  sanitizeCustomFontFamily,
} from '@/core/typst/fontCatalog';
import {
  formatShortCitation,
  resolveCitationFormat,
} from '@/core/transpiler/abntLinter';
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
  Globe,
  Palette,
  ExternalLink,
  Quote,
} from 'lucide-react';
import { POPULAR_UNIVERSE_TEMPLATES } from '@/core/universe/universeResolver';

const SAMPLE_PREVIEW_REF: AcademicReference = {
  id: 'preview-sample',
  type: 'book',
  authors: 'SILVA, Roberto',
  title: 'Engenharia de Software Moderna e Boas Práticas',
  city: 'São Paulo',
  publisher: 'Editora Acadêmica',
  year: '2023',
};

type CustomizerTabId = 'presets' | 'typography' | 'page' | 'citations' | 'structure';

const MODAL_TABS: Array<{ id: CustomizerTabId; label: string }> = [
  { id: 'presets', label: 'Normas & Presets' },
  { id: 'typography', label: 'Tipografia & Texto' },
  { id: 'page', label: 'Página & Cabeçalhos' },
  { id: 'citations', label: 'Citações & Referências' },
  { id: 'structure', label: 'Capa, Pôster & Universe' },
];

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
      paperSize: 'a4',
      pageOrientation: 'portrait',
      documentLanguage: 'pt',
      bodyAlignment: 'justify',
      pageNumbering: 'top_right',
      hideFirstPageNumber: true,
      romanPreTextual: false,
      headingNumbering: '1.1',
      h1PageBreak: true,
      includeCoverPage: true,
      includeTitlePage: true,
      includeToc: true,
      citationStyle: 'uppercase',
      citationFormat: 'abnt_upper',
      bibliographyEngine: 'redija_custom',
      referenceEntryFormat: 'abnt',
      referenceOrdering: 'alphabetical',
      referenceHighlight: 'bold',
      referenceAlignment: 'left',
      referenceSpacing: 'single_blank',
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
      paperSize: 'a4',
      pageOrientation: 'portrait',
      documentLanguage: 'pt',
      bodyAlignment: 'justify',
      pageNumbering: 'top_right',
      hideFirstPageNumber: true,
      romanPreTextual: false,
      headingNumbering: '1.1',
      h1PageBreak: true,
      includeCoverPage: true,
      includeTitlePage: true,
      includeToc: true,
      citationStyle: 'titlecase',
      citationFormat: 'abnt_titlecase',
      bibliographyEngine: 'redija_custom',
      referenceEntryFormat: 'abnt',
      referenceOrdering: 'alphabetical',
      referenceHighlight: 'bold',
      referenceAlignment: 'left',
      referenceSpacing: 'single_blank',
    },
  },
  {
    id: 'article_2col',
    title: 'Artigo Científico / Congresso (2 Colunas)',
    badge: 'NBR 6022 / Congresso',
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
      paperSize: 'a4',
      pageOrientation: 'portrait',
      documentLanguage: 'pt',
      bodyAlignment: 'justify',
      pageNumbering: 'top_right',
      hideFirstPageNumber: false,
      romanPreTextual: false,
      headingNumbering: '1.1',
      h1PageBreak: false,
      includeCoverPage: false,
      includeTitlePage: false,
      includeToc: false,
      citationStyle: 'titlecase',
      citationFormat: 'abnt_titlecase',
      bibliographyEngine: 'redija_custom',
      referenceEntryFormat: 'abnt',
      referenceOrdering: 'alphabetical',
      referenceHighlight: 'italic',
      referenceAlignment: 'left',
      referenceSpacing: 'compact',
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
      paperSize: 'letter',
      pageOrientation: 'portrait',
      documentLanguage: 'en',
      bodyAlignment: 'left',
      pageNumbering: 'top_right',
      hideFirstPageNumber: false,
      romanPreTextual: false,
      headingNumbering: 'none',
      h1PageBreak: false,
      includeCoverPage: true,
      includeTitlePage: false,
      includeToc: true,
      citationStyle: 'titlecase',
      citationFormat: 'author_date',
      bibliographyEngine: 'redija_custom',
      referenceEntryFormat: 'apa',
      referenceOrdering: 'alphabetical',
      referenceHighlight: 'italic',
      referenceAlignment: 'left',
      referenceSpacing: 'double',
    },
  },
  {
    id: 'sbc',
    title: 'SBC (Sociedade Brasileira de Computação)',
    badge: 'SBC Oficial',
    description:
      'Margens superior 3.5cm e laterais 3cm, coluna única, fonte 12pt com entrelinha simples, resumo bilíngue e afiliações institucionais no topo.',
    config: {
      fontFamily: 'serif',
      fontSizePt: 12,
      lineSpacing: '1.0',
      paragraphIndentCm: 1.25,
      marginTopCm: 3.5,
      marginLeftCm: 3,
      marginBottomCm: 2.5,
      marginRightCm: 3,
      columns: 1,
      paperSize: 'a4',
      pageOrientation: 'portrait',
      documentLanguage: 'pt',
      bodyAlignment: 'justify',
      pageNumbering: 'bottom_center',
      hideFirstPageNumber: false,
      romanPreTextual: false,
      headingNumbering: 'none',
      h1PageBreak: false,
      includeCoverPage: false,
      includeTitlePage: false,
      includeToc: false,
      citationStyle: 'uppercase',
      citationFormat: 'abnt_upper',
      bibliographyEngine: 'redija_custom',
      referenceEntryFormat: 'abnt',
      referenceOrdering: 'alphabetical',
      referenceHighlight: 'bold',
      referenceAlignment: 'justify',
      referenceSpacing: 'single_blank',
    },
  },
  {
    id: 'ieee',
    title: 'IEEE Conference (Internacional)',
    badge: 'IEEE Padrão',
    description:
      'Padrão mundial em 2 colunas com margens compactas, abstract destacado em negrito itálico e referências numéricas [1] em ordem de citação.',
    config: {
      fontFamily: 'serif',
      fontSizePt: 10,
      lineSpacing: '1.0',
      paragraphIndentCm: 0.35,
      marginTopCm: 1.9,
      marginLeftCm: 1.57,
      marginBottomCm: 2.54,
      marginRightCm: 1.57,
      columns: 2,
      paperSize: 'a4',
      pageOrientation: 'portrait',
      documentLanguage: 'en',
      bodyAlignment: 'justify',
      pageNumbering: 'bottom_center',
      hideFirstPageNumber: false,
      romanPreTextual: false,
      headingNumbering: 'none',
      h1PageBreak: false,
      includeCoverPage: false,
      includeTitlePage: false,
      includeToc: false,
      citationStyle: 'uppercase',
      citationFormat: 'ieee_numeric',
      bibliographyEngine: 'redija_custom',
      referenceEntryFormat: 'ieee',
      referenceOrdering: 'citation_order',
      referenceHighlight: 'italic',
      referenceAlignment: 'left',
      referenceSpacing: 'compact',
    },
  },
  {
    id: 'poster',
    title: 'Pôster Acadêmico A0 (Banner)',
    badge: 'A0 / Simpósio',
    description:
      'Grande formato para apresentação em mostras e congressos, com banner superior institucional e grid de 3 colunas em caixas visuais.',
    config: {
      fontFamily: 'sans',
      fontSizePt: 22,
      lineSpacing: '1.5',
      paragraphIndentCm: 0,
      marginTopCm: 2.5,
      marginLeftCm: 2.5,
      marginBottomCm: 2.5,
      marginRightCm: 2.5,
      columns: 1,
      paperSize: 'a4',
      pageOrientation: 'portrait',
      documentLanguage: 'pt',
      bodyAlignment: 'justify',
      pageNumbering: 'none',
      hideFirstPageNumber: true,
      romanPreTextual: false,
      headingNumbering: 'none',
      h1PageBreak: false,
      includeCoverPage: false,
      includeTitlePage: false,
      includeToc: false,
      citationStyle: 'uppercase',
      citationFormat: 'abnt_upper',
      bibliographyEngine: 'redija_custom',
      referenceEntryFormat: 'abnt',
      referenceOrdering: 'alphabetical',
      referenceHighlight: 'bold',
      referenceAlignment: 'justify',
      referenceSpacing: 'compact',
      posterDimensions: 'a0',
      posterOrientation: 'portrait',
      posterColumns: 3,
      posterTheme: 'emerald',
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
  const [activeTab, setActiveTab] = useState<CustomizerTabId>('presets');

  if (!isOpen) return null;

  const updateField = <K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => {
    onChangeConfig({
      ...config,
      preset: 'custom',
      [key]: value,
    });
  };

  const effectiveCitationFormat = resolveCitationFormat(config);
  const effectiveAlignment: ReferenceAlignment = config.referenceAlignment ?? 'left';
  const effectiveSpacing: ReferenceSpacing = config.referenceSpacing ?? 'single_blank';
  const effectiveOrdering: ReferenceOrdering = config.referenceOrdering ?? 'alphabetical';
  const effectiveEntryFormat: ReferenceEntryFormat = config.referenceEntryFormat ?? 'auto';
  const effectiveEngine: BibliographyEngine = config.bibliographyEngine ?? 'redija_custom';
  const effectiveCslStyle: CslStyle =
    config.cslStyle ??
    (effectiveCitationFormat === 'ieee_numeric'
      ? 'ieee'
      : effectiveCitationFormat === 'author_date'
        ? 'apa'
        : 'associacao-brasileira-de-normas-tecnicas');
  const effectiveHighlight = config.referenceHighlight ?? 'bold';
  const isCustomFontInvalid =
    config.fontFamily === 'custom' &&
    Boolean(config.customFontFamily?.trim()) &&
    !sanitizeCustomFontFamily(config.customFontFamily);

  const resolvedPreviewStyle: 'abnt' | 'apa' | 'ieee' =
    effectiveEntryFormat === 'abnt' || effectiveEntryFormat === 'apa' || effectiveEntryFormat === 'ieee'
      ? effectiveEntryFormat
      : config.preset === 'ieee' || effectiveCitationFormat === 'ieee_numeric'
        ? 'ieee'
        : config.preset === 'apa_7' || effectiveCitationFormat === 'author_date'
          ? 'apa'
          : 'abnt';

  const handleCitationFormatChange = (nextFormat: CitationFormat) => {
    const syncedStyle: 'uppercase' | 'titlecase' =
      nextFormat === 'abnt_titlecase' || nextFormat === 'author_date'
        ? 'titlecase'
        : 'uppercase';
    onChangeConfig({
      ...config,
      preset: 'custom',
      citationFormat: nextFormat,
      citationStyle: syncedStyle,
    });
  };

  const sampleInlineCall = formatShortCitation(SAMPLE_PREVIEW_REF, {
    format: effectiveCitationFormat,
    refNumber: 1,
  });

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

  const highlightClass =
    effectiveHighlight === 'bold'
      ? 'font-bold text-neutral-900'
      : effectiveHighlight === 'italic'
        ? 'italic text-neutral-900'
        : effectiveHighlight === 'underline'
          ? 'underline text-neutral-900'
          : 'text-neutral-900';

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
                Escolha uma norma pronta ou configure tipografia, página, cabeçalhos e bibliografia
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
          className="px-4 pt-2 border-b border-neutral-200 bg-neutral-50/70 flex items-center gap-1 overflow-x-auto shrink-0"
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
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px ${
                  selected
                    ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/80 rounded-t-lg'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Conteúdo da Aba Ativa */}
        <div role="tabpanel" className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* ABA 1: NORMAS & PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Escolha um Padrão de Norma (ou personalize nas abas)
                </label>
                {config.preset === 'poster' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('structure')}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline"
                  >
                    Configurar dimensões e tema do pôster →
                  </button>
                )}
              </div>

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
          )}

          {/* ABA 2: TIPOGRAFIA & TEXTO */}
          {activeTab === 'typography' && (
            <div className="space-y-4">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500">
                <Type className="w-3.5 h-3.5 text-emerald-600" />
                Tipografia, Alinhamento e Idioma
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label
                    htmlFor="template-font-family"
                    className="block text-[11px] font-medium text-neutral-600 mb-1"
                  >
                    Família da Fonte
                  </label>
                  <select
                    id="template-font-family"
                    value={config.fontFamily}
                    onChange={(e) => updateField('fontFamily', e.target.value as FontFamilyId)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  >
                    {FONT_CATALOG.map((font) => (
                      <option key={font.id} value={font.id}>
                        {font.label}
                      </option>
                    ))}
                    <option value="custom">Outra fonte externa...</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="template-font-size"
                      className="text-[11px] font-medium text-neutral-600"
                    >
                      Tamanho do Corpo (pt)
                    </label>
                    <div className="flex items-center gap-1">
                      {[10, 11, 12].map((pt) => (
                        <button
                          key={pt}
                          type="button"
                          onClick={() => updateField('fontSizePt', pt)}
                          className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                            config.fontSizePt === pt
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {pt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    id="template-font-size"
                    type="number"
                    min={8}
                    max={24}
                    step={0.5}
                    value={config.fontSizePt}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (Number.isFinite(val)) {
                        updateField('fontSizePt', Math.min(24, Math.max(8, val)));
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="template-line-spacing"
                    className="block text-[11px] font-medium text-neutral-600 mb-1"
                  >
                    Entrelinha
                  </label>
                  <select
                    id="template-line-spacing"
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
              </div>

              {config.fontFamily === 'custom' && (
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5">
                  <label
                    htmlFor="template-custom-font-name"
                    className="block text-[11px] font-semibold text-neutral-700"
                  >
                    Nome da Fonte Externa
                  </label>
                  <input
                    id="template-custom-font-name"
                    type="text"
                    value={config.customFontFamily || ''}
                    onChange={(e) => updateField('customFontFamily', e.target.value)}
                    placeholder="Ex: Open Sans, Source Serif 4, Merriweather, PT Serif"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                  {isCustomFontInvalid ? (
                    <p className="text-[10px] text-red-600">
                      Use apenas letras, números, espaços ou hífens no nome da fonte.
                    </p>
                  ) : (
                    <p className="text-[10px] text-neutral-500">
                      Carregada sob demanda quando selecionada, com fallback offline automático.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-neutral-100">
                <div>
                  <label
                    htmlFor="template-body-alignment"
                    className="block text-[11px] font-medium text-neutral-600 mb-1"
                  >
                    Alinhamento do Corpo
                  </label>
                  <select
                    id="template-body-alignment"
                    value={config.bodyAlignment ?? 'justify'}
                    onChange={(e) => updateField('bodyAlignment', e.target.value as BodyAlignment)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  >
                    <option value="justify">Justificado</option>
                    <option value="left">Alinhado à Esquerda</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="template-paragraph-spacing"
                    className="block text-[11px] font-medium text-neutral-600 mb-1"
                  >
                    Espaço Parágrafos (em)
                  </label>
                  <input
                    id="template-paragraph-spacing"
                    type="number"
                    min={0}
                    max={3}
                    step={0.1}
                    placeholder="Auto"
                    value={config.paragraphSpacingEm ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        updateField('paragraphSpacingEm', undefined);
                      } else {
                        const n = Number(raw);
                        if (Number.isFinite(n)) {
                          updateField('paragraphSpacingEm', Math.min(3, Math.max(0, n)));
                        }
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="template-columns"
                    className="block text-[11px] font-medium text-neutral-600 mb-1"
                  >
                    Colunas do Texto
                  </label>
                  <select
                    id="template-columns"
                    value={config.columns}
                    onChange={(e) =>
                      updateField('columns', Number(e.target.value) as TemplateConfig['columns'])
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  >
                    <option value={1}>1 Coluna</option>
                    <option value={2}>2 Colunas</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="template-document-language"
                    className="block text-[11px] font-medium text-neutral-600 mb-1"
                  >
                    Idioma / Hifenização
                  </label>
                  <select
                    id="template-document-language"
                    value={config.documentLanguage ?? 'pt'}
                    onChange={(e) =>
                      updateField('documentLanguage', e.target.value as DocumentLanguage)
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  >
                    <option value="pt">Português (BR)</option>
                    <option value="en">English (US)</option>
                    <option value="es">Español (ES)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: PÁGINA & CABEÇALHOS */}
          {activeTab === 'page' && (
            <div className="space-y-5">
              <div className="space-y-3">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500">
                  <Layout className="w-3.5 h-3.5 text-emerald-600" />
                  Papel, Orientação, Recuo e Margens (cm)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="template-paper-size"
                      className="block text-[11px] font-medium text-neutral-600 mb-1"
                    >
                      Tamanho do Papel
                    </label>
                    <select
                      id="template-paper-size"
                      value={config.paperSize ?? 'a4'}
                      onChange={(e) => updateField('paperSize', e.target.value as PaperSize)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                    >
                      <option value="a4">A4 (21 × 29,7 cm)</option>
                      <option value="letter">Carta / US Letter</option>
                      <option value="a5">A5 (14,8 × 21 cm)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="template-page-orientation"
                      className="block text-[11px] font-medium text-neutral-600 mb-1"
                    >
                      Orientação
                    </label>
                    <select
                      id="template-page-orientation"
                      value={config.pageOrientation ?? 'portrait'}
                      onChange={(e) =>
                        updateField('pageOrientation', e.target.value as PageOrientation)
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                    >
                      <option value="portrait">Retrato (Vertical)</option>
                      <option value="landscape">Paisagem (Horizontal)</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="template-indent-cm"
                      className="block text-[11px] font-medium text-neutral-600 mb-1"
                    >
                      Recuo 1ª Linha (cm)
                    </label>
                    <input
                      id="template-indent-cm"
                      type="number"
                      step="0.05"
                      min="0"
                      max="5"
                      value={config.paragraphIndentCm}
                      onChange={(e) =>
                        updateField('paragraphIndentCm', Number(e.target.value) || 0)
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

              <div className="border-t border-neutral-200 pt-4 space-y-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Paginação, Cabeçalho e Seções
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="template-page-numbering"
                      className="block text-[11px] font-medium text-neutral-600 mb-1"
                    >
                      Posição do Número de Página
                    </label>
                    <select
                      id="template-page-numbering"
                      value={config.pageNumbering ?? 'top_right'}
                      onChange={(e) =>
                        updateField('pageNumbering', e.target.value as PageNumberingPosition)
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                    >
                      <option value="top_right">Superior Direito (ABNT)</option>
                      <option value="bottom_center">Inferior Centralizado</option>
                      <option value="bottom_right">Inferior Direito</option>
                      <option value="none">Sem numeração</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="template-heading-numbering"
                      className="block text-[11px] font-medium text-neutral-600 mb-1"
                    >
                      Numeração de Seções
                    </label>
                    <select
                      id="template-heading-numbering"
                      value={config.headingNumbering ?? '1.1'}
                      onChange={(e) =>
                        updateField('headingNumbering', e.target.value as HeadingNumberingStyle)
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                    >
                      <option value="1.1">Decimal (1, 1.1, 1.1.1)</option>
                      <option value="1.">Com ponto (1., 1.1.)</option>
                      <option value="I.A">Romano / Alfabético (I, A)</option>
                      <option value="none">Sem numeração</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="template-running-header"
                      className="block text-[11px] font-medium text-neutral-600 mb-1"
                    >
                      Cabeçalho Corrente (Opcional)
                    </label>
                    <input
                      id="template-running-header"
                      type="text"
                      value={config.runningHeader || ''}
                      onChange={(e) => updateField('runningHeader', e.target.value)}
                      placeholder="Ex: Universidade • TCC"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-2">
                  <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.hideFirstPageNumber ?? true}
                      onChange={(e) => updateField('hideFirstPageNumber', e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    Ocultar número na primeira página
                  </label>
                  <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.romanPreTextual ?? false}
                      onChange={(e) => updateField('romanPreTextual', e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    Numeração romana minúscula (i, ii, iii) nos elementos pré-textuais
                  </label>
                  <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.h1PageBreak ?? true}
                      onChange={(e) => updateField('h1PageBreak', e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    Quebrar página automaticamente antes de Seções Primárias (H1)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: CITAÇÕES & REFERÊNCIAS */}
          {activeTab === 'citations' && (
            <div className="space-y-4">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500">
                <Quote className="w-3.5 h-3.5 text-emerald-600" />
                Central de Citações e Lista de Referências
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="template-citation-format"
                    className="block text-[11px] font-medium text-neutral-600 mb-1"
                  >
                    Formato da Chamada no Texto
                  </label>
                  <select
                    id="template-citation-format"
                    value={effectiveCitationFormat}
                    onChange={(e) => handleCitationFormatChange(e.target.value as CitationFormat)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  >
                    <option value="abnt_upper">
                      ABNT Maiúsculas: (SILVA, 2023) [NBR 10520:2002]
                    </option>
                    <option value="abnt_titlecase">
                      ABNT Caixa Mista: (Silva, 2023) [NBR 10520:2023]
                    </option>
                    <option value="ieee_numeric">
                      Numérico Colchetes: [1] (IEEE / Vancouver)
                    </option>
                    <option value="superscript">
                      Sobrescrito Numérico: ¹ (Nature / ABNT Numérico)
                    </option>
                    <option value="author_date">
                      Autor-Data Internacional: (Silva, 2023) [APA 7ª]
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="template-bibliography-engine"
                    className="block text-[11px] font-medium text-neutral-600 mb-1"
                  >
                    Motor de Bibliografia
                  </label>
                  <select
                    id="template-bibliography-engine"
                    value={effectiveEngine}
                    onChange={(e) =>
                      updateField('bibliographyEngine', e.target.value as BibliographyEngine)
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  >
                    <option value="redija_custom">Redija Multi-Norma (ABNT / APA / IEEE)</option>
                    <option value="typst_csl">CSL Nativo do Typst (BibTeX)</option>
                  </select>
                </div>

                {effectiveEngine === 'typst_csl' ? (
                  <div>
                    <label
                      htmlFor="template-csl-style"
                      className="block text-[11px] font-medium text-neutral-600 mb-1"
                    >
                      Estilo CSL (Typst)
                    </label>
                    <select
                      id="template-csl-style"
                      value={effectiveCslStyle}
                      onChange={(e) => updateField('cslStyle', e.target.value as CslStyle)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                    >
                      <option value="associacao-brasileira-de-normas-tecnicas">ABNT</option>
                      <option value="apa">APA (American Psychological Association)</option>
                      <option value="ieee">IEEE</option>
                      <option value="chicago-author-date">Chicago Autor-Data</option>
                      <option value="vancouver">Vancouver</option>
                      <option value="harvard-cite-them-right">Harvard</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="template-reference-entry-format"
                      className="block text-[11px] font-medium text-neutral-600 mb-1"
                    >
                      Formatação das Referências
                    </label>
                    <select
                      id="template-reference-entry-format"
                      value={effectiveEntryFormat}
                      onChange={(e) =>
                        updateField(
                          'referenceEntryFormat',
                          e.target.value as ReferenceEntryFormat,
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                    >
                      <option value="auto">Automática pelo modelo ativo</option>
                      <option value="abnt">ABNT (NBR 6023)</option>
                      <option value="apa">APA 7ª Edição</option>
                      <option value="ieee">IEEE</option>
                    </select>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="template-reference-ordering"
                    className="block text-[11px] font-medium text-neutral-600 mb-1"
                  >
                    Ordenação das Referências
                  </label>
                  <select
                    id="template-reference-ordering"
                    value={effectiveOrdering}
                    onChange={(e) =>
                      updateField('referenceOrdering', e.target.value as ReferenceOrdering)
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  >
                    <option value="alphabetical">Alfabética por autor (ABNT / APA)</option>
                    <option value="citation_order">Ordem de aparição no texto (IEEE / Vancouver)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="template-reference-highlight"
                    className="block text-[11px] font-medium text-neutral-600 mb-1"
                  >
                    Destaque dos Títulos nas Referências
                  </label>
                  <select
                    id="template-reference-highlight"
                    value={effectiveHighlight}
                    onChange={(e) =>
                      updateField('referenceHighlight', e.target.value as ReferenceHighlight)
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  >
                    <option value="bold">Negrito (Padrão ABNT NBR 6023)</option>
                    <option value="italic">Itálico (APA / Periódicos Internacionais)</option>
                    <option value="underline">Sublinhado (Clássico)</option>
                    <option value="none">Sem destaque (Texto simples)</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="template-reference-alignment"
                    className="block text-[11px] font-medium text-neutral-600 mb-1"
                  >
                    Alinhamento da Lista de Referências
                  </label>
                  <select
                    id="template-reference-alignment"
                    value={effectiveAlignment}
                    onChange={(e) =>
                      updateField('referenceAlignment', e.target.value as ReferenceAlignment)
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  >
                    <option value="left">Alinhada à Esquerda (ABNT / APA)</option>
                    <option value="justify">Justificada</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="template-reference-spacing"
                    className="block text-[11px] font-medium text-neutral-600 mb-1"
                  >
                    Espaçamento entre Referências
                  </label>
                  <select
                    id="template-reference-spacing"
                    value={effectiveSpacing}
                    onChange={(e) =>
                      updateField('referenceSpacing', e.target.value as ReferenceSpacing)
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                  >
                    <option value="single_blank">
                      Espaço Simples em Branco (Padrão ABNT NBR 6023)
                    </option>
                    <option value="compact">Compacto (IEEE / Artigos 2 Colunas / Pôster)</option>
                    <option value="double">Duplo (APA 7ª / Teses Espaçadas)</option>
                  </select>
                </div>
              </div>

              {/* Prévia Instantânea */}
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Prévia Instantânea de Citação &amp; Referência
                </span>
                <p className="text-xs text-neutral-700 leading-relaxed">
                  <strong>No texto:</strong> A arquitetura modular reduz o acoplamento entre módulos{' '}
                  <span className="font-semibold text-emerald-700">
                    {effectiveCitationFormat === 'superscript' ? <sup>1</sup> : sampleInlineCall}
                  </span>
                  .
                </p>
                <div
                  className={`text-[11px] text-neutral-600 pt-2 border-t border-neutral-200 ${
                    effectiveAlignment === 'justify' ? 'text-justify' : 'text-left'
                  }`}
                >
                  <span className="font-semibold text-neutral-500 mr-1">Na bibliografia:</span>
                  {effectiveCitationFormat === 'ieee_numeric' && '[1] '}
                  {effectiveCitationFormat === 'superscript' && <sup className="mr-0.5">1</sup>}
                  {resolvedPreviewStyle === 'ieee' ? (
                    <>
                      R. Silva, &ldquo;
                      <span className={highlightClass}>
                        Engenharia de Software Moderna e Boas Práticas
                      </span>
                      ,&rdquo; São Paulo: Editora Acadêmica, 2023.
                    </>
                  ) : resolvedPreviewStyle === 'apa' ? (
                    <>
                      Silva, R. (2023).{' '}
                      <span className={highlightClass}>
                        Engenharia de Software Moderna e Boas Práticas
                      </span>
                      . Editora Acadêmica.
                    </>
                  ) : (
                    <>
                      SILVA, Roberto.{' '}
                      <span className={highlightClass}>
                        Engenharia de Software Moderna e Boas Práticas
                      </span>
                      . São Paulo: Editora Acadêmica, 2023.
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ABA 5: CAPA, PÔSTER & UNIVERSE */}
          {activeTab === 'structure' && (
            <div className="space-y-5">
              {/* Estrutura & Brasão */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  Estrutura de Páginas & Brasão da Universidade
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

              {/* Opções de Pôster */}
              <div className="border-t border-neutral-200 pt-4">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
                  <Palette className="w-3.5 h-3.5 text-emerald-600" />
                  Configurações de Pôster Acadêmico (A0 / A1)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                      Tamanho do Pôster
                    </label>
                    <select
                      value={config.posterDimensions || 'a0'}
                      onChange={(e) =>
                        updateField(
                          'posterDimensions',
                          e.target.value as TemplateConfig['posterDimensions'],
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    >
                      <option value="a0">A0 (84,1 × 118,9 cm — Padrão Oficial)</option>
                      <option value="a1">A1 (59,4 × 84,1 cm — Simpósio Menor)</option>
                      <option value="a2">A2 (42,0 × 59,4 cm — Painel Compacto)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                      Orientação do Banner
                    </label>
                    <select
                      value={config.posterOrientation || 'portrait'}
                      onChange={(e) =>
                        updateField(
                          'posterOrientation',
                          e.target.value as TemplateConfig['posterOrientation'],
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    >
                      <option value="portrait">Retrato (Vertical — Mais Usado)</option>
                      <option value="landscape">Paisagem (Horizontal)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                      Número de Colunas no Pôster
                    </label>
                    <select
                      value={config.posterColumns || 3}
                      onChange={(e) =>
                        updateField(
                          'posterColumns',
                          Number(e.target.value) as TemplateConfig['posterColumns'],
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    >
                      <option value={2}>2 Colunas Largas</option>
                      <option value={3}>3 Colunas (Clássico)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                      Tema Visual do Banner
                    </label>
                    <select
                      value={config.posterTheme || 'emerald'}
                      onChange={(e) =>
                        updateField('posterTheme', e.target.value as TemplateConfig['posterTheme'])
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    >
                      <option value="emerald">Verde Esmeralda Institucional</option>
                      <option value="blue">Azul Real Científico</option>
                      <option value="classic_dark">Dark Minimalista</option>
                      <option value="clean">Clean / Fundo Claro</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Conector Typst Universe */}
              <div className="border-t border-neutral-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    Conector Typst Universe (Modelos Comunitários)
                  </label>
                  <a
                    href="https://typst.app/universe"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                    title="Abrir loja oficial de pacotes e templates em nova aba"
                  >
                    <span>Explorar typst.app/universe</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="space-y-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                  <div>
                    <label className="block text-[10px] font-semibold text-neutral-600 uppercase mb-1">
                      Identificador do Pacote Typst
                    </label>
                    <input
                      type="text"
                      value={config.universePackage || ''}
                      placeholder="Ex: @preview/charged-ieee:0.1.1 ou @preview/modern-sbc:0.1.0"
                      onChange={(e) => {
                        onChangeConfig({
                          ...config,
                          universePackage: e.target.value,
                          preset: 'universe_custom',
                        });
                      }}
                      className="w-full text-xs px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-emerald-600 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide block">
                      Modelos Populares do Universe:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_UNIVERSE_TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            onChangeConfig({
                              ...config,
                              universePackage: t.id,
                              universeEntrypoint: t.entrypoint,
                              preset: 'universe_custom',
                            });
                          }}
                          className={`text-[10px] px-2 py-1 rounded-md border font-mono transition-colors ${
                            config.universePackage === t.id
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold ring-1 ring-emerald-600'
                              : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          {t.id}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
