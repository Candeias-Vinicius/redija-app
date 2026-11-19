import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PROJECT_API_CONTACT_EMAIL,
  deduplicateSearchResults,
  searchReferencesByTitleOrAuthor,
} from '../referenceSearch';
import {
  CSL_TO_REDIJA_TYPE_MAP,
  RIS_TO_REDIJA_TYPE_MAP,
  ReferenceImportError,
  parseReferenceFileOrText,
  planReferenceImport,
} from '../referenceImporter';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('RDJ-07.2: Busca de referência pelo título ou autor (OpenAlex e Crossref)', () => {
  it('consulta OpenAlex e Crossref com e-mail institucional do projeto e deduplica a mesma obra entre as fontes', async () => {
    const requestedUrls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      requestedUrls.push(url);

      if (url.includes('api.openalex.org')) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 'https://openalex.org/W1',
                display_name: 'Clean Architecture: A Craftsman Guide',
                publication_year: 2017,
                type: 'book',
                doi: 'https://doi.org/10.1000/clean.arch.2017',
                authorships: [{ author: { display_name: 'Robert C. Martin' } }],
                primary_location: {
                  source: { display_name: 'Prentice Hall' },
                },
              },
            ],
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          message: {
            items: [
              {
                DOI: '10.1000/clean.arch.2017',
                type: 'book',
                title: ['Clean Architecture'],
                subtitle: ['A Craftsman Guide'],
                author: [{ family: 'Martin', given: 'Robert C.' }],
                issued: { 'date-parts': [[2017]] },
                publisher: 'Prentice Hall',
                'publisher-location': 'Boston',
                ISBN: ['9780134494166'],
              },
              {
                DOI: '10.1145/999999',
                type: 'journal-article',
                title: ['Typst: A Modern Typesetting System'],
                author: [
                  { family: 'Mädje', given: 'Laurenz' },
                  { family: 'Haug', given: 'Martin' },
                ],
                issued: { 'date-parts': [[2023]] },
                'container-title': ['ACM Symposium on Document Engineering'],
              },
            ],
          },
        }),
        { status: 200 },
      );
    });

    const results = await searchReferencesByTitleOrAuthor('Clean Architecture');

    // Confirma que ambas as APIs foram consultadas com o contato do projeto (nunca e-mail do usuário)
    expect(requestedUrls).toHaveLength(2);
    for (const u of requestedUrls) {
      expect(u).toContain(encodeURIComponent(PROJECT_API_CONTACT_EMAIL));
    }

    // A obra "Clean Architecture" presente nas duas bases aparece uma única vez, mesclada
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      title: 'Clean Architecture',
      subtitle: 'A Craftsman Guide',
      year: '2017',
      doi: '10.1000/clean.arch.2017',
      isbn: '9780134494166',
      city: 'Boston',
      source: 'merged',
    });
    expect(results[1]).toMatchObject({
      title: 'Typst',
      subtitle: 'A Modern Typesetting System',
      type: 'article',
      year: '2023',
    });
  });

  it('deduplica resultados entre fontes mesmo quando um deles não traz DOI (título normalizado + ano)', () => {
    const merged = deduplicateSearchResults([
      {
        id: 'oa-1',
        source: 'openalex',
        type: 'article',
        authors: 'SILVA, João',
        title: 'Educação Superior no Brasil!',
        year: '2022',
      },
      {
        id: 'cr-1',
        source: 'crossref',
        type: 'article',
        authors: 'SILVA, João',
        title: 'Educacao superior no Brasil',
        year: '2022',
        doi: '10.1590/educ2022',
      },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].doi).toBe('10.1590/educ2022');
  });

  it('exibe erro claro quando ambas as APIs falham', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network failure'));
    await expect(searchReferencesByTitleOrAuthor('Qualquer obra')).rejects.toThrow(
      /Não foi possível consultar as bases acadêmicas/i,
    );
  });
});

describe('RDJ-07.3: Importação de referências .ris, CSL-JSON e .bib (Zotero e Mendeley)', () => {
  it('importa arquivo .ris com tipo, autores, título, ano, veículo, DOI e ISBN', () => {
    const risSample = [
      'TY  - JOUR',
      'AU  - Silva, Roberto',
      'AU  - Souza, Maria Clara',
      'TI  - Automação da Escrita Acadêmica: Um Estudo Empírico',
      'T2  - Revista Brasileira de Informática na Educação',
      'PY  - 2024/05/12',
      'VL  - 32',
      'IS  - 2',
      'SP  - 110',
      'EP  - 128',
      'DO  - 10.5753/rbie.2024.1234',
      'ER  - ',
      '',
      'TY  - BOOK',
      'AU  - Gil, Antonio Carlos',
      'TI  - Como Elaborar Projetos de Pesquisa',
      'PY  - 2022',
      'PB  - Atlas',
      'CY  - São Paulo',
      'ET  - 7',
      'SN  - 978-65-597-7165-3',
      'ER  - ',
    ].join('\n');

    const { format, references } = parseReferenceFileOrText(risSample, 'zotero-export.ris');
    expect(format).toBe('ris');
    expect(references).toHaveLength(2);
    expect(references[0]).toMatchObject({
      type: 'article',
      authors: 'SILVA, Roberto; SOUZA, Maria Clara',
      title: 'Automação da Escrita Acadêmica',
      subtitle: 'Um Estudo Empírico',
      journal: 'Revista Brasileira de Informática na Educação',
      year: '2024',
      volume: '32',
      issue: '2',
      pages: '110-128',
      doi: '10.5753/rbie.2024.1234',
    });
    expect(references[1]).toMatchObject({
      type: 'book',
      authors: 'GIL, Antonio Carlos',
      title: 'Como Elaborar Projetos de Pesquisa',
      year: '2022',
      publisher: 'Atlas',
      city: 'São Paulo',
      edition: '7',
      isbn: '9786559771653',
    });
  });

  it('importa arquivo CSL-JSON exportado pelo Zotero ou Mendeley', () => {
    const cslJson = JSON.stringify([
      {
        id: 'item-1',
        type: 'article-journal',
        title: 'Deep Learning for Academic Writing: Perspectives',
        author: [
          { family: 'Santos', given: 'Ana Paula' },
          { family: 'Oliveira', given: 'Carlos' },
        ],
        issued: { 'date-parts': [[2025, 3, 1]] },
        'container-title': 'Journal of Educational Technology',
        volume: '18',
        issue: '4',
        page: '200--215',
        DOI: 'https://doi.org/10.1016/j.edtech.2025.01',
      },
      {
        id: 'item-2',
        type: 'thesis',
        title: 'Compilação Científica no Navegador',
        author: [{ family: 'Candeias', given: 'Vinícius' }],
        issued: { 'date-parts': [[2026]] },
        publisher: 'IFSP',
        'publisher-place': 'São Paulo',
        genre: 'Trabalho de Conclusão de Curso',
        ISBN: '9788535236996',
      },
    ]);

    const { format, references } = parseReferenceFileOrText(cslJson, 'mendeley.json');
    expect(format).toBe('csl-json');
    expect(references).toHaveLength(2);
    expect(references[0]).toMatchObject({
      type: 'article',
      authors: 'SANTOS, Ana Paula; OLIVEIRA, Carlos',
      title: 'Deep Learning for Academic Writing',
      subtitle: 'Perspectives',
      year: '2025',
      journal: 'Journal of Educational Technology',
      pages: '200-215',
      doi: '10.1016/j.edtech.2025.01',
    });
    expect(references[1]).toMatchObject({
      type: 'thesis',
      authors: 'CANDEIAS, Vinícius',
      institution: 'IFSP',
      degree: 'Trabalho de Conclusão de Curso',
      isbn: '9788535236996',
    });
  });

  it('gera o resumo exato "12 importadas, 3 duplicadas ignoradas" quando há duplicatas no destino (Cenário 4)', () => {
    const incoming = Array.from({ length: 15 }, (_, idx) => ({
      id: `in-${idx + 1}`,
      type: 'book' as const,
      authors: `AUTOR, Nome ${idx + 1}`,
      title: `Obra Acadêmica Número ${idx + 1}`,
      city: 'São Paulo',
      publisher: 'Editora',
      year: '2024',
      doi: `10.1000/obra.${idx + 1}`,
    }));

    const existingInDestination = [
      { title: 'Obra Acadêmica Número 2', year: '2024', doi: '10.1000/obra.2' },
      { title: 'Obra Acadêmica Número 7', year: '2024', doi: '10.1000/obra.7' },
      { title: 'Obra Acadêmica Número 14', year: '2024', doi: '10.1000/obra.14' },
    ];

    const plan = planReferenceImport(incoming, existingInDestination);
    expect(plan.toImport).toHaveLength(12);
    expect(plan.duplicates).toHaveLength(3);
    expect(plan.summaryText).toBe('12 importadas, 3 duplicadas ignoradas');
  });

  it('rejeita arquivo corrompido indicando a entrada afetada, sem importar nada pela metade (Cenário 5)', () => {
    const corruptedCsl = JSON.stringify([
      {
        id: 'ok-1',
        type: 'book',
        title: 'Obra Válida',
        author: [{ family: 'Silva', given: 'João' }],
      },
      {
        id: 'broken-2',
        type: 'article-journal',
        title: '   ',
      },
    ]);

    expect(() => parseReferenceFileOrText(corruptedCsl, 'corrompido.json')).toThrowError(
      ReferenceImportError,
    );
    expect(() => parseReferenceFileOrText(corruptedCsl, 'corrompido.json')).toThrow(
      /entrada #2 \(broken-2\)/i,
    );

    const unclosedRis = [
      'TY  - BOOK',
      'TI  - Obra 1',
      'ER  - ',
      'TY  - JOUR',
      'AU  - Autor Sem Título',
      'ER  - ',
    ].join('\n');

    expect(() => parseReferenceFileOrText(unclosedRis, 'invalido.ris')).toThrow(
      /entrada #2.*título da obra/i,
    );
  });

  it('mantém mapeamentos de tipos RIS e CSL-JSON documentados e exportados', () => {
    expect(RIS_TO_REDIJA_TYPE_MAP.JOUR).toBe('article');
    expect(RIS_TO_REDIJA_TYPE_MAP.THES).toBe('thesis');
    expect(RIS_TO_REDIJA_TYPE_MAP.BOOK).toBe('book');
    expect(CSL_TO_REDIJA_TYPE_MAP['article-journal']).toBe('article');
    expect(CSL_TO_REDIJA_TYPE_MAP.thesis).toBe('thesis');
    expect(CSL_TO_REDIJA_TYPE_MAP.webpage).toBe('website');
  });
});
