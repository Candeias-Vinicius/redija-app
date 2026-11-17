import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { DocumentMetadata } from '@/types/document';
import { PreTextualFieldId, TemplateCapabilities } from '@/core/templates/templateCapabilities';

interface SidebarPreTextualsSectionProps {
  metadata: DocumentMetadata;
  capabilities: TemplateCapabilities;
  onUpdateField: <K extends keyof DocumentMetadata>(
    field: K,
    value: DocumentMetadata[K],
  ) => void;
}

export const SidebarPreTextualsSection: React.FC<SidebarPreTextualsSectionProps> = ({
  metadata,
  capabilities,
  onUpdateField,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!capabilities.showPreTextuals) return null;

  const hasField = (fieldId: PreTextualFieldId) => capabilities.preTextualFields.includes(fieldId);

  return (
    <div className="p-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-700 py-1.5 hover:text-slate-900"
      >
        <span className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          Pré-Textuais &amp; Listas
        </span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-3 mt-2.5 pl-2 text-xs">
          {(hasField('includeApprovalPage') ||
            hasField('includeFiguresList') ||
            hasField('includeBoxesList') ||
            hasField('includeTablesList')) && (
            <div className="space-y-1.5">
              {hasField('includeApprovalPage') && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={Boolean(metadata.includeApprovalPage)}
                      onChange={(e) => onUpdateField('includeApprovalPage', e.target.checked)}
                      className="rounded text-brand-700 focus:ring-brand-500"
                    />
                    <span>Incluir Folha de Aprovação (Banca Examinadora)</span>
                  </label>

                  {metadata.includeApprovalPage && (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2 my-1">
                      <div>
                        <label htmlFor="sb-pre-data-de-aprovacao-deixe-em-branco-p-linh" className="text-xs font-medium text-slate-500 block mb-0.5">
                          Data de Aprovação (deixe em branco p/ linha de preenchimento)
                        </label>
                        <input
                          id="sb-pre-data-de-aprovacao-deixe-em-branco-p-linh"
                          type="text"
                          value={metadata.approvalDate || ''}
                          onChange={(e) => onUpdateField('approvalDate', e.target.value)}
                          placeholder="Ex: 10 de dezembro de 2026"
                          className="w-full text-xs px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-brand-600"
                        />
                      </div>
                      <div>
                        <label htmlFor="sb-pre-membros-da-banca-examinadora-1-por-linha" className="text-xs font-medium text-slate-500 block mb-0.5">
                          Membros da Banca Examinadora (1 por linha)
                        </label>
                        <textarea
                          id="sb-pre-membros-da-banca-examinadora-1-por-linha"
                          rows={3}
                          value={(metadata.committeeMembers ?? []).join('\n')}
                          onChange={(e) =>
                            onUpdateField('committeeMembers', e.target.value.split('\n'))
                          }
                          placeholder={
                            'Prof. Dr. Carlos Eduardo (Convidado)\nProfa. Dra. Ana Beatriz (Avaliadora)'
                          }
                          className="w-full text-xs p-2 border border-slate-200 rounded focus:outline-none focus:border-brand-600"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {hasField('includeFiguresList') && (
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(metadata.includeFiguresList)}
                    onChange={(e) => onUpdateField('includeFiguresList', e.target.checked)}
                    className="rounded text-brand-700 focus:ring-brand-500"
                  />
                  <span>Gerar Lista de Ilustrações automática</span>
                </label>
              )}

              {hasField('includeBoxesList') && (
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(metadata.includeBoxesList)}
                    onChange={(e) => onUpdateField('includeBoxesList', e.target.checked)}
                    className="rounded text-brand-700 focus:ring-brand-500"
                  />
                  <span>Gerar Lista de Quadros automática</span>
                </label>
              )}

              {hasField('includeTablesList') && (
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(metadata.includeTablesList)}
                    onChange={(e) => onUpdateField('includeTablesList', e.target.checked)}
                    className="rounded text-brand-700 focus:ring-brand-500"
                  />
                  <span>Gerar Lista de Tabelas automática</span>
                </label>
              )}
            </div>
          )}

          {hasField('dedicatory') && (
            <div>
              <label htmlFor="sb-pre-dedicatoria-opcional" className="text-xs font-medium text-slate-500 block mb-1">
                Dedicatória (Opcional)
              </label>
              <textarea
                id="sb-pre-dedicatoria-opcional"
                rows={2}
                value={metadata.dedicatory || ''}
                onChange={(e) => onUpdateField('dedicatory', e.target.value)}
                placeholder="Ex: Dedico este trabalho aos meus pais..."
                className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
              />
            </div>
          )}

          {hasField('acknowledgments') && (
            <div>
              <label htmlFor="sb-pre-agradecimentos-opcional" className="text-xs font-medium text-slate-500 block mb-1">
                Agradecimentos (Opcional)
              </label>
              <textarea
                id="sb-pre-agradecimentos-opcional"
                rows={3}
                value={metadata.acknowledgments || ''}
                onChange={(e) => onUpdateField('acknowledgments', e.target.value)}
                placeholder="Texto de agradecimentos..."
                className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
              />
            </div>
          )}

          {hasField('epigraph') && (
            <div>
              <label htmlFor="sb-pre-epigrafe-opcional" className="text-xs font-medium text-slate-500 block mb-1">
                Epígrafe (Opcional)
              </label>
              <textarea
                id="sb-pre-epigrafe-opcional"
                rows={2}
                value={metadata.epigraph || ''}
                onChange={(e) => onUpdateField('epigraph', e.target.value)}
                placeholder="Citação filosófica ou epígrafe..."
                className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600 mb-1"
              />
              <input
                type="text"
                value={metadata.epigraphAuthor || ''}
                onChange={(e) => onUpdateField('epigraphAuthor', e.target.value)}
                placeholder="Autor da epígrafe (ex: Carl Sagan)"
                className="w-full text-xs px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
              />
            </div>
          )}

          {hasField('abbreviations') && (
            <div>
              <label htmlFor="sb-pre-lista-de-abreviaturas-e-siglas-opcional" className="text-xs font-medium text-slate-500 block mb-1">
                Lista de Abreviaturas e Siglas (Opcional)
              </label>
              <textarea
                id="sb-pre-lista-de-abreviaturas-e-siglas-opcional"
                rows={3}
                value={metadata.abbreviations || ''}
                onChange={(e) => onUpdateField('abbreviations', e.target.value)}
                placeholder="Ex: ABNT: Associação Brasileira de Normas Técnicas&#10;IBGE: Instituto Brasileiro de Geografia e Estatística"
                className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
              />
            </div>
          )}

          {hasField('symbols') && (
            <div>
              <label htmlFor="sb-pre-lista-de-simbolos-opcional" className="text-xs font-medium text-slate-500 block mb-1">
                Lista de Símbolos (Opcional)
              </label>
              <textarea
                id="sb-pre-lista-de-simbolos-opcional"
                rows={2}
                value={metadata.symbols || ''}
                onChange={(e) => onUpdateField('symbols', e.target.value)}
                placeholder="Ex: Ω: Ohm (Resistência elétrica)&#10;λ: Comprimento de onda"
                className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
