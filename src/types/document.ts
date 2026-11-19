export type BlockType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'unnumbered_heading'
  | 'paragraph'
  | 'quote_long'
  | 'equation'
  | 'code'
  | 'raw_typst'
  | 'image'
  | 'table'
  | 'box'
  | 'footnote'
  | 'pagebreak'
  | 'bullet'
  | 'numbered';

export type ImageGridLayout = 'auto' | 'row' | 'grid_2x2' | 'stack';

export interface SubImageItem {
  id: string;
  dataUrl: string;
  mime?: string;
  label?: string;
}

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  updatedAt?: number;
  meta?: {
    author?: string;
    year?: string;
    page?: string;
    caption?: string;
    source?: string;
    url?: string;
    imageDataUrl?: string;
    imageMime?: string;
    imageWidthPct?: 50 | 75 | 100;
    imageLayout?: ImageGridLayout;
    subImages?: SubImageItem[];
    headers?: string[];
    rows?: string[][];
    language?: string;
    equationNumbered?: boolean;
  };
}

export interface DocumentMetadata {
  title: string;
  subtitle?: string;
  author: string;
  advisor: string;
  coadvisor?: string;
  nature?: string;
  institution: string;
  course: string;
  location: string;
  year: string;
  abstract: string;
  keywords: string[];
  // Folha de Aprovação (NBR 14724)
  includeApprovalPage?: boolean;
  approvalDate?: string;
  committeeMembers?: string[];
  // Elementos pré-textuais opcionais (NBR 14724)
  dedicatory?: string;
  acknowledgments?: string;
  epigraph?: string;
  epigraphAuthor?: string;
  foreignAbstract?: string;
  foreignKeywords?: string[];
  includeFiguresList?: boolean;
  includeTablesList?: boolean;
  includeBoxesList?: boolean;
  // Lista de Abreviaturas, Siglas e Símbolos (pré-textuais) e Glossário / Apêndices / Anexos (pós-textuais)
  abbreviations?: string;
  symbols?: string;
  glossary?: string;
  appendices?: string;
  annexes?: string;
  // Brasão / Logotipo da Instituição na capa (Data URL)
  institutionLogoDataUrl?: string;
}

export type NormPresetId =
  | 'abnt_classic'
  | 'abnt_2023'
  | 'article_1col'
  | 'article_2col'
  | 'apa_7'
  | 'sbc'
  | 'ieee'
  | 'poster'
  | 'universe_custom'
  | 'custom';

export type FontFamilyId =
  | 'serif'
  | 'sans'
  | 'libertinus'
  | 'new_cm'
  | 'lora'
  | 'eb_garamond'
  | 'inter'
  | 'roboto'
  | 'fira_sans'
  | 'jetbrains_mono'
  | 'custom';

export type CitationFormat =
  | 'abnt_upper'
  | 'abnt_titlecase'
  | 'ieee_numeric'
  | 'superscript'
  | 'author_date';

export type ReferenceHighlight = 'bold' | 'italic' | 'underline' | 'none';
export type ReferenceAlignment = 'left' | 'justify';
export type ReferenceSpacing = 'single_blank' | 'compact' | 'double';

export type PaperSize = 'a4' | 'letter' | 'a5';
export type PageOrientation = 'portrait' | 'landscape';
export type DocumentLanguage = 'pt' | 'en' | 'es';
export type BodyAlignment = 'justify' | 'left';
export type PageNumberingPosition = 'top_right' | 'bottom_center' | 'bottom_right' | 'none';
export type HeadingNumberingStyle = '1.1' | 'I.A' | '1.' | 'none';
export type ReferenceOrdering = 'alphabetical' | 'citation_order';
export type ReferenceEntryFormat = 'auto' | 'abnt' | 'apa' | 'ieee';
export type BibliographyEngine = 'redija_custom' | 'typst_csl';
export type CslStyle =
  | 'associacao-brasileira-de-normas-tecnicas'
  | 'apa'
  | 'ieee'
  | 'chicago-author-date'
  | 'vancouver'
  | 'harvard-cite-them-right';

export interface TemplateConfig {
  preset: NormPresetId;
  fontFamily: FontFamilyId;
  customFontFamily?: string;
  fontSizePt: number;
  lineSpacing: '1.5' | '1.0' | '2.0';
  paragraphIndentCm: number;
  marginTopCm: number;
  marginLeftCm: number;
  marginBottomCm: number;
  marginRightCm: number;
  columns: 1 | 2 | 3;
  includeCoverPage: boolean;
  includeTitlePage: boolean;
  includeToc: boolean;
  citationStyle: 'uppercase' | 'titlecase';
  citationFormat?: CitationFormat;
  referenceHighlight: ReferenceHighlight;
  referenceAlignment?: ReferenceAlignment;
  referenceSpacing?: ReferenceSpacing;

  // Paridade Tipográfica e de Página (Typst)
  bodyAlignment?: BodyAlignment;
  paragraphSpacingEm?: number;
  paperSize?: PaperSize;
  pageOrientation?: PageOrientation;
  documentLanguage?: DocumentLanguage;
  pageNumbering?: PageNumberingPosition;
  hideFirstPageNumber?: boolean;
  romanPreTextual?: boolean;
  runningHeader?: string;
  headingNumbering?: HeadingNumberingStyle;
  h1PageBreak?: boolean;

  // Engine e Formatação Multi-Norma da Bibliografia
  referenceOrdering?: ReferenceOrdering;
  referenceEntryFormat?: ReferenceEntryFormat;
  bibliographyEngine?: BibliographyEngine;
  cslStyle?: CslStyle;

  // Configurações Específicas de Pôster Acadêmico A0/A1
  posterDimensions?: 'a0' | 'a1' | 'a2';
  posterOrientation?: 'portrait' | 'landscape';
  posterColumns?: 2 | 3;
  posterTheme?: 'emerald' | 'blue' | 'classic_dark' | 'clean';

  // Configurações de Conexão com o Typst Universe
  universePackage?: string;
  universeEntrypoint?: string;
  /**
   * O que o RedijaApp leu do pacote (exemplo do modelo e assinatura da função de entrada).
   * Fica no projeto para o documento compilar igual em outro aparelho, sem reler o pacote.
   */
  universeProfile?: UniverseTemplateProfile;
  /** Valores dos campos próprios do modelo (painel "Configuração do modelo"), por argumento. */
  universeOverrides?: Record<string, string | boolean | number>;
  /** Código do topo editado à mão no painel "Configuração do modelo"; substitui o gerado. */
  universeCustomHeader?: string;
}

/**
 * Tipo de modelo pelo `categories` do `typst.toml`: documento (paper, thesis, report e
 * outros), apresentação, currículo, pôster/flyer, ou pacote sem `[template]` (biblioteca).
 */
export type UniverseTemplateKind = 'document' | 'presentation' | 'cv' | 'poster' | 'library';

/** Forma da regra `#show` do exemplo: `f.with(...)`, `doc => f(..., doc)`, `f(...)` ou `f`. */
export type UniverseShowForm = 'with' | 'closure' | 'factory' | 'bare';

/** Página pré-textual que o modelo monta com uma chamada própria, ex.: `#abstract[...]`. */
export type UniverseFrontField = 'abstract' | 'foreignAbstract' | 'dedication' | 'acknowledgments' | 'epigraph';

export interface UniverseFrontCall {
  /** Chamada sem o bloco de conteúdo, ex.: `#title-slide()` ou `#abstract(lang: "en")`. */
  call: string;
  /** Campo do trabalho que vai no bloco de conteúdo; ausente nas chamadas sem conteúdo. */
  field?: UniverseFrontField;
}

export interface UniverseTemplateProfile {
  /** Versão do analisador que gerou o perfil (perfis antigos são refeitos). */
  version: number;
  /** Pacote analisado, ex.: `@preview/modern-usp-thesis:0.2.0`. */
  packageId: string;
  kind: UniverseTemplateKind;
  categories: string[];
  /** Versão mínima do Typst declarada no `typst.toml` (`compiler`). */
  compiler?: string;
  /** Função de entrada (ex.: `thesis`, `ppgsi.thesis`). */
  entry?: string;
  form?: UniverseShowForm;
  /** Nome do corpo nas regras `doc => f(..., doc)`. */
  bodyVar?: string;
  /** Trecho do exemplo antes da regra `#show` (imports, `#let`, `#set`), sem comentários. */
  preamble?: string;
  /** Regra `#show` do exemplo, como está no arquivo. */
  showRule?: string;
  /**
   * Chamadas que o exemplo faz logo depois do `#show`, antes do primeiro título: capa ou
   * slide de título (repetidas como estão) e páginas com texto (resumo, dedicatória...),
   * que recebem o texto do trabalho no lugar do texto de exemplo.
   */
  frontCalls?: UniverseFrontCall[];
  /** Assinatura da função de entrada: nomes dos parâmetros. */
  signature?: { named: string[]; positional: string[]; sink: boolean };
}

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  preset: 'abnt_classic',
  fontFamily: 'serif',
  fontSizePt: 12,
  lineSpacing: '1.5',
  paragraphIndentCm: 1.25,
  marginTopCm: 3,
  marginLeftCm: 3,
  marginBottomCm: 2,
  marginRightCm: 2,
  columns: 1,
  includeCoverPage: true,
  includeTitlePage: true,
  includeToc: true,
  citationStyle: 'titlecase',
  citationFormat: 'abnt_titlecase',
  referenceHighlight: 'bold',
  referenceAlignment: 'left',
  referenceSpacing: 'single_blank',
};

export type ReferenceType = 'book' | 'article' | 'thesis' | 'website' | 'legislation';

export interface AcademicReference {
  id: string;
  type?: ReferenceType;
  authors: string;
  title: string;
  subtitle?: string;
  edition?: string;
  city: string;
  publisher: string;
  year: string;
  // Campos adicionais NBR 6023
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  institution?: string;
  degree?: string;
  url?: string;
  accessDate?: string;
  doi?: string;
}

export type ProjectTemplateType =
  | 'tcc'
  | 'artigo'
  | 'relatorio'
  | 'projeto_pesquisa'
  | 'em_branco'
  | 'sbc'
  | 'ieee'
  | 'poster'
  | 'universe_custom';

export interface SidebarConfig {
  isCustomized?: boolean;
  enabledFieldIds?: string[];
  hiddenFieldIds?: string[];
}

/**
 * Estado da lixeira de um projeto em relação ao Google Drive:
 * - `pending-trash`: está na lixeira local, mas o Drive ainda não confirmou o envio à lixeira.
 * - `pending-restore`: foi restaurado localmente, mas o Drive ainda não confirmou a restauração.
 * - `local-only`: a lixeira só vale neste dispositivo (ex.: arquivo compartilhado por outra pessoa).
 * - `synced`: está na lixeira local E o Drive confirmou que o arquivo está na lixeira dele.
 *   Só nesse estado um arquivo ativo no Drive significa "restaurado em outro dispositivo".
 */
export type DriveTrashSyncState = 'pending-trash' | 'pending-restore' | 'local-only' | 'synced';

export interface DocumentProject {
  id: string;
  name: string;
  templateType?: ProjectTemplateType;
  templateConfig?: TemplateConfig;
  sidebarConfig?: SidebarConfig;
  metadata: DocumentMetadata;
  blocks: Block[];
  references: AcademicReference[];
  updatedAt: string;
  deletedAt?: string | null;
  /** Ausente/`null` quando a lixeira local e o Drive estão de acordo. */
  driveTrashSync?: DriveTrashSyncState | null;

  // Gestão de Usuário e Google Drive Sync
  ownerEmail?: string;
  driveFileId?: string;
  driveSyncedAt?: string;
  isSharedWithMe?: boolean;
  sharedBy?: {
    name?: string;
    email?: string;
    photoLink?: string;
  };
}

export interface RedijaBackupFile {
  version: 1;
  exportedAt: string;
  project: DocumentProject;
}
