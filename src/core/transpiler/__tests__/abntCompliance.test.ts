import { describe, expect, it } from 'vitest';
import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';
import {
  formatAuthorCase,
  formatCitationReference,
  generateMain,
  generateStandaloneTypst,
  generateTypstFiles,
  MAIN_FILE,
  TEMPLATE_FILE,
  transpileReference,
} from '../typstGenerator';
import {
  formatNarrativeCitation,
} from '../abntLinter';
import { AcademicReference, DocumentProject, DEFAULT_TEMPLATE_CONFIG } from '@/types/document';
import { ABNT_CONFIG } from '@/types/abnt';

function createAbntMonographProject(overrides?: Partial<DocumentProject>): DocumentProject {
  return {
    id: 'proj_abnt_nbr',
    name: 'Monografia NBR 14724 Completa',
    templateType: 'tcc',
    updatedAt: '2026-11-08T00:00:00.000Z',
    templateConfig: {
      ...DEFAULT_TEMPLATE_CONFIG,
      preset: 'abnt_classic',
    },
    metadata: {
      institution: 'Universidade Federal de Minas Gerais',
      course: 'Programa de Pós-Graduação em Ciência da Computação',
      author: 'Lucas Pereira dos Santos',
      title: 'Compilação Segura e Tipografia Acadêmica',
      subtitle: 'Conformidade Automática com Normas ABNT via Typst',
      nature:
        'Dissertação apresentada ao Programa de Pós-Graduação em Ciência da Computação da UFMG como requisito parcial para obtenção do título de Mestre.',
      advisor: 'Prof. Dr. Eduardo Fernandes',
      coadvisor: 'Profa. Dra. Marina Guimarães',
      location: 'Belo Horizonte',
      year: '2026',
      includeApprovalPage: true,
      approvalDate: '15 de dezembro de 2026',
      committeeMembers: [
        'Prof. Dr. Carlos Drumond — UFMG',
        'Profa. Dra. Clarice Lispector — USP',
      ],
      dedicatory: 'Aos meus pais, que sempre incentivaram a busca pelo conhecimento.',
      acknowledgments:
        'Agradeço à universidade, aos professores do departamento e aos meus colegas de laboratório.',
      epigraph: 'A ciência é a busca constante pela verdade.',
      epigraphAuthor: 'Albert Einstein',
      abstract:
        'Este trabalho aborda a automação de documentos acadêmicos em conformidade com as normas da ABNT. São analisados os requisitos das normas NBR 14724 para estrutura do trabalho acadêmico, NBR 10520 para citações diretas e indiretas no sistema autor-data, NBR 6023 para referências bibliográficas e NBR 6028 para resumos. A ferramenta desenvolvida integra um transpilador visual com o motor de diagramação Typst, proporcionando compilação em tempo real e garantindo fidelidade às especificações de margens, espaçamentos, fontes e numeração progressiva de seções. Os resultados demonstram redução significativa de erros normativos em trabalhos de conclusão de curso e dissertações.',
      keywords: ['ABNT', 'NBR 14724', 'NBR 10520', 'Typst', 'Automação'],
      foreignAbstract:
        'This research focuses on the automated generation of academic documents adhering strictly to Brazilian ABNT standards. We analyze the technical requirements of NBR 14724 for academic document structure, NBR 10520 for in-text citations, and NBR 6023 for bibliography formatting. By pairing a web-based rich-text interface with the Typst typesetting system, the proposed platform renders high-fidelity documents in real time while maintaining strict compliance with official typography and pagination rules.',
      foreignKeywords: ['ABNT Standards', 'Academic Writing', 'Typst', 'Typesetting'],
      includeFiguresList: true,
      includeTablesList: true,
      includeBoxesList: true,
      abbreviations: 'ABNT — Associação Brasileira de Normas Técnicas\nUFMG — Universidade Federal de Minas Gerais',
      symbols: 'Ω — Ohm (resistência elétrica)\nλ — Comprimento de onda',
      glossary: 'Transpilação: Processo de conversão de código-fonte de uma linguagem para outra de nível equivalente.',
      appendices: 'APÊNDICE A — Questionário aplicado aos pesquisadores.',
      annexes: 'ANEXO A — Portaria institucional nº 42/2026.',
    },
    blocks: [
      { id: 'b1', type: 'h1', content: '1 INTRODUÇÃO' },
      {
        id: 'b2',
        type: 'paragraph',
        content:
          'A padronização de trabalhos acadêmicos no Brasil é regulamentada pela ABNT, com destaque para a NBR 14724 e a NBR 10520.',
      },
      { id: 'b3', type: 'h2', content: '1.1 Justificativa e Objetivos' },
      {
        id: 'b4',
        type: 'quote_long',
        content:
          'A ciência e a tecnologia desempenham papéis cruciais no desenvolvimento social e econômico de uma nação moderna.',
        meta: {
          author: 'SILVA, Roberto; SOUZA, Maria',
          year: '2023',
          page: '45-47',
        },
      },
      {
        id: 'b5',
        type: 'image',
        content: '',
        meta: {
          caption: 'Fluxo de processamento do documento',
          source: 'Elaborado pelo autor (2026)',
        },
      },
      {
        id: 'b6',
        type: 'table',
        content: '',
        meta: {
          caption: 'Comparativo de desempenho entre compiladores',
          source: 'Dados obtidos experimentalmente pelo autor (2026)',
          headers: ['Métrica', 'Typst', 'LaTeX'],
          rows: [
            ['Tempo Médio', '48 ms', '1450 ms'],
            ['Uso de Memória', '28 MB', '180 MB'],
          ],
        },
      },
      {
        id: 'b7',
        type: 'box',
        content: '',
        meta: {
          caption: 'Categorização de normas técnicas de documentação',
          source: 'Adaptado de ABNT (2023)',
          headers: ['Norma', 'Finalidade'],
          rows: [
            ['NBR 14724', 'Trabalhos acadêmicos'],
            ['NBR 10520', 'Citações em documentos'],
            ['NBR 6023', 'Referências'],
          ],
        },
      },
      { id: 'b8', type: 'h1', content: '2 METODOLOGIA' },
      {
        id: 'b9',
        type: 'paragraph',
        content: 'O método proposto utiliza gramática formal e análise léxica para validação dos blocos.',
      },
    ],
    references: [
      {
        id: 'r1',
        type: 'book',
        authors: 'SILVA, Roberto; SOUZA, Maria',
        title: 'Engenharia de Software Moderna',
        subtitle: 'Princípios e Práticas',
        edition: '2',
        city: 'São Paulo',
        publisher: 'Campus Elsevier',
        year: '2023',
      },
      {
        id: 'r2',
        type: 'article',
        authors: 'ALMEIDA, Carlos; PEREIRA, Ana; SANTOS, Bruno; COSTA, Daniela',
        title: 'Avaliação de Desempenho de Motores Tipográficos na Web',
        journal: 'Revista Brasileira de Computação Aplicada',
        volume: '15',
        issue: '3',
        pages: '102-118',
        city: 'Porto Alegre',
        publisher: 'SBC',
        year: '2025',
        doi: '10.1000/rbca.2025.102',
      },
      {
        id: 'r3',
        type: 'thesis',
        authors: 'MARTINS, Fernanda',
        title: 'Transpilação Segura de Documentos Visuais',
        degree: 'Tese (Doutorado em Ciência da Computação)',
        institution: 'Universidade Federal do Rio de Janeiro',
        city: 'Rio de Janeiro',
        publisher: 'UFRJ',
        year: '2024',
      },
      {
        id: 'r4',
        type: 'website',
        authors: 'BRASIL. Ministério da Educação',
        title: 'Diretrizes Curriculares Nacionais para Cursos de Computação',
        url: 'https://mec.gov.br/diretrizes-computacao',
        accessDate: '01 nov. 2026',
        city: 'Brasília',
        publisher: 'MEC',
        year: '2022',
      },
    ],
    ...overrides,
  };
}

describe('Conformidade ABNT NBR 10520 (Citações)', () => {
  it('formata citação autor-data com 1 autor extraindo apenas o sobrenome', () => {
    // 1 autor com prenome: deve manter apenas o sobrenome
    expect(formatCitationReference('SILVA, Roberto', '2023', '42')).toBe('SILVA, 2023, p. 42');
    expect(formatCitationReference('Roberto Silva', '2023')).toBe('SILVA, 2023');

    // Titlecase (NBR 10520:2023)
    expect(formatCitationReference('SILVA, Roberto', '2023', '42', 'titlecase')).toBe(
      'Silva, 2023, p. 42',
    );
  });

  it('formata citação autor-data com 2 autores separados por ponto e vírgula', () => {
    // 2 autores: NBR 10520 exige apenas os sobrenomes separados por ponto e vírgula
    expect(formatCitationReference('SILVA, Roberto; SOUZA, Maria', '2023')).toBe('SILVA; SOUZA, 2023');
    expect(formatCitationReference('SILVA, Roberto; SOUZA, Maria', '2023', '10', 'titlecase')).toBe(
      'Silva; Souza, 2023, p. 10',
    );
  });

  it('formata citação autor-data com 3 autores', () => {
    expect(
      formatCitationReference('SILVA, R.; SOUZA, M.; SANTOS, P.', '2024'),
    ).toBe('SILVA; SOUZA; SANTOS, 2024');
    expect(
      formatCitationReference('SILVA, R.; SOUZA, M.; SANTOS, P.', '2024', undefined, 'titlecase'),
    ).toBe('Silva; Souza; Santos, 2024');
  });

  it('formata citação autor-data com 4 ou mais autores com et al.', () => {
    expect(
      formatCitationReference('ALMEIDA, C.; PEREIRA, A.; SANTOS, B.; COSTA, D.', '2025', '110'),
    ).toBe('ALMEIDA et al., 2025, p. 110');
    expect(
      formatCitationReference('ALMEIDA, C.; PEREIRA, A.; SANTOS, B.; COSTA, D.', '2025', '110', 'titlecase'),
    ).toBe('Almeida et al., 2025, p. 110');
  });

  it('formata citação de citação (apud) conforme NBR 10520', () => {
    expect(formatAuthorCase('SILVA, Roberto apud SOUZA, Maria')).toBe('SILVA apud SOUZA');
    expect(formatAuthorCase('SILVA, Roberto apud SOUZA, Maria', 'titlecase')).toBe('Silva apud Souza');
  });

  it('formata chamada narrativa de autor no texto', () => {
    const ref1: AcademicReference = {
      id: '1',
      authors: 'SILVA, Roberto',
      title: 'Livro',
      city: 'SP',
      publisher: 'Ed',
      year: '2023',
    };
    expect(formatNarrativeCitation(ref1, '45')).toBe('Silva (2023, p. 45)');

    const ref2: AcademicReference = {
      id: '2',
      authors: 'SILVA, Roberto; SOUZA, Maria',
      title: 'Livro',
      city: 'SP',
      publisher: 'Ed',
      year: '2023',
    };
    expect(formatNarrativeCitation(ref2)).toBe('Silva e Souza (2023)');

    const ref3: AcademicReference = {
      id: '3',
      authors: 'SILVA, Roberto; SOUZA, Maria; SANTOS, Bruno',
      title: 'Livro',
      city: 'SP',
      publisher: 'Ed',
      year: '2023',
    };
    expect(formatNarrativeCitation(ref3)).toBe('Silva, Souza e Santos (2023)');

    const ref4: AcademicReference = {
      id: '4',
      authors: 'ALMEIDA, C.; PEREIRA, A.; SANTOS, B.; COSTA, D.',
      title: 'Artigo',
      city: 'SP',
      publisher: 'Ed',
      year: '2025',
    };
    expect(formatNarrativeCitation(ref4)).toBe('Almeida et al. (2025)');
  });

  it('aplica recuo de 4 cm e fonte menor para citações longas no modelo Typst', () => {
    const proj = createAbntMonographProject();
    const main = generateMain(proj);

    // Deve transpolar o bloco quote_long usando a macro #citacao(...) conforme NBR 10520:2023 (caixa mista)
    expect(main).toContain('#citacao(referencia: [Silva; Souza, 2023, p. 45\\-47])');

    // Valida que o abnt.typ define citação com inset de 4cm e fonte proporcional (0.85em)
    const files = generateTypstFiles(proj);
    const abntTyp = files[TEMPLATE_FILE];
    expect(abntTyp).toContain('inset: (left: 4cm)');
    expect(abntTyp).toContain('set text(size: 0.85em)');
    expect(abntTyp).toContain('entrelinha-simples');
  });

  it('escala citações longas e elementos auxiliares proporcionalmente quando fontSizePt muda (ex.: 16pt)', () => {
    const baseProj = createAbntMonographProject();
    const proj = {
      ...baseProj,
      templateConfig: {
        ...baseProj.templateConfig!,
        preset: 'custom' as const,
        fontSizePt: 16,
      },
    };
    const standalone = generateStandaloneTypst(proj);
    expect(standalone).toContain('tamanho-fonte: 16pt');

    const compiler = NodeCompiler.create();
    const compileResult = compiler.compile({ mainFileContent: standalone });
    expect(compileResult.hasError()).toBe(false);
    const pdfBuffer = compiler.pdf(compileResult.result!);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});

describe('Conformidade ABNT NBR 14724 (Trabalhos Acadêmicos: Estrutura e Apresentação)', () => {
  it('garante parâmetros canônicos de margens e fontes na configuração ABNT', () => {
    expect(ABNT_CONFIG.margins.top).toBe('3cm');
    expect(ABNT_CONFIG.margins.left).toBe('3cm');
    expect(ABNT_CONFIG.margins.bottom).toBe('2cm');
    expect(ABNT_CONFIG.margins.right).toBe('2cm');
    expect(ABNT_CONFIG.fontSize).toBe('12pt');
    expect(ABNT_CONFIG.fontSizeQuoteLong).toBe('10pt');
    expect(ABNT_CONFIG.lineSpacing).toBe(1.5);
    expect(ABNT_CONFIG.lineSpacingQuoteLong).toBe(1.0);
    expect(ABNT_CONFIG.paragraphIndent).toBe('1.25cm');
    expect(ABNT_CONFIG.quoteLongIndent).toBe('4cm');
  });

  it('estrutura a ordem canônica dos elementos pré-textuais e pós-textuais (NBR 14724)', () => {
    const proj = createAbntMonographProject();
    const files = generateTypstFiles(proj);
    const abntTyp = files[TEMPLATE_FILE];
    const main = files[MAIN_FILE];

    // Ordem no template abnt.typ:
    // Capa -> Folha de Rosto -> Folha de Aprovação -> Dedicatória -> Agradecimentos -> Epígrafe -> Resumo -> Abstract -> Listas -> Sumário
    const idxCapa = abntTyp.indexOf('// ------------------------------- CAPA');
    const idxRosto = abntTyp.indexOf('// -------------------------- FOLHA DE ROSTO');
    const idxAprov = abntTyp.indexOf('// ----------------------- FOLHA DE APROVAÇÃO');
    const idxDedic = abntTyp.indexOf('// --------------------------- DEDICATÓRIA');
    const idxAgrad = abntTyp.indexOf('// ------------------------- AGRADECIMENTOS');
    const idxEpig = abntTyp.indexOf('// ----------------------------- EPÍGRAFE');
    const idxResumo = abntTyp.indexOf('// ------------------------------ RESUMO');
    const idxAbstract = abntTyp.indexOf('// ----------------------------- ABSTRACT');
    const idxFiguras = abntTyp.indexOf('// ----------------------- LISTA DE ILUSTRAÇÕES');
    const idxQuadros = abntTyp.indexOf('// ------------------------- LISTA DE QUADROS');
    const idxTabelas = abntTyp.indexOf('// ------------------------- LISTA DE TABELAS');
    const idxSumario = abntTyp.indexOf('// ------------------------------ SUMÁRIO');
    const idxTextual = abntTyp.indexOf('// -------------------------- PARTE TEXTUAL');

    expect(idxCapa).toBeGreaterThan(-1);
    expect(idxRosto).toBeGreaterThan(idxCapa);
    expect(idxAprov).toBeGreaterThan(idxRosto);
    expect(idxDedic).toBeGreaterThan(idxAprov);
    expect(idxAgrad).toBeGreaterThan(idxDedic);
    expect(idxEpig).toBeGreaterThan(idxAgrad);
    expect(idxResumo).toBeGreaterThan(idxEpig);
    expect(idxAbstract).toBeGreaterThan(idxResumo);
    expect(idxFiguras).toBeGreaterThan(idxAbstract);
    expect(idxQuadros).toBeGreaterThan(idxFiguras);
    expect(idxTabelas).toBeGreaterThan(idxQuadros);
    expect(idxSumario).toBeGreaterThan(idxTabelas);
    expect(idxTextual).toBeGreaterThan(idxSumario);

    // Elementos pós-textuais no main.typ: Referências -> Glossário -> Apêndices -> Anexos
    const idxRefs = main.indexOf('#referencias(');
    const idxGlossario = main.indexOf('GLOSSÁRIO');
    const idxApendices = main.indexOf('APÊNDICES');
    const idxAnexos = main.indexOf('ANEXOS');

    expect(idxRefs).toBeGreaterThan(-1);
    expect(idxGlossario).toBeGreaterThan(idxRefs);
    expect(idxApendices).toBeGreaterThan(idxGlossario);
    expect(idxAnexos).toBeGreaterThan(idxApendices);
  });

  it('configura folha de aprovação com banca examinadora, orientador, coorientador e data', () => {
    const proj = createAbntMonographProject();
    const main = generateMain(proj);
    const files = generateTypstFiles(proj);
    const abntTyp = files[TEMPLATE_FILE];

    expect(main).toContain('incluir-folha-aprovacao: true');
    expect(main).toContain('data-aprovacao: "15 de dezembro de 2026"');
    expect(main).toContain('orientador: "Prof. Dr. Eduardo Fernandes"');
    expect(main).toContain('coorientador: "Profa. Dra. Marina Guimarães"');
    expect(main).toContain('banca: ("Prof. Dr. Carlos Drumond — UFMG", "Profa. Dra. Clarice Lispector — USP",)');

    // Verifica que o modelo abnt.typ renderiza linhas de assinatura para orientador e coorientador
    expect(abntTyp).toContain('#if orientador != none [');
    expect(abntTyp).toContain('#orientador (Orientador(a))');
    expect(abntTyp).toContain('#if coorientador != none [');
    expect(abntTyp).toContain('#coorientador (Coorientador(a))');
  });

  it('diferencia normas IBGE/ABNT para Tabelas (abertas lateralmente) e Quadros (fechados)', () => {
    const proj = createAbntMonographProject();
    const main = generateMain(proj);

    // Tabela: stroke com x: none
    expect(main).toContain('#tabela(legenda: [Comparativo de desempenho entre compiladores]');
    expect(main).toContain('stroke: (x: none, y: 0.5pt + luma(160))');

    // Quadro: stroke uniforme 0.5pt
    expect(main).toContain('#quadro(legenda: [Categorização de normas técnicas de documentação]');
    expect(main).toContain('stroke: 0.5pt + luma(140)');
  });

  it('aplica numeração progressiva de seções (NBR 6024) com destaque hierárquico', () => {
    const files = generateTypstFiles(createAbntMonographProject());
    const abntTyp = files[TEMPLATE_FILE];

    // NBR 6024: Seções primárias em caixa alta e negrito
    expect(abntTyp).toContain('show heading.where(level: 1): it => {');
    expect(abntTyp).toContain('text(weight: "bold", upper(it))');

    // NBR 6024: Seções secundárias em negrito
    expect(abntTyp).toContain('show heading.where(level: 2): it => text(weight: "bold", it)');

    // NBR 6024: Seções terciárias em itálico
    expect(abntTyp).toContain('show heading.where(level: 3): it => text(weight: "regular", style: "italic", it)');

    // NBR 6024: Seções quaternárias sublinhadas
    expect(abntTyp).toContain('show heading.where(level: 4): it => text(weight: "regular", underline(it))');

    // NBR 6024: Seções quinárias regulares
    expect(abntTyp).toContain('show heading.where(level: 5): it => text(weight: "regular", it)');
  });
});

describe('Conformidade ABNT NBR 6023 (Referências)', () => {
  it('formata referência de livro com destaque tipográfico no título principal e não no subtítulo', () => {
    const ref: AcademicReference = {
      id: '1',
      type: 'book',
      authors: 'SILVA, Roberto; SOUZA, Maria',
      title: 'Engenharia de Software',
      subtitle: 'Uma Abordagem Prática',
      edition: '3',
      city: 'Porto Alegre',
      publisher: 'Bookman',
      year: '2024',
    };
    const typst = transpileReference(ref);
    expect(typst).toBe(
      '[SILVA, ROBERTO; SOUZA, MARIA. #strong[Engenharia de Software]: Uma Abordagem Prática. 3. ed. Porto Alegre: Bookman, 2024.]',
    );
  });

  it('formata referência de artigo de periódico com destaque no título da revista', () => {
    const ref: AcademicReference = {
      id: '2',
      type: 'article',
      authors: 'ALMEIDA, Carlos',
      title: 'Compiladores Modernos',
      journal: 'Revista de Informática Teórica e Aplicada',
      volume: '30',
      issue: '2',
      pages: '45-60',
      city: 'Porto Alegre',
      publisher: 'UFRGS',
      year: '2025',
      doi: '10.1000/rita.2025',
    };
    const typst = transpileReference(ref);
    expect(typst).toBe(
      '[ALMEIDA, CARLOS. Compiladores Modernos. #strong[Revista de Informática Teórica e Aplicada], Porto Alegre, v. 30, n. 2, p. 45\\-60, 2025. DOI: 10\\.1000\\/rita.2025.]',
    );
  });

  it('formata referência de 4 ou mais autores com primeiro autor e et al. seguido de ponto', () => {
    const ref: AcademicReference = {
      id: '3',
      authors: 'SILVA, A.; SOUZA, B.; SANTOS, C.; PEREIRA, D.',
      title: 'Arquitetura de Software',
      city: 'São Paulo',
      publisher: 'Novatec',
      year: '2024',
    };
    const typst = transpileReference(ref);
    expect(typst).toContain('SILVA, A. #emph[et al.]. #strong[Arquitetura de Software]');
  });

  it('formata referência de documento eletrônico/website sem impor [S. l.]: [s. n.] espúrio (NBR 6023 item 7.14)', () => {
    const webRef: AcademicReference = {
      id: 'web_ref_1',
      type: 'website',
      authors: 'W3C',
      title: 'Web Content Accessibility Guidelines (WCAG) 2.2',
      city: '',
      publisher: '',
      year: '2023',
      url: 'https://www.w3.org/TR/WCAG22/',
      accessDate: '08 nov. 2026',
    };
    const typst = transpileReference(webRef);
    expect(typst).toBe(
      '[W3C. #strong[Web Content Accessibility Guidelines (WCAG) 2.2]. 2023. Disponível em: https:\\/\\/www.w3.org\\/TR\\/WCAG22\\/. Acesso em: 08 nov. 2026.]',
    );
    expect(typst).not.toContain('[S. l.]');
    expect(typst).not.toContain('[s. n.]');
  });

  it('formata referência de legislação destacando a publicação oficial (NBR 6023 item 7.9)', () => {
    const legRef: AcademicReference = {
      id: 'leg_ref_1',
      type: 'legislation',
      authors: 'BRASIL',
      title: 'Lei nº 13.709, de 14 de agosto de 2018',
      subtitle: 'Lei Geral de Proteção de Dados Pessoais (LGPD)',
      journal: 'Diário Oficial da União',
      city: 'Brasília, DF',
      publisher: '',
      year: '2018',
    };
    const typst = transpileReference(legRef);
    expect(typst).toBe(
      '[BRASIL. Lei nº 13.709, de 14 de agosto de 2018: Lei Geral de Proteção de Dados Pessoais (LGPD). #strong[Diário Oficial da União], Brasília, DF, 2018.]',
    );
  });

  it('ordena a lista de referências estritamente em ordem alfabética', () => {
    const proj = createAbntMonographProject();
    const main = generateMain(proj);

    // Extrai o bloco de referências do main.typ
    const refBlockStart = main.indexOf('#referencias(');
    const refBlock = main.slice(refBlockStart);

    // Ordem esperada na bibliografia: ALMEIDA, BRASIL, MARTINS, SILVA
    const idxAlmeida = refBlock.indexOf('ALMEIDA');
    const idxBrasil = refBlock.indexOf('BRASIL');
    const idxMartins = refBlock.indexOf('MARTINS');
    const idxSilva = refBlock.indexOf('SILVA, ROBERTO');

    expect(idxAlmeida).toBeGreaterThan(-1);
    expect(idxBrasil).toBeGreaterThan(idxAlmeida);
    expect(idxMartins).toBeGreaterThan(idxBrasil);
    expect(idxSilva).toBeGreaterThan(idxMartins);
  });
});

describe('Validação de Compilação WASM de Documento ABNT NBR 14724 Completo', () => {
  it('compila monografia ABNT completa com todos os elementos pré, textuais e pós-textuais sem erros', () => {
    const project = createAbntMonographProject();
    const standalone = generateStandaloneTypst(project);

    const compiler = NodeCompiler.create();
    const compileResult = compiler.compile({ mainFileContent: standalone });

    const err = compileResult.takeError();
    if (err) {
      const diagnostics = compiler.fetchDiagnostics(err);
      throw new Error(`Falha de compilação ABNT Typst: ${JSON.stringify(diagnostics, null, 2)}`);
    }

    expect(compileResult.result).toBeTruthy();
    const pdfBuffer = compiler.pdf(compileResult.result!);
    expect(pdfBuffer.byteLength).toBeGreaterThan(5000);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
