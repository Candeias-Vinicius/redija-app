// =====================================================================
// RedijaApp — Regras de Linter para Modelos Institucionais (RDJ-02.3)
// =====================================================================

import { DocumentProject } from '@/types/document';
import {
  getInstitutionalTemplateBySlug,
  InstitutionalTemplateDefinition,
} from '@/core/templates/institutions';
import { LinterWarning } from './types';

const REQUIRED_TEXT_FIELDS: Record<
  string,
  { key: keyof DocumentProject['metadata']; label: string }
> = {
  title: { key: 'title', label: 'Título do Trabalho' },
  author: { key: 'author', label: 'Nome do Autor' },
  advisor: { key: 'advisor', label: 'Orientador(a)' },
  coadvisor: { key: 'coadvisor', label: 'Coorientador(a)' },
  nature: { key: 'nature', label: 'Natureza do Trabalho' },
  institution: { key: 'institution', label: 'Instituição' },
  course: { key: 'course', label: 'Curso / Departamento' },
  location: { key: 'location', label: 'Cidade / Local' },
  year: { key: 'year', label: 'Ano' },
  dedicatory: { key: 'dedicatory', label: 'Dedicatória' },
  acknowledgments: { key: 'acknowledgments', label: 'Agradecimentos' },
  epigraph: { key: 'epigraph', label: 'Epígrafe' },
  abbreviations: { key: 'abbreviations', label: 'Lista de Abreviaturas e Siglas' },
  symbols: { key: 'symbols', label: 'Lista de Símbolos' },
};

/**
 * Resolve o modelo institucional associado ao projeto (quando houver).
 */
export function resolveProjectInstitutionalModel(
  project: DocumentProject,
  overrideModel?: InstitutionalTemplateDefinition | null,
): InstitutionalTemplateDefinition | undefined {
  if (overrideModel) return overrideModel;
  return getInstitutionalTemplateBySlug(project.institutionalTemplateSlug);
}

/**
 * Avalia exigências específicas do manual institucional (ex.: folha de aprovação obrigatória,
 * abstract em língua estrangeira obrigatório, campos obrigatórios de identificação).
 * Não gera falsos positivos quando o modelo sobrescreve margens ou tipografia da norma base.
 */
export function runInstitutionalLinterRules(
  project: DocumentProject,
  model?: InstitutionalTemplateDefinition | null,
): LinterWarning[] {
  const resolved = resolveProjectInstitutionalModel(project, model);
  if (!resolved) return [];

  const warnings: LinterWarning[] = [];
  const manualRef = `manual da ${resolved.institutionName} (${resolved.institutionAcronym}, ${resolved.manualVersion})`;
  const requiredSet = new Set(resolved.requiredFields ?? []);
  const overrides = resolved.linterOverrides ?? {};

  // Folha de Aprovação obrigatória
  if (
    (overrides.requireApprovalPage || requiredSet.has('includeApprovalPage')) &&
    !project.metadata.includeApprovalPage
  ) {
    warnings.push({
      id: 'institutional-required-approval-page',
      severity: 'warning',
      title: `Folha de aprovação obrigatória (${resolved.institutionAcronym})`,
      description: `O ${manualRef} exige a inclusão da Folha de Aprovação. Ative-a na barra lateral em Pré-textuais.`,
    });
  }

  // Abstract em língua estrangeira obrigatório
  if (
    (overrides.requireForeignAbstract || requiredSet.has('foreignAbstract')) &&
    !(project.metadata.foreignAbstract ?? '').trim()
  ) {
    warnings.push({
      id: 'institutional-required-foreign-abstract',
      severity: 'warning',
      title: `Abstract obrigatório (${resolved.institutionAcronym})`,
      description: `O ${manualRef} exige o resumo em língua estrangeira (Abstract). Preencha-o na seção Resumo da barra lateral.`,
    });
  }

  // Outros campos textuais declarados como obrigatórios pelo modelo institucional
  for (const fieldId of requiredSet) {
    const spec = REQUIRED_TEXT_FIELDS[fieldId];
    if (!spec) continue;
    const rawValue = project.metadata[spec.key];
    const isEmpty = typeof rawValue !== 'string' || rawValue.trim().length === 0;
    if (isEmpty) {
      warnings.push({
        id: `institutional-required-${fieldId}`,
        severity: 'warning',
        title: `${spec.label} obrigatório (${resolved.institutionAcronym})`,
        description: `O ${manualRef} exige o preenchimento do campo "${spec.label}".`,
      });
    }
  }

  return warnings;
}
