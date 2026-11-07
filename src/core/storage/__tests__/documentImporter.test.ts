import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  importDocumentFile,
  importFromZip,
  parseLatexToProject,
  parseDocxHtmlToProject,
} from '../documentImporter';
import { serializeBackup } from '../db';
import { createProjectFromTemplate } from '../projectTemplates';

describe('Document Importer (DOCX, ZIP Redija, ZIP Overleaf / LaTeX, .redija)', () => {
  describe('Importação de .redija nativo', () => {
    it('importa com sucesso um arquivo .redija serializado', async () => {
      const original = createProjectFromTemplate('artigo', 'Artigo Original');
      original.metadata.title = 'Título do Artigo';
      original.metadata.author = 'Pesquisador Silva';

      const jsonStr = serializeBackup(original);
      const encoder = new TextEncoder();
      const uint8 = encoder.encode(jsonStr);

      const fakeFile = {
        name: 'meu_artigo.redija',
        arrayBuffer: async () => uint8.buffer,
      };

      const imported = await importDocumentFile(fakeFile);
      expect(imported.name).toBe('Artigo Original');
      expect(imported.metadata.title).toBe('Título do Artigo');
      expect(imported.metadata.author).toBe('Pesquisador Silva');
    });

    it('rejeita extensões desconhecidas com mensagem explicativa', async () => {
      const fakeFile = {
        name: 'documento.txt',
        arrayBuffer: async () => new ArrayBuffer(0),
      };

      await expect(importDocumentFile(fakeFile)).rejects.toThrow(
        /Formato de arquivo não suportado/
      );
    });
  });

  describe('Importação de ZIP do RedijaApp', () => {
    it('restaura projeto completo a partir de zip do Redija contendo .redija e assets/', async () => {
      const original = createProjectFromTemplate('tcc', 'Meu TCC Exportado');
      const blockId = 'img-block-1';
      original.blocks = [
        {
          id: blockId,
          type: 'image',
          content: '',
          meta: {
            caption: 'Diagrama de Arquitetura',
            source: 'Autor',
          },
        },
      ];

      const zip = new JSZip();
      zip.file('meu_tcc_exportado.redija', serializeBackup(original));
      zip.file(`assets/img_${blockId}.png`, new Uint8Array([137, 80, 78, 71]));

      const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      const imported = await importFromZip(zipBuffer, 'meu_tcc_exportado.zip');

      expect(imported.name).toBe('Meu TCC Exportado');
      expect(imported.blocks).toHaveLength(1);
      expect(imported.blocks[0].type).toBe('image');
      expect(imported.blocks[0].meta?.imageDataUrl).toContain('data:image/png;base64,');
    });
  });

  describe('Importação de ZIP do Overleaf / LaTeX', () => {
    it('identifica projeto Overleaf, lê main.tex, referências bibtex e imagens', async () => {
      const texCode = `
        \\documentclass{article}
        \\title{Computação Quântica Aplicada}
        \\author{Ana Pereira}
        \\institution{Universidade Federal}
        \\begin{document}
        \\chapter{Introdução}
        Este é um texto introdutório sobre computação com \\textbf{ênfase} e citação \\cite{turing1950}.

        \\begin{equation}
        E = m \\times c^2
        \\end{equation}

        \\begin{figure}
        \\includegraphics{circuito.png}
        \\caption{Circuito Quântico de Teste}
        Fonte: Autores
        \\end{figure}

        \\begin{quote}
        Uma citação longa direta sobre computabilidade.
        \\end{quote}
        \\end{document}
      `;

      const bibCode = `
        @article{turing1950,
          author = {Alan Turing},
          title = {Computing Machinery and Intelligence},
          journal = {Mind},
          year = {1950}
        }
      `;

      const zip = new JSZip();
      zip.file('main.tex', texCode);
      zip.file('referencias.bib', bibCode);
      zip.file('circuito.png', new Uint8Array([137, 80, 78, 71]));

      const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      const imported = await importFromZip(zipBuffer, 'projeto_overleaf.zip');

      expect(imported.metadata.title).toBe('Computação Quântica Aplicada');
      expect(imported.metadata.author).toBe('Ana Pereira');
      expect(imported.metadata.institution).toBe('Universidade Federal');

      // Blocos estruturados
      const h1Block = imported.blocks.find((b) => b.type === 'h1');
      expect(h1Block?.content).toBe('Introdução');

      const eqBlock = imported.blocks.find((b) => b.type === 'equation');
      expect(eqBlock).toBeDefined();
      expect(eqBlock?.content).toContain('times');

      const imgBlock = imported.blocks.find((b) => b.type === 'image');
      expect(imgBlock).toBeDefined();
      expect(imgBlock?.meta?.caption).toBe('Circuito Quântico de Teste');
      expect(imgBlock?.meta?.imageDataUrl).toContain('data:image/png;base64,');

      const quoteBlock = imported.blocks.find((b) => b.type === 'quote_long');
      expect(quoteBlock).toBeDefined();

      // Referências BibTeX importadas
      expect(imported.references.length).toBeGreaterThan(0);
      const ref = imported.references.find((r) => r.title.includes('Computing Machinery'));
      expect(ref).toBeDefined();
      expect(ref?.authors).toContain('TURING');
    });

    it('rejeita arquivo ZIP não reconhecido (sem .redija e sem .tex)', async () => {
      const zip = new JSZip();
      zip.file('random.txt', 'arquivo qualquer');
      const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

      await expect(importFromZip(zipBuffer, 'desconhecido.zip')).rejects.toThrow(
        /O arquivo ZIP selecionado não foi reconhecido/
      );
    });
  });

  describe('Parser LaTeX (parseLatexToProject)', () => {
    it('converte comandos e seções LaTeX em blocos ABNT do Redija', () => {
      const tex = `
        \\title{Meu Trabalho}
        \\begin{document}
        \\section{Seção Primária}
        Texto da seção primária com \\textit{itálico} e \\underline{sublinhado}.

        \\subsection{Subseção Secundária}
        Outro parágrafo.
        \\end{document}
      `;

      const project = parseLatexToProject(tex, 'Teste LaTeX', new Map());
      expect(project.metadata.title).toBe('Meu Trabalho');

      const h1 = project.blocks.find((b) => b.type === 'h1');
      expect(h1?.content).toBe('Seção Primária');

      const h2 = project.blocks.find((b) => b.type === 'h2');
      expect(h2?.content).toBe('Subseção Secundária');

      const p = project.blocks.find((b) => b.type === 'paragraph' && b.content.includes('<em>itálico</em>'));
      expect(p).toBeDefined();
    });
  });

  describe('Parser HTML do DOCX (parseDocxHtmlToProject)', () => {
    it('converte títulos, parágrafos, listas, tabelas e extrai referências', () => {
      const html = `
        <h1>1 Introdução ao Aprendizado Profundo</h1>
        <p>Este trabalho discute redes neurais convolucionais com <strong>destaque</strong>.</p>
        <h2>1.1 Metodologia</h2>
        <p>A seguir os passos:</p>
        <ul>
          <li>Coleta de dados</li>
          <li>Treinamento</li>
        </ul>
        <table>
          <tr><th>Métrica</th><th>Acurácia</th></tr>
          <tr><td>ResNet</td><td>94.5%</td></tr>
        </table>
        <blockquote>Citação longa do autor clássico.</blockquote>
        <h2>Referências</h2>
        <p>SILVA, João. Redes Neurais Modernas. São Paulo: Editora Campus, 2023.</p>
        <p>SOUZA, Maria. Inteligência Artificial Aplicada. Rio de Janeiro: LTC, 2022.</p>
      `;

      const project = parseDocxHtmlToProject(html, 'Meu Documento Word');
      expect(project.metadata.title).toBe('1 Introdução ao Aprendizado Profundo');

      const h1 = project.blocks.find((b) => b.type === 'h1');
      expect(h1?.content).toBe('1 Introdução ao Aprendizado Profundo');

      const h2 = project.blocks.find((b) => b.type === 'h2');
      expect(h2?.content).toBe('1.1 Metodologia');

      const bullet = project.blocks.filter((b) => b.type === 'bullet');
      expect(bullet).toHaveLength(2);
      expect(bullet[0].content).toBe('Coleta de dados');

      const tableBlock = project.blocks.find((b) => b.type === 'table');
      expect(tableBlock).toBeDefined();
      expect(tableBlock?.meta?.headers).toEqual(['Métrica', 'Acurácia']);
      expect(tableBlock?.meta?.rows).toEqual([['ResNet', '94.5%']]);

      const quoteBlock = project.blocks.find((b) => b.type === 'quote_long');
      expect(quoteBlock).toBeDefined();

      // Referências extraídas
      expect(project.references.length).toBeGreaterThanOrEqual(2);
      const ref1 = project.references.find((r) => r.authors.includes('SILVA'));
      expect(ref1).toBeDefined();
      expect(ref1?.year).toBe('2023');
    });
  });
});
