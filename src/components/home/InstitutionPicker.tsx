import React, { useMemo, useState } from 'react';
import { Building2, ExternalLink, Search, X } from 'lucide-react';
import {
  getAllInstitutionalTemplates,
  getInstitutionalGroups,
  InstitutionalGroup,
  normalizeInstitutionQuery,
  searchInstitutionalTemplates,
} from '@/core/templates/institutions';
import { GITHUB_INSTITUTION_MODEL_REQUEST_URL } from '@/core/links';
import { writeLastInstitution } from './institutionHelpers';

interface InstitutionPickerProps {
  id?: string;
  selectedAcronym: string;
  onSelectInstitution: (acronym: string) => void;
  compact?: boolean;
}

/**
 * Seletor opcional de instituição na tela "Novo Trabalho" (RDJ-02.2):
 * - Busca local instantânea (< 100 ms), sem diferenciar maiúsculas nem acentos;
 * - Destaca os modelos da instituição selecionada;
 * - Quando não há modelo publicado, exibe link "Solicitar modelo" sem bloquear a criação.
 */
export const InstitutionPicker: React.FC<InstitutionPickerProps> = ({
  id = 'home-institution-search',
  selectedAcronym,
  onSelectInstitution,
  compact = false,
}) => {
  const [query, setQuery] = useState(selectedAcronym);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const allModels = useMemo(() => getAllInstitutionalTemplates(), []);
  const allGroups = useMemo(() => getInstitutionalGroups(allModels), [allModels]);

  const matchingGroups = useMemo<InstitutionalGroup[]>(() => {
    const trimmed = query.trim();
    if (!trimmed) return allGroups;
    const matchedModels = searchInstitutionalTemplates(trimmed, allModels);
    return getInstitutionalGroups(matchedModels);
  }, [query, allModels, allGroups]);

  const selectedGroup = useMemo(() => {
    if (!selectedAcronym.trim()) return undefined;
    const norm = normalizeInstitutionQuery(selectedAcronym);
    return allGroups.find((g) => normalizeInstitutionQuery(g.acronym) === norm);
  }, [selectedAcronym, allGroups]);

  const hasQueryWithoutMatch = query.trim().length > 0 && matchingGroups.length === 0;

  const handleSelect = (group: InstitutionalGroup) => {
    setQuery(group.acronym);
    setIsDropdownOpen(false);
    writeLastInstitution(group.acronym);
    onSelectInstitution(group.acronym);
  };

  const handleClear = () => {
    setQuery('');
    setIsDropdownOpen(false);
    writeLastInstitution('');
    onSelectInstitution('');
  };

  return (
    <div className={compact ? 'space-y-2' : 'max-w-md space-y-2'}>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          <Building2 className="w-4 h-4 text-brand-700 dark:text-brand-400" />
          <span>
            Sua instituição <span className="font-normal text-fg-muted">(opcional)</span>
          </span>
        </label>
        {selectedGroup && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-medium text-brand-700 dark:text-brand-400 hover:underline"
          >
            Trocar / limpar
          </button>
        )}
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          aria-hidden="true"
        />
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isDropdownOpen}
          aria-autocomplete="list"
          value={query}
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={() => {
            // Atraso curto para permitir clique nas opções do dropdown
            setTimeout(() => setIsDropdownOpen(false), 150);
          }}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setIsDropdownOpen(true);
            if (!next.trim()) {
              writeLastInstitution('');
              onSelectInstitution('');
            }
          }}
          placeholder="Buscar faculdade ou sigla (ex.: USP, UNICAMP, IFSP, UFMG, PUC-SP)"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-surface pl-9 pr-8 py-2 text-sm text-fg placeholder:text-fg-muted focus:outline-none focus:border-brand-600"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Limpar busca de instituição"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {isDropdownOpen && matchingGroups.length > 0 && (
          <ul
            role="listbox"
            aria-label="Instituições com modelos disponíveis"
            className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg"
          >
            {matchingGroups.map((group) => {
              const isSelected =
                selectedGroup &&
                normalizeInstitutionQuery(selectedGroup.acronym) ===
                  normalizeInstitutionQuery(group.acronym);
              return (
                <li key={group.acronym} role="option" aria-selected={Boolean(isSelected)}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(group);
                    }}
                    className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-800 dark:text-brand-200'
                        : 'hover:bg-surface-sunken text-fg'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold truncate">
                        {group.acronym} — {group.institutionName}
                      </span>
                      <span className="block text-xs text-fg-muted">{group.cityState}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
                      {group.models.length} {group.models.length === 1 ? 'modelo' : 'modelos'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {hasQueryWithoutMatch && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200"
        >
          <span>Ainda não temos o modelo da sua instituição. Você pode usar os modelos genéricos abaixo.</span>
          <a
            href={GITHUB_INSTITUTION_MODEL_REQUEST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-400 hover:underline"
          >
            Solicitar modelo
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
};
