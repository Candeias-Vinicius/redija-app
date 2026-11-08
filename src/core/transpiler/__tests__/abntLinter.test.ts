import { describe, expect, it } from 'vitest';
import {
  countWords,
  exportToBibtex,
  getPrimarySurname,
  parseBibtex,
  runAbntLinter,
} from '../abntLinter';
import { AcademicReference, DocumentProject, DEFAULT_TEMPLATE_CONFIG } from '@/types/document';

function createMockProject(overrides?: Partial<DocumentProject>): DocumentProject {
  return {
    id: 'linter_test',
    name: 'Projeto Linter ABNT',
    templateType: 'tcc',
    updatedAt: '2026-11-08T00:00:00.000Z',
    templateConfig: DEFAULT_TEMPLATE_CONFIG,
    metadata: {
      title: 'Auditoria de Conformidade ABNT',
      author: 'Juliana Mendes',
      advisor: 'Prof. Dr. Ricardo Antunes',
      institution: 'UFMG',
      course: 'Computação',
      location: 'BH',
      year: '2026',
      // Gera texto com exatamente 150 palavras para testar o limite inferior da NBR 6028
      abstract: Array(150).fill('palavra').join(' '),
      keywords: ['ABNT', 'Linter', 'Qualidade'],
    },
    blocks: [
      { id: 'b1', type: 'h1', content: '1 Introdução' },
      { id: 'b2', type: 'paragraph', content: 'Texto introdutório fundamentado em SILVA (2024).' },
    ],
    references: [
      {
        id: 'ref_silva',
        type: 'book',
        authors: 'SILVA, Roberto',
        title: 'Engenharia de Software',
        year: '2024',
        city: 'São Paulo',
        publisher: 'Editora X',
      },
    ],
    ...overrides,
  };
}

describe('ABNT Linter: Contagem de Palavras e Conformidade com Resumo (NBR 6028)', () => {
  it('conta palavras ignorando marcações HTML e entidades', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords('<p></p>')).toBe(0);
    expect(countWords('<p>&nbsp; &nbsp;</p>')).toBe(0);
    expect(countWords('Uma duas três palavras.')).toBe(4);
    expect(countWords('<p>Uma <strong>duas</strong> <em>três</em> palavras.</p>')).toBe(4);
    expect(countWords('Palavra-composta conta como uma')).toBe(4);
  });

  it('alerta quando o resumo está em branco (warning severo)', () => {
    const proj = createMockProject({
      metadata: {
        ...createMockProject().metadata,
        abstract: '',
      },
    });

    const warnings = runAbntLinter(proj);
    const emptyWarning = warnings.find((w) => w.id === 'abstract-empty');
    expect(emptyWarning).toBeDefined();
    expect(emptyWarning?.severity).toBe('warning');
  });

  it('valida limites de contagem de palavras da NBR 6028 (150 a 500 palavras)', () => {
    // 149 palavras: deve alertar info
    const proj149 = createMockProject({
      metadata: {
        ...createMockProject().metadata,
        abstract: Array(149).fill('termo').join(' '),
      },
    });
    expect(runAbntLinter(proj149).some((w) => w.id === 'abstract-length')).toBe(true);

    // Exatamente 150 palavras: limite válido inferior, nenhum alerta
    const proj150 = createMockProject({
      metadata: {
        ...createMockProject().metadata,
        abstract: Array(150).fill('termo').join(' '),
      },
    });
    expect(runAbntLinter(proj150).some((w) => w.id === 'abstract-length')).toBe(false);

    // Exatamente 500 palavras: limite válido superior, nenhum alerta
    const proj500 = createMockProject({
      metadata: {
        ...createMockProject().metadata,
        abstract: Array(500).fill('termo').join(' '),
      },
    });
    expect(runAbntLinter(proj500).some((w) => w.id === 'abstract-length')).toBe(false);

    // 501 palavras: deve alertar info de excesso de tamanho
    const proj501 = createMockProject({
      metadata: {
        ...createMockProject().metadata,
        abstract: Array(501).fill('termo').join(' '),
      },
    });
    expect(runAbntLinter(proj501).some((w) => w.id === 'abstract-length')).toBe(true);
  });
});

describe('ABNT Linter: Metadados Obrigatórios de Figuras, Quadros e Tabelas (NBR 14724)', () => {
  it('alerta quando imagem não possui legenda ou fonte', () => {
    const proj = createMockProject({
      blocks: [
        {
          id: 'fig_incompleta',
          type: 'image',
          content: '',
          meta: { caption: 'Apenas legenda' }, // Falta fonte
        },
      ],
    });

    const warnings = runAbntLinter(proj);
    expect(warnings.some((w) => w.id === 'fig-meta-fig_incompleta')).toBe(true);
  });

  it('alerta quando tabela ou quadro não possui legenda ou fonte', () => {
    const proj = createMockProject({
      blocks: [
        {
          id: 'tbl_sem_legenda',
          type: 'table',
          content: '',
          meta: { source: 'Apenas fonte' }, // Falta legenda
        },
        {
          id: 'box_sem_fonte',
          type: 'box',
          content: '',
          meta: { caption: 'Quadro A' }, // Falta fonte
        },
      ],
    });

    const warnings = runAbntLinter(proj);
    expect(warnings.some((w) => w.id === 'tbl-meta-tbl_sem_legenda')).toBe(true);
    expect(warnings.some((w) => w.id === 'tbl-meta-box_sem_fonte')).toBe(true);
  });

  it('não emite alerta quando figuras e tabelas estão completas com legenda e fonte', () => {
    const proj = createMockProject({
      blocks: [
        {
          id: 'fig_ok',
          type: 'image',
          content: '',
          meta: { caption: 'Arquitetura do sistema', source: 'Elaborado pelo autor (2026)' },
        },
        {
          id: 'tbl_ok',
          type: 'table',
          content: '',
          meta: { caption: 'Resultados comparativos', source: 'Dados da pesquisa' },
        },
      ],
    });

    const warnings = runAbntLinter(proj);
    expect(warnings.some((w) => w.id.startsWith('fig-meta-'))).toBe(false);
    expect(warnings.some((w) => w.id.startsWith('tbl-meta-'))).toBe(false);
  });
});

describe('ABNT Linter: Cruzamento de Citações e Referências (NBR 10520 & NBR 6023)', () => {
  it('alerta quando uma referência cadastrada não é citada no corpo do texto', () => {
    const proj = createMockProject({
      blocks: [
        { id: 'b1', type: 'paragraph', content: 'Texto falando sobre assuntos gerais sem citar ninguém.' },
      ],
      references: [
        {
          id: 'ref_nao_citada',
          authors: 'FERREIRA, Lucas',
          title: 'Algoritmos Genéticos',
          year: '2021',
          city: 'SP',
          publisher: 'Ed',
        },
      ],
    });

    const warnings = runAbntLinter(proj);
    expect(warnings.some((w) => w.id === 'uncited-ref-ref_nao_citada')).toBe(true);
  });

  it('alerta quando uma citação longa referencia um autor não cadastrado nas referências', () => {
    const proj = createMockProject({
      blocks: [
        {
          id: 'quote_sem_ref',
          type: 'quote_long',
          content: 'Trecho longo transcrito ipsis litteris de autor desconhecido.',
          meta: { author: 'ZANATTA, Claudia', year: '2019', page: '88' },
        },
      ],
      references: [
        {
          id: 'ref_existente',
          authors: 'SILVA, Roberto',
          title: 'Livro',
          year: '2024',
          city: 'SP',
          publisher: 'Ed',
        },
      ],
    });

    const warnings = runAbntLinter(proj);
    expect(warnings.some((w) => w.id === 'missing-ref-quote_sem_ref')).toBe(true);
  });

  it('lida com sobrenomes compostos e múltiplos autores no linter', () => {
    expect(getPrimarySurname('ESPÍRITO SANTO, Maria; SOUZA, Carlos')).toBe('ESPÍRITO SANTO');
    expect(getPrimarySurname('SILVA SOBRINHO, João')).toBe('SILVA SOBRINHO');
    expect(getPrimarySurname('BRASIL. Ministério da Ciência')).toBe('BRASIL. MINISTÉRIO DA CIÊNCIA');
  });
});

describe('ABNT Linter: Importação e Exportação BibTeX (.bib)', () => {
  it('faz parse preciso de entradas BibTeX com autores separados por and', () => {
    const bib = `
@book{pressman2020,
  author = {Roger S. Pressman and Bruce R. Maxim},
  title = {Software Engineering: A Practitioner's Approach},
  publisher = {McGraw-Hill},
  year = {2020},
  address = {New York},
  edition = {9}
}

@phdthesis{martins2024,
  author = {Fernanda Martins},
  title = {Modelagem de Tipografia Baseada em Regras},
  school = {Universidade Federal do Rio de Janeiro},
  year = {2024},
  address = {Rio de Janeiro}
}
`;
    const parsed = parseBibtex(bib);
    expect(parsed).toHaveLength(2);

    expect(parsed[0].type).toBe('book');
    expect(parsed[0].authors).toContain('PRESSMAN, Roger S.; MAXIM, Bruce R.');
    expect(parsed[0].title).toBe('Software Engineering');
    expect(parsed[0].subtitle).toBe("A Practitioner's Approach");
    expect(parsed[0].edition).toBe('9');

    expect(parsed[1].type).toBe('thesis');
    expect(parsed[1].authors).toContain('MARTINS, Fernanda');
    expect(parsed[1].degree).toBe('Tese (Doutorado)');
    expect(parsed[1].institution).toBe('Universidade Federal do Rio de Janeiro');
  });

  it('exporta referências acadêmicas para arquivo BibTeX válido', () => {
    const refs: AcademicReference[] = [
      {
        id: '1',
        type: 'article',
        authors: 'SILVA, Maria; SOUZA, João',
        title: 'Artigo sobre Typst',
        journal: 'Revista Web',
        volume: '10',
        issue: '1',
        pages: '10-20',
        city: 'São Paulo',
        publisher: 'Ed',
        year: '2026',
        doi: '10.1000/web.2026',
      },
    ];

    const bibOutput = exportToBibtex(refs);
    expect(bibOutput).toContain('@article{silva2026_1,');
    expect(bibOutput).toContain('author = {SILVA, Maria and SOUZA, João}');
    expect(bibOutput).toContain('journal = {Revista Web}');
    expect(bibOutput).toContain('doi = {10.1000/web.2026}');
  });
});
