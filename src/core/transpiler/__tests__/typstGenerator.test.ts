import { describe, expect, it } from 'vitest';
import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';
import { escapeMarkup, escapeString, typstContent, typstString } from '../escape';
import {
  formatCitationReference,
  generateMain,
  generateStandaloneTypst,
  generateTypstFiles,
  MAIN_FILE,
  stripManualNumbering,
  TEMPLATE_FILE,
  transpileReference,
} from '../typstGenerator';
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
        authors: 'ALMEIDA, Carlos',
        title: 'Compiladores e Transpiladores',
        city: 'Rio de Janeiro',
        publisher: 'Tech Books',
        year: '2022',
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
});

describe('Typst compilation integration', () => {
  it('compiles generated multi-file project (abnt.typ + main.typ) into valid PDF without errors', () => {
    const project = createSampleProject();
    const files = generateTypstFiles(project);

    const workspace = 'C:/Users/vinic/.gemini/antigravity/scratch/redija-app';
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
});
