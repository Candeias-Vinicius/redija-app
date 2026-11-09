// =====================================================================
// RedijaApp — Contratos de Verificadores Plurais (Strategy / OCP)
// =====================================================================

import { DocumentProject } from '@/types/document';
import { AbntWarning } from '../abntLinter';

export type LinterWarning = AbntWarning;

export type ActiveLinterKind =
  | 'abnt'
  | 'abnt_paused'
  | 'ieee'
  | 'sbc'
  | 'poster'
  | 'sanity';

export interface DocumentLinter {
  readonly id: ActiveLinterKind;
  readonly displayTitle: string;
  lint(project: DocumentProject): LinterWarning[];
}

export interface DocumentLintReport {
  kind: ActiveLinterKind;
  title: string;
  isPausedAbnt: boolean;
  warnings: LinterWarning[];
  sanityWarnings: LinterWarning[];
}
