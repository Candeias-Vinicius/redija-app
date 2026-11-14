import React, { useState } from 'react';
import { Building, ChevronDown, ChevronRight, Globe, Palette } from 'lucide-react';
import { DocumentMetadata, TemplateConfig } from '@/types/document';
import { IdentificacaoFieldId, TemplateCapabilities } from '@/core/templates/templateCapabilities';

interface SidebarIdentificationSectionProps {
  metadata: DocumentMetadata;
  templateConfig?: TemplateConfig;
  capabilities: TemplateCapabilities;
  onUpdateField: <K extends keyof DocumentMetadata>(
    field: K,
    value: DocumentMetadata[K],
  ) => void;
  onOpenTemplateCustomizer?: () => void;
}

export const SidebarIdentificationSection: React.FC<SidebarIdentificationSectionProps> = ({
  metadata,
  templateConfig,
  capabilities,
  onUpdateField,
  onOpenTemplateCustomizer,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasField = (fieldId: IdentificacaoFieldId) =>
    capabilities.identificacaoFields.includes(fieldId);

  return (
    <div className="p-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left text-xs font-semibold text-neutral-700 py-1.5 hover:text-neutral-900"
      >
        <span className="flex items-center gap-2">
          <Building className="w-3.5 h-3.5 text-neutral-400" />
          {capabilities.identificacaoTitle}
        </span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-2.5 mt-2.5 pl-2">
          {capabilities.effectiveType === 'poster' && onOpenTemplateCustomizer && (
            <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 space-y-1.5">
              <div className="text-[11px] font-medium text-emerald-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-emerald-600" />
                  Banner {(templateConfig?.posterDimensions || 'a0').toUpperCase()} •{' '}
                  {templateConfig?.posterColumns || 3} Colunas
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenTemplateCustomizer}
                className="w-full py-1 px-2 rounded bg-white border border-emerald-200 hover:bg-emerald-50 text-[11px] font-medium text-emerald-700 transition-colors"
              >
                Configurar Dimensões, Tema e Colunas
              </button>
            </div>
          )}

          {capabilities.effectiveType === 'universe_custom' && (
            <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-emerald-600" />
                <span>Pacote Conectado</span>
              </div>
              <div className="text-[11px] font-mono text-neutral-800 truncate">
                {templateConfig?.universePackage || '@preview/charged-ieee:0.1.4'}
              </div>
              {onOpenTemplateCustomizer && (
                <button
                  type="button"
                  onClick={onOpenTemplateCustomizer}
                  className="w-full py-1 px-2 rounded bg-white border border-neutral-200 hover:bg-neutral-100 text-[11px] font-medium text-neutral-700 transition-colors"
                >
                  Alterar Pacote / Entrypoint Universe
                </button>
              )}
            </div>
          )}

          {hasField('title') && (
            <div>
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Título do Trabalho
              </label>
              <input
                type="text"
                value={metadata.title}
                onChange={(e) => onUpdateField('title', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                placeholder="Ex: Análise da Eficiência Energética..."
              />
            </div>
          )}

          {hasField('subtitle') && (
            <div>
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Subtítulo (Opcional)
              </label>
              <input
                type="text"
                value={metadata.subtitle || ''}
                onChange={(e) => onUpdateField('subtitle', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                placeholder="Ex: Um estudo de caso regional"
              />
            </div>
          )}

          {hasField('author') && (
            <div>
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Nome do Autor
              </label>
              <input
                type="text"
                value={metadata.author}
                onChange={(e) => onUpdateField('author', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                placeholder="Ex: Nome do Autor"
              />
            </div>
          )}

          {hasField('advisor') && (
            <div>
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Orientador(a) (Opcional)
              </label>
              <input
                type="text"
                value={metadata.advisor || ''}
                onChange={(e) => onUpdateField('advisor', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                placeholder="Ex: Prof. Dr. Nome do Orientador"
              />
            </div>
          )}

          {hasField('coadvisor') && (
            <div>
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Coorientador(a) (Opcional)
              </label>
              <input
                type="text"
                value={metadata.coadvisor || ''}
                onChange={(e) => onUpdateField('coadvisor', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                placeholder="Ex: Profa. Dra. Nome da Coorientadora"
              />
            </div>
          )}

          {hasField('nature') && (
            <div>
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Natureza do Trabalho (Folha de Rosto)
              </label>
              <textarea
                rows={3}
                value={metadata.nature || ''}
                onChange={(e) => onUpdateField('nature', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                placeholder="Ex: Trabalho de Conclusão de Curso apresentado ao..."
              />
            </div>
          )}

          {hasField('institution') && (
            <div>
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Instituição
              </label>
              <input
                type="text"
                value={metadata.institution}
                onChange={(e) => onUpdateField('institution', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                placeholder="Ex: Universidade Federal..."
              />
            </div>
          )}

          {hasField('course') && (
            <div>
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Curso / Departamento
              </label>
              <input
                type="text"
                value={metadata.course}
                onChange={(e) => onUpdateField('course', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                placeholder="Ex: Bacharelado em Engenharia de Software"
              />
            </div>
          )}

          {(hasField('location') || hasField('year')) && (
            <div className="grid grid-cols-2 gap-2">
              {hasField('location') && (
                <div>
                  <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={metadata.location}
                    onChange={(e) => onUpdateField('location', e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                    placeholder="São Paulo"
                  />
                </div>
              )}
              {hasField('year') && (
                <div>
                  <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                    Ano
                  </label>
                  <input
                    type="text"
                    value={metadata.year}
                    onChange={(e) => onUpdateField('year', e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                    placeholder="2026"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
