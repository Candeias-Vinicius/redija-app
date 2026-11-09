// =====================================================================
// RedijaApp — Matriz de Capacidades por Template & Campos Preservados
// =====================================================================

import { DocumentMetadata, DocumentProject, ProjectTemplateType } from '@/types/document';
import {
  ConfigurableFieldId,
  IdentificacaoFieldId,
  METADATA_FIELD_REGISTRY,
  PosTextualFieldId,
  PreTextualFieldId,
  getDefaultFieldIdsForTemplate,
  resolveVisibleFieldSet,
} from './fieldRegistry';

export type {
  IdentificacaoFieldId,
  PreTextualFieldId,
  PosTextualFieldId,
  ConfigurableFieldId,
};

export type LinterStatusMode = 'abnt_active' | 'abnt_modified' | 'non_abnt';

export type ContextualGuideMode = 'abnt' | 'ieee' | 'sbc' | 'poster' | 'general';

export interface TemplateProfile {
  isAbntFamily: boolean;
  supportsSidebarFieldPdfSync: boolean;
  defaultBadge: string;
  modifiedBadge: string;
  headerTitle: string;
  headerSubtitle: string;
  identificacaoTitle: string;
}

export interface TemplateCapabilities extends TemplateProfile {
  effectiveType: ProjectTemplateType;
  isModified: boolean;
  isSidebarCustomized: boolean;
  badgeLabel: string;
  baseFieldIds: ConfigurableFieldId[];
  visibleFieldIds: ConfigurableFieldId[];
  identificacaoFields: IdentificacaoFieldId[];
  preTextualFields: PreTextualFieldId[];
  posTextualFields: PosTextualFieldId[];
  showPreTextuals: boolean;
  showResumoSection: boolean;
  resumoFields: {
    resumo: boolean;
    keywords: boolean;
    foreignAbstract: boolean;
  };
  showPostTextuals: boolean;
  showAbntLinter: boolean;
  linterStatusMode: LinterStatusMode;
  showAbntGuide: boolean;
  guideMode: ContextualGuideMode;
  guideLabel: string;
}

export interface PreservedFieldInfo {
  id: keyof DocumentMetadata;
  label: string;
  preview: string;
  kind: 'text' | 'boolean' | 'list';
}

/**
 * Mapa declarativo de perfis de capacidade por tipo de template (OCP).
 */
const TEMPLATE_PROFILES: Record<ProjectTemplateType, TemplateProfile> = {
  tcc: {
    isAbntFamily: true,
    supportsSidebarFieldPdfSync: true,
    defaultBadge: 'NBR 14724',
    modifiedBadge: 'ABNT Modificado',
    headerTitle: 'Estrutura ABNT (NBR 14724)',
    headerSubtitle: 'Capa, pré-textuais, resumo e referências.',
    identificacaoTitle: 'Capa & Folha de Rosto',
  },
  relatorio: {
    isAbntFamily: true,
    supportsSidebarFieldPdfSync: true,
    defaultBadge: 'NBR 10719',
    modifiedBadge: 'ABNT Modificado',
    headerTitle: 'Relatório Técnico (NBR 10719)',
    headerSubtitle: 'Capa, pré-textuais, resumo e referências.',
    identificacaoTitle: 'Capa & Folha de Rosto',
  },
  projeto_pesquisa: {
    isAbntFamily: true,
    supportsSidebarFieldPdfSync: true,
    defaultBadge: 'NBR 15287',
    modifiedBadge: 'ABNT Modificado',
    headerTitle: 'Projeto de Pesquisa (NBR 15287)',
    headerSubtitle: 'Capa, pré-textuais, resumo e referências.',
    identificacaoTitle: 'Capa & Folha de Rosto',
  },
  artigo: {
    isAbntFamily: true,
    supportsSidebarFieldPdfSync: true,
    defaultBadge: 'NBR 6022',
    modifiedBadge: 'ABNT Modificado',
    headerTitle: 'Artigo Científico (NBR 6022)',
    headerSubtitle: 'Identificação, resumo, referências e pós-textuais.',
    identificacaoTitle: 'Identificação do Artigo',
  },
  sbc: {
    isAbntFamily: false,
    supportsSidebarFieldPdfSync: false,
    defaultBadge: 'SBC',
    modifiedBadge: 'SBC Modificado',
    headerTitle: 'Artigo SBC',
    headerSubtitle: 'Cabeçalho SBC, resumo bilíngue e referências.',
    identificacaoTitle: 'Identificação do Artigo (SBC)',
  },
  ieee: {
    isAbntFamily: false,
    supportsSidebarFieldPdfSync: false,
    defaultBadge: 'IEEE',
    modifiedBadge: 'IEEE Modificado',
    headerTitle: 'Artigo IEEE Conference',
    headerSubtitle: 'Identificação, abstract, index terms e referências.',
    identificacaoTitle: 'Identificação do Artigo (IEEE)',
  },
  poster: {
    isAbntFamily: false,
    supportsSidebarFieldPdfSync: false,
    defaultBadge: 'Pôster A0/A1',
    modifiedBadge: 'Pôster Modificado',
    headerTitle: 'Pôster Acadêmico',
    headerSubtitle: 'Cabeçalho do banner, formato A0/A1 e referências.',
    identificacaoTitle: 'Cabeçalho do Pôster',
  },
  universe_custom: {
    isAbntFamily: false,
    supportsSidebarFieldPdfSync: false,
    defaultBadge: 'Typst Universe',
    modifiedBadge: 'Typst Universe',
    headerTitle: 'Typst Universe',
    headerSubtitle: 'Metadados compatíveis com o pacote externo.',
    identificacaoTitle: 'Metadados do Pacote',
  },
  em_branco: {
    isAbntFamily: false,
    supportsSidebarFieldPdfSync: true,
    defaultBadge: 'Documento Livre',
    modifiedBadge: 'Livre Modificado',
    headerTitle: 'Documento Livre',
    headerSubtitle: 'Metadados básicos, corpo e referências.',
    identificacaoTitle: 'Metadados Básicos',
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

function resolveGuideMeta(
  isAbntFamily: boolean,
  effectiveType: ProjectTemplateType,
  isApaPreset: boolean,
): { guideMode: ContextualGuideMode; guideLabel: string } {
  if (isAbntFamily) {
    return { guideMode: 'abnt', guideLabel: 'Guia de Normas ABNT' };
  }
  if (!isApaPreset) {
    if (effectiveType === 'ieee') {
      return { guideMode: 'ieee', guideLabel: 'Diretrizes de Publicação IEEE' };
    }
    if (effectiveType === 'sbc') {
      return { guideMode: 'sbc', guideLabel: 'Manual de Submissão SBC' };
    }
    if (effectiveType === 'poster') {
      return { guideMode: 'poster', guideLabel: 'Boas Práticas de Pôster Científico' };
    }
  }
  return { guideMode: 'general', guideLabel: 'Dicas de Diagramação e Boas Práticas' };
}

/**
 * Retorna as capacidades e metadados de exibição para o projeto atual,
 * mesclando o perfil padrão do template com customizações de campos em `sidebarConfig`.
 */
export function getTemplateCapabilities(project: DocumentProject): TemplateCapabilities {
  const effectiveType = resolveEffectiveTemplateType(project);
  const preset = project.templateConfig?.preset;
  const profile = TEMPLATE_PROFILES[effectiveType];

  const isApaPreset = preset === 'apa_7';
  const isAbntFamily = profile.isAbntFamily && !isApaPreset;
  const isSidebarCustomized = Boolean(project.sidebarConfig?.isCustomized);
  const isModified =
    (preset === 'custom' && effectiveType !== 'em_branco') || isSidebarCustomized;

  let badgeLabel = isModified ? profile.modifiedBadge : profile.defaultBadge;
  if (isAbntFamily && !isModified && preset === 'abnt_2023') {
    badgeLabel = 'NBR 10520:2023';
  } else if (isApaPreset) {
    badgeLabel = isSidebarCustomized ? 'APA 7ª Modificada' : 'APA 7ª Ed.';
  }

  const headerTitle = isApaPreset ? 'Estrutura Acadêmica (APA 7)' : profile.headerTitle;
  const headerSubtitle = isApaPreset
    ? 'Identificação, abstract e referências APA.'
    : profile.headerSubtitle;

  const baseFieldIds = getDefaultFieldIdsForTemplate(effectiveType);
  const visibleSet = resolveVisibleFieldSet(baseFieldIds, project.sidebarConfig);

  const visibleFieldIds: ConfigurableFieldId[] = [];
  const identificacaoFields: IdentificacaoFieldId[] = [];
  const preTextualFields: PreTextualFieldId[] = [];
  const posTextualFields: PosTextualFieldId[] = [];

  for (const def of METADATA_FIELD_REGISTRY) {
    if (!visibleSet.has(def.id)) continue;
    visibleFieldIds.push(def.id);
    if (def.category === 'identificacao') {
      identificacaoFields.push(def.id as IdentificacaoFieldId);
    } else if (def.category === 'pre_textual') {
      preTextualFields.push(def.id as PreTextualFieldId);
    } else if (def.category === 'pos_textual') {
      posTextualFields.push(def.id as PosTextualFieldId);
    }
  }

  const resumoFields = {
    resumo: visibleSet.has('abstract'),
    keywords: visibleSet.has('keywords'),
    foreignAbstract: visibleSet.has('foreignAbstract'),
  };

  const showPreTextuals = preTextualFields.length > 0;
  const showResumoSection =
    resumoFields.resumo || resumoFields.keywords || resumoFields.foreignAbstract;
  const showPostTextuals = posTextualFields.length > 0;

  const showAbntLinter = isAbntFamily && !isModified;
  const linterStatusMode: LinterStatusMode = showAbntLinter
    ? 'abnt_active'
    : isAbntFamily
      ? 'abnt_modified'
      : 'non_abnt';

  const { guideMode, guideLabel } = resolveGuideMeta(isAbntFamily, effectiveType, isApaPreset);

  return {
    ...profile,
    effectiveType,
    isAbntFamily,
    isModified,
    isSidebarCustomized,
    badgeLabel,
    headerTitle,
    headerSubtitle,
    baseFieldIds,
    visibleFieldIds,
    identificacaoFields,
    preTextualFields,
    posTextualFields,
    showPreTextuals,
    showResumoSection,
    resumoFields,
    showPostTextuals,
    showAbntLinter,
    linterStatusMode,
    showAbntGuide: isAbntFamily,
    guideMode,
    guideLabel,
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
 * Identifica metadados preenchidos que estão ocultos na vista atual do template/sidebar,
 * garantindo transparência e zero perda de dados ao alternar modelos ou ocultar campos.
 */
export function getPreservedHiddenFields(
  project: DocumentProject,
  capabilities: TemplateCapabilities,
): PreservedFieldInfo[] {
  const m = project.metadata;
  const hidden: PreservedFieldInfo[] = [];
  const visibleSet = new Set<ConfigurableFieldId>(capabilities.visibleFieldIds);

  const checkText = (fieldId: ConfigurableFieldId, id: keyof DocumentMetadata, label: string, val?: string) => {
    if (!visibleSet.has(fieldId) && isMeaningfulString(id, val)) {
      hidden.push({ id, label, preview: val!.trim(), kind: 'text' });
    }
  };

  checkText('title', 'title', 'Título do Trabalho', m.title);
  checkText('subtitle', 'subtitle', 'Subtítulo', m.subtitle);
  checkText('author', 'author', 'Autor', m.author);
  checkText('advisor', 'advisor', 'Orientador(a)', m.advisor);
  checkText('coadvisor', 'coadvisor', 'Coorientador(a)', m.coadvisor);
  checkText('nature', 'nature', 'Natureza do Trabalho', m.nature);
  checkText('institution', 'institution', 'Instituição', m.institution);
  checkText('course', 'course', 'Curso / Departamento', m.course);
  checkText('location', 'location', 'Cidade / Local', m.location);
  checkText('year', 'year', 'Ano', m.year);

  if (!visibleSet.has('includeApprovalPage') && m.includeApprovalPage) {
    hidden.push({
      id: 'includeApprovalPage',
      label: 'Folha de Aprovação (Banca)',
      preview: m.approvalDate ? `Data: ${m.approvalDate}` : 'Habilitada',
      kind: 'boolean',
    });
  }
  if (!visibleSet.has('includeFiguresList') && m.includeFiguresList) {
    hidden.push({ id: 'includeFiguresList', label: 'Lista de Ilustrações', preview: 'Habilitada', kind: 'boolean' });
  }
  if (!visibleSet.has('includeBoxesList') && m.includeBoxesList) {
    hidden.push({ id: 'includeBoxesList', label: 'Lista de Quadros', preview: 'Habilitada', kind: 'boolean' });
  }
  if (!visibleSet.has('includeTablesList') && m.includeTablesList) {
    hidden.push({ id: 'includeTablesList', label: 'Lista de Tabelas', preview: 'Habilitada', kind: 'boolean' });
  }
  checkText('dedicatory', 'dedicatory', 'Dedicatória', m.dedicatory);
  checkText('acknowledgments', 'acknowledgments', 'Agradecimentos', m.acknowledgments);
  checkText('epigraph', 'epigraph', 'Epígrafe', m.epigraph);
  checkText('abbreviations', 'abbreviations', 'Lista de Abreviaturas e Siglas', m.abbreviations);
  checkText('symbols', 'symbols', 'Lista de Símbolos', m.symbols);

  if (!visibleSet.has('abstract')) {
    checkText('abstract', 'abstract', 'Resumo', m.abstract);
  }
  if (!visibleSet.has('keywords')) {
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
  if (!visibleSet.has('foreignAbstract')) {
    checkText('foreignAbstract', 'foreignAbstract', 'Abstract (Inglês)', m.foreignAbstract);
  }

  checkText('glossary', 'glossary', 'Glossário', m.glossary);
  checkText('appendices', 'appendices', 'Apêndices', m.appendices);
  checkText('annexes', 'annexes', 'Anexos', m.annexes);

  return hidden;
}
