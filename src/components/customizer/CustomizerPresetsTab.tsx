import React from 'react';
import { Check, ExternalLink, Globe } from 'lucide-react';
import { TemplateConfig } from '@/types/document';
import { CustomizerScope } from '@/core/templates/templateCapabilities';
import { POPULAR_UNIVERSE_TEMPLATES } from '@/core/universe/universeResolver';
import { PRESETS, PresetInfo } from './presets';

interface CustomizerPresetsTabProps {
  config: TemplateConfig;
  scope?: CustomizerScope;
  isPosterActive: boolean;
  isUniverseSelected: boolean;
  showUniverseExplorer: boolean;
  universeConnectorRef: React.RefObject<HTMLDivElement | null>;
  onApplyPreset: (preset: PresetInfo) => void;
  onOpenPosterStructureTab: () => void;
  onToggleUniverseExplorer: () => void;
  onUniversePackageInput: (pkg: string) => void;
  onSelectUniverseChip: (pkgId: string, entrypoint: string) => void;
}

export const CustomizerPresetsTab: React.FC<CustomizerPresetsTabProps> = ({
  config,
  scope,
  isPosterActive,
  isUniverseSelected,
  showUniverseExplorer,
  universeConnectorRef,
  onApplyPreset,
  onOpenPosterStructureTab,
  onToggleUniverseExplorer,
  onUniversePackageInput,
  onSelectUniverseChip,
}) => {
  const visiblePresets = PRESETS;
  const allowUniverse = true;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
          Escolha um Padrão de Norma
        </label>
        {isPosterActive && (
          <button
            type="button"
            onClick={onOpenPosterStructureTab}
            className="text-[11px] font-semibold text-emerald-700 hover:underline"
          >
            Configurar dimensões e tema do pôster →
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {visiblePresets.map((preset) => {
          const isSelected = config.preset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset)}
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
                <p className="text-[11px] text-neutral-600 leading-relaxed">{preset.description}</p>
              </div>
            </button>
          );
        })}

        {/* Card: Conector Typst Universe (se permitido pelo escopo) */}
        {allowUniverse && (
          <button
            type="button"
            onClick={onToggleUniverseExplorer}
            aria-expanded={showUniverseExplorer}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
              isUniverseSelected
                ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                : showUniverseExplorer
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-neutral-200 hover:border-emerald-400 hover:bg-neutral-50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-bold text-xs text-neutral-900 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Explorar no Typst Universe
                </span>
                {isUniverseSelected && (
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
              <span className="inline-block text-[10px] font-semibold bg-neutral-200/80 text-neutral-700 px-1.5 py-0.5 rounded mb-1.5">
                Comunidade • typst.app/universe
              </span>
              <p className="text-[11px] text-neutral-600 leading-relaxed">
                Conecte modelos oficiais e da comunidade do Typst Universe importando pelo identificador
                do pacote (ex: @preview/charged-ieee:0.1.4).
              </p>
            </div>
          </button>
        )}
      </div>

      {(showUniverseExplorer || isUniverseSelected) && (
        <div
          ref={universeConnectorRef}
          className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="template-universe-package"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              Conector Typst Universe
            </label>
            <a
              href="https://typst.app/universe"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
              title="Abrir loja oficial de pacotes e templates em nova aba"
            >
              <span>Explorar typst.app/universe</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div>
            <label
              htmlFor="template-universe-package"
              className="block text-[10px] font-semibold text-neutral-600 uppercase mb-1"
            >
              Identificador do Pacote Typst
            </label>
            <input
              id="template-universe-package"
              type="text"
              value={config.universePackage || ''}
              placeholder="Ex: @preview/charged-ieee:0.1.4 ou @preview/modern-sbc:0.1.0"
              onChange={(e) => onUniversePackageInput(e.target.value)}
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
                  onClick={() => onSelectUniverseChip(t.id, t.entrypoint)}
                  className={`text-[10px] px-2 py-1 rounded-md border font-mono transition-colors ${
                    isUniverseSelected && config.universePackage === t.id
                      ? 'border-emerald-600 bg-emerald-100 text-emerald-900 font-bold ring-1 ring-emerald-600'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  {t.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
