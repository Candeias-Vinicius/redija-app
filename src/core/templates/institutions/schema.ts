// =====================================================================
// RedijaApp — Schema de Modelos Institucionais (RDJ-02.1)
// =====================================================================

import type {
  NormPresetId,
  ProjectTemplateType,
  TemplateConfig,
} from '@/types/document';
import type { ConfigurableFieldId } from '@/core/templates/fieldRegistry';

export type PreTextualElementId =
  | 'approval_page'
  | 'dedicatory'
  | 'acknowledgments'
  | 'epigraph'
  | 'abstract'
  | 'foreign_abstract'
  | 'figures_list'
  | 'boxes_list'
  | 'tables_list'
  | 'abbreviations'
  | 'symbols'
  | 'toc';

export const DEFAULT_PRE_TEXTUAL_ORDER: readonly PreTextualElementId[] = [
  'approval_page',
  'dedicatory',
  'acknowledgments',
  'epigraph',
  'abstract',
  'foreign_abstract',
  'figures_list',
  'boxes_list',
  'tables_list',
  'abbreviations',
  'symbols',
  'toc',
] as const;

export const VALID_PRE_TEXTUAL_ELEMENTS: ReadonlySet<PreTextualElementId> = new Set(
  DEFAULT_PRE_TEXTUAL_ORDER,
);

export const VALID_BASE_PRESETS: ReadonlySet<NormPresetId> = new Set([
  'abnt_classic',
  'abnt_2023',
  'article_1col',
  'article_2col',
  'apa_7',
  'sbc',
  'ieee',
  'poster',
]);

export const VALID_BASE_TEMPLATE_TYPES: ReadonlySet<ProjectTemplateType> = new Set([
  'tcc',
  'artigo',
  'relatorio',
  'projeto_pesquisa',
  'sbc',
  'ieee',
  'poster',
]);

export type CoverLogoPosition = 'top' | 'above_institution' | 'below_institution';

export interface InstitutionalCoverConfig {
  /** Indica que o manual prevê brasão/logotipo da instituição na capa (enviado pelo usuário). */
  showLogo?: boolean;
  /** Posição do brasão na capa em relação ao nome da instituição. */
  logoPosition?: CoverLogoPosition;
  /** Altura do brasão na capa em centímetros (ex.: 2.2). */
  logoHeightCm?: number;
  /** Nome da instituição em caixa alta (padrão ABNT: true). */
  uppercaseInstitution?: boolean;
  /** Título em caixa alta na capa (padrão ABNT: true). */
  uppercaseTitle?: boolean;
  /** Exibe o curso/unidade abaixo do nome da instituição na capa. */
  showCourse?: boolean;
}

export interface InstitutionalTitlePageConfig {
  /** Largura percentual do bloco da natureza do trabalho (padrão ABNT: 50). */
  natureWidthPct?: number;
  /** Exibe o nome da instituição no topo da folha de rosto. */
  showInstitution?: boolean;
  /** Exibe orientador(a) na nota de natureza. */
  showAdvisor?: boolean;
  /** Exibe coorientador(a) quando preenchido. */
  showCoadvisor?: boolean;
}

export interface InstitutionalDefaultMetadata {
  institution?: string;
  course?: string;
  location?: string;
  nature?: string;
  includeApprovalPage?: boolean;
  includeFiguresList?: boolean;
  includeTablesList?: boolean;
  includeBoxesList?: boolean;
  abstract?: string;
  keywords?: string[];
  foreignAbstract?: string;
  foreignKeywords?: string[];
}

export interface InstitutionalLinterOverrides {
  /** Mínimo de palavras para o resumo (sobrescreve o padrão 150/100 da NBR 6028). */
  abstractMinWords?: number;
  /** Máximo de palavras para o resumo (sobrescreve o padrão 500/250 da NBR 6028). */
  abstractMaxWords?: number;
  /** Exige Folha de Aprovação ativa segundo o manual da instituição. */
  requireApprovalPage?: boolean;
  /** Exige Abstract em língua estrangeira segundo o manual da instituição. */
  requireForeignAbstract?: boolean;
  /** Exige palavras-chave preenchidas. */
  requireKeywords?: boolean;
  /** Nota opcional exibida em avisos específicos da instituição. */
  customRulesNote?: string;
}

export type InstitutionalTemplateConfigOverrides = Partial<
  Omit<TemplateConfig, 'preset' | 'universePackage' | 'universeEntrypoint'>
>;

/**
 * Definição declarativa de um modelo institucional da comunidade (RDJ-02.1).
 * Cada arquivo `.json` em `src/core/templates/institutions/models/` é descoberto
 * automaticamente no build sem registro manual.
 */
export interface InstitutionalTemplateDefinition {
  /** Slug único para URL pública `/modelos/<slug>` (minúsculas, sem acentos, ex.: `ifsp-tcc`). */
  slug: string;
  /** Nome oficial completo da instituição (ex.: "Instituto Federal de São Paulo"). */
  institutionName: string;
  /** Sigla oficial da instituição (ex.: "IFSP"). */
  institutionAcronym: string;
  /** Cidade e UF principais (ex.: "São Paulo / SP"). */
  cityState: string;
  /** Tipos de trabalho cobertos pelo modelo (ex.: ["TCC", "Monografia"]). */
  workTypes: string[];
  /** Nome amigável exibido nos cartões e páginas (ex.: "TCC IFSP"). */
  displayTitle: string;
  /** Descrição curta do modelo e das diretrizes seguidas. */
  description: string;
  /** URL do manual oficial de normalização da instituição. */
  manualUrl: string;
  /** Versão ou ano de publicação do manual oficial (ex.: "2023" ou "4ª ed. (2020)"). */
  manualVersion: string;
  /** Autor(a) ou mantenedor(a) da contribuição. */
  author: string;
  /** Termos alternativos para busca (ex.: cidade, campus, nome antigo). */
  aliases?: string[];
  /** Norma base herdada pelo modelo (ex.: "abnt_classic"). */
  basePreset: NormPresetId;
  /** Tipo de template estrutural base herdado (ex.: "tcc"). */
  baseTemplateType: ProjectTemplateType;
  /** Sobrescritas de configuração tipográfica, margens e estrutura sobre a norma base. */
  templateConfigOverrides?: InstitutionalTemplateConfigOverrides;
  /** Regras de apresentação da capa (incluindo posição e altura do brasão enviado pelo usuário). */
  cover?: InstitutionalCoverConfig;
  /** Regras de apresentação da folha de rosto. */
  titlePage?: InstitutionalTitlePageConfig;
  /** Ordem customizada dos elementos pré-textuais (quando difere da ABNT padrão). */
  preTextualOrder?: PreTextualElementId[];
  /** Metadados iniciais pré-preenchidos ao criar um projeto com este modelo. */
  defaultMetadata?: InstitutionalDefaultMetadata;
  /** Campos considerados obrigatórios pelo manual da instituição (validados nos linters). */
  requiredFields?: ConfigurableFieldId[];
  /** Ajustes de regras dos linters para respeitar o manual institucional. */
  linterOverrides?: InstitutionalLinterOverrides;
}
