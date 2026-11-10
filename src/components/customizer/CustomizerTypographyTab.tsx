import React from 'react';
import { Lock, Type } from 'lucide-react';
import {
  BodyAlignment,
  DocumentLanguage,
  FontFamilyId,
  TemplateConfig,
} from '@/types/document';
import { CustomizerScope } from '@/core/templates/templateCapabilities';
import { FONT_CATALOG, sanitizeCustomFontFamily } from '@/core/typst/fontCatalog';

interface CustomizerTypographyTabProps {
  config: TemplateConfig;
  scope?: CustomizerScope;
  onUpdateField: <K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => void;
}

export const CustomizerTypographyTab: React.FC<CustomizerTypographyTabProps> = ({
  config,
  scope,
  onUpdateField,
}) => {
  const isCustomFontInvalid =
    config.fontFamily === 'custom' &&
    Boolean(config.customFontFamily?.trim()) &&
    !sanitizeCustomFontFamily(config.customFontFamily);

  return (
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
            onChange={(e) => onUpdateField('fontFamily', e.target.value as FontFamilyId)}
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
                  onClick={() => onUpdateField('fontSizePt', pt)}
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
                onUpdateField('fontSizePt', Math.min(24, Math.max(8, val)));
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
              onUpdateField('lineSpacing', e.target.value as TemplateConfig['lineSpacing'])
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
            onChange={(e) => onUpdateField('customFontFamily', e.target.value)}
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
            onChange={(e) => onUpdateField('bodyAlignment', e.target.value as BodyAlignment)}
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
                onUpdateField('paragraphSpacingEm', undefined);
              } else {
                const n = Number(raw);
                if (Number.isFinite(n)) {
                  onUpdateField('paragraphSpacingEm', Math.min(3, Math.max(0, n)));
                }
              }
            }}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="template-columns"
              className="block text-[11px] font-medium text-neutral-600"
            >
              Colunas do Texto
            </label>
            {scope && !scope.allowColumnChange && (
              <span
                className="flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                title={scope.columnLockedReason}
              >
                <Lock className="w-2.5 h-2.5 text-amber-600" />
                Travado
              </span>
            )}
          </div>
          <select
            id="template-columns"
            value={
              scope && !scope.allowColumnChange && scope.fixedColumns
                ? scope.fixedColumns
                : config.columns
            }
            disabled={Boolean(scope && !scope.allowColumnChange)}
            onChange={(e) =>
              onUpdateField('columns', Number(e.target.value) as TemplateConfig['columns'])
            }
            className={`w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600 ${
              scope && !scope.allowColumnChange
                ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed'
                : ''
            }`}
          >
            <option value={1}>1 Coluna</option>
            <option value={2}>2 Colunas</option>
          </select>
          {scope && !scope.allowColumnChange && scope.columnLockedReason && (
            <p className="text-[10px] text-neutral-500 mt-1">{scope.columnLockedReason}</p>
          )}
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
              onUpdateField('documentLanguage', e.target.value as DocumentLanguage)
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
  );
};
