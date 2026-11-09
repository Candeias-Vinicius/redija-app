// =====================================================================
// RedijaApp — Catálogo Unificado de Campos de Metadados (Field Registry)
// =====================================================================

import { DocumentMetadata, ProjectTemplateType, SidebarConfig } from '@/types/document';

export type MetadataFieldCategory = 'identificacao' | 'resumo' | 'pre_textual' | 'pos_textual';

export type MetadataFieldInputType = 'text' | 'textarea' | 'checkbox' | 'list';

export type IdentificacaoFieldId =
  | 'title'
  | 'subtitle'
  | 'author'
  | 'advisor'
  | 'coadvisor'
  | 'nature'
  | 'institution'
  | 'course'
  | 'location'
  | 'year';

export type ResumoFieldId = 'abstract' | 'keywords' | 'foreignAbstract';

export type PreTextualFieldId =
  | 'includeApprovalPage'
  | 'includeFiguresList'
  | 'includeBoxesList'
  | 'includeTablesList'
  | 'dedicatory'
  | 'acknowledgments'
  | 'epigraph'
  | 'abbreviations'
  | 'symbols';

export type PosTextualFieldId = 'glossary' | 'appendices' | 'annexes';

export type ConfigurableFieldId =
  | IdentificacaoFieldId
  | ResumoFieldId
  | PreTextualFieldId
  | PosTextualFieldId;

export interface MetadataFieldDefinition {
  id: ConfigurableFieldId;
  metadataKey: keyof DocumentMetadata;
  label: string;
  category: MetadataFieldCategory;
  inputType: MetadataFieldInputType;
  description: string;
  defaultInTemplates: ProjectTemplateType[];
}

export const FIELD_CATEGORY_LABELS: Record<MetadataFieldCategory, string> = {
  identificacao: 'Identificação, Capa & Folha de Rosto',
  resumo: 'Resumo, Abstract & Palavras-chave',
  pre_textual: 'Pré-Textuais & Listas Automáticas (ABNT)',
  pos_textual: 'Elementos Pós-Textuais',
};

const ABNT_MONOGRAPHS: ProjectTemplateType[] = ['tcc', 'relatorio', 'projeto_pesquisa'];

export const METADATA_FIELD_REGISTRY: MetadataFieldDefinition[] = [
  // Identificação
  {
    id: 'title',
    metadataKey: 'title',
    label: 'Título do Trabalho',
    category: 'identificacao',
    inputType: 'text',
    description: 'Título principal exibido na capa, folha de rosto ou cabeçalho do artigo.',
    defaultInTemplates: ['tcc', 'relatorio', 'projeto_pesquisa', 'artigo', 'sbc', 'ieee', 'poster', 'universe_custom', 'em_branco'],
  },
  {
    id: 'subtitle',
    metadataKey: 'subtitle',
    label: 'Subtítulo',
    category: 'identificacao',
    inputType: 'text',
    description: 'Complemento opcional separado por dois-pontos no título.',
    defaultInTemplates: ['tcc', 'relatorio', 'projeto_pesquisa', 'artigo', 'sbc', 'ieee', 'poster', 'em_branco'],
  },
  {
    id: 'author',
    metadataKey: 'author',
    label: 'Nome do Autor',
    category: 'identificacao',
    inputType: 'text',
    description: 'Autor(es) do trabalho ou artigo.',
    defaultInTemplates: ['tcc', 'relatorio', 'projeto_pesquisa', 'artigo', 'sbc', 'ieee', 'poster', 'universe_custom', 'em_branco'],
  },
  {
    id: 'advisor',
    metadataKey: 'advisor',
    label: 'Orientador(a)',
    category: 'identificacao',
    inputType: 'text',
    description: 'Nome e titulação do(a) professor(a) orientador(a).',
    defaultInTemplates: ['tcc', 'relatorio', 'projeto_pesquisa', 'artigo'],
  },
  {
    id: 'coadvisor',
    metadataKey: 'coadvisor',
    label: 'Coorientador(a)',
    category: 'identificacao',
    inputType: 'text',
    description: 'Coorientador(a) acadêmico(a) exibido na folha de rosto e banca.',
    defaultInTemplates: ABNT_MONOGRAPHS,
  },
  {
    id: 'nature',
    metadataKey: 'nature',
    label: 'Natureza do Trabalho (Nota de Rosto)',
    category: 'identificacao',
    inputType: 'textarea',
    description: 'Texto recuado à direita na folha de rosto descrevendo o objetivo acadêmico.',
    defaultInTemplates: ABNT_MONOGRAPHS,
  },
  {
    id: 'institution',
    metadataKey: 'institution',
    label: 'Instituição / Afiliação',
    category: 'identificacao',
    inputType: 'text',
    description: 'Universidade, faculdade ou instituto de vínculo dos autores.',
    defaultInTemplates: ['tcc', 'relatorio', 'projeto_pesquisa', 'artigo', 'sbc', 'ieee', 'poster', 'em_branco'],
  },
  {
    id: 'course',
    metadataKey: 'course',
    label: 'Curso / Departamento',
    category: 'identificacao',
    inputType: 'text',
    description: 'Programa de graduação, pós-graduação ou laboratório.',
    defaultInTemplates: ['tcc', 'relatorio', 'projeto_pesquisa', 'artigo', 'sbc', 'ieee', 'poster'],
  },
  {
    id: 'location',
    metadataKey: 'location',
    label: 'Cidade / Local',
    category: 'identificacao',
    inputType: 'text',
    description: 'Município/UF exibido na base da capa e folha de rosto.',
    defaultInTemplates: ['tcc', 'relatorio', 'projeto_pesquisa', 'artigo', 'sbc', 'ieee', 'poster', 'em_branco'],
  },
  {
    id: 'year',
    metadataKey: 'year',
    label: 'Ano de Depósito',
    category: 'identificacao',
    inputType: 'text',
    description: 'Ano de entrega ou publicação.',
    defaultInTemplates: ['tcc', 'relatorio', 'projeto_pesquisa', 'artigo', 'sbc', 'ieee', 'poster', 'em_branco'],
  },

  // Resumo & Keywords
  {
    id: 'abstract',
    metadataKey: 'abstract',
    label: 'Resumo (Vernáculo / Principal)',
    category: 'resumo',
    inputType: 'textarea',
    description: 'Resumo em parágrafo único antes do texto principal.',
    defaultInTemplates: ['tcc', 'relatorio', 'projeto_pesquisa', 'artigo', 'sbc', 'ieee', 'universe_custom', 'em_branco'],
  },
  {
    id: 'keywords',
    metadataKey: 'keywords',
    label: 'Palavras-chave / Index Terms',
    category: 'resumo',
    inputType: 'list',
    description: 'Descritores temáticos separados por vírgula.',
    defaultInTemplates: ['tcc', 'relatorio', 'projeto_pesquisa', 'artigo', 'sbc', 'ieee'],
  },
  {
    id: 'foreignAbstract',
    metadataKey: 'foreignAbstract',
    label: 'Abstract & Keywords (Língua Estrangeira)',
    category: 'resumo',
    inputType: 'textarea',
    description: 'Versão em inglês (ou segundo idioma) com respectivas palavras-chave.',
    defaultInTemplates: ['tcc', 'relatorio', 'projeto_pesquisa', 'artigo', 'sbc', 'ieee'],
  },

  // Pré-textuais ABNT
  {
    id: 'includeApprovalPage',
    metadataKey: 'includeApprovalPage',
    label: 'Folha de Aprovação (Banca Examinadora)',
    category: 'pre_textual',
    inputType: 'checkbox',
    description: 'Página formal pós-folha de rosto com data e linhas de assinatura.',
    defaultInTemplates: ABNT_MONOGRAPHS,
  },
  {
    id: 'includeFiguresList',
    metadataKey: 'includeFiguresList',
    label: 'Lista de Ilustrações Automática',
    category: 'pre_textual',
    inputType: 'checkbox',
    description: 'Índice automático numerado de figuras e gráficos.',
    defaultInTemplates: ABNT_MONOGRAPHS,
  },
  {
    id: 'includeBoxesList',
    metadataKey: 'includeBoxesList',
    label: 'Lista de Quadros Automática',
    category: 'pre_textual',
    inputType: 'checkbox',
    description: 'Índice automático separado para quadros textuais.',
    defaultInTemplates: ABNT_MONOGRAPHS,
  },
  {
    id: 'includeTablesList',
    metadataKey: 'includeTablesList',
    label: 'Lista de Tabelas Automática',
    category: 'pre_textual',
    inputType: 'checkbox',
    description: 'Índice automático para tabelas estatísticas IBGE/ABNT.',
    defaultInTemplates: ABNT_MONOGRAPHS,
  },
  {
    id: 'dedicatory',
    metadataKey: 'dedicatory',
    label: 'Dedicatória',
    category: 'pre_textual',
    inputType: 'textarea',
    description: 'Página dedicada a homenagem pessoal alinhada à base.',
    defaultInTemplates: ABNT_MONOGRAPHS,
  },
  {
    id: 'acknowledgments',
    metadataKey: 'acknowledgments',
    label: 'Agradecimentos',
    category: 'pre_textual',
    inputType: 'textarea',
    description: 'Página formal de agradecimentos a pessoas e agências de fomento.',
    defaultInTemplates: ABNT_MONOGRAPHS,
  },
  {
    id: 'epigraph',
    metadataKey: 'epigraph',
    label: 'Epígrafe & Autoria',
    category: 'pre_textual',
    inputType: 'textarea',
    description: 'Citação inspiradora exibida antes do resumo ou abertura.',
    defaultInTemplates: ABNT_MONOGRAPHS,
  },
  {
    id: 'abbreviations',
    metadataKey: 'abbreviations',
    label: 'Lista de Abreviaturas e Siglas',
    category: 'pre_textual',
    inputType: 'textarea',
    description: 'Relação alfabética de siglas técnicas empregadas no documento.',
    defaultInTemplates: ABNT_MONOGRAPHS,
  },
  {
    id: 'symbols',
    metadataKey: 'symbols',
    label: 'Lista de Símbolos',
    category: 'pre_textual',
    inputType: 'textarea',
    description: 'Símbolos matemáticos e unidades de medida.',
    defaultInTemplates: ABNT_MONOGRAPHS,
  },

  // Pós-textuais
  {
    id: 'glossary',
    metadataKey: 'glossary',
    label: 'Glossário',
    category: 'pos_textual',
    inputType: 'textarea',
    description: 'Definição de termos técnicos após as referências.',
    defaultInTemplates: ['tcc', 'relatorio', 'projeto_pesquisa', 'artigo', 'em_branco'],
  },
  {
    id: 'appendices',
    metadataKey: 'appendices',
    label: 'Apêndices',
    category: 'pos_textual',
    inputType: 'textarea',
    description: 'Documentos suplementares elaborados pelo próprio autor.',
    defaultInTemplates: ['tcc', 'relatorio', 'projeto_pesquisa', 'artigo', 'em_branco'],
  },
  {
    id: 'annexes',
    metadataKey: 'annexes',
    label: 'Anexos',
    category: 'pos_textual',
    inputType: 'textarea',
    description: 'Documentos comprobatórios ou de autoria de terceiros.',
    defaultInTemplates: ['tcc', 'relatorio', 'projeto_pesquisa', 'artigo', 'em_branco'],
  },
];

export const VALID_CONFIGURABLE_FIELD_IDS: ReadonlySet<ConfigurableFieldId> = new Set(
  METADATA_FIELD_REGISTRY.map((f) => f.id),
);

export const FIELD_DEFINITION_MAP = new Map<ConfigurableFieldId, MetadataFieldDefinition>(
  METADATA_FIELD_REGISTRY.map((f) => [f.id, f]),
);

export function getFieldsByCategory(): Record<MetadataFieldCategory, MetadataFieldDefinition[]> {
  return {
    identificacao: METADATA_FIELD_REGISTRY.filter((f) => f.category === 'identificacao'),
    resumo: METADATA_FIELD_REGISTRY.filter((f) => f.category === 'resumo'),
    pre_textual: METADATA_FIELD_REGISTRY.filter((f) => f.category === 'pre_textual'),
    pos_textual: METADATA_FIELD_REGISTRY.filter((f) => f.category === 'pos_textual'),
  };
}

export function getDefaultFieldIdsForTemplate(
  templateType: ProjectTemplateType,
): ConfigurableFieldId[] {
  return METADATA_FIELD_REGISTRY.filter((f) =>
    f.defaultInTemplates.includes(templateType),
  ).map((f) => f.id);
}

export function resolveVisibleFieldSet(
  baseFieldIds: ConfigurableFieldId[],
  sidebarConfig?: SidebarConfig,
): Set<ConfigurableFieldId> {
  const visible = new Set<ConfigurableFieldId>(baseFieldIds);

  if (sidebarConfig?.enabledFieldIds) {
    for (const id of sidebarConfig.enabledFieldIds) {
      if (VALID_CONFIGURABLE_FIELD_IDS.has(id as ConfigurableFieldId)) {
        visible.add(id as ConfigurableFieldId);
      }
    }
  }

  if (sidebarConfig?.hiddenFieldIds) {
    for (const id of sidebarConfig.hiddenFieldIds) {
      visible.delete(id as ConfigurableFieldId);
    }
  }

  return visible;
}

/**
 * Gera um `SidebarConfig` compacto em forma de diff relativo aos padrões do template.
 * Se o conjunto escolhido coincidir 100% com o padrão do modelo, retorna `undefined`
 * para sair do estado "Modificado" automaticamente.
 */
export function buildSidebarConfigFromSelection(
  baseFieldIds: ConfigurableFieldId[],
  selectedFieldIds: Set<ConfigurableFieldId>,
): SidebarConfig | undefined {
  const baseSet = new Set<ConfigurableFieldId>(baseFieldIds);
  const enabledFieldIds: string[] = [];
  const hiddenFieldIds: string[] = [];

  for (const def of METADATA_FIELD_REGISTRY) {
    const inBase = baseSet.has(def.id);
    const isSelected = selectedFieldIds.has(def.id);
    if (!inBase && isSelected) {
      enabledFieldIds.push(def.id);
    } else if (inBase && !isSelected) {
      hiddenFieldIds.push(def.id);
    }
  }

  if (enabledFieldIds.length === 0 && hiddenFieldIds.length === 0) {
    return undefined;
  }

  const config: SidebarConfig = { isCustomized: true };
  if (enabledFieldIds.length > 0) config.enabledFieldIds = enabledFieldIds;
  if (hiddenFieldIds.length > 0) config.hiddenFieldIds = hiddenFieldIds;
  return config;
}
