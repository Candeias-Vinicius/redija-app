// =====================================================================
// RedijaApp — Verificador Normativo SBC (Sociedade Brasileira de Computação)
// =====================================================================

import { DocumentProject } from '@/types/document';
import { auditCitationsAndReferences, countWords } from '../abntLinter';
import { DocumentLinter, LinterWarning } from './types';

export class SbcLinter implements DocumentLinter {
  readonly id = 'sbc' as const;
  readonly displayTitle = 'Verificador SBC';

  lint(project: DocumentProject): LinterWarning[] {
    const warnings: LinterWarning[] = [];

    const resumoWords = countWords(project.metadata.abstract);
    if (resumoWords === 0) {
      warnings.push({
        id: 'sbc-resumo-empty',
        severity: 'warning',
        title: 'Resumo em português ausente (SBC)',
        description: 'Artigos da SBC devem iniciar com o Resumo logo abaixo dos autores.',
      });
    } else if (resumoWords > 200) {
      warnings.push({
        id: 'sbc-resumo-length',
        severity: 'info',
        title: `Resumo com ${resumoWords} palavras (SBC)`,
        description: 'As diretrizes da SBC recomendam Resumo conciso com até 150–200 palavras.',
      });
    }

    const abstractEnWords = countWords(project.metadata.foreignAbstract || '');
    if (abstractEnWords === 0) {
      warnings.push({
        id: 'sbc-abstract-empty',
        severity: 'info',
        title: 'Abstract em inglês ausente (SBC)',
        description: 'Trabalhos em português submetidos a eventos da SBC geralmente acompanham Resumo e Abstract.',
      });
    }

    const validKeywords = (project.metadata.keywords || []).map((k) => k.trim()).filter(Boolean);
    if (validKeywords.length === 0) {
      warnings.push({
        id: 'sbc-keywords-empty',
        severity: 'warning',
        title: 'Palavras-chave ausentes (SBC)',
        description: 'Informe palavras-chave representativas logo após o Resumo.',
      });
    }

    const bodyWords = project.blocks.reduce(
      (acc, block) => acc + countWords(block.content),
      0,
    );
    if (bodyWords > 5000) {
      warnings.push({
        id: 'sbc-page-limit',
        severity: 'info',
        title: `Corpo extenso (${bodyWords} palavras — SBC)`,
        description: 'Artigos completos da SBC geralmente possuem limite de 10 a 14 páginas (~4.000 a 5.000 palavras).',
      });
    }

    project.blocks.forEach((b, idx) => {
      if ((b.type === 'image' || b.type === 'table' || b.type === 'box') && !b.meta?.caption?.trim()) {
        warnings.push({
          id: `sbc-elem-caption-${b.id}`,
          severity: 'warning',
          title: `Elemento visual no bloco #${idx + 1} sem legenda (SBC)`,
          description: 'Figuras, tabelas e quadros em eventos SBC devem possuir legenda numerada.',
        });
      }
    });

    if (!project.references || project.references.length === 0) {
      warnings.push({
        id: 'references-empty',
        severity: 'warning',
        title: 'Lista de Referências vazia (SBC)',
        description: 'Artigos da SBC requerem seção final de Referências em ordem alfabética.',
      });
    }

    warnings.push(
      ...auditCitationsAndReferences(project, {
        checkUncited: true,
        uncitedDescription: 'Todas as obras listadas em Referências na SBC devem possuir chamada no texto.',
      }),
    );

    return warnings;
  }
}

export const sbcLinter = new SbcLinter();
