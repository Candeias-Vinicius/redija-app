import React from 'react';
import { BookOpen, Palette, Trash2, Upload } from 'lucide-react';
import { DocumentMetadata, TemplateConfig } from '@/types/document';

interface CustomizerStructureTabProps {
  config: TemplateConfig;
  metadata: DocumentMetadata;
  onUpdateField: <K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => void;
  onLogoUpload: (file: File) => void;
  onRemoveLogo: () => void;
}

export const CustomizerStructureTab: React.FC<CustomizerStructureTabProps> = ({
  config,
  metadata,
  onUpdateField,
  onLogoUpload,
  onRemoveLogo,
}) => {
  return (
    <div className="space-y-5">
      {/* Estrutura & Brasão */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
          <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
          Estrutura de Páginas &amp; Brasão da Universidade
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
                onChange={(e) => onUpdateField('includeCoverPage', e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              Gerar Capa (NBR 14724)
            </label>
            <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={config.includeTitlePage}
                onChange={(e) => onUpdateField('includeTitlePage', e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              Gerar Folha de Rosto com Natureza e Orientador
            </label>
            <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={config.includeToc}
                onChange={(e) => onUpdateField('includeToc', e.target.checked)}
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
                  onClick={onRemoveLogo}
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
                    if (file) onLogoUpload(file);
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
                onUpdateField(
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
                onUpdateField(
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
                onUpdateField(
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
                onUpdateField('posterTheme', e.target.value as TemplateConfig['posterTheme'])
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
    </div>
  );
};
