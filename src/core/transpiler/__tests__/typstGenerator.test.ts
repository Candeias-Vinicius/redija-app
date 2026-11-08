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
import { DocumentProject } from '@/types/document';

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

      // Compilação com NodeCompiler para garantir validade no compilador real
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
      proj.templateConfig = {
        templateId: 'universe',
        // Injeção de código Typst via nome de pacote
        universePackage: '@preview/bad:0.1.0\n#panic("hack")\n',
        universeEntrypoint: 'bad_fn; #panic("hack")',
      };

      const { [MAIN_FILE]: mainTyp } = generateTypstFiles(proj);
      // Deve ignorar o pacote inválido e não injetar macros
      expect(mainTyp).not.toContain('#panic("hack")');
    });
  });
});
