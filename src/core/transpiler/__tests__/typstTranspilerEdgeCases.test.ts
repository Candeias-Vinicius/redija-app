import { describe, expect, it } from 'vitest';
import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';
import {
  escapeMarkup,
  hasRichHtmlMarkup,
  richTextToTypst,
  sanitizeLinkUrl,
  stripHtmlTags,
} from '../escape';
import {
  generateMain,
  generateStandaloneTypst,
  stripManualNumbering,
} from '../typstGenerator';
import { DocumentProject, DEFAULT_TEMPLATE_CONFIG } from '@/types/document';

describe('Transpilador Typst: Casos de Borda de Escape e Colisão de Sintaxe', () => {
  it('escapa colisões de modo matemático e caracteres monetários sem entrar em math mode', () => {
    const raw = 'O custo total foi de $150 por licença e o retorno superou $500, com margem de $x + y$.';
    const escaped = escapeMarkup(raw);

    // O cifrão ($) deve ser escapado para não abrir bloco matemático no Typst
    expect(escaped).toContain('\\$150');
    expect(escaped).toContain('\\$500');
    expect(escaped).toContain('\\$x \\+ y\\$');
    expect(escaped).not.toMatch(/(?<!\\)\$/);
  });

  it('escapa colisões de comandos, funções e macros (#hash)', () => {
    const raw = '#import "malicioso.typ": * #sys.process #panic("crash") #tag123 ##duplo';
    const escaped = escapeMarkup(raw);

    expect(escaped).toContain('\\#import');
    expect(escaped).toContain('\\#sys.process');
    expect(escaped).toContain('\\#panic');
    expect(escaped).toContain('\\#tag123');
    expect(escaped).toContain('\\#\\#duplo');
    expect(escaped).not.toMatch(/(?<!\\)#/);
  });

  it('escapa labels Typst (<label>) e chamadas de citação (@referencia)', () => {
    const raw = 'Veja a seção <sec:intro> e o contato email@universidade.edu.br ou anotação @Override.';
    const escaped = escapeMarkup(raw);

    expect(escaped).toContain('\\<sec:intro\\>');
    expect(escaped).toContain('\\@universidade');
    expect(escaped).toContain('\\@Override');
  });

  it('escapa colchetes desbalanceados, barras invertidas e asteriscos', () => {
    const raw = 'C:\\Windows\\System32 [unclosed bracket *asterisco* _sublinhado_ `crase`';
    const escaped = escapeMarkup(raw);

    expect(escaped).toContain('C:\\\\Windows\\\\System32');
    expect(escaped).toContain('\\[unclosed bracket');
    expect(escaped).toContain('\\*asterisco\\*');
    expect(escaped).toContain('\\_sublinhado\\_');
    expect(escaped).toContain('\\`crase\\`');
  });

  it('escapa gatilhos de listas numeradas, com marcadores e listas de termos no início de linha', () => {
    const multiline = [
      '1. Primeiro item numerado',
      '2) Segundo item numerado',
      '- Item com hífen',
      '+ Item com mais',
      '* Item com asterisco',
      '/ Termo: Definição de lista descritiva',
    ].join('\n');

    const escaped = escapeMarkup(multiline);

    expect(escaped).toContain('1\\. Primeiro item numerado');
    expect(escaped).toContain('2\\) Segundo item numerado');
    expect(escaped).toContain('\\- Item com hífen');
    expect(escaped).toContain('\\+ Item com mais');
    expect(escaped).toContain('\\* Item com asterisco');
    expect(escaped).toContain('\\/ Termo: Definição');
  });

  it('preserva integridade de URLs com parâmetros, barras duplas e âncoras', () => {
    const url = 'https://exemplo.org/api/v2/relatorio?ano=2026&tipo=tcc#conclusao';
    const escaped = escapeMarkup(url);

    // As barras devem aceitar escape seguro para não formar // (comentário do Typst)
    expect(escaped).toContain('https:\\/\\/exemplo.org\\/api\\/v2\\/relatorio?ano\\=2026&tipo\\=tcc\\#conclusao');
  });
});

describe('Transpilador Typst: Robustez a HTML Malformado e TipTap Rich Text', () => {
  it('fecha automaticamente tags HTML não fechadas para não desbalancear colchetes Typst', () => {
    const malformedHtml = '<p>Texto com <strong>negrito sem fechar e <em>itálico sem fechar';
    const typst = richTextToTypst(malformedHtml);

    // Deve abrir #strong[ e #emph[, e fechar ambos com ]] no final
    expect(typst).toBe('Texto com #strong[negrito sem fechar e #emph[itálico sem fechar]]');

    // Valida invariant: quantidade de colchetes abertos deve igualar fechados
    const opens = (typst.match(/\[/g) || []).length;
    const closes = (typst.match(/\]/g) || []).length;
    expect(opens).toBe(closes);
  });

  it('descarta tags de fechamento órfãs ou espúrias sem gerar colchete excedente', () => {
    const orphanHtml = 'Texto inicial</strong> mais texto</em> final</u>';
    const typst = richTextToTypst(orphanHtml);

    // Não deve adicionar colchetes fechando o que nunca foi aberto
    expect(typst).toBe('Texto inicial mais texto final');
    expect(typst).not.toContain(']');
  });

  it('lida com tags HTML sobrepostas ou cruzadas com segurança sintática', () => {
    const crossedHtml = '<p><b>Negrito <i>e itálico</b> só itálico</i> normal</p>';
    const typst = richTextToTypst(crossedHtml);

    const opens = (typst.match(/\[/g) || []).length;
    const closes = (typst.match(/\]/g) || []).length;
    expect(opens).toBe(closes);
  });

  it('decodifica entidades HTML antes de aplicar escape de sintaxe Typst', () => {
    const htmlWithEntities = '<p>Preço &amp; valor: 100 &lt; 200 &gt; 50 &quot;aspas&quot; &#39;simples&#39; &nbsp;</p>';
    const typst = richTextToTypst(htmlWithEntities);

    expect(typst).toContain('Preço & valor: 100 \\< 200 \\> 50 "aspas" \'simples\'');
  });

  it('ignora tags HTML desconhecidas ou atributos sem quebrar a marcação', () => {
    const richSpan = '<p class="MsoNormal"><span style="color: red;" data-id="123">Texto estilizado</span></p>';
    const plain = stripHtmlTags(richSpan);
    expect(plain).toBe('Texto estilizado');

    // Valida que richTextToTypst descarta tags desconhecidas como <span> e <div> sem vazar HTML literal para o Typst
    const typst = richTextToTypst(richSpan);
    expect(typst).toBe('Texto estilizado');
    expect(typst).not.toContain('<span');
    expect(typst).not.toContain('\\<span');
  });

  it('elimina completamente tags executáveis perigosas como script, style e iframe no richTextToTypst', () => {
    const xss = '<p>Texto legítimo <script>alert("hack")</script><style>body{color:red;}</style><iframe src="evil.com"></iframe> com <strong>ênfase</strong>.</p>';
    const typst = richTextToTypst(xss);
    expect(typst).toBe('Texto legítimo  com #strong[ênfase].');
    expect(typst).not.toContain('alert');
    expect(typst).not.toContain('evil.com');
  });
});

describe('Transpilador Typst: Casos de Borda de Blocos e Estrutura', () => {
  it('remove variações de numeração manual em títulos (com ponto, hífen ou travessão)', () => {
    expect(stripManualNumbering('1 INTRODUÇÃO')).toBe('INTRODUÇÃO');
    expect(stripManualNumbering('1. Introdução')).toBe('Introdução');
    expect(stripManualNumbering('1 - INTRODUÇÃO')).toBe('INTRODUÇÃO');
    expect(stripManualNumbering('1.1 - Justificativa')).toBe('Justificativa');
    expect(stripManualNumbering('1.1.1: Metodologia Científica')).toBe('Metodologia Científica');
    expect(stripManualNumbering('2.3.4.5 Resultados Obtidos')).toBe('Resultados Obtidos');
    expect(stripManualNumbering('Considerações Finais')).toBe('Considerações Finais');

    // Título vazio ou apenas com número
    expect(stripManualNumbering('')).toBe('');
    expect(stripManualNumbering('1.')).toBe('');
    expect(stripManualNumbering('1.1 - ')).toBe('');
  });

  it('trata blocos de equação limpando delimitadores externos duplicados ($ ou $$)', () => {
    const project: DocumentProject = {
      id: 'eq_test',
      name: 'Equações Edge Cases',
      templateType: 'artigo',
      updatedAt: '2026-11-08T00:00:00.000Z',
      templateConfig: DEFAULT_TEMPLATE_CONFIG,
      metadata: {
        title: 'Teste de Equações',
        author: 'Autor Teste',
        advisor: 'Prof. Orientador',
        institution: 'Inst',
        course: 'Curso',
        location: 'SP',
        year: '2026',
        abstract: 'Resumo com mais de cinquenta palavras para validação técnica do teste.',
        keywords: ['Teste'],
      },
      blocks: [
        { id: 'eq1', type: 'equation', content: 'E = m c^2' },
        { id: 'eq2', type: 'equation', content: '$x = y + 1$' },
        { id: 'eq3', type: 'equation', content: '$$ sum_(i=1)^n i = (n(n+1))/2 $$' },
        { id: 'eq4', type: 'equation', content: '   ' }, // Equação em branco: deve ser ignorada
      ],
      references: [],
    };

    const main = generateMain(project);
    expect(main).toContain('$ E = m c^2 $');
    expect(main).toContain('$ x = y + 1 $');
    expect(main).toContain('$ sum_(i=1)^n i = (n(n+1))/2 $');
    // Não deve conter $ $ $ $
    expect(main).not.toContain('$ $');
  });

  it('isola código-fonte contendo crases triplas usando fencing dinâmico', () => {
    const codeSnippetWithBackticks = [
      '// Snippet Markdown com bloco raw',
      '```javascript',
      'console.log("Olá Mundo");',
      '```',
    ].join('\n');

    const project: DocumentProject = {
      id: 'code_test',
      name: 'Código com Crases',
      templateType: 'artigo',
      updatedAt: '2026-11-08T00:00:00.000Z',
      templateConfig: DEFAULT_TEMPLATE_CONFIG,
      metadata: {
        title: 'Código Teste',
        author: 'Autor',
        advisor: 'Prof. Orientador',
        institution: 'Inst',
        course: 'Curso',
        location: 'SP',
        year: '2026',
        abstract: 'Resumo com conteúdo suficiente.',
        keywords: ['Teste'],
      },
      blocks: [
        {
          id: 'code_block_1',
          type: 'code',
          content: codeSnippetWithBackticks,
          meta: { caption: 'Exemplo de Markdown', source: 'Autor', language: 'markdown' },
        },
      ],
      references: [],
    };

    const main = generateMain(project);

    // O fence deve usar no mínimo 4 crases para não fechar nas crases triplas internas
    expect(main).toContain('````markdown');
    expect(main).toContain('console.log("Olá Mundo");');
    expect(main).toContain('````\n]');
  });

  it('lida com tabelas e quadros com células vazias, linhas assimétricas e caracteres especiais', () => {
    const project: DocumentProject = {
      id: 'table_test',
      name: 'Tabela Complexa',
      templateType: 'artigo',
      updatedAt: '2026-11-08T00:00:00.000Z',
      templateConfig: DEFAULT_TEMPLATE_CONFIG,
      metadata: {
        title: 'Tabela Teste',
        author: 'Autor',
        advisor: 'Prof. Orientador',
        institution: 'Inst',
        course: 'Curso',
        location: 'SP',
        year: '2026',
        abstract: 'Resumo de teste.',
        keywords: ['Tabela'],
      },
      blocks: [
        {
          id: 'tbl_1',
          type: 'table',
          content: '',
          meta: {
            caption: 'Tabela com [colchetes] e $cifrão$',
            source: 'Fonte com "aspas"',
            headers: ['Item #1', 'Preço ($)', 'Status'],
            rows: [
              ['Produto A', '10.00', 'Disponível'],
              ['Produto B', '25.50'], // Linha com 2 colunas quando header tem 3
              ['', '', ''], // Linha vazia
            ],
          },
        },
      ],
      references: [],
    };

    const main = generateMain(project);
    expect(main).toContain('table.cell(fill: luma(240))[#strong[Item \\#1]]');
    expect(main).toContain('table.cell(fill: luma(240))[#strong[Preço (\\$)]]');
    expect(main).toContain('[Produto A], [10\\.00], [Disponível]');
    // A célula faltante deve gerar [] vazio sem quebrar
    expect(main).toContain('[Produto B], [25\\.50], []');
  });
});

describe('Transpilador Typst: Compilação WASM Sob Estresse (Edge Cases Combinados)', () => {
  it('compila documento complexo contendo todos os casos de borda sem nenhum erro de parser Typst', () => {
    const stressProject: DocumentProject = {
      id: 'stress_proj',
      name: 'Documento Estresse Typst',
      templateType: 'tcc',
      updatedAt: '2026-11-08T00:00:00.000Z',
      templateConfig: DEFAULT_TEMPLATE_CONFIG,
      metadata: {
        title: 'Avaliação de Limites: $100, #comandos e <labels>',
        subtitle: 'Testes de Borda com "Aspas", & e // Slashes',
        author: 'João da Silva & Maria de Souza',
        advisor: 'Prof. Dr. "Orientador" #1',
        institution: 'Universidade Federal & Cia',
        course: 'Engenharia de Software / Redes',
        location: 'São Paulo - SP',
        year: '2026',
        abstract:
          '<p>Resumo com caracteres especiais como <strong>$100</strong>, <em>#tag</em>, &quot;aspas&quot;, 50% de taxa e <script>tags</script> irrelevantes. Mais de cento e cinquenta palavras para cumprir estritamente as diretrizes da norma ABNT NBR 6028 para resumos acadêmicos em trabalhos monográficos e teses universitárias. Apresentamos aqui uma bateria intensiva de validação para motores de diagramação estáticos e dinâmicos baseados no Typst WebAssembly. Cada elemento textual foi submetido a injeção deliberada de marcações que comumente derrubam compiladores de tipografia matemática e documental. Os resultados atestam a robustez das rotinas de sanitização, normalização e escape desenvolvidas para a plataforma RedijaApp.</p>',
        keywords: ['Typst & WASM', '$Math$', '#Macro#', 'Edge-Cases'],
      },
      blocks: [
        { id: 's1', type: 'h1', content: '1 - INTRODUÇÃO E CONTEXTO' },
        {
          id: 'p1',
          type: 'paragraph',
          content:
            '<p>Texto com <strong>negrito não fechado e $50 de custo e links como https://exemplo.com/api//v1?q=1#sec.',
        },
        { id: 's2', type: 'h2', content: '1.1 - Formulação Matemática' },
        {
          id: 'eq1',
          type: 'equation',
          content: '$$ f(x) = sqrt(x^2 + 1) $$',
        },
        {
          id: 'code1',
          type: 'code',
          content: '```bash\necho "Hello $USER"\nls -la /tmp\n```',
          meta: { caption: 'Script de automação', source: 'Autor' },
        },
        {
          id: 'q1',
          type: 'quote_long',
          content: '<p>Citação direta longa com <em>itálico</em> e $valor$ e #hash.</p>',
          meta: { author: 'SILVA, R. apud SOUZA, M.', year: '2023', page: '99' },
        },
        {
          id: 'tbl1',
          type: 'table',
          content: '',
          meta: {
            caption: 'Matriz de teste',
            source: 'Autor',
            headers: ['Chave', 'Valor'],
            rows: [['A', '$10'], ['B', 'C:\\path']],
          },
        },
      ],
      references: [
        {
          id: 'r1',
          type: 'book',
          authors: 'SILVA, Roberto',
          title: 'Tipografia & Compiladores',
          city: 'São Paulo',
          publisher: 'TechPress',
          year: '2024',
        },
      ],
    };

    const standalone = generateStandaloneTypst(stressProject);
    const compiler = NodeCompiler.create();
    const compileResult = compiler.compile({ mainFileContent: standalone });

    const err = compileResult.takeError();
    if (err) {
      const diagnostics = compiler.fetchDiagnostics(err);
      throw new Error(`Falha no teste de estresse Typst: ${JSON.stringify(diagnostics, null, 2)}`);
    }

    expect(compileResult.result).toBeTruthy();
    const pdfBuffer = compiler.pdf(compileResult.result!);
    expect(pdfBuffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdfBuffer.byteLength).toBeGreaterThan(1000);
  });
});

describe('Transpilador Typst: Novas Marcas Inline e Átomos (Links, Tachado, Código, Matemática)', () => {
  it('detecta marcação rica e átomos estruturados via hasRichHtmlMarkup', () => {
    expect(hasRichHtmlMarkup('<p>Texto puro</p>')).toBe(false);
    expect(hasRichHtmlMarkup('<p>Texto com <s>tachado</s></p>')).toBe(true);
    expect(hasRichHtmlMarkup('<p><code>x = 1</code></p>')).toBe(true);
    expect(hasRichHtmlMarkup('<p><a href="https://typst.app">Site</a></p>')).toBe(true);
    expect(hasRichHtmlMarkup('<p><span data-inline-math="x^2">$x^2$</span></p>')).toBe(true);
    expect(hasRichHtmlMarkup('<p><cite data-cite-id="r1">SILVA</cite></p>')).toBe(true);
  });

  it('sanitiza URLs bloqueando protocolos perigosos e permitindo apenas http, https e mailto', () => {
    expect(sanitizeLinkUrl('https://redija.app/docs?a=1')).toBe('https://redija.app/docs?a=1');
    expect(sanitizeLinkUrl('http://example.com')).toBe('http://example.com/');
    expect(sanitizeLinkUrl('mailto:contato@redija.app')).toBe('mailto:contato@redija.app');
    expect(sanitizeLinkUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeLinkUrl('data:text/html,<script>1</script>')).toBeNull();
    expect(sanitizeLinkUrl('nota-relativa')).toBeNull();
  });

  it('converte <s>, <code>, <a> e inline math preservando escape e aninhamento seguro', () => {
    const html =
      '<p>Veja <a href="https://typst.app">doc <code>foo("x")</code></a>, <s>removido #1</s> e <span data-inline-math="true" data-math="alpha + beta">alpha + beta</span>.</p>';
    const typst = richTextToTypst(html);

    expect(typst).toContain('#link("https://typst.app/")[doc #raw("foo(\\"x\\")")]');
    expect(typst).toContain('#strike[removido \\#1]');
    expect(typst).toContain('$alpha + beta$');
    expect(typst).not.toContain('<a');
  });

  it('remove atributo link inseguro mantendo o rótulo escapado como texto comum', () => {
    const unsafe = '<p><a href="javascript:evil()">Clique #aqui</a></p>';
    const typst = richTextToTypst(unsafe);
    expect(typst).toBe('Clique \\#aqui');
    expect(typst).not.toContain('#link');
    expect(typst).not.toContain('javascript:');
  });
});
