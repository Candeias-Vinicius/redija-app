// =====================================================================
// RedijaApp — Verificador Normativo IEEE Conference
// =====================================================================

import { DocumentProject } from '@/types/document';
import {
  auditCitationsAndReferences,
  countWords,
  resolveCitationFormat,
} from '../abntLinter';
import { DocumentLinter, LinterWarning } from './types';

export class IeeeLinter implements DocumentLinter {
  readonly id = 'ieee' as const;
  readonly displayTitle = 'Verificador IEEE';

  lint(project: DocumentProject): LinterWarning[] {
    const warnings: LinterWarning[] = [];

    const abstractText = project.metadata.foreignAbstract?.trim()
      ? project.metadata.foreignAbstract
      : project.metadata.abstract;
    const abstractWords = countWords(abstractText);

    if (abstractWords === 0) {
      warnings.push({
        id: 'ieee-abstract-empty',
        severity: 'warning',
        title: 'Abstract em branco (IEEE)',
        description: 'Artigos IEEE exigem um Abstract em parágrafo único antes da Seção I.',
      });
    } else if (abstractWords < 100 || abstractWords > 250) {
      warnings.push({
        id: 'ieee-abstract-length',
        severity: 'info',
        title: `Abstract com ${abstractWords} palavras (IEEE)`,
        description: 'As diretrizes IEEE Conference recomendam Abstract conciso entre 100 e 250 palavras.',
      });
    }

    const keywordsList =
      (project.metadata.foreignKeywords?.filter((k) => k.trim()).length ?? 0) > 0
        ? project.metadata.foreignKeywords!
        : project.metadata.keywords || [];
    const validKeywords = keywordsList.map((k) => k.trim()).filter(Boolean);

    if (validKeywords.length === 0) {
      warnings.push({
        id: 'ieee-keywords-empty',
        severity: 'warning',
        title: 'Index Terms ausentes (IEEE)',
        description: 'Inclua descritores (Keywords / Index Terms) ao final do Abstract.',
      });
    } else if (validKeywords.length < 3) {
      warnings.push({
        id: 'ieee-keywords-count',
        severity: 'info',
        title: `Apenas ${validKeywords.length} Index Term(s) (IEEE)`,
        description: 'Conferências IEEE recomendam de 3 a 5 termos em ordem alfabética.',
      });
    }

    const citationFormat = resolveCitationFormat(project.templateConfig);
    if (citationFormat !== 'ieee_numeric') {
      warnings.push({
        id: 'ieee-citation-format',
        severity: 'info',
        title: 'Citação não numérica detectada no padrão IEEE',
        description: 'O padrão IEEE adota chamadas numéricas [1], [2]. Ajuste em Norma & Layout se desejar conformidade estrita.',
      });
    }

    project.blocks.forEach((b, idx) => {
      if (b.type === 'image' && !b.meta?.caption?.trim()) {
        warnings.push({
          id: `ieee-fig-caption-${b.id}`,
          severity: 'warning',
          title: `Figura no bloco #${idx + 1} sem legenda (IEEE Fig.)`,
          description: 'Toda figura IEEE deve conter caption descritiva ("Fig. 1...").',
        });
      }
      if ((b.type === 'table' || b.type === 'box') && !b.meta?.caption?.trim()) {
        warnings.push({
          id: `ieee-tbl-caption-${b.id}`,
          severity: 'warning',
          title: `Tabela no bloco #${idx + 1} sem título (IEEE TABLE)`,
          description: 'Tabelas em artigos IEEE exigem título acima em caixa alta ("TABLE I...").',
        });
      }
    });

    if (!project.references || project.references.length === 0) {
      warnings.push({
        id: 'references-empty',
        severity: 'warning',
        title: 'References vazio (IEEE)',
        description: 'Artigos científicos requerem ao menos uma referência bibliográfica numerada.',
      });
    }

    warnings.push(
      ...auditCitationsAndReferences(project, {
        checkUncited: true,
        uncitedDescription: 'Em artigos IEEE, cada item listado em References [n] deve ser referenciado no texto.',
      }),
    );

    return warnings;
  }
}

export const ieeeLinter = new IeeeLinter();
