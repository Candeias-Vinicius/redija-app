// =====================================================================
// RedijaApp — Verificador Normativo ABNT (Strategy Adapter)
// =====================================================================

import { DocumentProject } from '@/types/document';
import { runAbntLinter } from '../abntLinter';
import { DocumentLinter, LinterWarning } from './types';

export class AbntLinter implements DocumentLinter {
  readonly id = 'abnt' as const;
  readonly displayTitle = 'Verificador ABNT';

  lint(project: DocumentProject): LinterWarning[] {
    return runAbntLinter(project);
  }
}

export const abntLinter = new AbntLinter();
