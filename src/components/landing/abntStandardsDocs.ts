export interface AbntStandardDoc {
  code: string;
  title: string;
  summary: string;
  rulesApplied: string[];
}

export const ABNT_STANDARDS_DOCS: AbntStandardDoc[] = [
  {
    code: 'ABNT NBR 14724',
    title: 'Trabalhos Acadêmicos: Apresentação (TCC, Monografias, Dissertações e Teses)',
    summary:
      'Define toda a estrutura física do trabalho (elementos pré-textuais, textuais e pós-textuais), margens, paginação e ilustrações.',
    rulesApplied: [
      'Formato A4 com margens padrão: 3 cm (superior e esquerda) e 2 cm (inferior e direita).',
      'Fonte tamanho 12 pt para o texto geral e 10 pt para citações longas, notas de rodapé, legendas e fontes de figuras/tabelas.',
      'Espaçamento 1,5 entre linhas no corpo do texto e espaçamento simples (1,0) em resumos, citações longas, notas e referências.',
      'Contagem de páginas iniciada na Folha de Rosto, mas com numeração impressa no canto superior direito somente a partir da primeira folha textual (Introdução).',
      'Estrutura completa: Capa, Folha de Rosto (com natureza recuada), Folha de Aprovação (Banca Examinadora), Dedicatória, Agradecimentos, Epígrafe, Listas automáticas (Ilustrações, Quadros, Tabelas, Siglas, Símbolos), Glossário, Apêndices e Anexos.',
    ],
  },
  {
    code: 'ABNT NBR 10520 (2002 e atualização 2023)',
    title: 'Citações em Documentos',
    summary:
      'Regulamenta as chamadas de autores no texto e a diagramação de citações diretas curtas, longas e indiretas.',
    rulesApplied: [
      'Citação direta longa (mais de 3 linhas) com recuo esquerdo obrigatório de 4 cm, fonte 10 pt, espaçamento simples e sem aspas.',
      'Suporte tanto ao padrão tradicional em maiúsculas (SILVA, 2023) quanto à atualização NBR 10520:2023 em caixa mista entre parênteses (Silva, 2023).',
      'Formatação automática de múltiplos autores (até 3 separados por ponto e vírgula, e 4 ou mais abreviados com et al. em itálico).',
      'Inserção rápida de chamadas pelo atalho "@" ou pelo comando "/" direto no parágrafo.',
    ],
  },
  {
    code: 'ABNT NBR 6023',
    title: 'Referências: Elaboração',
    summary:
      'Estabelece a ordem dos elementos e a formatação da lista final de referências bibliográficas.',
    rulesApplied: [
      'Referências alinhadas exclusivamente à esquerda (sem justificar), em espaçamento simples e separadas entre si por um espaço simples em branco.',
      'Ordenação alfabética automática pelo sobrenome do primeiro autor e abreviação normativa com et al. em itálico para obras com 4 ou mais autores.',
      'Formatação específica para Livros, Artigos de Periódicos, Teses/Dissertações/TCCs, Sites e Legislação, com importação automática por DOI, ISBN e BibTeX (.bib).',
    ],
  },
  {
    code: 'ABNT NBR 6024',
    title: 'Numeração Progressiva das Seções de um Documento',
    summary:
      'Padroniza a hierarquia e o destaque tipográfico dos títulos de capítulos e subseções.',
    rulesApplied: [
      'Numeração automática em 5 níveis (1, 1.1, 1.1.1, 1.1.1.1 e 1.1.1.1.1) sem ponto final após o número.',
      'Diferenciação tipográfica: Seção 1 em MAIÚSCULAS e negrito, Seção 1.1 em negrito, Seção 1.1.1 em itálico, Seção 1.1.1.1 sublinhada e Seção 1.1.1.1.1 regular.',
      'Suporte a títulos sem indicação numérica centralizados (Agradecimentos, Resumo, Referências, Glossário, Apêndices e Anexos).',
    ],
  },
  {
    code: 'ABNT NBR 6027',
    title: 'Sumário',
    summary:
      'Regras para geração do sumário refletindo fielmente a hierarquia e paginação das seções do trabalho.',
    rulesApplied: [
      'Geração 100% automática do Sumário espelhando os números, títulos e páginas exatas de todas as seções.',
    ],
  },
  {
    code: 'ABNT NBR 6028',
    title: 'Resumo, Resumo Crítico e Resumo Indicativo',
    summary:
      'Determina a apresentação do Resumo em língua vernácula e em língua estrangeira (Abstract).',
    rulesApplied: [
      'Diagramação em parágrafo único, espaçamento simples, seguido das Palavras-chave separadas por ponto.',
      'Contador de palavras em tempo real com verificação da faixa recomendada (150 a 500 palavras para trabalhos acadêmicos).',
    ],
  },
  {
    code: 'ABNT NBR 6022 & IBGE',
    title: 'Artigos em Publicações Periódicas e Apresentação Tabular (IBGE)',
    summary:
      'Diretrizes para artigos científicos (1 ou 2 colunas) e diferenciação entre Tabelas estatísticas e Quadros textuais.',
    rulesApplied: [
      'Tabelas estatísticas abertas nas laterais esquerda e direita (norma IBGE) com título no topo e fonte na base.',
      'Quadros textuais fechados nos 4 lados com listagem própria separada da Lista de Tabelas.',
    ],
  },
  {
    code: 'ABNT NBR 15287',
    title: 'Projeto de Pesquisa: Apresentação',
    summary:
      'Estrutura padronizada para submissão de projetos de TCC, mestrado, doutorado e iniciação científica.',
    rulesApplied: [
      'Atendido pela estrutura pré-textual e seções para Tema, Problema, Hipótese, Objetivos, Justificativa, Metodologia e Cronograma (em Quadros ABNT).',
    ],
  },
  {
    code: 'ABNT NBR 10719',
    title: 'Relatório Técnico e/ou Científico: Apresentação',
    summary:
      'Diretrizes para relatórios de estágio supervisionado, iniciação científica (PIBIC) e relatórios técnicos.',
    rulesApplied: [
      'Predefinição dedicada com estrutura formal de capa, folha de rosto, resumo, listas técnicas, desenvolvimento e anexos.',
    ],
  },
];
