// =====================================================================
// RedijaApp — Modelos Iniciais de Trabalhos Acadêmicos (ABNT)
// =====================================================================

import { DocumentProject, ProjectTemplateType, DEFAULT_TEMPLATE_CONFIG } from '@/types/document';

export interface ProjectTemplateInfo {
  type: ProjectTemplateType;
  label: string;
  description: string;
  badge: string;
}

export const PROJECT_TEMPLATES: ProjectTemplateInfo[] = [
  {
    type: 'tcc',
    label: 'Trabalho de Conclusão de Curso (TCC)',
    description: 'Estrutura completa com Capa, Folha de Rosto, Resumo, Sumário, Introdução, Metodologia e Referências (NBR 14724).',
    badge: 'NBR 14724',
  },
  {
    type: 'artigo',
    label: 'Artigo Científico',
    description: 'Estrutura enxuta para periódicos e congressos com Introdução, Referencial Teórico, Resultados e Conclusão.',
    badge: 'NBR 6022',
  },
  {
    type: 'relatorio',
    label: 'Relatório Técnico / Estágio',
    description: 'Modelo voltado para relatórios de atividades, estágio supervisionado ou iniciação científica.',
    badge: 'NBR 10719',
  },
  {
    type: 'projeto_pesquisa',
    label: 'Projeto de Pesquisa',
    description: 'Estrutura para qualificação ou seleção de pós-graduação: Tema, Problema, Justificativa, Objetivos e Metodologia.',
    badge: 'NBR 15287',
  },
  {
    type: 'em_branco',
    label: 'Documento em Branco (100% Livre)',
    description: 'Começa do zero com apenas um bloco vazio para você montar a estrutura e personalizar as normas como preferir.',
    badge: 'LIVRE',
  },
];

export function createProjectFromTemplate(
  templateType: ProjectTemplateType = 'tcc',
  customName?: string,
): DocumentProject {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const currentYear = String(new Date().getFullYear());

  if (templateType === 'artigo') {
    return {
      id,
      name: customName || 'Novo Artigo Científico',
      templateType: 'artigo',
      templateConfig: {
        ...DEFAULT_TEMPLATE_CONFIG,
        preset: 'article_2col',
        fontFamily: 'serif',
        fontSizePt: 10,
        lineSpacing: '1.0',
        paragraphIndentCm: 0.75,
        marginTopCm: 2.5,
        marginLeftCm: 2,
        marginBottomCm: 2,
        marginRightCm: 2,
        columns: 2,
        includeCoverPage: false,
        includeTitlePage: false,
        includeToc: false,
        citationStyle: 'titlecase',
        referenceHighlight: 'italic',
      },
      updatedAt: now,
      metadata: {
        title: 'Título do Artigo Científico',
        subtitle: 'Estudo experimental ou revisão sistemática',
        author: 'Nome do Autor',
        advisor: 'Prof. Dr. Nome do Orientador',
        nature: 'Artigo científico submetido ao Curso de Graduação como requisito avaliativo.',
        institution: 'Universidade Federal',
        course: 'Departamento Acadêmico',
        location: 'São Paulo',
        year: currentYear,
        abstract:
          'Apresente aqui o resumo informativo do artigo contendo objetivo, método, principais resultados e conclusões (entre 100 e 250 palavras conforme NBR 6028).',
        keywords: ['Artigo Científico', 'Pesquisa', 'ABNT'],
      },
      blocks: [
        { id: crypto.randomUUID(), type: 'h1', content: 'Introdução' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Contextualize o tema do artigo, apresentando o problema de pesquisa e o objetivo central da investigação.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: 'Referencial Teórico' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Discuta os principais autores e estudos prévios que fundamentam a análise proposta neste artigo.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: 'Resultados e Discussão' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Apresente os dados coletados e analise-os à luz da literatura revisada.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: 'Considerações Finais' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Sintetize as principais contribuições do estudo e indique possibilidades para pesquisas futuras.',
        },
      ],
      references: [
        {
          id: crypto.randomUUID(),
          authors: 'ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS',
          title: 'NBR 6023: Informação e documentação: Referências: Elaboração',
          city: 'Rio de Janeiro',
          publisher: 'ABNT',
          year: '2018',
        },
      ],
    };
  }

  if (templateType === 'relatorio') {
    return {
      id,
      name: customName || 'Relatório Técnico / Estágio',
      templateType: 'relatorio',
      updatedAt: now,
      metadata: {
        title: 'Relatório de Atividades Acadêmicas e Técnicas',
        subtitle: 'Período de acompanhamento semestral',
        author: 'Nome do Estudante',
        advisor: 'Prof. Dr. Supervisor',
        nature:
          'Relatório técnico apresentado à Coordenação de Curso como requisito obrigatório de acompanhamento.',
        institution: 'Universidade Federal',
        course: 'Coordenação de Estágios',
        location: 'São Paulo',
        year: currentYear,
        abstract:
          'Este relatório descreve as atividades técnicas desenvolvidas durante o período avaliado, detalhando o ambiente de trabalho, as ferramentas empregadas e os resultados alcançados.',
        keywords: ['Relatório Técnico', 'Atividades Práticas', 'Formação'],
      },
      blocks: [
        { id: crypto.randomUUID(), type: 'h1', content: 'Apresentação e Contexto' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Descreva o local ou laboratório onde as atividades foram realizadas e os objetivos gerais do plano de trabalho.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: 'Atividades Desenvolvidas' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Relate em ordem cronológica ou temática as tarefas executadas, metodologias adotadas e desafios superados.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: 'Conclusão' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Avalie a contribuição prática das atividades para a formação acadêmica e profissional.',
        },
      ],
      references: [],
    };
  }

  if (templateType === 'projeto_pesquisa') {
    return {
      id,
      name: customName || 'Projeto de Pesquisa',
      templateType: 'projeto_pesquisa',
      updatedAt: now,
      metadata: {
        title: 'Proposta de Investigação Científica',
        subtitle: 'Projeto de pesquisa apresentado para qualificação',
        author: 'Nome do Proponente',
        advisor: 'Prof. Dr. Orientador Pretendido',
        nature:
          'Projeto de Pesquisa apresentado ao Programa de Pós-Graduação ou Coordenação de TCC para avaliação.',
        institution: 'Universidade Federal',
        course: 'Programa de Pesquisa',
        location: 'São Paulo',
        year: currentYear,
        abstract:
          'Resumo da proposta de pesquisa delimitando o tema, o problema investigado, a hipótese central, os objetivos gerais e específicos e os procedimentos metodológicos planejados.',
        keywords: ['Projeto de Pesquisa', 'Metodologia Científica', 'ABNT'],
      },
      blocks: [
        { id: crypto.randomUUID(), type: 'h1', content: 'Introdução e Problema de Pesquisa' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Apresente a delimitação do tema e formule claramente a pergunta-problema que orientará a pesquisa.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: 'Justificativa' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Argumente sobre a relevância científica, acadêmica e social da realização deste estudo.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: 'Objetivos' },
        { id: crypto.randomUUID(), type: 'h2', content: 'Objetivo Geral' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content: 'Defina em uma frase com verbo no infinitivo o propósito global da pesquisa.',
        },
        { id: crypto.randomUUID(), type: 'h2', content: 'Objetivos Específicos' },
        {
          id: crypto.randomUUID(),
          type: 'bullet',
          content: 'Identificar as variáveis principais relacionadas ao fenômeno estudado;',
        },
        {
          id: crypto.randomUUID(),
          type: 'bullet',
          content: 'Analisar comparativamente os resultados obtidos em cenários controlados.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: 'Metodologia' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Classifique a pesquisa quanto à abordagem, natureza e procedimentos técnicos para coleta e análise de dados.',
        },
      ],
      references: [],
    };
  }

  if (templateType === 'em_branco') {
    return {
      id,
      name: customName || 'Documento em Branco',
      templateType: 'em_branco',
      templateConfig: {
        ...DEFAULT_TEMPLATE_CONFIG,
        preset: 'custom',
        includeCoverPage: false,
        includeTitlePage: false,
        includeToc: false,
      },
      updatedAt: now,
      metadata: {
        title: 'Título do Documento',
        subtitle: '',
        author: 'Autor',
        advisor: '',
        nature: '',
        institution: '',
        course: '',
        location: 'São Paulo',
        year: currentYear,
        abstract: '',
        keywords: [],
      },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content: '',
        },
      ],
      references: [],
    };
  }

  // Padrão: TCC completo
  return {
    id,
    name: customName || 'Meu Trabalho Acadêmico ABNT',
    templateType: 'tcc',
    updatedAt: now,
    metadata: {
      title:
        'Desenvolvimento de uma Plataforma Automatizada para Redação Científica em Conformidade com as Normas da ABNT',
      subtitle: 'Um estudo de caso em tecnologias baseadas em WebAssembly e Typst',
      author: 'Vinícius Candeias',
      advisor: 'Prof. Dr. Nome do Orientador',
      nature:
        'Trabalho de Conclusão de Curso apresentado ao Bacharelado em Ciência da Computação da Universidade Federal de Tecnologia, como requisito parcial para obtenção do título de Bacharel.',
      institution: 'Universidade Federal de Tecnologia',
      course: 'Bacharelado em Ciência da Computação',
      location: 'São Paulo',
      year: currentYear,
      abstract:
        'Este projeto apresenta a concepção e implementação do RedijaApp, uma plataforma web focada em simplificar a escrita acadêmica para estudantes universitários. Utilizando o compilador Typst executado via WebAssembly no navegador e uma interface intuitiva orientada a blocos, o sistema automatiza a formatação rigorosa exigida pela ABNT, eliminando a barreira técnica associada a ferramentas como LaTeX.',
      keywords: ['ABNT', 'Typst', 'WebAssembly', 'Editor Acadêmico', 'Produtividade'],
    },
    blocks: [
      {
        id: crypto.randomUUID(),
        type: 'h1',
        content: 'Introdução',
      },
      {
        id: crypto.randomUUID(),
        type: 'paragraph',
        content:
          'A elaboração de trabalhos acadêmicos no Brasil impõe aos estudantes um duplo desafio: a pesquisa científica e o cumprimento rigoroso das diretrizes de diagramação estabelecidas pela Associação Brasileira de Normas Técnicas (ABNT). Ferramentas como o Microsoft Word demandam ajustes manuais suscetíveis a erros, enquanto o ecossistema LaTeX apresenta uma curva de aprendizado íngreme para pesquisadores sem formação em computação.',
      },
      {
        id: crypto.randomUUID(),
        type: 'h2',
        content: 'Justificativa e Objetivos',
      },
      {
        id: crypto.randomUUID(),
        type: 'paragraph',
        content:
          'O objetivo principal deste projeto é democratizar o acesso à tipografia de alta qualidade, garantindo que o autor concentre seus esforços no conteúdo intelectual e na argumentação, delegando toda a complexidade de regras de paginação, citações e referências ao motor automatizado.',
      },
      {
        id: crypto.randomUUID(),
        type: 'quote_long',
        content:
          'A simplificação das interfaces de escrita científica não deve comprometer a fidelidade tipográfica ou o rigor metodológico, mas sim atuar como um catalisador para a disseminação do conhecimento acessível.',
        meta: {
          author: 'SILVA',
          year: '2023',
          page: '42',
        },
      },
      {
        id: crypto.randomUUID(),
        type: 'h1',
        content: 'Metodologia e Arquitetura',
      },
      {
        id: crypto.randomUUID(),
        type: 'paragraph',
        content:
          'A arquitetura do RedijaApp divide-se em três camadas principais: uma interface de usuário visual e interativa com atalhos de barra, um módulo transpilador que gera representações formais do documento e o compilador de alto desempenho Typst.',
      },
      {
        id: crypto.randomUUID(),
        type: 'image',
        content: '',
        meta: {
          caption: 'Fluxo de dados da arquitetura do RedijaApp',
          source: 'Dados da pesquisa, 2026',
        },
      },
    ],
    references: [
      {
        id: crypto.randomUUID(),
        authors: 'ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS',
        title: 'NBR 14724: Informação e documentação: Trabalhos acadêmicos: Apresentação',
        city: 'Rio de Janeiro',
        publisher: 'ABNT',
        year: '2011',
      },
      {
        id: crypto.randomUUID(),
        authors: 'SILVA, Roberto Carlos; SOUZA, Maria Fernanda',
        title: 'Tipografia digital e a evolução dos sistemas de editoração científica',
        edition: '3',
        city: 'São Paulo',
        publisher: 'Editora Acadêmica',
        year: '2023',
      },
    ],
  };
}
