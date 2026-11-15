import { afterEach, describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import {
  importDocumentFile,
  detectLatexTemplate,
  detectDocxTemplate,
  detectTypstTemplate,
  pandocResponseToProject,
  IMPORTER_STRATEGIES,
} from '../documentImporter';
import { extractTypstMetadata } from '../importer/pandoc/templateDetection';
import { serializeBackup } from '../db';
import { createProjectFromTemplate } from '../projectTemplates';

const fileFrom = (name: string, data: ArrayBuffer | string) => ({
  name,
  arrayBuffer: async () =>
    typeof data === 'string' ? (new TextEncoder().encode(data).buffer as ArrayBuffer) : data,
});

describe('Document Importer (.redija, ZIP do Redija e serviço de importação)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe('Importação de .redija nativo', () => {
    it('importa com sucesso um arquivo .redija serializado', async () => {
      const original = createProjectFromTemplate('artigo', 'Artigo Original');
      original.metadata.title = 'Título do Artigo';
      original.metadata.author = 'Pesquisador Silva';

      const imported = await importDocumentFile(fileFrom('meu_artigo.redija', serializeBackup(original)));
      expect(imported.name).toBe('Artigo Original');
      expect(imported.metadata.title).toBe('Título do Artigo');
      expect(imported.metadata.author).toBe('Pesquisador Silva');
    });

    it('rejeita extensões desconhecidas com mensagem explicativa', async () => {
      await expect(importDocumentFile(fileFrom('documento.txt', new ArrayBuffer(0)))).rejects.toThrow(
        /Formato de arquivo não suportado/,
      );
    });
  });

  describe('Importação de ZIP do RedijaApp', () => {
    it('restaura projeto a partir de zip com .redija e assets/ sem usar o serviço de importação', async () => {
      vi.stubEnv('VITE_IMPORT_API_URL', '');
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      const original = createProjectFromTemplate('tcc', 'Meu TCC Exportado');
      const blockId = 'img-block-1';
      original.blocks = [
        { id: blockId, type: 'image', content: '', meta: { caption: 'Diagrama de Arquitetura', source: 'Autor' } },
      ];

      const zip = new JSZip();
      zip.file('meu_tcc_exportado.redija', serializeBackup(original));
      zip.file(`assets/img_${blockId}.png`, new Uint8Array([137, 80, 78, 71]));
      const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

      const imported = await importDocumentFile(fileFrom('meu_tcc_exportado.zip', zipBuffer));

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(imported.name).toBe('Meu TCC Exportado');
      expect(imported.blocks).toHaveLength(1);
      expect(imported.blocks[0].type).toBe('image');
      expect(imported.blocks[0].meta?.imageDataUrl).toContain('data:image/png;base64,');
    });
  });

  describe('Formatos que dependem do serviço de importação', () => {
    it('explica que o serviço é necessário quando VITE_IMPORT_API_URL não está configurada', async () => {
      vi.stubEnv('VITE_IMPORT_API_URL', '');
      const zip = new JSZip();
      zip.file('main.tex', '\\documentclass{article}\\begin{document}Oi\\end{document}');
      const overleafZip = await zip.generateAsync({ type: 'arraybuffer' });

      for (const file of [
        fileFrom('tcc.docx', new ArrayBuffer(4)),
        fileFrom('main.tex', '\\section{Intro}'),
        fileFrom('main.typ', '= Intro'),
        fileFrom('notas.md', '# Intro'),
        fileFrom('overleaf.zip', overleafZip),
      ]) {
        await expect(importDocumentFile(file)).rejects.toThrow(/precisa do serviço de importação/);
      }
    });

    it('avisa que o serviço está fora do ar em erro de rede, sem conversor local de reserva', async () => {
      vi.stubEnv('VITE_IMPORT_API_URL', 'http://localhost:9');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

      await expect(importDocumentFile(fileFrom('main.tex', '\\section{Intro}'))).rejects.toThrow(
        /Não foi possível contatar o serviço de importação/,
      );
    });

    it('envia o arquivo ao serviço e converte o AST devolvido', async () => {
      vi.stubEnv('VITE_IMPORT_API_URL', 'http://localhost:8080/');
      const fetchSpy = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            format: 'markdown',
            mainFile: 'notas.md',
            ast: {
              'pandoc-api-version': [1, 23, 1],
              meta: {},
              blocks: [{ t: 'Header', c: [1, ['', [], []], [{ t: 'Str', c: 'Introdução' }]] }],
            },
            mathTypst: {},
            media: {},
            bibliography: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
      vi.stubGlobal('fetch', fetchSpy);

      const imported = await importDocumentFile(fileFrom('notas.md', '# Introdução'));
      expect(fetchSpy).toHaveBeenCalledWith('http://localhost:8080/convert', expect.anything());
      expect(imported.name).toBe('notas');
      expect(imported.blocks.some((b) => b.type === 'h1' && b.content === 'Introdução')).toBe(true);
    });
  });

  describe('Detecção heurística de modelo', () => {
    it('detecta modelo no texto de Word/Markdown (TCC vs Relatório vs Artigo)', () => {
      expect(detectDocxTemplate('<h1>Folha de Aprovação</h1><p>Trabalho de Conclusão de Curso</p>')).toBe('tcc');
      expect(detectDocxTemplate('<h1>Relatório de Estágio Supervisionado</h1>')).toBe('relatorio');
      expect(detectDocxTemplate('Projeto de Pesquisa\nJustificativa')).toBe('projeto_pesquisa');
      expect(detectDocxTemplate('<h1>Introdução</h1><p>Artigo simples.</p>')).toBe('artigo');
    });

    it('identifica IEEEtran, SBC, Pôster, abntex2 artigo e artigo genérico no LaTeX', () => {
      expect(detectLatexTemplate('\\documentclass[conference]{IEEEtran}\\begin{document}\\end{document}')).toBe('ieee');
      expect(detectLatexTemplate('\\documentclass{article}\\usepackage{sbc-template}\\begin{document}\\end{document}')).toBe('sbc');
      expect(detectLatexTemplate('\\documentclass{tikzposter}\\begin{document}\\end{document}')).toBe('poster');
      expect(detectLatexTemplate('\\documentclass[article]{abntex2}\\tipotrabalho{Artigo Científico}')).toBe('artigo');
      expect(detectLatexTemplate('\\documentclass{abntex2}\\chapter{Introdução}')).toBe('tcc');
      expect(detectLatexTemplate('\\documentclass{article}\\section{Intro}')).toBe('artigo');
    });

    it('detecta projetos Typst nativos (SBC, IEEE, Pôster, ABNT) e do Typst Universe', () => {
      expect(detectTypstTemplate('#import "abnt.typ": *\n#show: abnt.with(titulo: "TCC")')).toBe('tcc');
      expect(detectTypstTemplate('#show: abnt.with(incluir-capa: false)')).toBe('artigo');
      expect(detectTypstTemplate('#show: ieee-article.with(titulo: "Paper")')).toBe('ieee');
      expect(detectTypstTemplate('#show: academic-poster.with(titulo: "Banner")')).toBe('poster');
      expect(detectTypstTemplate('#import "@preview/charged-ieee:0.1.1": *')).toBe('universe_custom');
      expect(detectTypstTemplate('= Só título\n\nParágrafo simples.')).toBe('artigo');
    });
  });

  describe('Metadados do #show: do Typst', () => {
    it('extrai campos nomeados, resumo/abstract e palavras-chave em tuplas (modelo SBC)', () => {
      const meta = extractTypstMetadata(`
        #import "sbc.typ": *
        #show: sbc-article.with(
          titulo: "Sistemas Multi-Template",
          autor: "Carlos Eduardo",
          instituicao: "UFRGS",
          resumo: [Resumo em PT-BR.],
          palavras-chave: ("Typst", "SBC",),
          abstract: [Abstract in EN.],
          keywords: ("Typst", "WASM",),
        )
      `);
      expect(meta).toEqual({
        title: 'Sistemas Multi-Template',
        author: 'Carlos Eduardo',
        institution: 'UFRGS',
        abstract: 'Resumo em PT-BR.',
        foreignAbstract: 'Abstract in EN.',
        keywords: ['Typst', 'SBC'],
        foreignKeywords: ['Typst', 'WASM'],
      });
    });

    it('aplica pacote, entrypoint e metadados do Typst Universe no projeto importado', () => {
      const mainSource = `
        #import "@preview/charged-ieee:0.1.1": *
        #show: ieee.with(
          title: "Compilação WASM no Navegador",
          authors: ("Alice Silva", "Bruno Costa"),
          abstract: [Resumo técnico direto no show rule.],
        )
        = Introdução
      `;
      const project = pandocResponseToProject(
        {
          format: 'typst',
          mainFile: 'main.typ',
          mainSource,
          ast: {
            'pandoc-api-version': [1, 23, 1],
            meta: {},
            blocks: [{ t: 'Header', c: [1, ['', [], []], [{ t: 'Str', c: 'Introdução' }]] }],
          },
          mathTypst: {},
          media: {},
          bibliography: [],
          warnings: [],
        },
        'main',
      );

      expect(project.templateType).toBe('universe_custom');
      expect(project.templateConfig?.universePackage).toBe('@preview/charged-ieee:0.1.1');
      expect(project.templateConfig?.universeEntrypoint).toBe('ieee');
      expect(project.metadata.title).toBe('Compilação WASM no Navegador');
      expect(project.metadata.author).toBe('Alice Silva; Bruno Costa');
      expect(project.metadata.abstract).toBe('Resumo técnico direto no show rule.');
    });
  });

  describe('Registry Strategy de Importadores (IMPORTER_STRATEGIES)', () => {
    it('expõe estratégias registradas para todos os formatos suportados sem duplicação de mapeamento', () => {
      const ids = IMPORTER_STRATEGIES.map((s) => s.id);
      expect(ids).toEqual(['redija', 'docx', 'zip', 'typst', 'latex', 'markdown']);
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('tcc.redija'))?.id).toBe('redija');
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('artigo.docx'))?.id).toBe('docx');
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('overleaf.zip'))?.id).toBe('zip');
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('main.typ'))?.id).toBe('typst');
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('main.tex'))?.id).toBe('latex');
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('notas.markdown'))?.id).toBe('markdown');
    });
  });
});
