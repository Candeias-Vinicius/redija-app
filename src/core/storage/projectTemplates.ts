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
    type: 'sbc',
    label: 'Artigo SBC (Sociedade Brasileira de Computação)',
    description: 'Modelo oficial para congressos e periódicos da SBC com formatação de cabeçalho, afiliações e referências no padrão nacional de computação.',
    badge: 'SBC',
  },
  {
    type: 'ieee',
    label: 'Artigo IEEE Conference',
    description: 'Padrão internacional de publicação em duas colunas para conferências e simpósios de engenharia, tecnologia e ciências exatas.',
    badge: 'IEEE',
  },
  {
    type: 'poster',
    label: 'Pôster Acadêmico A0 (Banner)',
    description: 'Banner de grande formato (A0 / 84 × 119 cm) com cabeçalho institucional em destaque e 3 colunas em caixas visuais para simpósios e mostras científicas.',
    badge: 'A0 / BANNER',
  },
  {
    type: 'universe_custom',
    label: 'Typst Universe (Template Comunitário)',
    description: 'Conecte qualquer modelo da loja oficial do Typst Universe colando o identificador do pacote (ex: @preview/charged-ieee:0.1.1).',
    badge: 'UNIVERSE',
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
        citationFormat: 'abnt_titlecase',
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

  if (templateType === 'sbc') {
    return {
      id,
      name: customName || 'Novo Artigo SBC',
      templateType: 'sbc',
      templateConfig: {
        ...DEFAULT_TEMPLATE_CONFIG,
        preset: 'sbc',
        fontFamily: 'serif',
        fontSizePt: 12,
        lineSpacing: '1.0',
        columns: 1,
        includeCoverPage: false,
        includeTitlePage: false,
        includeToc: false,
        citationStyle: 'uppercase',
        citationFormat: 'abnt_upper',
        referenceHighlight: 'bold',
        referenceAlignment: 'justify',
      },
      updatedAt: now,
      metadata: {
        title: 'Título do Artigo no Padrão da SBC',
        subtitle: '',
        author: 'Nome dos Autores',
        advisor: '',
        nature: '',
        institution: 'Instituto de Informática — Universidade Federal',
        course: 'Departamento de Ciência da Computação',
        location: 'Porto Alegre — RS — Brasil',
        year: currentYear,
        abstract:
          'Este artigo descreve a arquitetura e os resultados experimentais de uma solução moderna para computação em nuvem e sistemas distribuídos.',
        keywords: ['SBC', 'Computação', 'Sistemas Distribuídos', 'Artigo Científico'],
        foreignAbstract:
          'This paper presents the architectural design and experimental evaluation of a modern solution for cloud computing and distributed systems.',
        foreignKeywords: ['Computer Science', 'Distributed Systems', 'Cloud Computing'],
      },
      blocks: [
        { id: crypto.randomUUID(), type: 'h1', content: '1 Introdução' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'A evolução dos sistemas computacionais demanda métodos ágeis e arquiteturas escaláveis. Neste trabalho, investigamos o impacto de novas abordagens na eficiência de processamento.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: '2 Trabalhos Relacionados' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Diversas pesquisas na literatura recente exploram técnicas correlatas, apresentando vantagens e limitações que motivaram a presente proposta.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: '3 Metodologia e Arquitetura Proposta' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'O modelo proposto é fundamentado em microsserviços desacoplados e execução paralela otimizada.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: '4 Avaliação Experimental' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Foram conduzidos testes de carga e análise de vazão, demonstrando melhorias expressivas de desempenho e redução de latência.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: '5 Conclusão' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Os resultados obtidos comprovam a eficácia da abordagem, fornecendo subsídios para futuras expansões em ambientes corporativos e acadêmicos.',
        },
      ],
      references: [
        {
          id: crypto.randomUUID(),
          authors: 'SILVA, Roberto Carlos; SANTOS, Maria Clara',
          title: 'Arquiteturas modernas de computação distribuída e tolerância a falhas',
          city: 'Porto Alegre',
          publisher: 'SBC OpenLib',
          year: '2023',
        },
      ],
    };
  }

  if (templateType === 'ieee') {
    return {
      id,
      name: customName || 'Novo Artigo IEEE',
      templateType: 'ieee',
      templateConfig: {
        ...DEFAULT_TEMPLATE_CONFIG,
        preset: 'ieee',
        fontFamily: 'serif',
        fontSizePt: 10,
        lineSpacing: '1.0',
        columns: 2,
        includeCoverPage: false,
        includeTitlePage: false,
        includeToc: false,
        citationStyle: 'uppercase',
        citationFormat: 'ieee_numeric',
        referenceHighlight: 'italic',
        referenceAlignment: 'left',
        referenceSpacing: 'compact',
      },
      updatedAt: now,
      metadata: {
        title: 'High-Performance Edge Computing Architecture for Real-Time Sensor Networks',
        subtitle: '',
        author: 'Author Name',
        advisor: '',
        nature: '',
        institution: 'Department of Electrical Engineering, University Institute',
        course: 'Center for Applied Computing',
        location: 'São Paulo, Brazil',
        year: currentYear,
        abstract:
          'This paper presents a distributed edge computing framework designed to reduce latency in real-time sensor stream processing. Experimental validation demonstrates significant throughput enhancements.',
        keywords: ['Edge Computing', 'Sensor Networks', 'Real-time Processing', 'Throughput'],
      },
      blocks: [
        { id: crypto.randomUUID(), type: 'h1', content: 'I. Introduction' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'The proliferation of Internet-of-Things (IoT) devices has created unprecedented demands on modern network backbones. Decentralized edge processing offers a compelling paradigm to mitigate bandwidth bottlenecks.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: 'II. System Model and Formulation' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'We formalize the distributed queueing model considering asynchronous data arrival and deterministic processing constraints.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: 'III. Proposed Architecture' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Our modular architecture decomposes pipeline execution across heterogeneous nodes using zero-copy memory transfers.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: 'IV. Experimental Results' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Empirical benchmarks confirm a 42% latency reduction compared to centralized cloud orchestration baselines.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: 'V. Conclusion' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'The proposed framework establishes a resilient foundation for mission-critical edge deployments.',
        },
      ],
      references: [
        {
          id: crypto.randomUUID(),
          authors: 'Johnson, A.; Williams, B.',
          title: 'Decentralized optimization for edge intelligence',
          journal: 'IEEE Transactions on Computers',
          volume: '72',
          issue: '4',
          pages: '1012-1025',
          city: 'New York',
          publisher: 'IEEE',
          year: '2023',
          doi: '10.1109/TC.2023.1234567',
        },
      ],
    };
  }

  if (templateType === 'poster') {
    return {
      id,
      name: customName || 'Novo Pôster Científico A0',
      templateType: 'poster',
      templateConfig: {
        ...DEFAULT_TEMPLATE_CONFIG,
        preset: 'poster',
        fontFamily: 'sans',
        posterDimensions: 'a0',
        posterOrientation: 'portrait',
        posterColumns: 3,
        posterTheme: 'emerald',
        citationFormat: 'abnt_upper',
        referenceAlignment: 'justify',
        includeCoverPage: false,
        includeTitlePage: false,
        includeToc: false,
      },
      updatedAt: now,
      metadata: {
        title: 'Desenvolvimento e Análise Experimental de Novos Algoritmos Otimizados',
        subtitle: 'Mostra Científica e Simpósio Anual de Pesquisa e Extensão',
        author: 'Nome do Aluno / Bolsista de IC e Prof. Orientador',
        advisor: 'Prof. Orientador',
        nature: 'Pôster acadêmico apresentado no Simpósio de Pesquisa e Iniciação Científica.',
        institution: 'Universidade Federal de Ciência e Tecnologia',
        course: 'Laboratório de Inovação e Inteligência Computacional',
        location: 'São Paulo — SP',
        year: currentYear,
        abstract: '',
        keywords: ['Pôster', 'Iniciação Científica', 'Inovação', 'Pesquisa'],
      },
      blocks: [
        { id: crypto.randomUUID(), type: 'h1', content: '1. Introdução & Contextualização' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'O crescimento exponencial de dados requer métodos analíticos cada vez mais ágeis. Este projeto investiga novas arquiteturas para processamento inteligente.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: '2. Objetivos Principais' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Projetar, implementar e validar experimentalmente uma metodologia com menor consumo energético e elevada precisão.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: '3. Metodologia e Procedimentos' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Coleta de dados amostrais em bancada de testes, com normalização de séries temporais e validação cruzada k-fold.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: '4. Resultados Obtidos' },
        {
          id: crypto.randomUUID(),
          type: 'image',
          content: '',
          meta: {
            caption: 'Comparação da acurácia e taxa de resposta entre os modelos avaliados',
            source: 'Dados experimentais coletados em laboratório, 2026',
          },
        },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Observou-se um ganho consistente de 38% na velocidade de convergência com redução do desvio padrão.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: '5. Considerações Finais' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'A hipótese formulada foi corroborada pelos ensaios laboratoriais, indicando forte viabilidade para transferência de tecnologia.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: '6. Agradecimentos & Fomento' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Os autores agradecem o apoio financeiro e concessão de bolsa pelas agências CNPq, CAPES e Fundação de Apoio à Pesquisa.',
        },
      ],
      references: [
        {
          id: crypto.randomUUID(),
          authors: 'SILVA, M. E.; OLIVEIRA, P. R.',
          title: 'Metodologias visuais de comunicação científica para congressos',
          publisher: 'Editora Universitária',
          city: 'São Paulo',
          year: '2024',
        },
      ],
    };
  }

  if (templateType === 'universe_custom') {
    return {
      id,
      name: customName || 'Novo Projeto Typst Universe',
      templateType: 'universe_custom',
      templateConfig: {
        ...DEFAULT_TEMPLATE_CONFIG,
        preset: 'universe_custom',
        universePackage: '@preview/charged-ieee:0.1.1',
        universeEntrypoint: 'ieee',
        includeCoverPage: false,
        includeTitlePage: false,
        includeToc: false,
      },
      updatedAt: now,
      metadata: {
        title: 'Título do Documento Typst Universe',
        subtitle: '',
        author: 'Nome do Autor',
        advisor: '',
        nature: '',
        institution: 'Universidade / Instituição',
        course: '',
        location: 'São Paulo',
        year: currentYear,
        abstract: 'Resumo do trabalho acadêmico gerado a partir do Typst Universe.',
        keywords: ['Typst Universe', 'Template Comunitário'],
      },
      blocks: [
        { id: crypto.randomUUID(), type: 'h1', content: '1. Introdução' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Este documento utiliza um pacote comunitário oficial carregado a partir do Typst Universe.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: '2. Desenvolvimento' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content:
            'Você pode personalizar o identificador do pacote no menu Ferramentas para alternar entre diferentes modelos disponíveis no Universe.',
        },
        { id: crypto.randomUUID(), type: 'h1', content: '3. Conclusão' },
        {
          id: crypto.randomUUID(),
          type: 'paragraph',
          content: 'Conclusão dos resultados e discussões.',
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
          '<p>A elaboração de trabalhos acadêmicos no Brasil impõe aos estudantes um duplo desafio: a pesquisa científica e o cumprimento rigoroso das diretrizes de diagramação estabelecidas pela Associação Brasileira de Normas Técnicas (ABNT). Ferramentas como o Microsoft Word demandam ajustes manuais suscetíveis a erros, enquanto o ecossistema LaTeX apresenta uma curva de aprendizado íngreme para pesquisadores sem formação em computação.</p>',
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
          '<p>O objetivo principal deste projeto é democratizar o acesso à tipografia de alta qualidade, garantindo que o autor concentre seus esforços no conteúdo intelectual e na argumentação, delegando toda a complexidade de regras de paginação, citações e referências ao motor automatizado.</p>',
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
          '<p>A arquitetura do RedijaApp divide-se em três camadas principais: uma interface de usuário visual e interativa com atalhos de barra, um módulo transpilador que gera representações formais do documento e o compilador de alto desempenho Typst.</p>',
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
