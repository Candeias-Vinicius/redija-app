// =====================================================================
// RedijaApp — Verificador Universal de Integridade (Sanity Linter)
// Ativo para modos customizados, modificados, APA, Livre e Universe.
// =====================================================================

import { DocumentProject } from '@/types/document';
import { auditCitationsAndReferences, countWords } from '../abntLinter';
import { DocumentLinter, LinterWarning } from './types';

export class SanityLinter implements DocumentLinter {
  readonly id = 'sanity' as const;
  readonly displayTitle = 'Verificador de Integridade';

  lint(project: DocumentProject): LinterWarning[] {
    const warnings: LinterWarning[] = [];

    if (!project.metadata.title?.trim()) {
      warnings.push({
        id: 'sanity-title-empty',
        severity: 'warning',
        title: 'Documento sem título',
        description: 'Preencha o campo Título na aba lateral para identificação do PDF.',
      });
    }

    if (!project.metadata.author?.trim()) {
      warnings.push({
        id: 'sanity-author-empty',
        severity: 'warning',
        title: 'Documento sem autoria definida',
        description: 'Informe ao menos um autor nos metadados do documento.',
      });
    }

    const totalBodyWords = project.blocks.reduce(
      (acc, block) => acc + countWords(block.content),
      0,
    );
    const hasVisualBlocks = project.blocks.some(
      (b) => b.type === 'image' || b.type === 'table' || b.type === 'box' || b.type === 'equation' || b.type === 'code',
    );
    if (totalBodyWords === 0 && !hasVisualBlocks) {
      warnings.push({
        id: 'sanity-body-empty',
        severity: 'warning',
        title: 'Corpo do documento vazio',
        description: 'Adicione parágrafos, seções ou elementos ao editor antes de exportar.',
      });
    }

    project.blocks.forEach((b, idx) => {
      if (b.type === 'image' && !b.meta?.caption?.trim()) {
        warnings.push({
          id: `sanity-img-caption-${b.id}`,
          severity: 'info',
          title: `Imagem no bloco #${idx + 1} sem legenda`,
          description: 'Recomenda-se incluir uma legenda descritiva abaixo ou acima da imagem.',
        });
      }
      if (b.type === 'quote_long' && !b.meta?.author?.trim()) {
        warnings.push({
          id: `sanity-quote-missing-${b.id}`,
          severity: 'info',
          title: `Citação direta longa no bloco #${idx + 1} sem autoria`,
          description: 'Informe autor e ano nos metadados da citação direta longa para atribuição correta.',
        });
      }
    });

    // Em modo universal/customizado, sinaliza apenas citações quebradas sem exigir lista fechada
    warnings.push(
      ...auditCitationsAndReferences(project, {
        checkUncited: false,
      }),
    );

    return warnings;
  }
}

export const sanityLinter = new SanityLinter();
