import { describe, expect, it } from 'vitest';
import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';
import {
  escapeMarkup,
  escapeString,
  richTextToTypst,
  stripHtmlTags,
  typstContent,
  typstString,
} from '../escape';
import {
  extractBinaryAssets,
  formatCitationReference,
  generateMain,
  generateStandaloneTypst,
  generateTypstFiles,
  MAIN_FILE,
  stripManualNumbering,
  TEMPLATE_FILE,
  transpileReference,
} from '../typstGenerator';
import {
  countWords,
  exportToBibtex,
  formatShortCitation,
  getPrimarySurname,
  parseBibtex,
  runAbntLinter,
} from '../abntLinter';
import { DocumentProject, DEFAULT_TEMPLATE_CONFIG } from '@/types/document';

function createSampleProject(overrides?: Partial<DocumentProject>): DocumentProject {
  return {
    id: 'test_proj',
    name: 'Projeto Teste ABNT',
    updatedAt: '2026-11-06T00:00:00.000Z',
    metadata: {
      title: 'Análise de Sistemas Web',
      subtitle: 'Estudo de caso com Typst',
      author: 'Maria Silva',
      advisor: 'Prof. Dr. João Souza',
      nature: 'Trabalho de Conclusão de Curso apresentado ao Curso de Ciência da Computação.',
      institution: 'Universidade Federal',
      course: 'Ciência da Computação',
      location: 'São Paulo',
      year: '2026',
      abstract: 'Resumo do trabalho com caracteres especiais como $100, #tag, 50% e *asteriscos*.',
      keywords: ['ABNT', 'Typst', 'WebAssembly'],
      dedicatory: 'Dedico este trabalho à ciência aberta.',
      acknowledgments: 'Agradeço aos professores e colegas.',
      epigraph: 'Em algum lugar, algo incrível está esperando para ser descoberto.',
      epigraphAuthor: 'Carl Sagan',
      foreignAbstract: 'This work presents a web platform for ABNT academic writing.',
      foreignKeywords: ['ABNT', 'Typst', 'Academic Writing'],
      includeFiguresList: true,
      includeTablesList: true,
    },
    blocks: [
      { id: '1', type: 'h1', content: '1 INTRODUÇÃO' },
      {
        id: '2',
        type: 'paragraph',
        content:
          'Texto com símbolos que quebrariam Typst sem escape: $50, #importante, *negrito*, _itálico_, <tag>, @ref, ~til, =igual, +mais, -menos e https://exemplo.com/rota//teste.',
      },
      { id: '3', type: 'h2', content: '1.1 Objetivos Específicos' },
      {
        id: '4',
        type: 'quote_long',
        content: 'Citação longa com caracteres especiais: $x = y + 1$ e #comando.',
        meta: { author: 'Silva', year: '2023', page: '42' },
      },
      { id: '5', type: 'bullet', content: 'Item de lista com #hash e $cifrão' },
      { id: '6', type: 'numbered', content: '1. Item numerado' },
      {
        id: '7',
        type: 'image',
        content: '',
        meta: { caption: 'Arquitetura #1 do sistema', source: 'Dados da pesquisa (2026)' },
      },
      {
        id: '8',
        type: 'table',
        content: '',
        meta: {
          caption: 'Desempenho de compilação',
          source: 'Elaborado pelo autor (2026)',
          headers: ['Motor', 'Tempo (ms)'],
          rows: [
            ['Typst WASM', '45 ms'],
            ['LaTeX', '1200 ms'],
          ],
        },
      },
      {
        id: '9',
        type: 'footnote',
        content: '<p>Nota explicativa com <strong>negrito</strong> e <em>itálico</em>.</p>',
      },
      {
        id: '10',
        type: 'pagebreak',
        content: '',
      },
    ],
    references: [
      {
        id: 'r1',
        authors: 'SILVA, Maria; SOUZA, João',
        title: 'Engenharia de Software Moderna',
        subtitle: 'Princípios e Práticas',
        edition: '2',
        city: 'São Paulo',
        publisher: 'Editora Acadêmica',
        year: '2024',
        url: 'https://exemplo.com/livro?a=1&b=2#cap1',
        accessDate: '06 nov. 2026',
      },
      {
        id: 'r2',
        type: 'article',
        authors: 'ALMEIDA, Carlos',
        title: 'Compiladores e Transpiladores',
        journal: 'Revista Brasileira de Computação',
        volume: '15',
        issue: '2',
        pages: '10-25',
        city: 'Rio de Janeiro',
        publisher: 'Tech Books',
        year: '2022',
        doi: '10.1000/rbc.2022',
      },
    ],
    ...overrides,
  };
}

describe('escape helpers', () => {
  it('escapes special markup characters in user text', () => {
    const raw = 'Custo $50 #tag *ast* _sub_ `code` @at <lt> [br] ~til /bar =eq +plus -minus \\backslash';
    const escaped = escapeMarkup(raw);
    expect(escaped).toContain('\\$50');
    expect(escaped).toContain('\\#tag');
    expect(escaped).toContain('\\*ast\\*');
    expect(escaped).toContain('\\_sub\\_');
    expect(escaped).toContain('\\@at');
    expect(escaped).toContain('\\<lt\\>');
    expect(escaped).toContain('\\[br\\]');
    expect(escaped).toContain('\\/bar');
    expect(escaped).toContain('\\\\backslash');
  });

  it('escapes numbered list triggers at start of lines', () => {
    expect(escapeMarkup('1. Primeiro item')).toBe('1\\. Primeiro item');
    expect(escapeMarkup('2) Segundo item')).toBe('2\\) Segundo item');
  });

  it('escapes strings for Typst string literals', () => {
    expect(escapeString('Texto com "aspas" e \\barra\nnova linha')).toBe(
      'Texto com \\"aspas\\" e \\\\barra\\nnova linha',
    );
    expect(typstString('Olá "mundo"')).toBe('"Olá \\"mundo\\""');
    expect(typstContent('Valor #1')).toBe('[Valor \\#1]');
  });

  it('converts TipTap HTML formatting to Typst markup while escaping special characters', () => {
    const html =
      '<p>Texto com <strong>negrito $10</strong>, <em>itálico #1</em>, <u>sublinhado</u>, H<sub>2</sub>O e x<sup>2</sup>.</p>';
    const typst = richTextToTypst(html);
    expect(typst).toBe(
      'Texto com #strong[negrito \\$10], #emph[itálico \\#1], #underline[sublinhado], H#sub[2]O e x#super[2].',
    );
    expect(stripHtmlTags(html)).toBe(
      'Texto com negrito $10, itálico #1, sublinhado, H2O e x2.',
    );
  });

  it('extracts binary image assets from Data URLs', () => {
    const pngBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const proj = createSampleProject({
      blocks: [
        {
          id: 'img_1',
          type: 'image',
          content: '',
          meta: { caption: 'Pixel', source: 'Autor', imageDataUrl: pngBase64 },
        },
      ],
    });

    const assets = extractBinaryAssets(proj);
    expect(assets['/assets/img_img_1.png']).toBeInstanceOf(Uint8Array);
    expect(assets['/assets/img_img_1.png'].byteLength).toBeGreaterThan(10);
  });
});

describe('typstGenerator helpers', () => {
  it('strips manual section numbering from headings', () => {
    expect(stripManualNumbering('1 INTRODUÇÃO')).toBe('INTRODUÇÃO');
    expect(stripManualNumbering('1.1 Justificativa')).toBe('Justificativa');
    expect(stripManualNumbering('2.3.4. Resultados')).toBe('Resultados');
    expect(stripManualNumbering('Conclusão')).toBe('Conclusão');
  });

  it('formats citation reference according to ABNT NBR 10520', () => {
    expect(formatCitationReference('Silva', '2023', '42')).toBe('SILVA, 2023, p. 42');
    expect(formatCitationReference('Silva', '2023')).toBe('SILVA, 2023');
    expect(formatCitationReference('', '', '')).toBe('');
  });

  it('formats bibliographic reference and sorts alphabetically', () => {
    const ref = transpileReference({
      id: '1',
      authors: 'silva, joão',
      title: 'Título da Obra',
      subtitle: 'Subtítulo',
      edition: '3',
      city: 'São Paulo',
      publisher: 'Editora X',
      year: '2025',
    });
    expect(ref).toBe('[SILVA, JOÃO. #strong[Título da Obra]: Subtítulo. 3. ed. São Paulo: Editora X, 2025.]');

    const main = generateMain(createSampleProject());
    const idxAlmeida = main.indexOf('ALMEIDA');
    const idxSilva = main.indexOf('SILVA, MARIA');
    expect(idxAlmeida).toBeGreaterThan(-1);
    expect(idxSilva).toBeGreaterThan(idxAlmeida);
  });

  it('runs ABNT linter for word count, uncited references, and citation formatting', () => {
    expect(countWords('<p>Um dois <strong>três</strong> quatro.</p>')).toBe(4);
    expect(getPrimarySurname('SILVA, Roberto; SOUZA, Maria')).toBe('SILVA');
    expect(
      formatShortCitation({
        id: '1',
        authors: 'SILVA, Roberto',
        title: 'Obra',
        city: 'SP',
        publisher: 'Ed',
        year: '2024',
      }),
    ).toBe('(SILVA, 2024)');

    // 2 autores separados por ponto e vírgula
    expect(
      formatShortCitation({
        id: '2',
        authors: 'SILVA, Roberto; SOUZA, Maria',
        title: 'Obra',
        city: 'SP',
        publisher: 'Ed',
        year: '2024',
      }),
    ).toBe('(SILVA; SOUZA, 2024)');

    // 4 ou mais autores abreviados automaticamente com et al. (NBR 10520)
    expect(
      formatShortCitation(
        {
          id: '4',
          authors: 'SILVA, R.; SOUZA, M.; SANTOS, P.; OLIVEIRA, C.',
          title: 'Obra Coletiva',
          city: 'SP',
          publisher: 'Ed',
          year: '2024',
        },
        'titlecase',
      ),
    ).toBe('(Silva et al., 2024)');

    // Referência bibliográfica com 4+ autores usa #emph[et al.] sem duplicar ponto
    const ref4Authors = transpileReference({
      id: '4',
      authors: 'SILVA, R.; SOUZA, M.; SANTOS, P.; OLIVEIRA, C.',
      title: 'Pesquisa Avançada',
      city: 'São Paulo',
      publisher: 'Editora Y',
      year: '2024',
    });
    expect(ref4Authors).toContain('SILVA, R. #emph[et al.]. #strong[Pesquisa Avançada]');

    const proj = createSampleProject();
    const warnings = runAbntLinter(proj);
    // ALMEIDA não foi citado no texto, logo o linter deve avisar
    expect(warnings.some((w) => w.id === 'uncited-ref-r2')).toBe(true);
    // SILVA foi citado no bloco quote_long, logo não deve aparecer como não citado
    expect(warnings.some((w) => w.id === 'uncited-ref-r1')).toBe(false);
  });

  it('parses and exports BibTeX (.bib) references accurately', () => {
    const sampleBib = `
@article{silva2024,
  author = {Silva, Roberto and Souza, Maria},
  title = {Inteligência Artificial na Educação},
  journal = {Revista Brasileira de Informática},
  year = {2024},
  volume = {12},
  number = {3},
  pages = {45--60},
  doi = {10.1000/rbi.2024}
}

@book{knuth1997,
  author = {Donald E. Knuth},
  title = {The Art of Computer Programming},
  publisher = {Addison-Wesley},
  address = {Reading},
  year = {1997}
}
`;
    const parsed = parseBibtex(sampleBib);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].type).toBe('article');
    expect(parsed[0].authors).toContain('SILVA, Roberto');
    expect(parsed[0].journal).toBe('Revista Brasileira de Informática');
    expect(parsed[1].type).toBe('book');
    expect(parsed[1].authors).toContain('KNUTH');

    const exported = exportToBibtex(parsed);
    expect(exported).toContain('@article{');
    expect(exported).toContain('@book{');
    expect(exported).toContain('Inteligência Artificial na Educação');
  });

  it('extracts binary assets and uses cached dataUrl results for fast re-rendering', () => {
    const dummyPngDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const proj = createSampleProject({
      blocks: [
        {
          id: 'img_test_1',
          type: 'image',
          content: '',
          meta: {
            caption: 'Teste de Imagem',
            source: 'Autor',
            imageDataUrl: dummyPngDataUrl,
          },
        },
      ],
    });

    const assetsFirst = extractBinaryAssets(proj);
    expect(Object.keys(assetsFirst)).toHaveLength(1);
    expect(assetsFirst['/assets/img_img_test_1.png']).toBeDefined();

    const assetsSecond = extractBinaryAssets(proj);
    // Cached instance identity check
    expect(assetsSecond['/assets/img_img_test_1.png']).toBe(assetsFirst['/assets/img_img_test_1.png']);
  });
});

describe('Typst compilation integration', () => {
  it('compiles generated multi-file project (abnt.typ + main.typ) into valid PDF without errors', () => {
    const project = createSampleProject();
    const files = generateTypstFiles(project);

    const workspace = process.cwd().replace(/\\/g, '/');
    const compiler = NodeCompiler.create({ workspace });
    compiler.addSource(`${workspace}/${TEMPLATE_FILE}`, files[TEMPLATE_FILE]);

    const compileResult = compiler.compile({
      mainFileContent: files[MAIN_FILE],
    });

    const err = compileResult.takeError();
    if (err) {
      const diagnostics = compiler.fetchDiagnostics(err);
      throw new Error(`Typst compilation failed: ${JSON.stringify(diagnostics, null, 2)}`);
    }

    expect(compileResult.result).toBeTruthy();
    const pdfBuffer = compiler.pdf(compileResult.result!);
    expect(pdfBuffer.byteLength).toBeGreaterThan(1000);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('compiles standalone exported .typ into valid PDF without errors', () => {
    const project = createSampleProject();
    const standalone = generateStandaloneTypst(project);

    const compiler = NodeCompiler.create();
    const compileResult = compiler.compile({ mainFileContent: standalone });

    expect(compileResult.hasError()).toBe(false);
    const pdfBuffer = compiler.pdf(compileResult.result!);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('compiles customized template (sans-serif, 2 columns, no cover, titlecase citations, italic refs)', () => {
    const project = createSampleProject({
      templateConfig: {
        preset: 'article_2col',
        fontFamily: 'sans',
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
    });

    const standalone = generateStandaloneTypst(project);
    expect(standalone).toContain('fonte: "sans"');
    expect(standalone).toContain('colunas: 2');
    expect(standalone).toContain('incluir-capa: false');
    expect(standalone).toContain('Silva, 2023, p. 42');
    expect(standalone).toContain('#emph[Engenharia de Software Moderna]');

    const compiler = NodeCompiler.create();
    const compileResult = compiler.compile({ mainFileContent: standalone });
    expect(compileResult.hasError()).toBe(false);
    const pdfBuffer = compiler.pdf(compileResult.result!);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('compiles equations, code blocks, ABNT box (quadro), h4/h5, abbreviations, appendices, and annexes', () => {
    const project = createSampleProject({
      metadata: {
        ...createSampleProject().metadata,
        coadvisor: 'Profa. Dra. Helena Costa',
        includeApprovalPage: true,
        approvalDate: '12 de dezembro de 2026',
        committeeMembers: [
          'Prof. Dr. Marcos Rocha — Avaliador Interno',
          'Profa. Dra. Cláudia Lima — Avaliadora Externa',
        ],
        includeBoxesList: true,
        abbreviations: 'ABNT — Associação Brasileira de Normas Técnicas',
        symbols: 'Ω — Ohm',
        glossary: 'WebAssembly: Formato binário de execução web.',
        appendices: 'APÊNDICE A — Roteiro de entrevista estruturada.',
        annexes: 'ANEXO A — Documento oficial da instituição.',
      },
      blocks: [
        ...createSampleProject().blocks,
        { id: 'h4_1', type: 'h4', content: 'Subseção Quaternária' },
        { id: 'h5_1', type: 'h5', content: 'Subseção Quinária' },
        { id: 'unnum_1', type: 'unnumbered_heading', content: 'Agradecimentos Especiais' },
        { id: 'eq_1', type: 'equation', content: 'f(x) = sum_(i=1)^n (x_i - mu)^2 / sigma^2' },
        {
          id: 'code_1',
          type: 'code',
          content: 'def media(valores):\n    return sum(valores) / len(valores)',
          meta: {
            caption: 'Cálculo da média aritmética',
            source: 'Elaborado pelo autor',
            language: 'python',
          },
        },
        {
          id: 'box_1',
          type: 'box',
          content: '',
          meta: {
            caption: 'Quadro comparativo de abordagens',
            source: 'Dados da pesquisa (2026)',
            headers: ['Abordagem', 'Característica'],
            rows: [['Qualitativa', 'Análise interpretativa']],
          },
        },
      ],
    });

    const standalone = generateStandaloneTypst(project);
    expect(standalone).toContain('coorientador: "Profa. Dra. Helena Costa"');
    expect(standalone).toContain('incluir-folha-aprovacao: true');
    expect(standalone).toContain('lista-quadros: true');
    expect(standalone).toContain('simbolos: [Ω — Ohm]');
    expect(standalone).toContain('GLOSSÁRIO');
    expect(standalone).toContain('==== Subseção Quaternária');
    expect(standalone).toContain('===== Subseção Quinária');
    expect(standalone).toContain('#heading(numbering: none)[AGRADECIMENTOS ESPECIAIS]');
    expect(standalone).toContain('$ f(x) = sum_(i=1)^n (x_i - mu)^2 / sigma^2 $');
    expect(standalone).toContain('#codigo(');
    expect(standalone).toContain('#quadro(');
    expect(standalone).toContain('APÊNDICES');
    expect(standalone).toContain('ANEXOS');

    const compiler = NodeCompiler.create();
    const compileResult = compiler.compile({ mainFileContent: standalone });
    expect(compileResult.hasError()).toBe(false);
    const pdfBuffer = compiler.pdf(compileResult.result!);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('compiles SBC article template into valid PDF without errors', () => {
    const sbcProject = createProjectFromTemplate('sbc');
    const standalone = generateStandaloneTypst(sbcProject);

    expect(standalone).toContain('#show: sbc-article.with');
    expect(standalone).toContain('= Introdução');

    const compiler = NodeCompiler.create();
    const compileResult = compiler.compile({ mainFileContent: standalone });
    expect(compileResult.hasError()).toBe(false);
    const pdfBuffer = compiler.pdf(compileResult.result!);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('compiles IEEE conference article template into valid PDF without errors', () => {
    const ieeeProject = createProjectFromTemplate('ieee');
    const standalone = generateStandaloneTypst(ieeeProject);

    expect(standalone).toContain('#show: ieee-article.with');
    expect(standalone).toContain('I. Introduction');

    const compiler = NodeCompiler.create();
    const compileResult = compiler.compile({ mainFileContent: standalone });
    expect(compileResult.hasError()).toBe(false);
    const pdfBuffer = compiler.pdf(compileResult.result!);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('compiles Academic Poster A0 template into valid PDF without errors', () => {
    const posterProject = createProjectFromTemplate('poster');
    const standalone = generateStandaloneTypst(posterProject);

    expect(standalone).toContain('#show: academic-poster.with');
    expect(standalone).toContain('dimensoes: "a0"');

    const compiler = NodeCompiler.create();
    const compileResult = compiler.compile({ mainFileContent: standalone });
    expect(compileResult.hasError()).toBe(false);
    const pdfBuffer = compiler.pdf(compileResult.result!);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  describe('AppSec & Typst Hardening', () => {
    it('escapes $ and # inside equation blocks to prevent escaping math mode or executing arbitrary macros', () => {
      const proj = createProjectFromTemplate('tcc');
      proj.blocks = [
        {
          id: 'eq1',
          type: 'equation',
          content: 'E = m c^2 $ #panic("pwned") $ #test',
        },
      ];

      const { [MAIN_FILE]: mainTyp } = generateTypstFiles(proj);
      expect(mainTyp).toContain('$ E = m c^2 \\$ \\#panic("pwned") \\$ \\#test $');
      expect(mainTyp).not.toContain('$ #panic');

      // Testa que equações com delimitadores escapados compilam perfeitamente sem erro no modo matemático
      proj.blocks = [
        {
          id: 'eq2',
          type: 'equation',
          content: 'E = m c^2 $ x + y $ z',
        },
      ];
      const standalone = generateStandaloneTypst(proj);
      const compiler = NodeCompiler.create();
      const compileResult = compiler.compile({ mainFileContent: standalone });
      expect(compileResult.hasError()).toBe(false);
    });

    it('clamps image width percentage safely between 10% and 100%', () => {
      const proj = createProjectFromTemplate('tcc');
      proj.blocks = [
        {
          id: 'img1',
          type: 'image',
          content: '',
          meta: {
            caption: 'Teste Imagem Limites',
            imageDataUrl:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            // @ts-expect-error testando injeção/valor fora dos limites
            imageWidthPct: 9999,
          },
        },
      ];

      const { [MAIN_FILE]: mainTyp } = generateTypstFiles(proj);
      expect(mainTyp).toContain('width: 100%');
      expect(mainTyp).not.toContain('width: 9999%');
    });

    it('rejects malicious universePackage and universeEntrypoint strings', () => {
      const proj = createProjectFromTemplate('tcc');
      proj.templateType = 'universe_custom';
      proj.templateConfig = {
        ...DEFAULT_TEMPLATE_CONFIG,
        // Injeção de código Typst via nome de pacote
        universePackage: '@preview/bad:0.1.0\n#panic("hack")\n',
        universeEntrypoint: 'bad_fn; #panic("hack")',
      };

      const { [MAIN_FILE]: mainTyp } = generateTypstFiles(proj);
      // Deve ignorar o pacote inválido e não injetar macros
      expect(mainTyp).not.toContain('#panic("hack")');
    });
  });

  describe('Fases 3–5: Sync Q3 de Campos, Central de Citações/Referências & Fontes', () => {
    it('suprime campos ocultos do PDF em templates flexíveis (Q3) e compila sem erros', () => {
      const proj = createSampleProject({
        metadata: {
          ...createSampleProject().metadata,
          dedicatory: 'Aos meus pais.',
          glossary: 'Typst: Compilador científico.',
          appendices: 'APÊNDICE A — Código fonte.',
        },
        sidebarConfig: {
          isCustomized: true,
          hiddenFieldIds: ['dedicatory', 'glossary'],
        },
      });

      const { [MAIN_FILE]: mainTyp } = generateTypstFiles(proj);
      expect(mainTyp).not.toContain('dedicatoria:');
      expect(mainTyp).not.toContain('GLOSSÁRIO');
      expect(mainTyp).toContain('APÊNDICES');

      const standalone = generateStandaloneTypst(proj);
      const compiler = NodeCompiler.create();
      const compileResult = compiler.compile({ mainFileContent: standalone });
      expect(compileResult.hasError()).toBe(false);
    });

    it('emite todos os parâmetros de Central Universal de Referências e Fontes Externas e compila com fallback offline', () => {
      const proj = createSampleProject({
        templateConfig: {
          ...DEFAULT_TEMPLATE_CONFIG,
          preset: 'custom',
          fontFamily: 'inter',
          citationStyle: 'uppercase',
          citationFormat: 'ieee_numeric',
          referenceHighlight: 'underline',
          referenceAlignment: 'justify',
          referenceSpacing: 'compact',
        },
      });

      const standalone = generateStandaloneTypst(proj);
      expect(standalone).toContain('fonte: ("Inter", "Arimo", "Liberation Sans")');
      expect(standalone).toContain('\\[2, p. 42\\]');
      expect(standalone).toContain('#underline[Engenharia de Software Moderna]');
      expect(standalone).toContain('alinhamento: "justify"');
      expect(standalone).toContain('espacamento: 0.5em');
      expect(standalone).toContain('numeracao: "bracket"');

      const compiler = NodeCompiler.create();
      const compileResult = compiler.compile({ mainFileContent: standalone });
      expect(compileResult.hasError()).toBe(false);
      const pdfBuffer = compiler.pdf(compileResult.result!);
      expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });

    it('compila citação longa sobrescrita e destaque "none" nas referências com segurança', () => {
      const proj = createSampleProject({
        templateConfig: {
          ...DEFAULT_TEMPLATE_CONFIG,
          preset: 'custom',
          fontFamily: 'custom',
          customFontFamily: 'Open Sans',
          citationFormat: 'superscript',
          referenceHighlight: 'none',
          referenceSpacing: 'double',
        },
      });

      const standalone = generateStandaloneTypst(proj);
      expect(standalone).toContain('fonte: ("Open Sans", "Tinos", "Arimo", "Libertinus Serif")');
      expect(standalone).toContain('#super[2]');
      expect(standalone).toContain('espacamento: 1.8em');
      expect(standalone).toContain('numeracao: "dot"');
      expect(standalone).not.toContain('#strong[Engenharia de Software Moderna]');
      expect(standalone).not.toContain('#emph[Engenharia de Software Moderna]');

      const compiler = NodeCompiler.create();
      const compileResult = compiler.compile({ mainFileContent: standalone });
      expect(compileResult.hasError()).toBe(false);
    });
  });

  describe('Paridade Typst, Presets Multi-Norma, Citações Reativas & CSL Nativo', () => {
    it('roteia preset "sbc" e "ieee" dentro de templateType "tcc" pelo modelo efetivo e compila em PDF', () => {
      const baseTcc = createProjectFromTemplate('tcc');
      const sbcViaPreset: DocumentProject = {
        ...baseTcc,
        templateConfig: {
          ...baseTcc.templateConfig!,
          preset: 'sbc',
          fontSizePt: 11,
          paperSize: 'letter',
          runningHeader: 'Simpósio Brasileiro',
          headingNumbering: '1.',
        },
      };

      const sbcFiles = generateTypstFiles(sbcViaPreset);
      expect(sbcFiles[MAIN_FILE]).toContain('#import "sbc.typ": *');
      expect(sbcFiles[MAIN_FILE]).toContain('#show: sbc-article.with');
      expect(sbcFiles[MAIN_FILE]).toContain('tamanho-fonte: 11pt');
      expect(sbcFiles[MAIN_FILE]).toContain('tamanho-papel: "letter"');
      expect(sbcFiles[MAIN_FILE]).toContain('cabecalho: "Simpósio Brasileiro"');
      expect(sbcFiles[MAIN_FILE]).toContain('numeracao-secoes: "1."');

      const compiler = NodeCompiler.create();
      const sbcRes = compiler.compile({ mainFileContent: generateStandaloneTypst(sbcViaPreset) });
      expect(sbcRes.hasError()).toBe(false);

      const ieeeViaPreset: DocumentProject = {
        ...baseTcc,
        templateConfig: {
          ...baseTcc.templateConfig!,
          preset: 'ieee',
        },
      };
      const ieeeFiles = generateTypstFiles(ieeeViaPreset);
      expect(ieeeFiles[MAIN_FILE]).toContain('#import "ieee.typ": *');
      expect(ieeeFiles[MAIN_FILE]).toContain('#show: ieee-article.with');
      const ieeeRes = compiler.compile({ mainFileContent: generateStandaloneTypst(ieeeViaPreset) });
      expect(ieeeRes.hasError()).toBe(false);

      const posterProj = createProjectFromTemplate('poster');
      posterProj.templateConfig = {
        ...posterProj.templateConfig!,
        preset: 'custom',
        fontSizePt: 18,
      };
      const posterStandalone = generateStandaloneTypst(posterProj);
      expect(posterStandalone).toContain('tamanho-fonte: 18pt');
      const posterRes = compiler.compile({ mainFileContent: posterStandalone });
      expect(posterRes.hasError()).toBe(false);
    });

    it('transpila tokens reativos <cite> em modo parentética e narrativa com ordenação dinâmica (alphabetical vs citation_order)', () => {
      const proj = createSampleProject({
        blocks: [
          { id: 'h1', type: 'h1', content: 'Introdução' },
          {
            id: 'p1',
            type: 'paragraph',
            content:
              '<p>Primeiro citado <cite data-cite-id="r1" data-cite-mode="narrative" data-cite-page="15">Silva e Souza (2024, p. 15)</cite>, depois <cite data-cite-id="r2" data-cite-mode="parenthetical">ALMEIDA, 2022</cite>.</p>',
          },
        ],
      });

      // 1. ABNT Autor-Data (NBR 10520:2023) + alphabetical
      const abntMain = generateMain(proj);
      expect(abntMain).toContain('Silva e Souza (2024, p. 15)');
      expect(abntMain).toContain('(Almeida, 2022)');

      // 2. IEEE Numeric + citation_order: r1 aparece antes de r2 -> [1] Silva, [2] Almeida
      const ieeeProj: DocumentProject = {
        ...proj,
        templateConfig: {
          ...DEFAULT_TEMPLATE_CONFIG,
          preset: 'custom',
          citationFormat: 'ieee_numeric',
          referenceOrdering: 'citation_order',
          referenceEntryFormat: 'ieee',
        },
      };
      const ieeeStandalone = generateStandaloneTypst(ieeeProj);
      expect(ieeeStandalone).toContain('Silva e Souza \\[1, p. 15\\]');
      expect(ieeeStandalone).toContain('\\[2\\]');
      const refsBlock = ieeeStandalone.slice(ieeeStandalone.indexOf('#referencias('));
      expect(refsBlock.indexOf('M. Silva')).toBeGreaterThan(-1);
      expect(refsBlock.indexOf('C. Almeida')).toBeGreaterThan(refsBlock.indexOf('M. Silva'));

      const compiler = NodeCompiler.create();
      expect(compiler.compile({ mainFileContent: ieeeStandalone }).hasError()).toBe(false);

      // 3. Superscript + author_date
      const supProj: DocumentProject = {
        ...proj,
        templateConfig: {
          ...DEFAULT_TEMPLATE_CONFIG,
          preset: 'custom',
          citationFormat: 'superscript',
        },
      };
      const supMain = generateMain(supProj);
      expect(supMain).toContain('Silva e Souza#super[2]');
      expect(supMain).toContain('#super[1]');

      const apaProj: DocumentProject = {
        ...proj,
        templateConfig: {
          ...DEFAULT_TEMPLATE_CONFIG,
          preset: 'custom',
          citationFormat: 'author_date',
          referenceEntryFormat: 'apa',
        },
      };
      const apaMain = generateMain(apaProj);
      expect(apaMain).toContain('Silva & Souza (2024, p. 15)');
      expect(apaMain).toContain('(Almeida 2022)');
    });

    it('formata entradas bibliográficas em APA 7 e IEEE no transpileReference', () => {
      const bookRef = createSampleProject().references[0];
      const articleRef = createSampleProject().references[1];

      const apaBook = transpileReference(bookRef, {
        ...DEFAULT_TEMPLATE_CONFIG,
        referenceEntryFormat: 'apa',
        referenceHighlight: 'italic',
      });
      expect(apaBook).toContain('Silva, M., & Souza, J. (2024). #emph[Engenharia de Software Moderna]: Princípios e Práticas (2 ed.). Editora Acadêmica.');

      const apaArticle = transpileReference(articleRef, {
        ...DEFAULT_TEMPLATE_CONFIG,
        referenceEntryFormat: 'apa',
        referenceHighlight: 'italic',
      });
      expect(apaArticle).toContain('Almeida, C. (2022). Compiladores e Transpiladores. #emph[Revista Brasileira de Computação], 15(2), 10\\-25.');

      const ieeeBook = transpileReference(bookRef, {
        ...DEFAULT_TEMPLATE_CONFIG,
        referenceEntryFormat: 'ieee',
        referenceHighlight: 'italic',
      });
      expect(ieeeBook).toContain('M. Silva and J. Souza, #emph[Engenharia de Software Moderna]');

      const ieeeArticle = transpileReference(articleRef, {
        ...DEFAULT_TEMPLATE_CONFIG,
        referenceEntryFormat: 'ieee',
        referenceHighlight: 'italic',
      });
      expect(ieeeArticle).toContain('C. Almeida, "Compiladores e Transpiladores," #emph[Revista Brasileira de Computação], vol. 15, no. 2, pp. 10\\-25, 2022.');
    });

    it('compila bibliografia via engine CSL nativo do Typst (typst_csl) com refs.bib e #cite(<key>)', () => {
      const proj = createSampleProject({
        templateConfig: {
          ...DEFAULT_TEMPLATE_CONFIG,
          preset: 'custom',
          bibliographyEngine: 'typst_csl',
          cslStyle: 'ieee',
        },
        blocks: [
          { id: 'h1', type: 'h1', content: 'Introdução' },
          {
            id: 'p1',
            type: 'paragraph',
            content:
              '<p>Segundo <cite data-cite-id="r1" data-cite-mode="narrative" data-cite-page="42">Silva e Souza</cite> e <cite data-cite-id="r2" data-cite-mode="parenthetical">Almeida</cite>.</p>',
          },
        ],
      });

      const bundle = generateTypstFiles(proj);
      expect(bundle['refs.bib']).toBeDefined();
      expect(bundle['refs.bib']).toContain('@book{');
      expect(bundle[MAIN_FILE]).toContain('#cite(<');
      expect(bundle[MAIN_FILE]).toContain('form: "prose"');
      expect(bundle[MAIN_FILE]).toContain('supplement: [p. 42]');
      expect(bundle[MAIN_FILE]).toContain('#bibliography("refs.bib", style: "ieee", full: true');

      const standalone = generateStandaloneTypst(proj);
      expect(standalone).toContain('#bibliography(bytes(');

      const compiler = NodeCompiler.create();
      const res = compiler.compile({ mainFileContent: standalone });
      expect(res.hasError()).toBe(false);
      const pdfBuffer = compiler.pdf(res.result!);
      expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });

    it('suporta paridade Typst completa: fonte 13.5pt, paper letter, landscape, idioma EN, links, tachado, código inline, math inline e bloco raw_typst', () => {
      const proj = createSampleProject({
        templateConfig: {
          ...DEFAULT_TEMPLATE_CONFIG,
          preset: 'custom',
          fontSizePt: 13.5,
          paperSize: 'letter',
          pageOrientation: 'landscape',
          documentLanguage: 'en',
          bodyAlignment: 'left',
          paragraphSpacingEm: 0.8,
          pageNumbering: 'bottom_right',
          romanPreTextual: true,
          runningHeader: 'Redija Header',
          headingNumbering: 'I.A',
          h1PageBreak: false,
        },
        blocks: [
          { id: 'h1', type: 'h1', content: 'Introduction' },
          {
            id: 'p_rich',
            type: 'paragraph',
            content:
              '<p>Veja <a href="https://typst.app">Typst <code>v0.13</code></a>, <s>texto antigo</s>, <a href="javascript:alert(1)">Link Bloqueado</a>, código <code>apud et al.</code> e matemática <span data-inline-math="true" data-math="a^2 + b^2">a^2 + b^2</span>.</p>',
          },
          {
            id: 'raw_1',
            type: 'raw_typst',
            content: '#rect(fill: luma(245), inset: 6pt)[Bloco *Typst* Direto]',
          },
        ],
      });

      const standalone = generateStandaloneTypst(proj);
      expect(standalone).toContain('tamanho-fonte: 13.5pt');
      expect(standalone).toContain('tamanho-papel: "letter"');
      expect(standalone).toContain('orientacao: "landscape"');
      expect(standalone).toContain('idioma: "en"');
      expect(standalone).toContain('justificar-corpo: false');
      expect(standalone).toContain('espacamento-paragrafo: 0.8em');
      expect(standalone).toContain('posicao-pagina: "bottom_right"');
      expect(standalone).toContain('romano-pre-textual: true');
      expect(standalone).toContain('cabecalho: "Redija Header"');
      expect(standalone).toContain('numeracao-secoes: "I.A"');
      expect(standalone).toContain('quebra-h1: false');

      expect(standalone).toContain('#link("https://typst.app/")[Typst #raw("v0.13")]');
      expect(standalone).toContain('#strike[texto antigo]');
      expect(standalone).toContain('Link Bloqueado');
      expect(standalone).not.toContain('javascript:');
      expect(standalone).toContain('#raw("apud et al.")');
      expect(standalone).not.toContain('#raw("#emph[apud]')
      expect(standalone).toContain('$a^2 + b^2$');
      expect(standalone).toContain('#rect(fill: luma(245), inset: 6pt)[Bloco *Typst* Direto]');

      const compiler = NodeCompiler.create();
      const res = compiler.compile({ mainFileContent: standalone });
      expect(res.hasError()).toBe(false);
      const pdfBuffer = compiler.pdf(res.result!);
      expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });

    it('gera autores em formato dicionário para charged-ieee:0.1.4 e import de tema para touying:0.5.3', () => {
      const ieeeProj = createSampleProject({
        templateType: 'universe_custom',
        templateConfig: {
          ...DEFAULT_TEMPLATE_CONFIG,
          preset: 'universe_custom',
          universePackage: '@preview/charged-ieee:0.1.4',
          universeEntrypoint: 'ieee',
        },
        metadata: {
          ...createSampleProject().metadata,
          author: 'Alice Silva; Bruno Costa',
          institution: 'UFPR',
          location: 'Curitiba',
        },
      });
      const { [MAIN_FILE]: ieeeMain } = generateTypstFiles(ieeeProj);
      expect(ieeeMain).toContain('#import "@preview/charged-ieee:0.1.4": *');
      expect(ieeeMain).toContain('#show: ieee.with(');
      expect(ieeeMain).toContain('name: "Alice Silva"');
      expect(ieeeMain).toContain('name: "Bruno Costa"');
      expect(ieeeMain).toContain('organization: [UFPR]');
      expect(ieeeMain).toContain('location: [Curitiba]');
      expect(ieeeMain).toContain('#set text(font: ("Tinos"');

      const touyingProj = createSampleProject({
        templateType: 'universe_custom',
        templateConfig: {
          ...DEFAULT_TEMPLATE_CONFIG,
          preset: 'universe_custom',
          universePackage: '@preview/touying:0.5.3',
          universeEntrypoint: 'simple-theme',
        },
      });
      const { [MAIN_FILE]: touyingMain } = generateTypstFiles(touyingProj);
      expect(touyingMain).toContain('#import "@preview/touying:0.5.3": *');
      expect(touyingMain).toContain('#import themes.simple: *');
      expect(touyingMain).toContain('#show: simple-theme.with(aspect-ratio: "16-9")');
    });
  });
});
