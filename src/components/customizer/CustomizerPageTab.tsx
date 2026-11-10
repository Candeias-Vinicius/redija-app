import React from 'react';
import { Layout, Lock } from 'lucide-react';
import {
  HeadingNumberingStyle,
  PageNumberingPosition,
  PageOrientation,
  PaperSize,
  TemplateConfig,
} from '@/types/document';
import { CustomizerScope } from '@/core/templates/templateCapabilities';

interface CustomizerPageTabProps {
  config: TemplateConfig;
  scope?: CustomizerScope;
  onUpdateField: <K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => void;
}

export const CustomizerPageTab: React.FC<CustomizerPageTabProps> = ({
  config,
  scope,
  onUpdateField,
}) => {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500">
            <Layout className="w-3.5 h-3.5 text-emerald-600" />
            Papel, Orientação, Recuo e Margens (cm)
          </label>
          {scope && (!scope.allowMarginChange || !scope.allowPaperSizeChange) && (
            <span
              className="flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
              title={scope.marginLockedReason || scope.paperSizeLockedReason}
            >
              <Lock className="w-2.5 h-2.5 text-amber-600" />
              Página padronizada pela norma
            </span>
          )}
        </div>

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
              disabled={Boolean(scope && !scope.allowPaperSizeChange)}
              onChange={(e) => onUpdateField('paperSize', e.target.value as PaperSize)}
              className={`w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600 ${
                scope && !scope.allowPaperSizeChange
                  ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed'
                  : ''
              }`}
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
              disabled={Boolean(scope && !scope.allowOrientationChange)}
              onChange={(e) =>
                onUpdateField('pageOrientation', e.target.value as PageOrientation)
              }
              className={`w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600 ${
                scope && !scope.allowOrientationChange
                  ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed'
                  : ''
              }`}
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
              onChange={(e) => onUpdateField('paragraphIndentCm', Number(e.target.value) || 0)}
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
              disabled={Boolean(scope && !scope.allowMarginChange)}
              onChange={(e) => onUpdateField('marginTopCm', Number(e.target.value) || 3)}
              className={`w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600 ${
                scope && !scope.allowMarginChange
                  ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed'
                  : ''
              }`}
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
              disabled={Boolean(scope && !scope.allowMarginChange)}
              onChange={(e) => onUpdateField('marginLeftCm', Number(e.target.value) || 3)}
              className={`w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600 ${
                scope && !scope.allowMarginChange
                  ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed'
                  : ''
              }`}
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
              disabled={Boolean(scope && !scope.allowMarginChange)}
              onChange={(e) => onUpdateField('marginBottomCm', Number(e.target.value) || 2)}
              className={`w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600 ${
                scope && !scope.allowMarginChange
                  ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed'
                  : ''
              }`}
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
              disabled={Boolean(scope && !scope.allowMarginChange)}
              onChange={(e) => onUpdateField('marginRightCm', Number(e.target.value) || 2)}
              className={`w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600 ${
                scope && !scope.allowMarginChange
                  ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed'
                  : ''
              }`}
            />
          </div>
        </div>
        {scope && !scope.allowMarginChange && scope.marginLockedReason && (
          <p className="text-[10px] text-neutral-500">{scope.marginLockedReason}</p>
        )}
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
                onUpdateField('pageNumbering', e.target.value as PageNumberingPosition)
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
                onUpdateField('headingNumbering', e.target.value as HeadingNumberingStyle)
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
              onChange={(e) => onUpdateField('runningHeader', e.target.value)}
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
              onChange={(e) => onUpdateField('hideFirstPageNumber', e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            Ocultar número na primeira página
          </label>
          <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
            <input
              type="checkbox"
              checked={config.romanPreTextual ?? false}
              onChange={(e) => onUpdateField('romanPreTextual', e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            Numeração romana minúscula (i, ii, iii) nos elementos pré-textuais
          </label>
          <label
            className={`flex items-center gap-2 text-xs text-neutral-700 ${
              scope && !scope.allowH1PageBreakToggle ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <input
              type="checkbox"
              checked={
                scope && !scope.allowH1PageBreakToggle ? false : (config.h1PageBreak ?? true)
              }
              disabled={Boolean(scope && !scope.allowH1PageBreakToggle)}
              onChange={(e) => onUpdateField('h1PageBreak', e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            Quebrar página automaticamente antes de Seções Primárias (H1)
            {scope && !scope.allowH1PageBreakToggle && (
              <span className="text-[10px] text-amber-700 font-medium ml-1">
                (Desativado para seções corridas)
              </span>
            )}
          </label>
        </div>
      </div>
    </div>
  );
};
