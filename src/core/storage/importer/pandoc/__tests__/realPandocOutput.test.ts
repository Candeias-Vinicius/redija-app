/**
 * Regressão com respostas REAIS do serviço de importação (Pandoc 3.6.4).
 * Fontes em ./fixtures/sources; para regenerar as respostas, suba o serviço (server/README.md) e rode:
 *   curl -F "file=@overleaf.zip" localhost:8080/convert > fixtures/overleaf.response.json
 * (o .zip é a pasta fixtures/sources/overleaf compactada).
 */
import { describe, expect, it } from 'vitest';
import { pandocResponseToProject } from '../astToProject';
import { ConvertResponse } from '../types';
import overleafJson from './fixtures/overleaf.response.json';
import wordJson from './fixtures/word.response.json';
import artigoJson from './fixtures/artigo.response.json';
import tccJson from './fixtures/tcc.response.json';

const load = (json: unknown, name: string) => pandocResponseToProject(json as ConvertResponse, name);
const types = (p: ReturnType<typeof load>) => p.blocks.map((b) => b.type);

describe('LaTeX abntex2 multi-arquivo (Overleaf .zip)', () => {
  const p = load(overleafJson, 'overleaf');

  it('lê metadados do abntex2 e resumos', () => {
    expect(p.templateType).toBe('tcc');
    expect(p.metadata).toMatchObject({
      title: 'Importação de Documentos Acadêmicos',
      author: 'Maria Oliveira',
      advisor: 'Prof. Dr. João Santos',
      institution: 'Universidade Federal de Pernambuco, Centro de Informática',
      location: 'Recife',
      year: '2025',
      nature: 'Monografia apresentada ao curso de Ciência da Computação.',
      abstract: 'Este trabalho apresenta um conversor de documentos.',
      keywords: ['Pandoc', 'Typst', 'ABNT'],
      foreignAbstract: 'This work presents a document converter.',
      foreignKeywords: ['Pandoc', 'Typst'],
      subtitle: '',
    });
  });

  it('segue \\input/\\include e preserva a estrutura', () => {
    expect(types(p)).toEqual([
      'h1',
      'paragraph',
      'footnote',
      'paragraph',
      'equation',
      'quote_long',
      'h2',
      'bullet',
      'bullet',
      'h1',
      'image',
      'table',
      'unnumbered_heading',
      'paragraph',
    ]);
  });

  it('liga citações ao .bib, converte matemática e associa fontes ABNT', () => {
    const [silva, souza] = p.references;
    expect(silva).toMatchObject({ authors: 'SILVA, João; PEREIRA, Ana', title: 'Tipografia digital', edition: '2' });
    expect(souza).toMatchObject({ journal: 'Revista Brasileira de Design', pages: '10-25', doi: '10.1234/rbd.2019.3' });

    const intro = p.blocks[1].content;
    expect(intro).toContain(`data-cite-id="${silva.id}" data-cite-mode="parenthetical" data-cite-page="42"`);
    expect(intro).toContain(`data-cite-id="${souza.id}" data-cite-mode="narrative"`);

    expect(p.blocks[3].content).toContain('data-math="E = m c^2"');
    expect(p.blocks[4].content).toBe('integral_0^1 x^2 thin d x = 1 / 3');
    expect(p.blocks[5].meta).toMatchObject({ author: 'SOUZA', year: '2019', page: '10' });

    expect(p.blocks[10].meta).toMatchObject({
      caption: 'Arquitetura do sistema',
      source: 'Elaborado pelo autor (2025)',
    });
    expect(p.blocks[10].meta?.imageDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(p.blocks[11].meta).toMatchObject({
      caption: 'Resultados obtidos',
      source: 'Dados da pesquisa',
      headers: ['Formato', 'Acurácia'],
      rows: [
        ['DOCX', '95%'],
        ['LaTeX', '90%'],
      ],
    });
  });
});

describe('Word (.docx)', () => {
  const p = load(wordJson, 'word');

  it('detecta relatório, extrai título, resumo e referências da seção', () => {
    expect(p.templateType).toBe('relatorio');
    expect(p.metadata).toMatchObject({
      title: 'Relatório de Estágio Supervisionado',
      author: 'Carla Mendes',
      abstract: 'Este relatório descreve as atividades do estágio.',
      keywords: ['estágio', 'software', 'relatório'],
    });
    expect(p.references.map((r) => [r.authors, r.year])).toEqual([
      ['SILVA, J. A.', '2018'],
      ['SOUZA, M.', '2021'],
    ]);
  });

  it('mapeia figura com legenda acima e fonte abaixo, quadro, nota e formatação', () => {
    expect(types(p)).toEqual(['h1', 'paragraph', 'footnote', 'image', 'h2', 'bullet', 'bullet', 'box']);
    expect(p.blocks[1].content).toBe('<p>O estágio foi realizado na empresa X. Ver <s>antigo</s> trecho e H<sub>2</sub>O.</p>');
    expect(p.blocks[3].meta).toMatchObject({ caption: 'Fluxo de trabalho', source: 'Elaborado pela autora (2025)' });
    expect(p.blocks[3].meta?.imageDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(p.blocks[7].meta).toMatchObject({ caption: 'Ferramentas', headers: ['Ferramenta', 'Uso'] });
  });
});

describe('Markdown (.md)', () => {
  const p = load(artigoJson, 'artigo');

  it('lê YAML, equações, citação longa, tabela, código e listas', () => {
    expect(p.metadata).toMatchObject({
      title: 'Um Artigo em Markdown',
      author: 'Ana Souza; Bruno Lima',
      advisor: 'Prof. Dr. Carlos',
      year: '2025',
      abstract: 'Este é o resumo do artigo.',
      keywords: ['markdown', 'pandoc'],
    });
    expect(types(p)).toEqual([
      'h1',
      'paragraph',
      'footnote',
      'equation',
      'quote_long',
      'table',
      'code',
      'numbered',
      'numbered',
    ]);
    expect(p.blocks[3].content).toBe('sum_(i = 1)^n i = frac(n \\( n + 1 \\), 2)');
    expect(p.blocks[4].meta).toMatchObject({ author: 'SILVA', year: '2020', page: '12' });
    expect(p.blocks[5].meta?.caption).toBe('Dados de exemplo');
    expect(p.blocks[6].meta?.language).toBe('python');
  });
});

describe('Typst (.typ com template do Universe)', () => {
  const p = load(tccJson, 'tcc');

  it('mantém o pacote do Universe e converte o corpo', () => {
    expect(p.templateType).toBe('universe_custom');
    expect(p.templateConfig?.universePackage).toBe('@preview/abnt-ufpe:0.1.0');
    expect(p.metadata).toMatchObject({ title: 'Trabalho em Typst', author: 'Pedro Alves', abstract: '' });
    expect(types(p)).toEqual(['h1', 'paragraph', 'equation', 'h2', 'bullet', 'bullet', 'table']);
    expect(p.blocks[6].meta).toMatchObject({ caption: 'Tabela simples', headers: ['A', 'B'], rows: [['1', '2']] });
  });
});
