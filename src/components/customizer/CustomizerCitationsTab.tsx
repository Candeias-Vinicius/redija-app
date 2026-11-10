import React from 'react';
import { Lock, Quote } from 'lucide-react';
import {
  BibliographyEngine,
  CitationFormat,
  CslStyle,
  ReferenceAlignment,
  ReferenceEntryFormat,
  ReferenceHighlight,
  ReferenceOrdering,
  ReferenceSpacing,
  TemplateConfig,
} from '@/types/document';
import { CustomizerScope } from '@/core/templates/templateCapabilities';
import { formatShortCitation, resolveCitationFormat } from '@/core/transpiler/abntLinter';
import {
  resolveEffectiveCslStyle,
  resolvePreviewCitationStyle,
  SAMPLE_PREVIEW_REF,
} from './presets';

interface CustomizerCitationsTabProps {
  config: TemplateConfig;
  scope?: CustomizerScope;
  onUpdateField: <K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => void;
  onCitationFormatChange: (format: CitationFormat) => void;
}

export const CustomizerCitationsTab: React.FC<CustomizerCitationsTabProps> = ({
  config,
  scope,
  onUpdateField,
  onCitationFormatChange,
}) => {
  const effectiveCitationFormat = resolveCitationFormat(config);
  const isCitationLocked = Boolean(
    scope && !scope.isFullyUnrestricted && scope.allowedCitationFormats.length === 1,
  );
  const isAllowed = (fmt: CitationFormat) =>
    !scope || scope.isFullyUnrestricted || scope.allowedCitationFormats.includes(fmt);
  const effectiveAlignment: ReferenceAlignment = config.referenceAlignment ?? 'left';
  const effectiveSpacing: ReferenceSpacing = config.referenceSpacing ?? 'single_blank';
  const effectiveOrdering: ReferenceOrdering = config.referenceOrdering ?? 'alphabetical';
  const effectiveEntryFormat: ReferenceEntryFormat = config.referenceEntryFormat ?? 'auto';
  const effectiveEngine: BibliographyEngine = config.bibliographyEngine ?? 'redija_custom';
  const effectiveCslStyle: CslStyle = resolveEffectiveCslStyle(config, effectiveCitationFormat);
  const effectiveHighlight: ReferenceHighlight = config.referenceHighlight ?? 'bold';

  const resolvedPreviewStyle = resolvePreviewCitationStyle(
    config,
    effectiveEntryFormat,
    effectiveCitationFormat,
  );

  const sampleInlineCall = formatShortCitation(SAMPLE_PREVIEW_REF, {
    format: effectiveCitationFormat,
    refNumber: 1,
  });

  const highlightClass =
    effectiveHighlight === 'bold'
      ? 'font-bold text-neutral-900'
      : effectiveHighlight === 'italic'
        ? 'italic text-neutral-900'
        : effectiveHighlight === 'underline'
          ? 'underline text-neutral-900'
          : 'text-neutral-900';

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500">
        <Quote className="w-3.5 h-3.5 text-emerald-600" />
        Central de Citações e Lista de Referências
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="template-citation-format"
              className="block text-[11px] font-medium text-neutral-600"
            >
              Formato da Chamada no Texto
            </label>
            {isCitationLocked && (
              <span
                className="flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                title={scope?.citationLockedReason}
              >
                <Lock className="w-2.5 h-2.5 text-amber-600" />
                Travado
              </span>
            )}
          </div>
          <select
            id="template-citation-format"
            value={effectiveCitationFormat}
            disabled={isCitationLocked}
            onChange={(e) => onCitationFormatChange(e.target.value as CitationFormat)}
            className={`w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600 ${
              isCitationLocked ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed' : ''
            }`}
          >
            {isAllowed('abnt_titlecase') && (
              <option value="abnt_titlecase">ABNT Autor-Data: (Silva, 2023) [NBR 10520:2023]</option>
            )}
            {isAllowed('ieee_numeric') && (
              <option value="ieee_numeric">Numérico Colchetes: [1] (IEEE / Vancouver)</option>
            )}
            {isAllowed('superscript') && (
              <option value="superscript">Sobrescrito Numérico: ¹ (Nature / ABNT Numérico)</option>
            )}
            {isAllowed('author_date') && (
              <option value="author_date">Autor-Data Internacional: (Silva, 2023) [APA 7ª]</option>
            )}
          </select>
          {isCitationLocked && scope?.citationLockedReason && (
            <p className="text-[10px] text-neutral-500 mt-1">{scope.citationLockedReason}</p>
          )}
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
              onUpdateField('bibliographyEngine', e.target.value as BibliographyEngine)
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
              onChange={(e) => onUpdateField('cslStyle', e.target.value as CslStyle)}
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
                onUpdateField('referenceEntryFormat', e.target.value as ReferenceEntryFormat)
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
              onUpdateField('referenceOrdering', e.target.value as ReferenceOrdering)
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
              onUpdateField('referenceHighlight', e.target.value as ReferenceHighlight)
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
              onUpdateField('referenceAlignment', e.target.value as ReferenceAlignment)
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
              onUpdateField('referenceSpacing', e.target.value as ReferenceSpacing)
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
  );
};
