/**
 * Subconjunto tipado do AST JSON do Pandoc (pandoc-types 1.23) usado pelo importador.
 * Referência: https://hackage.haskell.org/package/pandoc-types/docs/Text-Pandoc-Definition.html
 */

export type PandocAttr = [string, string[], [string, string][]];
export type PandocTarget = [string, string];

export type CitationMode = { t: 'NormalCitation' | 'AuthorInText' | 'SuppressAuthor' };

export interface PandocCitation {
  citationId: string;
  citationPrefix: PandocInline[];
  citationSuffix: PandocInline[];
  citationMode: CitationMode;
  citationNoteNum?: number;
  citationHash?: number;
}

export type PandocInline =
  | { t: 'Str'; c: string }
  | { t: 'Emph' | 'Underline' | 'Strong' | 'Strikeout' | 'Superscript' | 'Subscript' | 'SmallCaps'; c: PandocInline[] }
  | { t: 'Quoted'; c: [{ t: 'SingleQuote' | 'DoubleQuote' }, PandocInline[]] }
  | { t: 'Cite'; c: [PandocCitation[], PandocInline[]] }
  | { t: 'Code'; c: [PandocAttr, string] }
  | { t: 'Space' | 'SoftBreak' | 'LineBreak' }
  | { t: 'Math'; c: [{ t: 'InlineMath' | 'DisplayMath' }, string] }
  | { t: 'RawInline'; c: [string, string] }
  | { t: 'Link'; c: [PandocAttr, PandocInline[], PandocTarget] }
  | { t: 'Image'; c: [PandocAttr, PandocInline[], PandocTarget] }
  | { t: 'Note'; c: PandocBlock[] }
  | { t: 'Span'; c: [PandocAttr, PandocInline[]] };

export type PandocCaption = [PandocInline[] | null, PandocBlock[]];
export type PandocCell = [PandocAttr, unknown, number, number, PandocBlock[]];
export type PandocRow = [PandocAttr, PandocCell[]];
export type PandocTableHead = [PandocAttr, PandocRow[]];
export type PandocTableBody = [PandocAttr, number, PandocRow[], PandocRow[]];
export type PandocTableFoot = [PandocAttr, PandocRow[]];

export type PandocBlock =
  | { t: 'Plain' | 'Para'; c: PandocInline[] }
  | { t: 'LineBlock'; c: PandocInline[][] }
  | { t: 'CodeBlock'; c: [PandocAttr, string] }
  | { t: 'RawBlock'; c: [string, string] }
  | { t: 'BlockQuote'; c: PandocBlock[] }
  | { t: 'OrderedList'; c: [unknown, PandocBlock[][]] }
  | { t: 'BulletList'; c: PandocBlock[][] }
  | { t: 'DefinitionList'; c: [PandocInline[], PandocBlock[][]][] }
  | { t: 'Header'; c: [number, PandocAttr, PandocInline[]] }
  | { t: 'HorizontalRule' }
  | {
      t: 'Table';
      c: [PandocAttr, PandocCaption, unknown[], PandocTableHead, PandocTableBody[], PandocTableFoot];
    }
  | { t: 'Figure'; c: [PandocAttr, PandocCaption, PandocBlock[]] }
  | { t: 'Div'; c: [PandocAttr, PandocBlock[]] };

export type PandocMetaValue =
  | { t: 'MetaMap'; c: Record<string, PandocMetaValue> }
  | { t: 'MetaList'; c: PandocMetaValue[] }
  | { t: 'MetaBool'; c: boolean }
  | { t: 'MetaString'; c: string }
  | { t: 'MetaInlines'; c: PandocInline[] }
  | { t: 'MetaBlocks'; c: PandocBlock[] };

export interface PandocDocument {
  'pandoc-api-version': number[];
  meta: Record<string, PandocMetaValue>;
  blocks: PandocBlock[];
}

/** Entrada CSL-JSON (subconjunto) produzida por `pandoc -f bibtex -t csljson`. */
export interface CslName {
  family?: string;
  given?: string;
  literal?: string;
}

export interface CslItem {
  id: string;
  type?: string;
  title?: string;
  author?: CslName[];
  editor?: CslName[];
  issued?: { 'date-parts'?: (number | string)[][]; literal?: string };
  accessed?: { 'date-parts'?: (number | string)[][] };
  publisher?: string;
  'publisher-place'?: string;
  'container-title'?: string;
  volume?: string | number;
  issue?: string | number;
  page?: string;
  edition?: string | number;
  DOI?: string;
  URL?: string;
  genre?: string;
}

export type ImportSourceFormat = 'docx' | 'latex' | 'markdown' | 'typst';

/**
 * Resposta de POST /convert do serviço de importação (server/src/convert.ts → ConvertResponse).
 * Mantenha os dois tipos sincronizados.
 */
export interface ConvertResponse {
  format: ImportSourceFormat;
  mainFile: string;
  ast: PandocDocument;
  mathTypst: Record<string, string>;
  media: Record<string, string>;
  bibliography: CslItem[];
  mainSource?: string;
  warnings: string[];
}
