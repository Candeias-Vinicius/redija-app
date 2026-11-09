// =====================================================================
// RedijaApp — Matriz de Capacidades por Template & Campos Preservados
// =====================================================================

import { DocumentMetadata, DocumentProject, ProjectTemplateType } from '@/types/document';

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

export type LinterStatusMode = 'abnt_active' | 'abnt_modified' | 'non_abnt';

export interface TemplateProfile {
  isAbntFamily: boolean;
  defaultBadge: string;
  modifiedBadge: string;
  headerTitle: string;
  headerSubtitle: string;
  identificacaoTitle: string;
  identificacaoFields: IdentificacaoFieldId[];
  showPreTextuals: boolean;
  showResumoSection: boolean;
  resumoFields: {
    resumo: boolean;
    keywords: boolean;
    foreignAbstract: boolean;
  };
  showPostTextuals: boolean;
}

export interface TemplateCapabilities extends TemplateProfile {
  effectiveType: ProjectTemplateType;
  isModified: boolean;
  badgeLabel: string;
  showAbntLinter: boolean;
  linterStatusMode: LinterStatusMode;
  showAbntGuide: boolean;
}

export interface PreservedFieldInfo {
  id: keyof DocumentMetadata;
  label: string;
  preview: string;
  kind: 'text' | 'boolean' | 'list';
}

const ALL_IDENTIFICACAO_FIELDS: IdentificacaoFieldId[] = [
  'title',
  'subtitle',
  'author',
  'advisor',
  'coadvisor',
  'nature',
  'institution',
  'course',
  'location',
  'year',
];

const ARTICLE_IDENTIFICACAO_FIELDS: IdentificacaoFieldId[] = [
  'title',
  'subtitle',
  'author',
  'institution',
  'course',
  'location',
  'year',
];

/**
 * Mapa declarativo de perfis de capacidade por tipo de template (OCP).
 * Alinhado com os parâmetros realmente consumidos pelo transpiler Typst.
 */
const TEMPLATE_PROFILES: Record<ProjectTemplateType, TemplateProfile> = {
  tcc: {
    isAbntFamily: true,
    defaultBadge: 'NBR 14724',
    modifiedBadge: 'ABNT Modificado',
    headerTitle: 'Estrutura ABNT (NBR 14724)',
    headerSubtitle: 'Capa, pré-textuais, resumo e referências.',
    identificacaoTitle: 'Capa & Folha de Rosto',
    identificacaoFields: ALL_IDENTIFICACAO_FIELDS,
    showPreTextuals: true,
    showResumoSection: true,
    resumoFields: { resumo: true, keywords: true, foreignAbstract: true },
    showPostTextuals: true,
  },
  relatorio: {
    isAbntFamily: true,
    defaultBadge: 'NBR 10719',
    modifiedBadge: 'ABNT Modificado',
    headerTitle: 'Relatório Técnico (NBR 10719)',
    headerSubtitle: 'Capa, pré-textuais, resumo e referências.',
    identificacaoTitle: 'Capa & Folha de Rosto',
    identificacaoFields: ALL_IDENTIFICACAO_FIELDS,
    showPreTextuals: true,
    showResumoSection: true,
    resumoFields: { resumo: true, keywords: true, foreignAbstract: true },
    showPostTextuals: true,
  },
  projeto_pesquisa: {
    isAbntFamily: true,
    defaultBadge: 'NBR 15287',
    modifiedBadge: 'ABNT Modificado',
    headerTitle: 'Projeto de Pesquisa (NBR 15287)',
    headerSubtitle: 'Capa, pré-textuais, resumo e referências.',
    identificacaoTitle: 'Capa & Folha de Rosto',
    identificacaoFields: ALL_IDENTIFICACAO_FIELDS,
    showPreTextuals: true,
    showResumoSection: true,
    resumoFields: { resumo: true, keywords: true, foreignAbstract: true },
    showPostTextuals: true,
  },
  artigo: {
    isAbntFamily: true,
    defaultBadge: 'NBR 6022',
    modifiedBadge: 'ABNT Modificado',
    headerTitle: 'Artigo Científico (NBR 6022)',
    headerSubtitle: 'Identificação, resumo, referências e pós-textuais.',
    identificacaoTitle: 'Identificação do Artigo',
    identificacaoFields: ['title', 'subtitle', 'author', 'advisor', 'institution', 'course', 'location', 'year'],
    showPreTextuals: false,
    showResumoSection: true,
    resumoFields: { resumo: true, keywords: true, foreignAbstract: true },
    showPostTextuals: true,
  },
  sbc: {
    isAbntFamily: false,
    defaultBadge: 'SBC',
    modifiedBadge: 'SBC Modificado',
    headerTitle: 'Artigo SBC',
    headerSubtitle: 'Cabeçalho SBC, resumo bilíngue e referências.',
    identificacaoTitle: 'Identificação do Artigo (SBC)',
    identificacaoFields: ARTICLE_IDENTIFICACAO_FIELDS,
    showPreTextuals: false,
    showResumoSection: true,
    resumoFields: { resumo: true, keywords: true, foreignAbstract: true },
    showPostTextuals: false,
  },
  ieee: {
    isAbntFamily: false,
    defaultBadge: 'IEEE',
    modifiedBadge: 'IEEE Modificado',
    headerTitle: 'Artigo IEEE Conference',
    headerSubtitle: 'Identificação, abstract, index terms e referências.',
    identificacaoTitle: 'Identificação do Artigo (IEEE)',
    identificacaoFields: ARTICLE_IDENTIFICACAO_FIELDS,
    showPreTextuals: false,
    showResumoSection: true,
    resumoFields: { resumo: true, keywords: true, foreignAbstract: true },
    showPostTextuals: false,
  },
  poster: {
    isAbntFamily: false,
    defaultBadge: 'Pôster A0/A1',
    modifiedBadge: 'Pôster Modificado',
    headerTitle: 'Pôster Acadêmico',
    headerSubtitle: 'Cabeçalho do banner, formato A0/A1 e referências.',
    identificacaoTitle: 'Cabeçalho do Pôster',
    identificacaoFields: ARTICLE_IDENTIFICACAO_FIELDS,
    showPreTextuals: false,
    showResumoSection: false,
    resumoFields: { resumo: false, keywords: false, foreignAbstract: false },
    showPostTextuals: false,
  },
  universe_custom: {
    isAbntFamily: false,
    defaultBadge: 'Typst Universe',
    modifiedBadge: 'Typst Universe',
    headerTitle: 'Typst Universe',
    headerSubtitle: 'Metadados compatíveis com o pacote externo.',
    identificacaoTitle: 'Metadados do Pacote',
    identificacaoFields: ['title', 'author'],
    showPreTextuals: false,
    showResumoSection: true,
    resumoFields: { resumo: true, keywords: false, foreignAbstract: false },
    showPostTextuals: false,
  },
  em_branco: {
    isAbntFamily: false,
    defaultBadge: 'Documento Livre',
    modifiedBadge: 'Livre Modificado',
    headerTitle: 'Documento Livre',
    headerSubtitle: 'Metadados básicos, corpo e referências.',
    identificacaoTitle: 'Metadados Básicos',
    identificacaoFields: ['title', 'subtitle', 'author', 'institution', 'location', 'year'],
    showPreTextuals: false,
    showResumoSection: true,
    resumoFields: { resumo: true, keywords: false, foreignAbstract: false },
    showPostTextuals: true,
  },
};

/**
 * Resolve o template efetivo considerando `templateConfig.preset` e `templateType`.
 */
export function resolveEffectiveTemplateType(project: DocumentProject): ProjectTemplateType {
  const preset = project.templateConfig?.preset;
  if (
    preset === 'sbc' ||
    preset === 'ieee' ||
    preset === 'poster' ||
    preset === 'universe_custom'
  ) {
    return preset;
  }
  return project.templateType ?? 'tcc';
}

/**
 * Retorna as capacidades e metadados de exibição para o projeto atual.
 */
export function getTemplateCapabilities(project: DocumentProject): TemplateCapabilities {
  const effectiveType = resolveEffectiveTemplateType(project);
  const preset = project.templateConfig?.preset;
  const profile = TEMPLATE_PROFILES[effectiveType];

  const isApaPreset = preset === 'apa_7';
  const isAbntFamily = profile.isAbntFamily && !isApaPreset;
  const isModified =
    (preset === 'custom' && effectiveType !== 'em_branco') ||
    Boolean(project.sidebarConfig?.isCustomized);

  let badgeLabel = isModified ? profile.modifiedBadge : profile.defaultBadge;
  if (isAbntFamily && !isModified && preset === 'abnt_2023') {
    badgeLabel = 'NBR 10520:2023';
  } else if (isApaPreset) {
    badgeLabel = 'APA 7ª Ed.';
  }

  const headerTitle = isApaPreset ? 'Estrutura Acadêmica (APA 7)' : profile.headerTitle;
  const headerSubtitle = isApaPreset
    ? 'Identificação, abstract e referências APA.'
    : profile.headerSubtitle;

  const showAbntLinter = isAbntFamily && !isModified;
  const linterStatusMode: LinterStatusMode = showAbntLinter
    ? 'abnt_active'
    : isAbntFamily
      ? 'abnt_modified'
      : 'non_abnt';

  return {
    ...profile,
    effectiveType,
    isAbntFamily,
    isModified,
    badgeLabel,
    headerTitle,
    headerSubtitle,
    showAbntLinter,
    linterStatusMode,
    showAbntGuide: isAbntFamily,
  };
}

const BOILERPLATE_DEFAULTS: Partial<Record<keyof DocumentMetadata, ReadonlySet<string>>> = {
  advisor: new Set([
    'Prof. Dr. Nome do Orientador',
    'Prof. Dr. Supervisor',
    'Prof. Dr. Orientador Pretendido',
    'Prof. Orientador',
  ]),
  nature: new Set([
    'Artigo científico submetido ao Curso de Graduação como requisito avaliativo.',
    'Pôster acadêmico apresentado no Simpósio de Pesquisa e Iniciação Científica.',
  ]),
  institution: new Set(['Universidade / Instituição', 'Nome da Instituição de Ensino']),
  location: new Set(['São Paulo', 'Cidade - UF']),
};

function isMeaningfulString(field: keyof DocumentMetadata, val?: string): boolean {
  const trimmed = (val ?? '').trim();
  if (!trimmed) return false;
  const boilerplateSet = BOILERPLATE_DEFAULTS[field];
  return !(boilerplateSet && boilerplateSet.has(trimmed));
}

/**
 * Identifica metadados preenchidos que estão ocultos na vista primária do template ativo,
 * garantindo transparência e zero perda de dados ao alternar entre modelos.
 */
export function getPreservedHiddenFields(
  project: DocumentProject,
  capabilities: TemplateCapabilities,
): PreservedFieldInfo[] {
  const m = project.metadata;
  const hidden: PreservedFieldInfo[] = [];
  const visibleIdSet = new Set<string>(capabilities.identificacaoFields);

  const checkText = (visible: boolean, id: keyof DocumentMetadata, label: string, val?: string) => {
    if (!visible && isMeaningfulString(id, val)) {
      hidden.push({ id, label, preview: val!.trim(), kind: 'text' });
    }
  };

  checkText(visibleIdSet.has('subtitle'), 'subtitle', 'Subtítulo', m.subtitle);
  checkText(visibleIdSet.has('advisor'), 'advisor', 'Orientador(a)', m.advisor);
  checkText(visibleIdSet.has('coadvisor'), 'coadvisor', 'Coorientador(a)', m.coadvisor);
  checkText(visibleIdSet.has('nature'), 'nature', 'Natureza do Trabalho', m.nature);
  checkText(visibleIdSet.has('institution'), 'institution', 'Instituição', m.institution);
  checkText(visibleIdSet.has('course'), 'course', 'Curso / Departamento', m.course);
  checkText(visibleIdSet.has('location'), 'location', 'Cidade / Local', m.location);
  checkText(visibleIdSet.has('year'), 'year', 'Ano', m.year);

  if (!capabilities.showPreTextuals) {
    if (m.includeApprovalPage) {
      hidden.push({
        id: 'includeApprovalPage',
        label: 'Folha de Aprovação (Banca)',
        preview: m.approvalDate ? `Data: ${m.approvalDate}` : 'Habilitada',
        kind: 'boolean',
      });
    }
    if (m.includeFiguresList) {
      hidden.push({ id: 'includeFiguresList', label: 'Lista de Ilustrações', preview: 'Habilitada', kind: 'boolean' });
    }
    if (m.includeBoxesList) {
      hidden.push({ id: 'includeBoxesList', label: 'Lista de Quadros', preview: 'Habilitada', kind: 'boolean' });
    }
    if (m.includeTablesList) {
      hidden.push({ id: 'includeTablesList', label: 'Lista de Tabelas', preview: 'Habilitada', kind: 'boolean' });
    }
    checkText(false, 'dedicatory', 'Dedicatória', m.dedicatory);
    checkText(false, 'acknowledgments', 'Agradecimentos', m.acknowledgments);
    checkText(false, 'epigraph', 'Epígrafe', m.epigraph);
    checkText(false, 'abbreviations', 'Lista de Abreviaturas e Siglas', m.abbreviations);
    checkText(false, 'symbols', 'Lista de Símbolos', m.symbols);
  }

  if (!capabilities.resumoFields.resumo) {
    checkText(false, 'abstract', 'Resumo', m.abstract);
  }
  if (!capabilities.resumoFields.keywords) {
    const kws = (m.keywords ?? []).map((k) => k.trim()).filter(Boolean);
    const isPosterDefault =
      capabilities.effectiveType === 'poster' &&
      kws.join(',') === 'Pôster,Iniciação Científica,Inovação,Pesquisa';
    const isUniverseDefault =
      capabilities.effectiveType === 'universe_custom' &&
      kws.join(',') === 'Typst Universe,Template Comunitário';

    if (kws.length > 0 && !isPosterDefault && !isUniverseDefault) {
      hidden.push({ id: 'keywords', label: 'Palavras-chave', preview: kws.join(', '), kind: 'list' });
    }
  }
  if (!capabilities.resumoFields.foreignAbstract) {
    checkText(false, 'foreignAbstract', 'Abstract (Inglês)', m.foreignAbstract);
  }

  if (!capabilities.showPostTextuals) {
    checkText(false, 'glossary', 'Glossário', m.glossary);
    checkText(false, 'appendices', 'Apêndices', m.appendices);
    checkText(false, 'annexes', 'Anexos', m.annexes);
  }

  return hidden;
}
