import React, { useRef, useState } from 'react';
import {
  Building,
  ChevronDown,
  ChevronRight,
  Globe,
  ImagePlus,
  Palette,
  Trash2,
  Upload,
} from 'lucide-react';
import { DocumentMetadata, DocumentProject, TemplateConfig } from '@/types/document';
import { IdentificacaoFieldId, TemplateCapabilities } from '@/core/templates/templateCapabilities';
import { getInstitutionalTemplateBySlug } from '@/core/templates/institutions/registry';
import {
  calculateProjectImageBytes,
  getDataUrlByteSize,
  validateInstitutionLogoUpload,
} from '@/core/storage/imageQuota';
import {
  removeCachedInstitutionLogo,
  saveCachedInstitutionLogo,
} from '@/core/storage/institutionLogoCache';

interface SidebarIdentificationSectionProps {
  project?: DocumentProject;
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
  project,
  metadata,
  templateConfig,
  capabilities,
  onUpdateField,
  onOpenTemplateCustomizer,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const hasField = (fieldId: IdentificacaoFieldId) =>
    capabilities.identificacaoFields.includes(fieldId);

  const institutionalModel = getInstitutionalTemplateBySlug(project?.institutionalTemplateSlug);
  const showLogoField =
    Boolean(institutionalModel?.cover?.showLogo) ||
    Boolean(metadata.institutionLogoDataUrl) ||
    (capabilities.isAbntFamily && templateConfig?.includeCoverPage !== false) ||
    capabilities.effectiveType === 'poster';

  const institutionCacheKey =
    institutionalModel?.institutionAcronym ||
    project?.institutionAcronym ||
    metadata.institution;

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const currentProjectBytes = project
      ? calculateProjectImageBytes(project.blocks, project.metadata)
      : getDataUrlByteSize(metadata.institutionLogoDataUrl);
    const currentLogoBytes = getDataUrlByteSize(metadata.institutionLogoDataUrl);
    const bytesWithoutLogo = Math.max(0, currentProjectBytes - currentLogoBytes);

    const check = validateInstitutionLogoUpload(file, bytesWithoutLogo);
    if (!check.valid) {
      setLogoError(check.error ?? 'Arquivo inválido para brasão.');
      return;
    }

    setLogoError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        setLogoError('Não foi possível ler o arquivo selecionado.');
        return;
      }
      onUpdateField('institutionLogoDataUrl', dataUrl);
      if (institutionCacheKey) {
        void saveCachedInstitutionLogo(institutionCacheKey, dataUrl);
      }
    };
    reader.onerror = () => {
      setLogoError('Erro ao ler a imagem do brasão.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoError(null);
    onUpdateField('institutionLogoDataUrl', undefined);
    if (institutionCacheKey) {
      void removeCachedInstitutionLogo(institutionCacheKey);
    }
  };

  return (
    <div className="p-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-700 py-1.5 hover:text-slate-900"
      >
        <span className="flex items-center gap-2">
          <Building className="w-3.5 h-3.5 text-slate-500" />
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
            <div className="p-2.5 rounded-lg bg-brand-50/60 border border-brand-200 space-y-1.5">
              <div className="text-xs font-medium text-brand-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-brand-700" />
                  Banner {(templateConfig?.posterDimensions || 'a0').toUpperCase()} •{' '}
                  {templateConfig?.posterColumns || 3} Colunas
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenTemplateCustomizer}
                className="w-full py-1 px-2 rounded bg-white border border-brand-200 hover:bg-brand-50 text-xs font-medium text-brand-700 transition-colors"
              >
                Configurar Dimensões, Tema e Colunas
              </button>
            </div>
          )}

          {capabilities.effectiveType === 'universe_custom' && (
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-brand-700" />
                <span>Pacote Conectado</span>
              </div>
              <div className="text-xs font-mono text-slate-800 truncate">
                {templateConfig?.universePackage || '@preview/charged-ieee:0.1.4'}
              </div>
              {onOpenTemplateCustomizer && (
                <button
                  type="button"
                  onClick={onOpenTemplateCustomizer}
                  className="w-full py-1 px-2 rounded bg-white border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
                >
                  Alterar Pacote / Entrypoint Universe
                </button>
              )}
            </div>
          )}

          {hasField('title') && (
            <div>
              <label htmlFor="sb-id-titulo-do-trabalho" className="text-xs font-medium text-slate-500 block mb-1">
                Título do Trabalho
              </label>
              <input
                id="sb-id-titulo-do-trabalho"
                type="text"
                value={metadata.title}
                onChange={(e) => onUpdateField('title', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                placeholder="Ex: Análise da Eficiência Energética..."
              />
            </div>
          )}

          {hasField('subtitle') && (
            <div>
              <label htmlFor="sb-id-subtitulo-opcional" className="text-xs font-medium text-slate-500 block mb-1">
                Subtítulo (Opcional)
              </label>
              <input
                id="sb-id-subtitulo-opcional"
                type="text"
                value={metadata.subtitle || ''}
                onChange={(e) => onUpdateField('subtitle', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                placeholder="Ex: Um estudo de caso regional"
              />
            </div>
          )}

          {hasField('author') && (
            <div>
              <label htmlFor="sb-id-nome-do-autor" className="text-xs font-medium text-slate-500 block mb-1">
                Nome do Autor
              </label>
              <input
                id="sb-id-nome-do-autor"
                type="text"
                value={metadata.author}
                onChange={(e) => onUpdateField('author', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                placeholder="Ex: Nome do Autor"
              />
            </div>
          )}

          {hasField('advisor') && (
            <div>
              <label htmlFor="sb-id-orientador-a-opcional" className="text-xs font-medium text-slate-500 block mb-1">
                Orientador(a) (Opcional)
              </label>
              <input
                id="sb-id-orientador-a-opcional"
                type="text"
                value={metadata.advisor || ''}
                onChange={(e) => onUpdateField('advisor', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                placeholder="Ex: Prof. Dr. Nome do Orientador"
              />
            </div>
          )}

          {hasField('coadvisor') && (
            <div>
              <label htmlFor="sb-id-coorientador-a-opcional" className="text-xs font-medium text-slate-500 block mb-1">
                Coorientador(a) (Opcional)
              </label>
              <input
                id="sb-id-coorientador-a-opcional"
                type="text"
                value={metadata.coadvisor || ''}
                onChange={(e) => onUpdateField('coadvisor', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                placeholder="Ex: Profa. Dra. Nome da Coorientadora"
              />
            </div>
          )}

          {hasField('nature') && (
            <div>
              <label htmlFor="sb-id-natureza-do-trabalho-folha-de-rosto" className="text-xs font-medium text-slate-500 block mb-1">
                Natureza do Trabalho (Folha de Rosto)
              </label>
              <textarea
                id="sb-id-natureza-do-trabalho-folha-de-rosto"
                rows={3}
                value={metadata.nature || ''}
                onChange={(e) => onUpdateField('nature', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                placeholder="Ex: Trabalho de Conclusão de Curso apresentado ao..."
              />
            </div>
          )}

          {hasField('institution') && (
            <div>
              <label htmlFor="sb-id-instituicao" className="text-xs font-medium text-slate-500 block mb-1">
                Instituição
              </label>
              <input
                id="sb-id-instituicao"
                type="text"
                value={metadata.institution}
                onChange={(e) => onUpdateField('institution', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                placeholder="Ex: Universidade Federal..."
              />
            </div>
          )}

          {showLogoField && (
            <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="sb-id-brasao-instituicao"
                  className="text-xs font-medium text-slate-700 flex items-center gap-1.5"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-brand-700" />
                  <span>Brasão da instituição</span>
                </label>
                {institutionalModel?.cover?.showLogo && !metadata.institutionLogoDataUrl && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                    Previsto na capa
                  </span>
                )}
              </div>

              <input
                ref={logoInputRef}
                id="sb-id-brasao-instituicao"
                type="file"
                accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoFileChange}
                className="sr-only"
              />

              {metadata.institutionLogoDataUrl ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-md border border-slate-200 bg-white flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    <img
                      src={metadata.institutionLogoDataUrl}
                      alt="Prévia do brasão da instituição"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
                    >
                      <Upload className="w-3 h-3" />
                      Trocar brasão
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded border border-red-200 bg-white hover:bg-red-50 text-xs font-medium text-red-700 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full py-2 px-2.5 rounded-md border border-dashed border-slate-300 bg-white hover:border-brand-600 hover:bg-brand-50/40 text-xs font-medium text-slate-600 hover:text-brand-800 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Enviar brasão (PNG, JPG ou SVG)
                </button>
              )}

              <p className="text-[11px] text-slate-500 leading-snug">
                PNG, JPG ou SVG de até 2 MB. Fica salvo no seu dispositivo e no seu Drive.
              </p>

              {logoError && (
                <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                  {logoError}
                </p>
              )}
            </div>
          )}

          {hasField('course') && (
            <div>
              <label htmlFor="sb-id-curso-departamento" className="text-xs font-medium text-slate-500 block mb-1">
                Curso / Departamento
              </label>
              <input
                id="sb-id-curso-departamento"
                type="text"
                value={metadata.course}
                onChange={(e) => onUpdateField('course', e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                placeholder="Ex: Bacharelado em Engenharia de Software"
              />
            </div>
          )}

          {(hasField('location') || hasField('year')) && (
            <div className="grid grid-cols-2 gap-2">
              {hasField('location') && (
                <div>
                  <label htmlFor="sb-id-cidade" className="text-xs font-medium text-slate-500 block mb-1">
                    Cidade
                  </label>
                  <input
                    id="sb-id-cidade"
                    type="text"
                    value={metadata.location}
                    onChange={(e) => onUpdateField('location', e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
                    placeholder="São Paulo"
                  />
                </div>
              )}
              {hasField('year') && (
                <div>
                  <label htmlFor="sb-id-ano" className="text-xs font-medium text-slate-500 block mb-1">
                    Ano
                  </label>
                  <input
                    id="sb-id-ano"
                    type="text"
                    value={metadata.year}
                    onChange={(e) => onUpdateField('year', e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
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
