import { afterEach, describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import {
  importDocumentFile,
  detectLatexTemplate,
  detectDocxTemplate,
  detectTypstTemplate,
  pandocResponseToProject,
  IMPORTER_STRATEGIES,
  IMPORT_ACCEPT,
  ImportFailure,
  type ImportProgress,
} from '../documentImporter';
import { extractTypstMetadata } from '../importer/pandoc/templateDetection';
import { serializeBackup } from '../db';
import { createProjectFromTemplate } from '../projectTemplates';
import { convertResponse, FakeXhr, installFakeXhr } from './fakeXhr';

const fileFrom = (name: string, data: ArrayBuffer | string) => ({
  name,
  arrayBuffer: async () =>
    typeof data === 'string' ? (new TextEncoder().encode(data).buffer as ArrayBuffer) : data,
});

const PNG = new Uint8Array([137, 80, 78, 71]);

/** .zip exportado pelo Redija (`*.redija` + `assets/img_<id>.png`) com figuras sem a imagem embutida. */
async function redijaExportZip(blockIds: string[], extra?: (zip: JSZip) => void) {
  const original = createProjectFromTemplate('tcc', 'Meu TCC Exportado');
  original.blocks = blockIds.map((id) => ({
    id,
    type: 'image' as const,
    content: '',
    meta: { caption: `Figura ${id}`, source: 'Autor' },
  }));
  const zip = new JSZip();
  extra?.(zip);
  zip.file('meu_tcc/meu_tcc.redija', serializeBackup(original));
  for (const id of blockIds)
    zip.file(`meu_tcc/assets/img_${id}.png`, new Uint8Array([...PNG, id.length]));
  return zip.generateAsync({ type: 'arraybuffer' });
}

describe('Document Importer (.redija, ZIP do Redija e serviço de importação)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    FakeXhr.onSend = null;
  });

  describe('Importação de .redija nativo', () => {
    it('importa com sucesso um arquivo .redija serializado', async () => {
      const original = createProjectFromTemplate('artigo', 'Artigo Original');
      original.metadata.title = 'Título do Artigo';
      original.metadata.author = 'Pesquisador Silva';

      const { project: imported, warnings } = await importDocumentFile(
        fileFrom('meu_artigo.redija', serializeBackup(original)),
      );
      expect(imported.name).toBe('Artigo Original');
      expect(imported.metadata.title).toBe('Título do Artigo');
      expect(imported.metadata.author).toBe('Pesquisador Silva');
      expect(warnings).toEqual([]);
    });

    it('aceita o backup salvo como .json e recusa um JSON que não é projeto do Redija', async () => {
      const original = createProjectFromTemplate('artigo', 'Backup em JSON');
      const { project } = await importDocumentFile(
        fileFrom('backup.json', serializeBackup(original)),
      );
      expect(project.name).toBe('Backup em JSON');

      await expect(importDocumentFile(fileFrom('dados.json', '{"foo": 1}'))).rejects.toThrow(
        /não contém os dados obrigatórios de um projeto do RedijaApp/,
      );
    });

    it('explica que o arquivo está vazio em vez de falar em JSON inválido', async () => {
      await expect(importDocumentFile(fileFrom('vazio.redija', ''))).rejects.toThrow(
        /está vazio \(0 bytes\)/,
      );
    });

    it('rejeita extensões desconhecidas com mensagem explicativa', async () => {
      await expect(
        importDocumentFile(fileFrom('documento.txt', new ArrayBuffer(0))),
      ).rejects.toThrow(/Formato de arquivo não suportado/);
    });
  });

  describe('Importação de ZIP do RedijaApp', () => {
    it('restaura projeto a partir de zip com .redija e assets/ sem usar o serviço de importação', async () => {
      vi.stubEnv('VITE_IMPORT_API_URL', 'http://localhost:8080');
      const xhrSpy = vi.fn();
      vi.stubGlobal('XMLHttpRequest', xhrSpy);

      const { project: imported } = await importDocumentFile(
        fileFrom('meu_tcc_exportado.zip', await redijaExportZip(['img-block-1'])),
      );

      expect(xhrSpy).not.toHaveBeenCalled();
      expect(imported.name).toBe('Meu TCC Exportado');
      expect(imported.blocks).toHaveLength(1);
      expect(imported.blocks[0].type).toBe('image');
      expect(imported.blocks[0].meta?.imageDataUrl).toContain('data:image/png;base64,');
    });

    it('ignora o ._projeto.redija que o macOS grava em __MACOSX, mesmo quando vem primeiro', async () => {
      const zipBuffer = await redijaExportZip(['b1'], (zip) => {
        zip.file('__MACOSX/meu_tcc/._meu_tcc.redija', new Uint8Array([0, 5, 22, 7, 0, 2, 0, 0]));
      });
      const { project } = await importDocumentFile(fileFrom('meu_tcc.zip', zipBuffer));
      expect(project.name).toBe('Meu TCC Exportado');
    });

    it('associa cada figura à sua imagem pelo nome exato (img_b1 não pega img_b10)', async () => {
      const { project } = await importDocumentFile(
        fileFrom('meu_tcc.zip', await redijaExportZip(['b10', 'b1'])),
      );
      const imageOf = (id: string) =>
        atob(project.blocks.find((b) => b.id === id)!.meta!.imageDataUrl!.split(',')[1]).charCodeAt(
          4,
        );
      expect(imageOf('b1')).toBe(2);
      expect(imageOf('b10')).toBe(3);
    });

    it('informa o progresso da descompactação', async () => {
      const stages: ImportProgress[] = [];
      await importDocumentFile(fileFrom('meu_tcc.zip', await redijaExportZip(['b1'])), {
        onProgress: (p) => stages.push(p),
      });
      expect(stages[0]).toEqual({ stage: 'reading' });
      expect(stages.some((p) => p.stage === 'extracting' && p.percent === 100)).toBe(true);
      expect(stages[stages.length - 1]).toEqual({ stage: 'building' });
    });
  });

  describe('Arquivos .zip inválidos', () => {
    const expectFailure = async (data: ArrayBuffer, message: RegExp) => {
      const attempt = importDocumentFile(fileFrom('projeto.zip', data));
      await expect(attempt).rejects.toBeInstanceOf(ImportFailure);
      await expect(attempt).rejects.toThrow(message);
    };

    it('explica arquivo vazio, de outro formato e .zip sem arquivos', async () => {
      await expectFailure(new ArrayBuffer(0), /está vazio \(0 bytes\)/);
      await expectFailure(
        new TextEncoder().encode('%PDF-1.7').buffer as ArrayBuffer,
        /não é um \.zip válido/,
      );
      await expectFailure(
        await new JSZip().generateAsync({ type: 'arraybuffer' }),
        /\.zip está vazio/,
      );
    });

    it('explica .zip corrompido ou baixado pela metade, sem a mensagem técnica do JSZip', async () => {
      const zip = new JSZip();
      zip.file('main.tex', '\\documentclass{article}'.repeat(200));
      const full = new Uint8Array(
        await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' }),
      );
      await expectFailure(
        full.slice(0, Math.floor(full.length * 0.6)).buffer,
        /corrompido ou incompleto/,
      );
    });

    it('explica .zip protegido por senha', async () => {
      const zip = new JSZip();
      zip.file('main.tex', 'x');
      const bytes = new Uint8Array(await zip.generateAsync({ type: 'arraybuffer' }));
      // Liga o bit de criptografia nos cabeçalhos local e central
      const view = new DataView(bytes.buffer);
      for (let i = 0; i + 4 <= bytes.length; i++) {
        const sig = view.getUint32(i, true);
        if (sig === 0x04034b50) view.setUint16(i + 6, view.getUint16(i + 6, true) | 1, true);
        if (sig === 0x02014b50) view.setUint16(i + 8, view.getUint16(i + 8, true) | 1, true);
      }
      await expectFailure(bytes.buffer, /protegido por senha/);
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
      void installFakeXhr((xhr) => xhr.failNetwork());

      await expect(importDocumentFile(fileFrom('main.tex', '\\section{Intro}'))).rejects.toThrow(
        /Não foi possível contatar o serviço de importação/,
      );
    });

    it('envia o arquivo ao serviço, converte o AST devolvido e repassa os avisos', async () => {
      vi.stubEnv('VITE_IMPORT_API_URL', 'http://localhost:8080/');
      const sent = installFakeXhr((xhr) =>
        xhr.respond(
          200,
          convertResponse({ warnings: ['Formato de imagem não suportado: grafico.pdf'] }),
        ),
      );

      const { project: imported, warnings } = await importDocumentFile(
        fileFrom('notas.md', '# Introdução'),
      );
      const xhr = await sent;
      expect(xhr.method).toBe('POST');
      expect(xhr.url).toBe('http://localhost:8080/convert');
      expect((xhr.body?.get('file') as File).name).toBe('notas.md');
      expect(imported.name).toBe('notas');
      expect(imported.blocks.some((b) => b.type === 'h1' && b.content === 'Introdução')).toBe(true);
      expect(warnings).toEqual(['Formato de imagem não suportado: grafico.pdf']);
    });

    it('envia o .zip do Overleaf original, sem cópia, quando ele não traz um .redija', async () => {
      vi.stubEnv('VITE_IMPORT_API_URL', 'http://localhost:8080');
      const sent = installFakeXhr((xhr) => xhr.respond(200, convertResponse({ format: 'latex' })));
      const zip = new JSZip();
      zip.file('main.tex', '\\documentclass{article}\\begin{document}Oi\\end{document}');
      const file = new File([await zip.generateAsync({ type: 'arraybuffer' })], 'overleaf.zip');

      await importDocumentFile(file);
      expect((await sent).body?.get('file')).toBeInstanceOf(Blob);
      expect(((await sent).body?.get('file') as File).size).toBe(file.size);
    });

    it('recusa antes de enviar um arquivo acima do limite do serviço (250 MB)', async () => {
      vi.stubEnv('VITE_IMPORT_API_URL', 'http://localhost:8080');
      const xhrSpy = vi.fn();
      vi.stubGlobal('XMLHttpRequest', xhrSpy);
      const huge = { ...fileFrom('tese.docx', new ArrayBuffer(8)), size: 300 * 1024 * 1024 };

      await expect(importDocumentFile(huge)).rejects.toThrow(
        /300,0 MB, acima do limite de 250,0 MB/,
      );
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });

  describe('Detecção heurística de modelo', () => {
    it('detecta modelo no texto de Word/Markdown (TCC vs Relatório vs Artigo)', () => {
      expect(
        detectDocxTemplate('<h1>Folha de Aprovação</h1><p>Trabalho de Conclusão de Curso</p>'),
      ).toBe('tcc');
      expect(detectDocxTemplate('<h1>Relatório de Estágio Supervisionado</h1>')).toBe('relatorio');
      expect(detectDocxTemplate('Projeto de Pesquisa\nJustificativa')).toBe('projeto_pesquisa');
      expect(detectDocxTemplate('<h1>Introdução</h1><p>Artigo simples.</p>')).toBe('artigo');
    });

    it('identifica IEEEtran, SBC, Pôster, abntex2 artigo e artigo genérico no LaTeX', () => {
      expect(
        detectLatexTemplate(
          '\\documentclass[conference]{IEEEtran}\\begin{document}\\end{document}',
        ),
      ).toBe('ieee');
      expect(
        detectLatexTemplate(
          '\\documentclass{article}\\usepackage{sbc-template}\\begin{document}\\end{document}',
        ),
      ).toBe('sbc');
      expect(
        detectLatexTemplate('\\documentclass{tikzposter}\\begin{document}\\end{document}'),
      ).toBe('poster');
      expect(
        detectLatexTemplate('\\documentclass[article]{abntex2}\\tipotrabalho{Artigo Científico}'),
      ).toBe('artigo');
      expect(detectLatexTemplate('\\documentclass{abntex2}\\chapter{Introdução}')).toBe('tcc');
      expect(detectLatexTemplate('\\documentclass{article}\\section{Intro}')).toBe('artigo');
    });

    it('detecta projetos Typst nativos (SBC, IEEE, Pôster, ABNT) e do Typst Universe', () => {
      expect(detectTypstTemplate('#import "abnt.typ": *\n#show: abnt.with(titulo: "TCC")')).toBe(
        'tcc',
      );
      expect(detectTypstTemplate('#show: abnt.with(incluir-capa: false)')).toBe('artigo');
      expect(detectTypstTemplate('#show: ieee-article.with(titulo: "Paper")')).toBe('ieee');
      expect(detectTypstTemplate('#show: academic-poster.with(titulo: "Banner")')).toBe('poster');
      expect(detectTypstTemplate('#import "@preview/charged-ieee:0.1.1": *')).toBe(
        'universe_custom',
      );
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
      expect(ids).toEqual(['redija', 'docx', 'zip', 'typst', 'latex', 'markdown', 'json']);
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('backup.json'))?.id).toBe('json');
      // O seletor de arquivos oferece exatamente os formatos que o importador aceita
      for (const ext of IMPORT_ACCEPT.split(',')) {
        expect(IMPORTER_STRATEGIES.some((s) => s.matches(`arquivo${ext}`))).toBe(true);
      }
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('tcc.redija'))?.id).toBe('redija');
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('artigo.docx'))?.id).toBe('docx');
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('overleaf.zip'))?.id).toBe('zip');
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('main.typ'))?.id).toBe('typst');
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('main.tex'))?.id).toBe('latex');
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('notas.markdown'))?.id).toBe('markdown');
    });
  });
});
