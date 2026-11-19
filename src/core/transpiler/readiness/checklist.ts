// =====================================================================
// RedijaApp — Checklist "Pronto para Entregar" (RDJ-05.2, RDJ-05.3, RDJ-05.4)
// =====================================================================

import { DEFAULT_TEMPLATE_CONFIG, DocumentProject } from '@/types/document';
import { TemplateCapabilities } from '@/core/templates/templateCapabilities';
import { auditCitationsAndReferences, countWords } from '../abntLinter';
import { DocumentLintReport, LinterWarning } from '../linters/types';
import { calculateComplianceScore, ComplianceScoreResult } from './score';

export type ReadinessGroupId =
  | 'estrutura'
  | 'conteudo'
  | 'citacoes_referencias'
  | 'formatacao';

export const READINESS_GROUP_LABELS: Record<ReadinessGroupId, string> = {
  estrutura: 'Estrutura',
  conteudo: 'Conteúdo',
  citacoes_referencias: 'Citações e referências',
  formatacao: 'Formatação',
};

export const READINESS_GROUP_ORDER: readonly ReadinessGroupId[] = [
  'estrutura',
  'conteudo',
  'citacoes_referencias',
  'formatacao',
] as const;

export type ChecklistNavigationTarget =
  | { kind: 'block'; blockId: string }
  | { kind: 'sidebar-field'; elementId: string }
  | { kind: 'references'; referenceId?: string }
  | { kind: 'customizer' };

export interface ChecklistItem {
  id: string;
  group: ReadinessGroupId;
  title: string;
  description: string;
  status: 'ok' | 'pending' | 'reminder';
  /** Peso na nota: structural (-15), warning (-5), info (-1), none (0). */
  impact: 'structural' | 'warning' | 'info' | 'none';
  target?: ChecklistNavigationTarget;
  externalUrl?: string;
}

export interface ReadinessGroupSummary {
  id: ReadinessGroupId;
  label: string;
  items: ChecklistItem[];
  pendingCount: number;
  okCount: number;
  reminderCount: number;
}

export interface ReadinessReport {
  scoreResult: ComplianceScoreResult;
  groups: ReadinessGroupSummary[];
  allItems: ChecklistItem[];
  pendingCount: number;
  isReadyToDeliver: boolean;
}

/**
 * Extensão opcional para modelos institucionais (RDJ-02), permitindo
 * adicionar itens estruturais, limites customizados ou lembrete de ficha catalográfica
 * sem alterar o código das regras base.
 */
export interface InstitutionalChecklistExtension {
  institutionName: string;
  institutionAcronym?: string;
  abstractMinWords?: number;
  abstractMaxWords?: number;
  requireCatalogCard?: boolean;
  catalogCardUrl?: string;
  extraItems?: (project: DocumentProject) => ChecklistItem[];
}

function getEffectiveCfg(project: DocumentProject) {
  return {
    ...DEFAULT_TEMPLATE_CONFIG,
    ...(project.templateConfig ?? {}),
  };
}

function getNonEmptyKeywords(project: DocumentProject): string[] {
  return (project.metadata.keywords ?? []).map((k) => k.trim()).filter(Boolean);
}

/**
 * Monta o relatório completo "Pronto para Entregar" combinando:
 * - Checklist estrutural contextual por tipo de trabalho e norma (RDJ-05.2);
 * - Auditoria de citações órfãs e referências não citadas sem duplicação (RDJ-05.3);
 * - Demais avisos dos linters ativos agrupados por categoria (RDJ-05.4);
 * - Nota consolidada de 0 a 100 (RDJ-05.1).
 */
export function buildReadinessReport(
  project: DocumentProject,
  capabilities: TemplateCapabilities,
  lintReport: DocumentLintReport,
  institutionalExtension?: InstitutionalChecklistExtension,
): ReadinessReport {
  const items: ChecklistItem[] = [];
  const handledLintIds = new Set<string>();
  const effectiveType = capabilities.effectiveType;
  const cfg = getEffectiveCfg(project);
  const m = project.metadata;

  const isAbntMonograph =
    capabilities.isAbntFamily &&
    (effectiveType === 'tcc' || effectiveType === 'relatorio' || effectiveType === 'projeto_pesquisa');
  const isAbntTcc = capabilities.isAbntFamily && effectiveType === 'tcc';
  const isAbntArticle = capabilities.isAbntFamily && effectiveType === 'artigo';

  // -------------------------------------------------------------------
  // 1. Checklist Estrutural por Norma e Tipo de Trabalho (RDJ-05.2)
  // -------------------------------------------------------------------
  if (isAbntMonograph) {
    // Capa
    const hasCover = Boolean(cfg.includeCoverPage) && Boolean(m.title?.trim()) && Boolean(m.author?.trim());
    items.push({
      id: 'struct-cover',
      group: 'estrutura',
      title: 'Capa',
      description: hasCover
        ? 'Capa habilitada com título e autor preenchidos.'
        : 'Ative a capa e preencha título e autor na seção de identificação.',
      status: hasCover ? 'ok' : 'pending',
      impact: hasCover ? 'none' : 'structural',
      target: { kind: 'sidebar-field', elementId: 'sb-id-titulo-do-trabalho' },
    });

    // Folha de rosto
    const hasTitlePage = Boolean(cfg.includeTitlePage) && Boolean(m.nature?.trim());
    items.push({
      id: 'struct-title-page',
      group: 'estrutura',
      title: 'Folha de rosto',
      description: hasTitlePage
        ? 'Folha de rosto habilitada com natureza do trabalho preenchida.'
        : 'Ative a folha de rosto e preencha a natureza do trabalho.',
      status: hasTitlePage ? 'ok' : 'pending',
      impact: hasTitlePage ? 'none' : 'structural',
      target: { kind: 'sidebar-field', elementId: 'sb-id-natureza-do-trabalho-folha-de-rosto' },
    });

    // Folha de aprovação (obrigatória em TCC / Dissertação / Tese — NBR 14724)
    if (isAbntTcc) {
      const hasApproval = Boolean(m.includeApprovalPage);
      items.push({
        id: 'struct-approval-page',
        group: 'estrutura',
        title: 'Folha de aprovação',
        description: hasApproval
          ? 'Folha de aprovação ativada nos elementos pré-textuais.'
          : 'Ative a Folha de Aprovação (obrigatória na NBR 14724 para TCC, dissertação e tese).',
        status: hasApproval ? 'ok' : 'pending',
        impact: hasApproval ? 'none' : 'structural',
        target: { kind: 'sidebar-field', elementId: 'sb-pre-folha-de-aprovacao' },
      });
    }

    // Resumo (NBR 6028: 150 a 500 palavras)
    const minAbs = institutionalExtension?.abstractMinWords ?? 150;
    const maxAbs = institutionalExtension?.abstractMaxWords ?? 500;
    const absWords = countWords(m.abstract);
    const absOk = absWords >= minAbs && absWords <= maxAbs;
    handledLintIds.add('abstract-empty');
    handledLintIds.add('abstract-length');
    items.push({
      id: 'struct-abstract',
      group: 'conteudo',
      title: 'Resumo (NBR 6028)',
      description:
        absWords === 0
          ? 'Preencha o resumo em parágrafo único na barra lateral.'
          : absOk
            ? `Resumo dentro da faixa recomendada (${absWords} palavras).`
            : `O resumo deve ter entre ${minAbs} e ${maxAbs} palavras (atual: ${absWords}).`,
      status: absOk ? 'ok' : 'pending',
      impact: absOk ? 'none' : absWords === 0 ? 'structural' : 'info',
      target: { kind: 'sidebar-field', elementId: 'sb-abs-resumo' },
    });

    // Abstract em língua estrangeira (obrigatório em TCC — NBR 14724)
    if (isAbntTcc) {
      const hasForeignAbs = Boolean(m.foreignAbstract?.trim());
      items.push({
        id: 'struct-foreign-abstract',
        group: 'conteudo',
        title: 'Abstract (língua estrangeira)',
        description: hasForeignAbs
          ? 'Resumo em língua estrangeira preenchido.'
          : 'Preencha o Abstract em inglês (ou segundo idioma) conforme a NBR 14724.',
        status: hasForeignAbs ? 'ok' : 'pending',
        impact: hasForeignAbs ? 'none' : 'structural',
        target: { kind: 'sidebar-field', elementId: 'sb-abs-abstract-lingua-estrangeira-opcional' },
      });
    }

    // Palavras-chave (3 a 5)
    const kws = getNonEmptyKeywords(project);
    const kwsOk = kws.length >= 3 && kws.length <= 5;
    handledLintIds.add('keywords-empty');
    items.push({
      id: 'struct-keywords',
      group: 'conteudo',
      title: 'Palavras-chave',
      description: kwsOk
        ? `${kws.length} palavras-chave informadas.`
        : `Informe de 3 a 5 palavras-chave (atual: ${kws.length}).`,
      status: kwsOk ? 'ok' : 'pending',
      impact: kwsOk ? 'none' : 'warning',
      target: { kind: 'sidebar-field', elementId: 'sb-abs-campo' },
    });

    // Sumário
    const hasToc = Boolean(cfg.includeToc);
    items.push({
      id: 'struct-toc',
      group: 'estrutura',
      title: 'Sumário',
      description: hasToc
        ? 'Sumário automático ativado.'
        : 'Ative o Sumário nas configurações de estrutura do modelo.',
      status: hasToc ? 'ok' : 'pending',
      impact: hasToc ? 'none' : 'structural',
      target: { kind: 'customizer' },
    });

    // Referências (obrigatório em TCC; opcional em relatório/projeto se não houver citações)
    if (isAbntTcc) {
      const hasRefs = (project.references?.length ?? 0) > 0;
      handledLintIds.add('references-empty');
      items.push({
        id: 'struct-references',
        group: 'citacoes_referencias',
        title: 'Referências',
        description: hasRefs
          ? `${project.references.length} referência(s) cadastrada(s).`
          : 'Cadastre ao menos uma referência bibliográfica conforme a NBR 6023.',
        status: hasRefs ? 'ok' : 'pending',
        impact: hasRefs ? 'none' : 'structural',
        target: { kind: 'references' },
      });
    } else {
      // Relatório e Projeto de Pesquisa sem referências não devem gerar falso positivo no starter
      if ((project.references?.length ?? 0) === 0) {
        handledLintIds.add('references-empty');
      }
    }
  } else if (isAbntArticle) {
    // Artigo Científico ABNT (NBR 6022)
    const hasId = Boolean(m.title?.trim()) && Boolean(m.author?.trim());
    items.push({
      id: 'struct-article-id',
      group: 'estrutura',
      title: 'Título e autoria do artigo',
      description: hasId
        ? 'Título e autoria preenchidos.'
        : 'Preencha o título e o nome do autor na barra lateral.',
      status: hasId ? 'ok' : 'pending',
      impact: hasId ? 'none' : 'structural',
      target: { kind: 'sidebar-field', elementId: 'sb-id-titulo-do-trabalho' },
    });

    const minAbs = institutionalExtension?.abstractMinWords ?? 100;
    const maxAbs = institutionalExtension?.abstractMaxWords ?? 250;
    const absWords = countWords(m.abstract);
    const absOk = absWords >= minAbs && absWords <= maxAbs;
    handledLintIds.add('abstract-empty');
    handledLintIds.add('abstract-length');
    items.push({
      id: 'struct-abstract',
      group: 'conteudo',
      title: 'Resumo do artigo (NBR 6028)',
      description:
        absWords === 0
          ? 'Preencha o resumo do artigo na barra lateral.'
          : absOk
            ? `Resumo dentro da faixa de artigos (${absWords} palavras).`
            : `O resumo deve ter entre ${minAbs} e ${maxAbs} palavras (atual: ${absWords}).`,
      status: absOk ? 'ok' : 'pending',
      impact: absOk ? 'none' : absWords === 0 ? 'structural' : 'info',
      target: { kind: 'sidebar-field', elementId: 'sb-abs-resumo' },
    });

    const kws = getNonEmptyKeywords(project);
    const kwsOk = kws.length >= 3 && kws.length <= 5;
    handledLintIds.add('keywords-empty');
    items.push({
      id: 'struct-keywords',
      group: 'conteudo',
      title: 'Palavras-chave',
      description: kwsOk
        ? `${kws.length} palavras-chave informadas.`
        : `Informe de 3 a 5 palavras-chave (atual: ${kws.length}).`,
      status: kwsOk ? 'ok' : 'pending',
      impact: kwsOk ? 'none' : 'warning',
      target: { kind: 'sidebar-field', elementId: 'sb-abs-campo' },
    });

    const hasRefs = (project.references?.length ?? 0) > 0;
    handledLintIds.add('references-empty');
    items.push({
      id: 'struct-references',
      group: 'citacoes_referencias',
      title: 'Referências',
      description: hasRefs
        ? `${project.references.length} referência(s) cadastrada(s).`
        : 'Adicione ao menos uma referência bibliográfica ao artigo.',
      status: hasRefs ? 'ok' : 'pending',
      impact: hasRefs ? 'none' : 'structural',
      target: { kind: 'references' },
    });
  } else if (effectiveType === 'ieee') {
    const hasId = Boolean(m.title?.trim()) && Boolean(m.author?.trim());
    items.push({
      id: 'struct-ieee-id',
      group: 'estrutura',
      title: 'Título e autores (IEEE)',
      description: hasId ? 'Identificação preenchida.' : 'Informe título e autor(es) do artigo IEEE.',
      status: hasId ? 'ok' : 'pending',
      impact: hasId ? 'none' : 'structural',
      target: { kind: 'sidebar-field', elementId: 'sb-id-titulo-do-trabalho' },
    });

    const absWords = countWords(m.abstract);
    const hasAbs = absWords > 0;
    items.push({
      id: 'struct-ieee-abstract',
      group: 'conteudo',
      title: 'Abstract (IEEE)',
      description: hasAbs
        ? `Abstract preenchido (${absWords} palavras).`
        : 'Preencha o Abstract do artigo IEEE.',
      status: hasAbs ? 'ok' : 'pending',
      impact: hasAbs ? 'none' : 'structural',
      target: { kind: 'sidebar-field', elementId: 'sb-abs-resumo' },
    });

    const kws = getNonEmptyKeywords(project);
    items.push({
      id: 'struct-ieee-keywords',
      group: 'conteudo',
      title: 'Index Terms (IEEE)',
      description:
        kws.length > 0
          ? `${kws.length} Index Terms informados.`
          : 'Informe os Index Terms do artigo IEEE.',
      status: kws.length > 0 ? 'ok' : 'pending',
      impact: kws.length > 0 ? 'none' : 'warning',
      target: { kind: 'sidebar-field', elementId: 'sb-abs-campo' },
    });

    const hasRefs = (project.references?.length ?? 0) > 0;
    items.push({
      id: 'struct-ieee-refs',
      group: 'citacoes_referencias',
      title: 'References (IEEE)',
      description: hasRefs
        ? `${project.references.length} referência(s) cadastrada(s).`
        : 'Adicione referências bibliográficas ao artigo IEEE.',
      status: hasRefs ? 'ok' : 'pending',
      impact: hasRefs ? 'none' : 'structural',
      target: { kind: 'references' },
    });
  } else if (effectiveType === 'sbc') {
    const hasId = Boolean(m.title?.trim()) && Boolean(m.author?.trim());
    items.push({
      id: 'struct-sbc-id',
      group: 'estrutura',
      title: 'Cabeçalho do artigo (SBC)',
      description: hasId ? 'Título e autoria preenchidos.' : 'Informe título e autor(es) do artigo SBC.',
      status: hasId ? 'ok' : 'pending',
      impact: hasId ? 'none' : 'structural',
      target: { kind: 'sidebar-field', elementId: 'sb-id-titulo-do-trabalho' },
    });

    const hasResumo = countWords(m.abstract) > 0;
    items.push({
      id: 'struct-sbc-resumo',
      group: 'conteudo',
      title: 'Resumo (SBC)',
      description: hasResumo ? 'Resumo preenchido.' : 'Preencha o Resumo em português.',
      status: hasResumo ? 'ok' : 'pending',
      impact: hasResumo ? 'none' : 'structural',
      target: { kind: 'sidebar-field', elementId: 'sb-abs-resumo' },
    });

    const hasAbstract = Boolean(m.foreignAbstract?.trim());
    items.push({
      id: 'struct-sbc-abstract',
      group: 'conteudo',
      title: 'Abstract (SBC)',
      description: hasAbstract ? 'Abstract preenchido.' : 'Preencha o Abstract em inglês.',
      status: hasAbstract ? 'ok' : 'pending',
      impact: hasAbstract ? 'none' : 'structural',
      target: { kind: 'sidebar-field', elementId: 'sb-abs-abstract-lingua-estrangeira-opcional' },
    });

    const hasRefs = (project.references?.length ?? 0) > 0;
    items.push({
      id: 'struct-sbc-refs',
      group: 'citacoes_referencias',
      title: 'Referências (SBC)',
      description: hasRefs
        ? `${project.references.length} referência(s) cadastrada(s).`
        : 'Cadastre as referências bibliográficas do artigo SBC.',
      status: hasRefs ? 'ok' : 'pending',
      impact: hasRefs ? 'none' : 'structural',
      target: { kind: 'references' },
    });
  } else if (effectiveType === 'poster') {
    const hasHeader =
      Boolean(m.title?.trim()) && Boolean(m.author?.trim()) && Boolean(m.institution?.trim());
    items.push({
      id: 'struct-poster-header',
      group: 'estrutura',
      title: 'Cabeçalho do Pôster',
      description: hasHeader
        ? 'Título, autor e instituição preenchidos.'
        : 'Preencha título, autor e instituição para o banner.',
      status: hasHeader ? 'ok' : 'pending',
      impact: hasHeader ? 'none' : 'structural',
      target: { kind: 'sidebar-field', elementId: 'sb-id-titulo-do-trabalho' },
    });

    const hasBlocks = project.blocks.some((b) => countWords(b.content) > 0 || b.type === 'image');
    items.push({
      id: 'struct-poster-content',
      group: 'conteudo',
      title: 'Conteúdo do Pôster',
      description: hasBlocks
        ? 'Seções e elementos preenchidos.'
        : 'Adicione conteúdo ao pôster antes de exportar.',
      status: hasBlocks ? 'ok' : 'pending',
      impact: hasBlocks ? 'none' : 'structural',
    });
  } else {
    // Documento livre (em_branco), APA ou Typst Universe
    const hasId = Boolean(m.title?.trim()) && Boolean(m.author?.trim());
    items.push({
      id: 'struct-basic-id',
      group: 'estrutura',
      title: 'Título e autoria',
      description: hasId ? 'Identificação básica preenchida.' : 'Informe título e autor do documento.',
      status: hasId ? 'ok' : 'pending',
      impact: hasId ? 'none' : 'structural',
      target: { kind: 'sidebar-field', elementId: 'sb-id-titulo-do-trabalho' },
    });
  }

  // -------------------------------------------------------------------
  // 2. Figuras, Tabelas e Quadros sem legenda ou fonte (RDJ-05.2 Cenário 5)
  // -------------------------------------------------------------------
  if (capabilities.isAbntFamily) {
    let allVisualsComplete = true;
    let hasAnyVisual = false;
    project.blocks.forEach((b, idx) => {
      if (b.type === 'image' || b.type === 'table' || b.type === 'box') {
        hasAnyVisual = true;
        const label = b.type === 'image' ? 'Figura' : b.type === 'box' ? 'Quadro' : 'Tabela';
        const missingCaption = !b.meta?.caption?.trim();
        const missingSource = !b.meta?.source?.trim();
        if (missingCaption || missingSource) {
          allVisualsComplete = false;
          const lintId = b.type === 'image' ? `fig-meta-${b.id}` : `tbl-meta-${b.id}`;
          handledLintIds.add(lintId);
          const missingDesc =
            missingCaption && missingSource
              ? 'sem legenda e sem fonte'
              : missingCaption
                ? 'sem legenda'
                : 'sem fonte';
          items.push({
            id: lintId,
            group: 'conteudo',
            title: `${label} no bloco #${idx + 1} ${missingDesc}`,
            description: `Pela NBR 14724, todo(a) ${label.toLowerCase()} deve informar título/legenda na parte superior e fonte na parte inferior.`,
            status: 'pending',
            impact: 'warning',
            target: { kind: 'block', blockId: b.id },
          });
        }
      }
    });
    if (hasAnyVisual && allVisualsComplete) {
      items.push({
        id: 'struct-visuals-ok',
        group: 'conteudo',
        title: 'Figuras, tabelas e quadros',
        description: 'Todas as ilustrações, tabelas e quadros possuem legenda e fonte.',
        status: 'ok',
        impact: 'none',
      });
    }
  }

  // -------------------------------------------------------------------
  // 3. Lembrete de Ficha Catalográfica & Extensões Institucionais (RDJ-05.2 Cenário 7)
  // -------------------------------------------------------------------
  if (institutionalExtension?.requireCatalogCard || institutionalExtension?.catalogCardUrl) {
    items.push({
      id: 'reminder-catalog-card',
      group: 'estrutura',
      title: 'Lembrete: Ficha catalográfica',
      description: `O manual da ${institutionalExtension.institutionName} prevê ficha catalográfica no verso da folha de rosto. Gere-a no sistema da biblioteca (não desconta da nota).`,
      status: 'reminder',
      impact: 'none',
      externalUrl: institutionalExtension.catalogCardUrl,
    });
  }

  if (institutionalExtension?.extraItems) {
    items.push(...institutionalExtension.extraItems(project));
  }

  // -------------------------------------------------------------------
  // 4. Citações sem referência & Referências não citadas (RDJ-05.3)
  // -------------------------------------------------------------------
  const activeLintWarnings = lintReport.isPausedAbnt
    ? lintReport.sanityWarnings
    : lintReport.warnings;

  const existingCitationWarnings = activeLintWarnings.filter(
    (w) => w.id.startsWith('missing-ref-') || w.id.startsWith('uncited-ref-'),
  );

  // Reaproveita os avisos do linter ativo sem duplicar; se o linter não verificou
  // referências não citadas (ex.: sanityLinter em modo livre), complementa apenas se houver refs.
  const citationAuditWarnings: LinterWarning[] = [...existingCitationWarnings];
  const seenCitIds = new Set(citationAuditWarnings.map((w) => w.id));

  if (
    !lintReport.isPausedAbnt &&
    effectiveType !== 'em_branco' &&
    effectiveType !== 'poster' &&
    effectiveType !== 'universe_custom' &&
    (project.references?.length ?? 0) > 0
  ) {
    for (const w of auditCitationsAndReferences(project, { checkUncited: true })) {
      if (!seenCitIds.has(w.id)) {
        seenCitIds.add(w.id);
        citationAuditWarnings.push(w);
      }
    }
  }

  for (const w of citationAuditWarnings) {
    handledLintIds.add(w.id);
    const isOrphan = w.id.startsWith('missing-ref-');
    items.push({
      id: w.id,
      group: 'citacoes_referencias',
      title: w.title,
      description: w.description,
      status: 'pending',
      impact: isOrphan ? 'warning' : 'info',
      target: isOrphan
        ? w.blockId
          ? { kind: 'block', blockId: w.blockId }
          : undefined
        : { kind: 'references', referenceId: w.referenceId },
    });
  }

  if (citationAuditWarnings.length === 0) {
    items.push({
      id: 'citations-consistent-ok',
      group: 'citacoes_referencias',
      title: 'Citações e referências',
      description:
        (project.references?.length ?? 0) > 0
          ? 'Todas as citações possuem referência correspondente e todas as referências foram citadas.'
          : 'Nenhuma citação órfã encontrada no documento.',
      status: 'ok',
      impact: 'none',
    });
  }

  // -------------------------------------------------------------------
  // 5. Demais avisos dos linters ativos (Formatação / Conteúdo)
  // -------------------------------------------------------------------
  const seenOtherIds = new Set(items.map((i) => i.id));
  for (const w of activeLintWarnings) {
    if (handledLintIds.has(w.id) || seenOtherIds.has(w.id)) continue;
    // Em documento em branco recém-criado, não sinalizar corpo vazio como erro falso
    if (effectiveType === 'em_branco' && w.id === 'sanity-body-empty') continue;

    seenOtherIds.add(w.id);
    const isFormatting =
      w.id.startsWith('citation-') ||
      w.id.includes('margin') ||
      w.id.includes('format') ||
      w.id.includes('nbr10520');
    items.push({
      id: w.id,
      group: isFormatting ? 'formatacao' : 'conteudo',
      title: w.title,
      description: w.description,
      status: 'pending',
      impact: w.severity === 'warning' ? 'warning' : 'info',
      target: w.blockId
        ? { kind: 'block', blockId: w.blockId }
        : isFormatting
          ? { kind: 'customizer' }
          : undefined,
    });
  }

  // Se não houve nenhum item em Formatação, adiciona item "ok" para dar clareza visual
  if (!items.some((i) => i.group === 'formatacao')) {
    items.push({
      id: 'formatting-ok',
      group: 'formatacao',
      title: 'Regras de formatação da norma',
      description: lintReport.isPausedAbnt
        ? 'Verificação estrita da ABNT pausada pelo usuário.'
        : 'Nenhum desvio de formatação encontrado.',
      status: 'ok',
      impact: 'none',
    });
  }

  // -------------------------------------------------------------------
  // 6. Cálculo da nota (RDJ-05.1) e agrupamento (RDJ-05.4)
  // -------------------------------------------------------------------
  const missingStructuralIds = items
    .filter((i) => i.status === 'pending' && i.impact === 'structural')
    .map((i) => i.id);

  const penaltyWarnings: Array<Pick<LinterWarning, 'id' | 'severity'>> = items
    .filter((i) => i.status === 'pending' && (i.impact === 'warning' || i.impact === 'info'))
    .map((i) => ({
      id: i.id,
      severity: i.impact as 'warning' | 'info',
    }));

  const scoreResult = calculateComplianceScore({
    missingStructuralIds,
    warnings: penaltyWarnings,
    isPaused: lintReport.isPausedAbnt,
  });

  const groups: ReadinessGroupSummary[] = READINESS_GROUP_ORDER.map((groupId) => {
    const groupItems = items.filter((i) => i.group === groupId);
    return {
      id: groupId,
      label: READINESS_GROUP_LABELS[groupId],
      items: groupItems,
      pendingCount: groupItems.filter((i) => i.status === 'pending').length,
      okCount: groupItems.filter((i) => i.status === 'ok').length,
      reminderCount: groupItems.filter((i) => i.status === 'reminder').length,
    };
  });

  const pendingCount = groups.reduce((acc, g) => acc + g.pendingCount, 0);

  return {
    scoreResult,
    groups,
    allItems: items,
    pendingCount,
    isReadyToDeliver: !scoreResult.isPaused && pendingCount === 0,
  };
}
