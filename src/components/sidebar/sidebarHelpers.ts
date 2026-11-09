import { AcademicReference, ProjectTemplateType } from '@/types/document';

export const REFERENCE_FILTER_TABS = [
  { id: 'all', label: 'Todas' },
  { id: 'book', label: 'Livros' },
  { id: 'article', label: 'Artigos' },
  { id: 'thesis', label: 'Teses' },
  { id: 'website', label: 'Sites' },
] as const;

export function getAbstractWordRange(effectiveType: ProjectTemplateType | string): {
  min: number;
  max: number;
} {
  if (effectiveType === 'sbc') return { min: 50, max: 200 };
  if (effectiveType === 'artigo' || effectiveType === 'ieee') return { min: 100, max: 250 };
  return { min: 150, max: 500 };
}

export function filterReferences(
  references: AcademicReference[],
  searchQuery: string,
  typeFilter: string,
): AcademicReference[] {
  const q = searchQuery.trim().toLowerCase();
  return references.filter((ref) => {
    if (typeFilter !== 'all' && (ref.type || 'book') !== typeFilter) {
      return false;
    }
    if (!q) return true;
    return (
      ref.authors.toLowerCase().includes(q) ||
      ref.title.toLowerCase().includes(q) ||
      (ref.year || '').toLowerCase().includes(q) ||
      (ref.journal || '').toLowerCase().includes(q) ||
      (ref.publisher || '').toLowerCase().includes(q)
    );
  });
}

export function getReferenceTypeBadgeLabel(t?: AcademicReference['type']): string {
  switch (t) {
    case 'article':
      return 'Artigo';
    case 'thesis':
      return 'Tese/TCC';
    case 'website':
      return 'Site';
    case 'legislation':
      return 'Norma/Lei';
    default:
      return 'Livro';
  }
}
