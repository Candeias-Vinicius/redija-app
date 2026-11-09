// =====================================================================
// RedijaApp — Verificador de Pôsteres Científicos A0/A1
// =====================================================================

import { DocumentProject } from '@/types/document';
import { auditCitationsAndReferences, countWords } from '../abntLinter';
import { DocumentLinter, LinterWarning } from './types';

export class PosterLinter implements DocumentLinter {
  readonly id = 'poster' as const;
  readonly displayTitle = 'Verificador Pôster';

  lint(project: DocumentProject): LinterWarning[] {
    const warnings: LinterWarning[] = [];

    if (!project.metadata.title?.trim() || !project.metadata.author?.trim()) {
      warnings.push({
        id: 'poster-header-incomplete',
        severity: 'warning',
        title: 'Cabeçalho do banner incompleto',
        description: 'Verifique se o Título e Autores/Instituição estão preenchidos para destaque no topo do banner.',
      });
    }

    const bodyWords = project.blocks.reduce(
      (acc, block) => acc + countWords(block.content),
      0,
    );
    if (bodyWords === 0) {
      warnings.push({
        id: 'poster-body-empty',
        severity: 'warning',
        title: 'Conteúdo do pôster vazio',
        description: 'Adicione blocos curtos em tópicos para preenchimento das colunas do banner.',
      });
    } else if (bodyWords > 800) {
      warnings.push({
        id: 'poster-word-density',
        severity: 'warning',
        title: `Excesso de texto no pôster (${bodyWords} palavras)`,
        description:
          'Pôsteres acadêmicos A0/A1 devem ser visuais e objetivos (recomenda-se até 800 palavras) para leitura rápida a 1–2 metros.',
      });
    }

    const hasVisual = project.blocks.some(
      (b) => b.type === 'image' || b.type === 'table' || b.type === 'box',
    );
    if (!hasVisual) {
      warnings.push({
        id: 'poster-visual-elements',
        severity: 'info',
        title: 'Pôster sem gráficos, imagens ou tabelas',
        description: 'Inclua ao menos um elemento visual para facilitar a leitura rápida durante a apresentação.',
      });
    }

    warnings.push(
      ...auditCitationsAndReferences(project, {
        checkUncited: false,
      }),
    );

    return warnings;
  }
}

export const posterLinter = new PosterLinter();
