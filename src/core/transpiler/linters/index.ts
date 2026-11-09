// =====================================================================
// RedijaApp — Orquestrador de Verificadores Plurais (Open/Closed)
// =====================================================================

import { DocumentProject, ProjectTemplateType } from '@/types/document';
import { TemplateCapabilities } from '@/core/templates/templateCapabilities';
import { abntLinter } from './abntLinter';
import { ieeeLinter } from './ieeeLinter';
import { posterLinter } from './posterLinter';
import { sanityLinter } from './sanityLinter';
import { sbcLinter } from './sbcLinter';
import { DocumentLinter, DocumentLintReport } from './types';

export type { ActiveLinterKind, DocumentLinter, DocumentLintReport, LinterWarning } from './types';
export { AbntLinter } from './abntLinter';
export { IeeeLinter } from './ieeeLinter';
export { PosterLinter } from './posterLinter';
export { SanityLinter } from './sanityLinter';
export { SbcLinter } from './sbcLinter';

const TEMPLATE_LINTER_REGISTRY: Partial<Record<ProjectTemplateType, DocumentLinter>> = {
  ieee: ieeeLinter,
  sbc: sbcLinter,
  poster: posterLinter,
};

/**
 * Seleciona e executa o verificador adequado ao template e estado de customização
 * seguindo o princípio Open/Closed: novos modelos registram sua própria estratégia
 * sem alterar o fluxo principal de verificação.
 */
export function runDocumentLinter(
  project: DocumentProject,
  capabilities: TemplateCapabilities,
): DocumentLintReport {
  if (capabilities.linterStatusMode === 'abnt_active') {
    const warnings = abntLinter.lint(project);
    return {
      kind: 'abnt',
      title: abntLinter.displayTitle,
      isPausedAbnt: false,
      warnings,
      sanityWarnings: [],
    };
  }

  if (capabilities.linterStatusMode === 'abnt_modified') {
    const sanityWarnings = sanityLinter.lint(project);
    return {
      kind: 'abnt_paused',
      title: 'Verificador ABNT (Pausado)',
      isPausedAbnt: true,
      warnings: [],
      sanityWarnings,
    };
  }

  const isApaOrFree =
    project.templateConfig?.preset === 'apa_7' ||
    capabilities.effectiveType === 'universe_custom' ||
    capabilities.effectiveType === 'em_branco' ||
    capabilities.isModified;

  if (isApaOrFree) {
    const warnings = sanityLinter.lint(project);
    return {
      kind: 'sanity',
      title: sanityLinter.displayTitle,
      isPausedAbnt: false,
      warnings,
      sanityWarnings: warnings,
    };
  }

  const strategy = TEMPLATE_LINTER_REGISTRY[capabilities.effectiveType] ?? sanityLinter;
  const warnings = strategy.lint(project);
  return {
    kind: strategy.id,
    title: strategy.displayTitle,
    isPausedAbnt: false,
    warnings,
    sanityWarnings: [],
  };
}
