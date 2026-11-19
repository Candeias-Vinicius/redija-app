// =====================================================================
// RedijaApp — Cálculo da Nota de Conformidade (RDJ-05.1)
// =====================================================================

import type { LinterWarning } from '../linters/types';

export type ComplianceBand = 'ready' | 'attention' | 'critical' | 'paused';

export interface ComplianceScoreInput {
  /** Itens estruturais obrigatórios ausentes (cada um desconta 15 pontos). */
  missingStructuralIds?: readonly string[];
  /** Avisos de linter (`warning` desconta 5, `info` desconta 1). IDs repetidos contam uma única vez. */
  warnings?: readonly Pick<LinterWarning, 'id' | 'severity'>[];
  /** Quando a verificação ABNT está pausada, a nota não é exibida. */
  isPaused?: boolean;
}

export interface ComplianceScoreResult {
  score: number | null;
  band: ComplianceBand;
  label: string;
  isPaused: boolean;
  counts: {
    missingStructural: number;
    warnings: number;
    infos: number;
  };
}

export const STRUCTURAL_PENALTY = 15;
export const WARNING_PENALTY = 5;
export const INFO_PENALTY = 1;

/**
 * Função pura que calcula a nota de conformidade de 0 a 100 (RDJ-05.1):
 *   100 − 15 × (itens estruturais ausentes) − 5 × (warning) − 1 × (info), mínimo 0.
 *
 * Faixas:
 * - verde >= 90: "Pronto"
 * - amarelo 70–89: "Atenção"
 * - vermelho < 70: "Crítico"
 * - pausado: nota nula, rótulo "Verificação pausada"
 */
export function calculateComplianceScore(input: ComplianceScoreInput): ComplianceScoreResult {
  if (input.isPaused) {
    return {
      score: null,
      band: 'paused',
      label: 'Verificação pausada',
      isPaused: true,
      counts: {
        missingStructural: 0,
        warnings: 0,
        infos: 0,
      },
    };
  }

  const uniqueStructural = new Set<string>(input.missingStructuralIds ?? []);
  const seenWarningIds = new Set<string>();
  let warningCount = 0;
  let infoCount = 0;

  for (const w of input.warnings ?? []) {
    if (!w.id || seenWarningIds.has(w.id)) continue;
    seenWarningIds.add(w.id);
    if (w.severity === 'warning') {
      warningCount += 1;
    } else {
      infoCount += 1;
    }
  }

  const missingStructural = uniqueStructural.size;
  const rawScore =
    100 -
    missingStructural * STRUCTURAL_PENALTY -
    warningCount * WARNING_PENALTY -
    infoCount * INFO_PENALTY;
  const score = Math.max(0, rawScore);

  let band: ComplianceBand;
  let label: string;
  if (score >= 90) {
    band = 'ready';
    label = 'Pronto';
  } else if (score >= 70) {
    band = 'attention';
    label = 'Atenção';
  } else {
    band = 'critical';
    label = 'Crítico';
  }

  return {
    score,
    band,
    label,
    isPaused: false,
    counts: {
      missingStructural,
      warnings: warningCount,
      infos: infoCount,
    },
  };
}
