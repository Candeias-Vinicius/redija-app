import { describe, expect, it } from 'vitest';
import { pandocResponseToProject } from '../astToProject';
import { cslToReference } from '../cslToReference';
import { ConvertResponse, PandocBlock, PandocInline, PandocMetaValue } from '../types';

const A: [string, string[], [string, string][]] = ['', [], []];

/** Converte texto em inlines Str/Space como o Pandoc faz. */
function txt(text: string): PandocInline[] {
  const out: PandocInline[] = [];
  text.split(' ').forEach((word, i) => {
    if (i > 0) out.push({ t: 'Space' });
    out.push({ t: 'Str', c: word });
  });
  return out;
}
const para = (...inlines: PandocInline[][]): PandocBlock => ({ t: 'Para', c: inlines.flat() });
const header = (level: number, text: string, classes: string[] = []): PandocBlock => ({
  t: 'Header',
  c: [level, ['', classes, []], txt(text)],
});

function response(blocks: PandocBlock[], extra: Partial<ConvertResponse> = {}): ConvertResponse {
  return {
    format: 'docx',
    mainFile: 'tcc.docx',
    ast: { 'pandoc-api-version': [1, 23, 1], meta: {}, blocks },
    mathTypst: {},
    media: {},
    bibliography: [],
    warnings: [],
    ...extra,
  };
}

describe('pandocResponseToProject', () => {
  it('mapeia títulos, parágrafos com formatação e listas', () => {
    const project = pandocResponseToProject(
      response([
        header(1, 'Introdução'),
        para(txt('Texto'), [{ t: 'Space' }, { t: 'Strong', c: txt('forte') }, { t: 'Space' }, { t: 'Emph', c: txt('<x>') }]),
        header(2, 'Seção sem número', ['unnumbered']),
        { t: 'BulletList', c: [[{ t: 'Plain', c: txt('item a') }], [{ t: 'Plain', c: txt('item b') }]] },
        { t: 'OrderedList', c: [[1, { t: 'Decimal' }, { t: 'Period' }], [[{ t: 'Plain', c: txt('primeiro') }]]] },
      ]),
      'Meu TCC',
    );

    expect(project.name).toBe('Meu TCC');
    expect(project.blocks.map((b) => b.type)).toEqual([
      'h1',
      'paragraph',
      'unnumbered_heading',
      'bullet',
      'bullet',
      'numbered',
    ]);
    expect(project.blocks[1].content).toBe('<p>Texto <strong>forte</strong> <em>&lt;x&gt;</em></p>');
    expect(project.blocks[3].content).toBe('item a');
  });

  it('extrai Resumo, palavras-chave, Abstract e ignora Sumário', () => {
    const project = pandocResponseToProject(
      response([
        header(1, 'Sumário'),
        para(txt('1 Introdução ..... 3')),
        header(1, 'Resumo'),
        para(txt('Este trabalho estuda algo.')),
        para(txt('Palavras-chave: tipografia; ABNT; Typst.')),
        header(1, 'Abstract'),
        para(txt('This work studies something.')),
        para(txt('Keywords: typography, ABNT.')),
        header(1, 'Introdução'),
        para(txt('Corpo.')),
      ]),
      'x',
    );
    expect(project.metadata.abstract).toBe('Este trabalho estuda algo.');
    expect(project.metadata.keywords).toEqual(['tipografia', 'ABNT', 'Typst']);
    expect(project.metadata.foreignAbstract).toBe('This work studies something.');
    expect(project.metadata.foreignKeywords).toEqual(['typography', 'ABNT']);
    expect(project.blocks.map((b) => b.content)).toEqual(['Introdução', '<p>Corpo.</p>']);
  });

  it('usa equações convertidas para Typst (inline e em destaque)', () => {
    const project = pandocResponseToProject(
      response(
        [
          para(txt('Seja'), [{ t: 'Space' }, { t: 'Math', c: [{ t: 'InlineMath' }, '\\alpha^2'] }], [
            { t: 'Space' },
            { t: 'Math', c: [{ t: 'DisplayMath' }, '\\frac{a}{b}'] },
            { t: 'Str', c: 'fim.' },
          ]),
        ],
        { mathTypst: { '\\alpha^2': 'alpha^2', '\\frac{a}{b}': 'a / b' } },
      ),
      'x',
    );
    expect(project.blocks.map((b) => b.type)).toEqual(['paragraph', 'equation', 'paragraph']);
    expect(project.blocks[0].content).toContain('data-inline-math="true" data-math="alpha^2"');
    expect(project.blocks[1].content).toBe('a / b');
    expect(project.blocks[2].content).toBe('<p>fim.</p>');
  });

  it('cria figura com imagem, legenda ABNT acima e fonte abaixo', () => {
    const project = pandocResponseToProject(
      response(
        [
          para(txt('Figura 1 – Arquitetura do sistema')),
          para([{ t: 'Image', c: [A, [], ['.redija-media/media/image1.png', '']] }]),
          para(txt('Fonte: Elaborado pelo autor (2025).')),
        ],
        { media: { '.redija-media/media/image1.png': 'data:image/png;base64,AAAA' } },
      ),
      'x',
    );
    expect(project.blocks).toHaveLength(1);
    expect(project.blocks[0]).toMatchObject({
      type: 'image',
      meta: {
        caption: 'Arquitetura do sistema',
        source: 'Elaborado pelo autor (2025)',
        imageDataUrl: 'data:image/png;base64,AAAA',
      },
    });
  });

  it('converte tabelas e quadros', () => {
    const cell = (text: string) => [A, { t: 'AlignDefault' }, 1, 1, [{ t: 'Plain', c: txt(text) }]] as [
      typeof A,
      unknown,
      number,
      number,
      PandocBlock[],
    ];
    const table: PandocBlock = {
      t: 'Table',
      c: [
        A,
        [null, [para(txt('Quadro 2 – Comparativo'))]],
        [],
        [A, [[A, [cell('Nome'), cell('Valor')]]]],
        [[A, 0, [], [[A, [cell('a'), cell('1')]]]]],
        [A, []],
      ],
    };
    const project = pandocResponseToProject(response([table]), 'x');
    expect(project.blocks[0]).toMatchObject({
      type: 'box',
      meta: { headers: ['Nome', 'Valor'], rows: [['a', '1']], caption: 'Comparativo' },
    });
  });

  it('liga citações do .bib às referências e transforma notas em blocos de rodapé', () => {
    const project = pandocResponseToProject(
      response(
        [
          para(txt('Como mostrado'), [
            { t: 'Space' },
            {
              t: 'Cite',
              c: [
                [
                  {
                    citationId: 'silva2020',
                    citationPrefix: [],
                    citationSuffix: txt(', p. 42'),
                    citationMode: { t: 'NormalCitation' },
                  },
                ],
                txt('[@silva2020]'),
              ],
            },
            { t: 'Note', c: [para(txt('Nota explicativa.'))] },
          ]),
        ],
        {
          format: 'latex',
          bibliography: [
            {
              id: 'silva2020',
              type: 'book',
              title: 'Tipografia digital: fundamentos',
              author: [{ family: 'Silva', given: 'João' }],
              issued: { 'date-parts': [[2020]] },
              publisher: 'Editora X',
              'publisher-place': 'São Paulo',
            },
          ],
        },
      ),
      'x',
    );
    const [ref] = project.references;
    expect(ref).toMatchObject({ authors: 'SILVA, João', title: 'Tipografia digital', subtitle: 'fundamentos', year: '2020' });
    expect(project.blocks[0].content).toContain(`<cite data-cite-id="${ref.id}" data-cite-mode="parenthetical" data-cite-page="42">SILVA, 2020</cite>`);
    expect(project.blocks[1]).toMatchObject({ type: 'footnote', content: 'Nota explicativa.' });
  });

  it('lê metadados do YAML do Markdown, inclusive chaves em português', () => {
    const meta: Record<string, PandocMetaValue> = {
      titulo: { t: 'MetaInlines', c: txt('Meu Trabalho') },
      author: { t: 'MetaList', c: [{ t: 'MetaInlines', c: txt('Ana Souza') }, { t: 'MetaInlines', c: txt('Bruno Lima') }] },
      orientador: { t: 'MetaString', c: 'Prof. Dr. Carlos' },
      date: { t: 'MetaInlines', c: txt('março de 2025') },
      keywords: { t: 'MetaList', c: [{ t: 'MetaString', c: 'a' }, { t: 'MetaString', c: 'b' }] },
    };
    const project = pandocResponseToProject(
      { ...response([header(1, 'Introdução')], { format: 'markdown' }), ast: { 'pandoc-api-version': [1, 23], meta, blocks: [header(1, 'Introdução')] } },
      'x',
    );
    expect(project.metadata).toMatchObject({
      title: 'Meu Trabalho',
      author: 'Ana Souza; Bruno Lima',
      advisor: 'Prof. Dr. Carlos',
      year: '2025',
      keywords: ['a', 'b'],
    });
  });

  it('trata ambientes abntex2 (resumo, citacao) vindos como Div', () => {
    const project = pandocResponseToProject(
      response(
        [
          { t: 'Div', c: [['', ['resumo'], []], [para(txt('Resumo em português.')), para(txt('Palavras-chave: um. dois.'))]] },
          { t: 'Div', c: [['', ['resumo'], []], [para(txt('English abstract.'))]] },
          { t: 'Div', c: [['', ['citacao'], []], [para(txt('Texto citado longo (SILVA, 2020, p. 10).'))]] },
        ],
        { format: 'latex' },
      ),
      'x',
    );
    expect(project.metadata.abstract).toBe('Resumo em português.');
    expect(project.metadata.foreignAbstract).toBe('English abstract.');
    expect(project.metadata.keywords).toEqual(['um', 'dois']);
    expect(project.blocks[0]).toMatchObject({
      type: 'quote_long',
      content: 'Texto citado longo',
      meta: { author: 'SILVA', year: '2020', page: '10' },
    });
  });

  it('usa a seção Referências do Word quando não há .bib', () => {
    const project = pandocResponseToProject(
      response([header(1, 'Referências'), para(txt('SILVA, J. Tipografia. São Paulo: X, 2019.'))]),
      'x',
    );
    expect(project.references).toHaveLength(1);
    expect(project.references[0]).toMatchObject({ authors: 'SILVA, J.', year: '2019' });
  });
});

describe('ambientes do abntex2 reescritos pelo servidor', () => {
  const cell = (text: string) =>
    [A, { t: 'AlignDefault' }, 1, 1, [{ t: 'Plain', c: txt(text) }]] as [typeof A, unknown, number, number, PandocBlock[]];
  const table = (caption: string): PandocBlock => ({
    t: 'Table',
    c: [A, [null, [{ t: 'Plain', c: txt(caption) }]], [], [A, [[A, [cell('A'), cell('B')]]]], [[A, 0, [], [[A, [cell('1'), cell('2')]]]]], [A, []]],
  });
  const cite = (id: string): PandocInline => ({
    t: 'Cite',
    c: [[{ citationId: id, citationPrefix: [], citationSuffix: [], citationMode: { t: 'NormalCitation' } }], [{ t: 'RawInline', c: ['latex', `\\cite{${id}}`] }]],
  });

  const project = pandocResponseToProject(
    response(
      [
        { t: 'Div', c: [['', ['redijasiglas'], []], [{ t: 'DefinitionList', c: [[txt('AMAN'), [[para(txt('Academia Militar'))]]]] }]] },
        {
          t: 'Div',
          c: [['', ['resumo'], []], [
            para(txt('TÍTULO DO TRABALHO EM CAIXA ALTA')),
            para(txt('AUTOR: Fulano')),
            para(txt('O resumo de verdade.')),
            para(txt('Palavras-chaves: a; b.')),
          ]],
        },
        { t: 'Div', c: [['', ['redijaquadro'], []], [{ t: 'Div', c: [['tab:x', [], []], [table('Meu quadro')]] }]] },
        { t: 'Para', c: [{ t: 'Span', c: [['tab:x', [], [['label', 'tab:x']]], []] }] },
        para(txt('Fonte:'), [{ t: 'Space' }, cite('liduario2023')]),
      ],
      {
        format: 'latex',
        bibliography: [{ id: 'liduario2023', author: [{ family: 'Villaça Liduário', given: 'Ruy' }], title: 'Gephi', issued: { 'date-parts': [[2023]] } }],
      },
    ),
    'x',
  );

  it('leva siglas para os metadados e limpa o cabeçalho do resumo', () => {
    expect(project.metadata.abbreviations).toBe('AMAN: Academia Militar');
    expect(project.metadata.abstract).toBe('O resumo de verdade.');
    expect(project.metadata.keywords).toEqual(['a', 'b']);
  });

  it('marca quadro como box e acha a fonte com citação mesmo após \\label solto', () => {
    expect(project.blocks).toHaveLength(1);
    expect(project.blocks[0]).toMatchObject({
      type: 'box',
      meta: { caption: 'Meu quadro', source: 'Villaça Liduário (2023)' },
    });
  });
});

describe('modelos institucionais com comandos próprios (ex.: UCSAL)', () => {
  const source = [
    '\\titulo{Ensino de matemática}',
    '\\palavraschave{1. Gamification.',
    '2. Mathematics Education.}',
    '\\DEELautor{ Ana Lima\\\\Beto Reis \\\\}{}',
    '% \\DEELresumo{comentado}',
    '\\begin{document}',
    '\\DEELresumo{',
    'Primeiro parágrafo.',
    '',
    'Segundo \\textbf{parágrafo}.}',
    '\\DEELdedicatoria{Dedico a todos. \\\\}',
  ].join('\n');

  const project = pandocResponseToProject(
    response(
      [
        {
          t: 'Div',
          c: [['', ['tabbing'], []], [{ t: 'Para', c: [{ t: 'SmallCaps', c: txt('API') }, { t: 'Space' }, { t: 'Emph', c: txt('Application Interface') }, { t: 'LineBreak' }, ...txt('BES Engenharia de Software')] }]],
        },
        header(1, 'Introdução'),
        para(txt('Corpo.')),
      ],
      { format: 'latex', mainSource: source },
    ),
    'x',
  );

  it('lê autores, resumo com parágrafos, palavras-chave numeradas e dedicatória', () => {
    expect(project.metadata).toMatchObject({
      title: 'Ensino de matemática',
      author: 'Ana Lima; Beto Reis',
      abstract: 'Primeiro parágrafo.\nSegundo parágrafo.',
      keywords: ['Gamification', 'Mathematics Education'],
      dedicatory: 'Dedico a todos.',
    });
  });

  it('usa o tabbing pré-textual como lista de siglas', () => {
    expect(project.metadata.abbreviations).toBe('API: Application Interface\nBES: Engenharia de Software');
    expect(project.blocks.map((b) => b.type)).toEqual(['h1', 'paragraph']);
  });
});

describe('cslToReference', () => {
  it('mapeia artigo de periódico com DOI e páginas', () => {
    const ref = cslToReference({
      id: 'k',
      type: 'article-journal',
      title: 'Um estudo',
      author: [{ family: 'Pereira', given: 'Ana' }, { literal: 'IBGE' }],
      'container-title': 'Revista Y',
      volume: 3,
      issue: '2',
      page: '10--20',
      DOI: '10.1/x',
      issued: { 'date-parts': [[2021, 5]] },
    });
    expect(ref).toMatchObject({
      type: 'article',
      authors: 'PEREIRA, Ana; IBGE',
      journal: 'Revista Y',
      volume: '3',
      issue: '2',
      pages: '10-20',
      doi: '10.1/x',
      year: '2021',
    });
  });
});
