import { createContext } from 'react';
import { AcademicReference, CitationFormat } from '@/types/document';

export interface CitationRenderContextValue {
  references: AcademicReference[];
  refIndexMap: Map<string, number>;
  citationFormat: CitationFormat;
}

export const CitationRenderContext = createContext<CitationRenderContextValue>({
  references: [],
  refIndexMap: new Map(),
  citationFormat: 'abnt_upper',
});
