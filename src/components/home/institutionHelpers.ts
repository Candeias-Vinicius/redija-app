import {
  getAllInstitutionalTemplates,
  InstitutionalTemplateDefinition,
  normalizeInstitutionQuery,
} from '@/core/templates/institutions';

const LAST_INSTITUTION_KEY = 'redija:lastInstitution';

export function readLastInstitution(): string {
  try {
    return localStorage.getItem(LAST_INSTITUTION_KEY) || '';
  } catch {
    return '';
  }
}

export function writeLastInstitution(value: string): void {
  try {
    if (value.trim()) {
      localStorage.setItem(LAST_INSTITUTION_KEY, value.trim());
    } else {
      localStorage.removeItem(LAST_INSTITUTION_KEY);
    }
  } catch {
    // ignora
  }
}

/**
 * Retorna os modelos em destaque para a instituição selecionada.
 */
export function getHighlightedInstitutionalModels(
  selectedAcronym: string,
): InstitutionalTemplateDefinition[] {
  if (!selectedAcronym.trim()) return [];
  const norm = normalizeInstitutionQuery(selectedAcronym);
  return getAllInstitutionalTemplates().filter(
    (m) => normalizeInstitutionQuery(m.institutionAcronym) === norm,
  );
}
