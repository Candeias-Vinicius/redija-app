import { Block, BlockType } from '@/types/document';
import { hasRichHtmlMarkup, stripHtmlTags } from '@/core/transpiler/escape';

export type SlashCommandType = BlockType | 'action_cite';

export interface SlashMenuOptionDef {
  type: SlashCommandType;
  label: string;
  description: string;
  keywords: string;
}

export const SLASH_OPTION_DEFS: SlashMenuOptionDef[] = [
  {
    type: 'action_cite',
    label: 'Chamar Referência no Texto (@)',
    description: 'Insere (SOBRENOME, ANO) ou Autor (ANO) a partir das suas referências',
    keywords: 'referencia citacao curta autor data parenteses chamar @',
  },
  {
    type: 'paragraph',
    label: 'Parágrafo ABNT',
    description: 'Texto corrido justificado com recuo de 1,25 cm',
    keywords: 'paragrafo texto normal p',
  },
  {
    type: 'h1',
    label: 'Seção Primária (1)',
    description: 'Título de capítulo em caixa alta e negrito (quebra página)',
    keywords: 'titulo 1 h1 capitulo secao primaria',
  },
  {
    type: 'h2',
    label: 'Seção Secundária (1.1)',
    description: 'Subtítulo em negrito',
    keywords: 'titulo 2 h2 subsecao secundaria',
  },
  {
    type: 'h3',
    label: 'Seção Terciária (1.1.1)',
    description: 'Subseção de 3º nível em itálico',
    keywords: 'titulo 3 h3 subsecao terciaria',
  },
  {
    type: 'h4',
    label: 'Seção Quaternária (1.1.1.1)',
    description: 'Subseção de 4º nível sublinhada',
    keywords: 'titulo 4 h4 subsecao quaternaria',
  },
  {
    type: 'h5',
    label: 'Seção Quinária (1.1.1.1.1)',
    description: 'Subseção de 5º nível regular',
    keywords: 'titulo 5 h5 subsecao quinaria',
  },
  {
    type: 'unnumbered_heading',
    label: 'Título Sem Numeração',
    description: 'Seção em maiúsculas sem número',
    keywords: 'titulo sem numero h0 secao livre',
  },
  {
    type: 'quote_long',
    label: 'Citação Direta Longa',
    description: 'Para trechos com mais de 3 linhas',
    keywords: 'citacao longa direta recuo 4cm autor',
  },
  {
    type: 'equation',
    label: 'Equação Matemática / Fórmula',
    description: 'Fórmula científica com botões visuais',
    keywords: 'equacao formula matematica fisica calculo soma integral',
  },
  {
    type: 'code',
    label: 'Bloco de Código / Algoritmo',
    description: 'Trecho de código-fonte com legenda e fonte',
    keywords: 'codigo algoritmo programacao python javascript sql',
  },
  {
    type: 'image',
    label: 'Figura com Upload',
    description: 'Ilustração ou gráfico com legenda, fonte e controle de largura',
    keywords: 'figura imagem foto grafico upload ilustracao',
  },
  {
    type: 'table',
    label: 'Tabela (Dados Numéricos)',
    description: 'Tabela estatística com laterais abertas',
    keywords: 'tabela ibge dados estatisticos linhas colunas',
  },
  {
    type: 'box',
    label: 'Quadro (Dados Textuais)',
    description: 'Quadro comparativo fechado com bordas nos 4 lados',
    keywords: 'quadro comparativo bordas fechado texto',
  },
  {
    type: 'bullet',
    label: 'Lista de Marcadores',
    description: 'Alíneas e tópicos não ordenados',
    keywords: 'lista marcadores topicos bullet',
  },
  {
    type: 'numbered',
    label: 'Lista Numerada',
    description: 'Itens sequenciais numerados automaticamente',
    keywords: 'lista numerada ordenada 1 2 3',
  },
  {
    type: 'footnote',
    label: 'Nota de Rodapé',
    description: 'Nota explicativa numerada no rodapé da página',
    keywords: 'nota rodape explicacao referencia',
  },
  {
    type: 'raw_typst',
    label: 'Bloco Typst Avançado',
    description: 'Código Typst direto sem escape (diagramas, grades, caixas)',
    keywords: 'typst raw codigo avancado diagrama grade cetz fletcher',
  },
  {
    type: 'pagebreak',
    label: 'Quebra de Página',
    description: 'Força o conteúdo seguinte a iniciar em nova folha A4',
    keywords: 'quebra pagina nova folha pagebreak',
  },
];

export function createDefaultMetaForType(type: BlockType): Block['meta'] {
  if (type === 'quote_long') {
    return { author: 'SOBRENOME', year: '2025', page: '15' };
  }
  if (type === 'image') {
    return { caption: 'Descrição da figura', source: 'do autor', imageWidthPct: 75 };
  }
  if (type === 'code') {
    return {
      caption: 'Implementação do método principal',
      source: 'Elaborado pelo autor',
      language: 'python',
    };
  }
  if (type === 'table' || type === 'box') {
    return {
      caption: type === 'box' ? 'Quadro síntese de conceitos' : 'Comparativo de resultados',
      source: 'Dados da pesquisa',
      headers: ['Critério', 'Resultado'],
      rows: [
        ['Item A', '98%'],
        ['Item B', '94%'],
      ],
    };
  }
  return undefined;
}

// Calcula numeração progressiva automática (1 a 1.1.1.1.1) para exibição visual no editor
export function computeSectionNumbers(blocks: Block[]): Record<string, string> {
  let h1 = 0;
  let h2 = 0;
  let h3 = 0;
  let h4 = 0;
  let h5 = 0;
  const map: Record<string, string> = {};

  for (const b of blocks) {
    if (b.type === 'h1') {
      h1 += 1;
      h2 = 0;
      h3 = 0;
      h4 = 0;
      h5 = 0;
      map[b.id] = `${h1}`;
    } else if (b.type === 'h2') {
      if (h1 === 0) h1 = 1;
      h2 += 1;
      h3 = 0;
      h4 = 0;
      h5 = 0;
      map[b.id] = `${h1}.${h2}`;
    } else if (b.type === 'h3') {
      if (h1 === 0) h1 = 1;
      if (h2 === 0) h2 = 1;
      h3 += 1;
      h4 = 0;
      h5 = 0;
      map[b.id] = `${h1}.${h2}.${h3}`;
    } else if (b.type === 'h4') {
      if (h1 === 0) h1 = 1;
      if (h2 === 0) h2 = 1;
      if (h3 === 0) h3 = 1;
      h4 += 1;
      h5 = 0;
      map[b.id] = `${h1}.${h2}.${h3}.${h4}`;
    } else if (b.type === 'h5') {
      if (h1 === 0) h1 = 1;
      if (h2 === 0) h2 = 1;
      if (h3 === 0) h3 = 1;
      if (h4 === 0) h4 = 1;
      h5 += 1;
      map[b.id] = `${h1}.${h2}.${h3}.${h4}.${h5}`;
    }
  }
  return map;
}

export function filterSlashOptions<
  T extends { label: string; description: string; keywords: string },
>(options: T[], search: string): T[] {
  const q = search.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(q) ||
      opt.description.toLowerCase().includes(q) ||
      opt.keywords.includes(q),
  );
}

export function reorderBlocks(blocks: Block[], sourceId: string, targetId: string): Block[] {
  if (sourceId === targetId) return blocks;
  const fromIdx = blocks.findIndex((b) => b.id === sourceId);
  const toIdx = blocks.findIndex((b) => b.id === targetId);
  if (fromIdx === -1 || toIdx === -1) return blocks;
  const next = [...blocks];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}

export function shouldSkipContentUpdate(currentContent: string, nextContent: string): boolean {
  if (currentContent === nextContent) return true;
  // Se a única diferença for a tag <p> inicial gerada pelo TipTap sobre texto puro, não dispara atualização de estado
  const plainCurrent = stripHtmlTags(currentContent).trim();
  const plainNew = stripHtmlTags(nextContent).trim();
  const hasMarkup = hasRichHtmlMarkup(nextContent);
  return plainCurrent === plainNew && !hasMarkup && !currentContent.startsWith('<');
}
