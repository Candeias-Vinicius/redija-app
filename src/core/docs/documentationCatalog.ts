export interface StandardDocSection {
  code: string;
  title: string;
  summary: string;
  rulesApplied: string[];
}

export type AbntStandardDoc = StandardDocSection;

export const ABNT_STANDARDS_DOCS: StandardDocSection[] = [
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
      'Padroniza a hierarquia e o destaque tipográfico dos títulos de capítulos e subseções (da seção primária à quinária).',
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
      'Atendido pela estrutura pré-textual e seções para Tema, Problema, Hipótese, Objetivos, Justificativa, Referencial Teórico, Metodologia e Cronograma (em Quadros ABNT).',
    ],
  },
  {
    code: 'ABNT NBR 10719',
    title: 'Relatório Técnico e/ou Científico: Apresentação',
    summary:
      'Diretrizes para relatórios de estágio supervisionado, iniciação científica (PIBIC) e relatórios técnicos.',
    rulesApplied: [
      'Predefinição dedicada em "Norma & Layout" com estrutura formal de capa, folha de rosto, resumo, listas técnicas, desenvolvimento e anexos.',
    ],
  },
];

export const IEEE_GUIDELINES_DOCS: StandardDocSection[] = [
  {
    code: 'IEEE • Estrutura & Colunas',
    title: 'Diagramação de Artigos para Conferências IEEE (Two-Column)',
    summary:
      'Padrão internacional adotado em conferências de engenharia elétrica, eletrônica, telecomunicações e ciência da computação.',
    rulesApplied: [
      'Corpo do texto em 2 colunas (10 pt, fonte serifada), com título centralizado em destaque no topo da primeira página.',
      'Margens compactas oficiais: 1,9 cm superior, 2,54 cm inferior e 1,57 cm nas laterais.',
      'Seções principais em algarismos romanos (I. INTRODUCTION) e subseções alfabéticas em itálico.',
    ],
  },
  {
    code: 'IEEE • Abstract & Index Terms',
    title: 'Resumo Técnico e Descritores em Inglês',
    summary:
      'Conferências internacionais exigem Abstract objetivo entre 100 e 250 palavras em bloco contínuo seguido de Index Terms.',
    rulesApplied: [
      'Preencha os campos Abstract e Index Terms na aba lateral (sem necessidade de capa, folha de rosto ou sumário).',
      'Evite equações complexas, siglas não definidas e citações dentro do Abstract.',
    ],
  },
  {
    code: 'IEEE • Citações Numéricas [1]',
    title: 'Sistema Numérico de Referências e Chamadas',
    summary:
      'Diferente do autor-data tradicional brasileiro, o estilo IEEE referencia trabalhos por colchetes numerados.',
    rulesApplied: [
      'Configure o modo Numérico [1] na Central de Citações (já ativo por padrão ao criar artigos IEEE).',
      'Use o atalho "@" no editor para inserir chamadas [1], [2] sincronizadas com a ordem bibliográfica.',
    ],
  },
];

export const SBC_GUIDELINES_DOCS: StandardDocSection[] = [
  {
    code: 'SBC • Formato Oficial de Simpósios',
    title: 'Sociedade Brasileira de Computação (Artigos Completos e Resumidos)',
    summary:
      'Padrão oficial brasileiro utilizado no CSBC, SBES, SBRC, SBSI e workshops da SBC.',
    rulesApplied: [
      'Margens oficiais SBC: superior 3,5 cm, laterais 3,0 cm e inferior 2,5 cm em coluna única (12 pt, entrelinha simples).',
      'Cabeçalho direto na página 1 com título, autores, afiliação institucional e blocos bilíngues (Resumo e Abstract).',
      'Recomenda-se manter Resumo e Abstract concisos (tipicamente entre 50 e 200 palavras).',
    ],
  },
  {
    code: 'SBC • Seções & Referências',
    title: 'Organização Textual e Bibliografia',
    summary: 'Alinhamento com recomendações clássicas da computação no Brasil.',
    rulesApplied: [
      'Seções numeradas objetivas (1. Introdução, 2. Trabalhos Relacionados, 3. Metodologia, 4. Resultados, 5. Conclusão).',
      'Referências justificadas ou à esquerda configuráveis em "Layout das Referências e Citações".',
    ],
  },
];

export const POSTER_GUIDELINES_DOCS: StandardDocSection[] = [
  {
    code: 'Pôster Científico • Dimensões A0 / A1',
    title: 'Apresentação Visual em Congressos e Feiras de Iniciação Científica',
    summary:
      'Projetado para leitura rápida a 1–2 metros de distância, priorizando síntese visual, gráficos e resultados.',
    rulesApplied: [
      'Configure dimensão (A0, A1 ou A2), orientação (retrato/paisagem), 2 ou 3 colunas e paleta institucional em "Norma & Layout".',
      'Mantenha parágrafos curtos (idealmente < 120 palavras por seção) e priorize figuras, tabelas e equações-chave.',
      'Título, autores, afiliação e palavras-chave ficam destacados no banner superior do pôster.',
    ],
  },
];

export const GENERAL_GUIDELINES_DOCS: StandardDocSection[] = [
  {
    code: 'APA 7ª Edição & Documentos Livres',
    title: 'Norma Internacional Autor-Data e Personalização Avançada',
    summary:
      'Ideal para periódicos de psicologia, ciências sociais, relatórios executivos ou templates livres.',
    rulesApplied: [
      'Estilo APA 7ª Edição pré-configurado com margens de 2,54 cm, entrelinha dupla (2,0), citações (Autor, Ano) e destaque de títulos em itálico.',
      'Suporte a múltiplos formatos de chamada: Maiúsculas (SILVA, 2023), Caixa Mista (Silva, 2023), Numérico [1], Sobrescrito ¹ e APA (Silva, 2023).',
      'Personalização completa dos campos visíveis na barra lateral ("Personalizar Campos") e fontes baixadas sob demanda via CDN (Google Fonts / Fontsource).',
    ],
  },
  {
    code: 'Typst Universe',
    title: 'Templates Comunitários Externos (@preview/...)',
    summary:
      'Conecte qualquer pacote público do Typst Universe informando identificador e entrypoint na barra lateral.',
    rulesApplied: [
      'Se o compilador estiver offline, o RedijaApp utiliza automaticamente um layout fallback seguro para não perder seu rascunho.',
    ],
  },
];

export interface DocGuideArticle {
  id: string;
  badge: string;
  title: string;
  summary: string;
  bullets: string[];
  codeExample?: string;
}

export interface DocTrackSection {
  id: string;
  label: string;
  description: string;
  articles: DocGuideArticle[];
  standards?: StandardDocSection[];
}

export const DOCS_SECTIONS: DocTrackSection[] = [
  {
    id: 'primeiros-passos',
    label: 'Primeiros Passos & Editor',
    description:
      'Comece em segundos no editor visual em blocos e deixe o motor Typst WebAssembly gerar seu PDF em tempo real direto no navegador.',
    articles: [
      {
        id: 'inicio-acesso',
        badge: 'Acesso',
        title: 'Perfil Local (Convidado) ou Google Drive Pessoal',
        summary:
          'Você pode escrever sem criar conta ou conectar seu Google Drive para salvar e colaborar na nuvem.',
        bullets: [
          'Perfil Local: grava rascunhos e imagens no IndexedDB do navegador, funcionando mesmo sem internet.',
          'Login Google (BYOS): salva backups diretamente na sua conta usando o escopo restrito drive.file.',
          'Isolamento de contas: documentos locais nunca são mesclados automaticamente na conta Google de outra pessoa.',
        ],
      },
      {
        id: 'atalhos-editor',
        badge: 'Produtividade',
        title: 'Comandos Rápidos (/), Citações (@) e Blocos Modulares',
        summary:
          'Escreva sem tocar em código LaTeX/Typst usando blocos estilo Notion com arrastar-e-soltar.',
        bullets: [
          'Digite "/" em um parágrafo para inserir títulos H1–H5, citações diretas longas (>3 linhas), figuras, tabelas IBGE, quadros, equações, código e quebras de página.',
          'Digite "@" para buscar e inserir citações inline vinculadas às referências cadastradas na aba lateral.',
          'Reordene seções arrastando pela alça esquerda do bloco e use Ctrl+Z / Ctrl+Y para histórico completo.',
          'Ajuste livremente a largura da barra lateral, do editor e do visualizador de PDF no cabeçalho.',
        ],
      },
      {
        id: 'referencias-doi',
        badge: 'Referências',
        title: 'Cadastro Automático por DOI, ISBN e BibTeX (.bib)',
        summary:
          'Central universal de referências integrada ao editor e às chamadas normativas.',
        bullets: [
          'Informe um DOI para preencher título, autores, periódico e ano automaticamente via CrossRef.',
          'Importe lotes completos de arquivos .bib ou escolha entre 5 estilos de chamada: (SILVA, 2023), (Silva, 2023), numérico [1], sobrescrito ¹ e APA.',
        ],
      },
    ],
  },
  {
    id: 'normas-abnt',
    label: 'Normas ABNT (9 NBRs)',
    description:
      'Especificações implementadas nativamente no compilador Typst e verificadas em tempo real pelo Linter ABNT da barra lateral.',
    articles: [
      {
        id: 'abnt-linter-personalizar',
        badge: 'Automação',
        title: 'Linter em Tempo Real & Personalizar Campos',
        summary:
          'A aba lateral monitora capa, folha de rosto, tamanho do resumo e referências conforme o modelo ativo.',
        bullets: [
          'Ao alterar normas no Customizer (ex.: mudar margens ou citações), o indicador muda para "ABNT Modificado" e adapta o verificador.',
          'Pelo botão "Personalizar Campos", você pode ocultar ou exibir qualquer campo sem apagar o conteúdo (preservado na gaveta segura).',
        ],
      },
    ],
    standards: ABNT_STANDARDS_DOCS,
  },
  {
    id: 'templates-internacionais',
    label: 'SBC, IEEE, Pôsteres & Universe',
    description:
      'Além de TCCs e artigos ABNT, o RedijaApp adapta estrutura, barra lateral e compilação para padrões internacionais e eventos científicos.',
    articles: [
      {
        id: 'customizer-5-abas',
        badge: 'Personalização',
        title: 'Template Customizer (5 Abas)',
        summary:
          'Ajuste presets normativos, tipografia sob demanda, margens, citações e estrutura sem editar scripts.',
        bullets: [
          'Normas & Presets: alterne com um clique entre ABNT Clássica, ABNT 2023, Artigo 2 Colunas, APA 7ª, SBC, IEEE e Pôster A0/A1.',
          'Tipografia: utilize Tinos/Arimo offline ou carregue Google Fonts / Fontsource sob demanda via CDN.',
          'Página & Colunas: personalize margens, 1 ou 2 colunas, espaçamento e visibilidade de capa/sumário.',
        ],
      },
    ],
    standards: [
      ...SBC_GUIDELINES_DOCS,
      ...IEEE_GUIDELINES_DOCS,
      ...POSTER_GUIDELINES_DOCS,
      ...GENERAL_GUIDELINES_DOCS,
    ],
  },
  {
    id: 'importacao-exportacao',
    label: 'Importação & Exportação',
    description:
      'Migre trabalhos prontos em poucos segundos e exporte o documento final em PDF vetorial, código Typst ou backup portátil.',
    articles: [
      {
        id: 'importadores',
        badge: 'Importar',
        title: 'Word (.docx), Overleaf/LaTeX (.tex/.zip), Typst (.typ) e Backup (.redija)',
        summary:
          'O importador identifica automaticamente o modelo compatível e extrai título, autores, resumo, seções, imagens e bibliografia.',
        bullets: [
          'Microsoft Word (.docx): converte títulos hierárquicos, tabelas, listas e figuras embutidas com sanitização de HTML.',
          'LaTeX / Overleaf (.tex ou .zip): extrai capítulos, equações, pacotes, imagens em subpastas e entradas .bib.',
          'Typst (.typ ou .zip): lê estrutura de blocos, referências e diretivas @preview/... do Typst Universe.',
          'Backup Redija (.redija): restaura integralmente blocos, imagens em base64/blob, metadados e configurações.',
        ],
      },
      {
        id: 'exportadores',
        badge: 'Exportar',
        title: 'PDF Final, Projeto Typst (.typ / .zip) e Compilação Offline',
        summary:
          'Gere o PDF pronto para entrega ou leve os fontes puros para compilar localmente com o CLI oficial do Typst.',
        bullets: [
          'Baixar PDF: compilação vetorial de alta qualidade executada inteiramente no seu navegador (Web Worker).',
          'Exportar Projeto (.zip / .typ): inclui main.typ, arquivo de template normativo, referências e figuras organizadas.',
        ],
        codeExample: `# Compilar localmente após exportar o .zip:\ntypst compile main.typ`,
      },
    ],
  },
  {
    id: 'nuvem-colaboracao',
    label: 'Drive BYOS, P2P & Privacidade',
    description:
      'Arquitetura Privacy by Design: seus trabalhos não passam por bancos de dados proprietários de terceiros.',
    articles: [
      {
        id: 'drive-byos',
        badge: 'Armazenamento',
        title: 'Bring Your Own Storage (Google Drive) & Lixeira de 30 Dias',
        summary:
          'Sincronização segura usando sua conta pessoal e retenção contra exclusões acidentais.',
        bullets: [
          'Tokens OAuth2 permanecem apenas na memória da aba (RAM), reduzindo exposição em armazenamento persistente.',
          'Lixeira segura com contagem regressiva de 30 dias para restaurar projetos antes da remoção definitiva.',
          'Nas Configurações de Conta você pode revogar o acesso do aplicativo ou remover os arquivos da pasta no Drive.',
        ],
      },
      {
        id: 'colaboracao-p2p',
        badge: 'Tempo Real',
        title: 'Colaboração ao Vivo via WebRTC (P2P) & Auto-Merge',
        summary:
          'Edite simultaneamente com orientadores e coautores com indicadores de presença direto no bloco ativo.',
        bullets: [
          'Comunicação direta navegador-a-navegador via WebRTC (PeerJS) e BroadcastChannel entre abas locais.',
          'Mesclagem automática por timestamp de cada bloco (updatedAt) para evitar perda silenciosa de parágrafos.',
        ],
      },
    ],
  },
  {
    id: 'codigo-aberto',
    label: 'Código Aberto & Comunidade',
    description:
      'O RedijaApp é software livre sob licença GNU AGPL-3.0. Contribuições, correções e novos templates são sempre bem-vindos.',
    articles: [
      {
        id: 'como-contribuir-resumo',
        badge: 'Open Source',
        title: 'Repositório Oficial, Issues e Guia de Contribuição',
        summary:
          'Encontrou uma regra acadêmica para aprimorar ou quer rodar o projeto localmente?',
        bullets: [
          'Código-fonte completo disponível no GitHub (React 19, TypeScript 6, Vite 8, Typst WASM).',
          'Abra Issues para relatar bugs de diagramação ou sugerir normas institucionais e templates do Typst Universe.',
          'Consulte o README.md e o CONTRIBUTING.md do repositório para instruções de setup local, testes e fluxo de Pull Requests.',
        ],
      },
      {
        id: 'licenca-agpl-e-creditos',
        badge: 'AGPL-3.0 & Créditos',
        title: 'Licença AGPL-3.0, Marca & Créditos ao Motor Typst',
        summary:
          'Entenda os termos copyleft de rede do RedijaApp e as licenças originais do motor científico utilizado no navegador.',
        bullets: [
          'Licença do RedijaApp (GNU AGPL-3.0): o uso, estudo e modificação são livres; qualquer versão modificada disponibilizada em rede (SaaS) deve manter o código-fonte acessível sob AGPL-3.0.',
          'Identidade visual protegida: a licença do código não autoriza o uso do nome RedijaApp ou logotipo oficial em serviços hospedados por terceiros.',
          'Motor Tipográfico Typst & typst.ts (Apache-2.0): a compilação e renderização em WebAssembly são alimentadas por Typst (typst/typst) e typst.ts (Myriad-Dreamin), com fontes locais Tinos e Arimo (Apache-2.0). Consulte THIRD_PARTY_NOTICES.md.',
        ],
      },
    ],
  },
];

export function filterDocsSections(query: string): DocTrackSection[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return DOCS_SECTIONS;

  return DOCS_SECTIONS.map((section) => {
    const sectionMatches =
      section.label.toLowerCase().includes(normalized) ||
      section.description.toLowerCase().includes(normalized);

    if (sectionMatches) return section;

    const matchingArticles = section.articles.filter(
      (art) =>
        art.title.toLowerCase().includes(normalized) ||
        art.summary.toLowerCase().includes(normalized) ||
        art.badge.toLowerCase().includes(normalized) ||
        art.bullets.some((b) => b.toLowerCase().includes(normalized)),
    );

    const matchingStandards = section.standards?.filter(
      (std) =>
        std.code.toLowerCase().includes(normalized) ||
        std.title.toLowerCase().includes(normalized) ||
        std.summary.toLowerCase().includes(normalized) ||
        std.rulesApplied.some((r) => r.toLowerCase().includes(normalized)),
    );

    if (matchingArticles.length === 0 && (!matchingStandards || matchingStandards.length === 0)) {
      return null;
    }

    return {
      ...section,
      articles: matchingArticles,
      standards: matchingStandards,
    };
  }).filter((section): section is DocTrackSection => section !== null);
}
