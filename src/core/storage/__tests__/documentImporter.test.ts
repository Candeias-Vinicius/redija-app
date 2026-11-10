import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  importDocumentFile,
  importFromZip,
  parseLatexToProject,
  parseDocxHtmlToProject,
  detectLatexTemplate,
  detectDocxTemplate,
  detectTypstTemplate,
  parseTypstToProject,
  IMPORTER_STRATEGIES,
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

    it('expande múltiplos arquivos LaTeX (include/input), macros ABNT customizadas e siglas', async () => {
      const mainTex = `
        \\documentclass{abntex2}
        \\titulo{Plataforma Redija: Automação Inteligente de TCC}
        \\DEELautor{ Lucas Silva\\\\Ana Reis\\\\}{}
        \\curso{Engenharia de Software}
        \\orientador{Prof. Dr. Orientador Principal}
        \\membrob{Prof. Me. Membro da Banca}
        \\palavraschave{1. Gamificação. 2. Aprendizado. 3. Síndrome de Down.}
        \\keywords{1. Gamification. 2. Learning.}
        \\DEELdedicatoria{Dedico aos meus pais.}
        \\DEELagradecimentos{Agradeço aos professores.}
        \\DEELepigrafe{"A imaginação é mais importante que o conhecimento." \\\\ (Albert Einstein)}
        \\DEELresumo{Resumo completo do trabalho de conclusão.}
        \\DEELabstract{Full abstract of the capstone project.}
        \\begin{document}
        \\onehalfspacing
        \\ElementosPreTextuais
        \\include{list_siglas}
        \\Sumario
        \\textual
        \\include{capitulos/1_introducao}
        \\end{document}
      `;

      const cap1Tex = `
        \\chapter{Introdução}\\label{chp:intro}
        Este é o parágrafo inicial da introdução com \\citeonline{turing1950}.
        \\section{Objetivos}
        \\begin{itemize}
          \\item Primeiro objetivo específico.
          \\item Segundo objetivo com \\cite{turing1950}.
        \\end{itemize}
      `;

      const siglasTex = `
        \\begin{tabbing}
        xxxxxxxxxxx \\= xxxxxxxxxxxxx \\kill
        \\textsc{IA} \\> Inteligência Artificial\\\\
        \\textsc{BES} \\> Bacharelado em Engenharia de Software
        \\end{tabbing}
      `;

      const bibCode = `
        @article{turing1950,
          title={Computing Machinery and Intelligence},
          author={Turing, Alan M},
          year={1950}
        }
      `;

      const zip = new JSZip();
      zip.file('Main.tex', mainTex);
      zip.file('capitulos/1_introducao.tex', cap1Tex);
      zip.file('list_siglas.tex', siglasTex);
      zip.file('referencias.bib', bibCode);

      const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      const imported = await importFromZip(zipBuffer, 'TCC_Completo.zip');

      // Metadados semânticos extraídos
      expect(imported.metadata.title).toBe('Plataforma Redija');
      expect(imported.metadata.subtitle).toBe('Automação Inteligente de TCC');
      expect(imported.metadata.author).toBe('Lucas Silva; Ana Reis');
      expect(imported.metadata.course).toBe('Engenharia de Software');
      expect(imported.metadata.advisor).toBe('Prof. Dr. Orientador Principal');
      expect(imported.metadata.committeeMembers).toEqual(['Prof. Me. Membro da Banca']);
      expect(imported.metadata.includeApprovalPage).toBe(true);
      expect(imported.metadata.dedicatory).toBe('Dedico aos meus pais.');
      expect(imported.metadata.acknowledgments).toBe('Agradeço aos professores.');
      expect(imported.metadata.epigraph).toBe('A imaginação é mais importante que o conhecimento.');
      expect(imported.metadata.epigraphAuthor).toBe('Albert Einstein');
      expect(imported.metadata.abstract).toBe('Resumo completo do trabalho de conclusão.');
      expect(imported.metadata.foreignAbstract).toBe('Full abstract of the capstone project.');
      expect(imported.metadata.keywords).toEqual(['Gamificação', 'Aprendizado', 'Síndrome de Down']);
      expect(imported.metadata.foreignKeywords).toEqual(['Gamification', 'Learning']);
      expect(imported.metadata.abbreviations).toContain('IA - Inteligência Artificial');
      expect(imported.metadata.abbreviations).toContain('BES - Bacharelado em Engenharia de Software');

      // Conteúdo dos capítulos incluídos expandidos
      const h1Intro = imported.blocks.find((b) => b.type === 'h1' && b.content.includes('Introdução'));
      expect(h1Intro).toBeDefined();

      const introPara = imported.blocks.find((b) => b.type === 'paragraph' && b.content.includes('parágrafo inicial'));
      expect(introPara).toBeDefined();
      expect(introPara?.content).toContain('data-cite-id="turing1950"');
      expect(introPara?.content).toContain('data-cite-mode="narrative"');

      // Itens de lista (itemize) convertidos para bullet
      const bullets = imported.blocks.filter((b) => b.type === 'bullet');
      expect(bullets.length).toBe(2);
      expect(bullets[0].content).toContain('Primeiro objetivo específico.');
      expect(bullets[1].content).toContain('data-cite-mode="parenthetical"');

      // Limpeza de ruídos de macros estruturais do LaTeX
      expect(imported.blocks.some((b) => b.content.includes('\\onehalfspacing'))).toBe(false);
      expect(imported.blocks.some((b) => b.content.includes('\\ElementosPreTextuais'))).toBe(false);
      expect(imported.blocks.some((b) => b.content.includes('\\DEELresumo'))).toBe(false);
      expect(imported.blocks.some((b) => b.content.includes('\\include'))).toBe(false);
    });

    it('aprende macros customizadas dinamicamente a partir de arquivos .sty de qualquer universidade', async () => {
      const customSty = `
        \\ProvidesPackage{customuniv}[2024]
        \\newcommand{\\MinhaFaculdadeTitulo}[1]{\\titulo{#1}}
        \\newcommand{\\MinhaFaculdadeAutor}[1]{\\autor{#1}}
        \\newcommand{\\MinhaFaculdadeOrientador}[1]{\\orientador{#1}}
        \\newcommand{\\MinhaFaculdadeResumo}[1]{\\resumo{#1}}
        \\newcommand{\\MinhaFaculdadeDedicat}[1]{\\dedicatoria{#1}}
      `;

      const mainTex = `
        \\documentclass{abntex2}
        \\usepackage{customuniv}
        \\MinhaFaculdadeTitulo{Computação Quântica na Amazônia}
        \\MinhaFaculdadeAutor{Carlos Silva\\\\Mariana Souza}
        \\MinhaFaculdadeOrientador{Prof. Dra. Roberta Lima}
        \\MinhaFaculdadeResumo{Resumo dinâmico totalmente mapeado.}
        \\MinhaFaculdadeDedicat{Dedico este trabalho aos pioneiros.}
        \\begin{document}
        \\chapter{Introdução}
        Texto introdutório.
        \\end{document}
      `;

      const zip = new JSZip();
      zip.file('customuniv.sty', customSty);
      zip.file('Main.tex', mainTex);

      const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      const imported = await importFromZip(zipBuffer, 'universidade_custom.zip');

      expect(imported.metadata.title).toBe('Computação Quântica na Amazônia');
      expect(imported.metadata.author).toBe('Carlos Silva; Mariana Souza');
      expect(imported.metadata.advisor).toBe('Prof. Dra. Roberta Lima');
      expect(imported.metadata.abstract).toBe('Resumo dinâmico totalmente mapeado.');
      expect(imported.metadata.dedicatory).toBe('Dedico este trabalho aos pioneiros.');
      expect(imported.blocks.some((b) => b.content.includes('\\MinhaFaculdadeResumo'))).toBe(false);
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

    it('neutraliza injeções de scripts maliciosos e atributos perigosos em parágrafos e imagens', () => {
      const maliciousHtml = `
        <h1>Título Seguro</h1>
        <p>Texto com <script>alert("XSS")</script> e <img src="x" onerror="stealCookies()"> e <a href="javascript:alert(1)">link</a>.</p>
        <p><img src="javascript:alert(1)" /></p>
        <p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" /></p>
      `;

      const project = parseDocxHtmlToProject(maliciousHtml, 'Doc Seguro');
      const p = project.blocks.find((b) => b.type === 'paragraph');
      expect(p?.content).not.toContain('<script>');
      expect(p?.content).not.toContain('alert("XSS")');
      expect(p?.content).not.toContain('onerror=');
      expect(p?.content).not.toContain('javascript:');

      // Imagem maliciosa com javascript: deve ser descartada
      const images = project.blocks.filter((b) => b.type === 'image');
      expect(images).toHaveLength(1);
      expect(images[0].meta?.imageDataUrl).toContain('data:image/png;base64');
    });

    it('detecta template semanticamente no DOCX (TCC vs Relatório vs Artigo) e extrai Resumo, Abstract e Palavras-chave', () => {
      expect(detectDocxTemplate('<h1>Folha de Aprovação</h1><p>Trabalho de Conclusão de Curso</p>')).toBe('tcc');
      expect(detectDocxTemplate('<h1>Relatório de Estágio Supervisionado</h1>')).toBe('relatorio');
      expect(detectDocxTemplate('<h1>Introdução</h1><p>Artigo simples.</p>')).toBe('artigo');

      const artigoHtml = `
        <p>Autor: Mariana Costa</p>
        <p>Orientador: Prof. Dr. Ricardo Alves</p>
        <p>Instituição: Universidade Estadual Paulista</p>
        <h1>Arquiteturas Reativas em Tempo Real</h1>
        <h2>Resumo</h2>
        <p>Este artigo avalia pipelines assíncronos em larga escala.</p>
        <p>Palavras-chave: Sistemas Distribuídos, Latência, React.</p>
        <h2>Abstract</h2>
        <p>This paper evaluates large-scale asynchronous pipelines.</p>
        <p>Keywords: Distributed Systems, Latency, React.</p>
        <h2>1 Introdução</h2>
        <p>Texto principal do artigo.</p>
      `;

      const project = parseDocxHtmlToProject(artigoHtml, 'Artigo Word');
      expect(project.templateType).toBe('artigo');
      expect(project.metadata.author).toBe('Mariana Costa');
      expect(project.metadata.advisor).toBe('Prof. Dr. Ricardo Alves');
      expect(project.metadata.institution).toBe('Universidade Estadual Paulista');
      expect(project.metadata.abstract).toContain('pipelines assíncronos');
      expect(project.metadata.keywords).toEqual(['Sistemas Distribuídos', 'Latência', 'React']);
      expect(project.metadata.foreignAbstract).toContain('asynchronous pipelines');
      expect(project.metadata.foreignKeywords).toEqual(['Distributed Systems', 'Latency', 'React']);
    });

    it('popula abstract e keywords principais em DOCX apenas em inglês', () => {
      const enHtml = `
        <h1>Edge Intelligence Study</h1>
        <h2>Abstract</h2>
        <p>English-only summary of edge computing benchmarks.</p>
        <p>Keywords: Edge, WebAssembly, Benchmarks.</p>
        <h2>1 Introduction</h2>
        <p>Introduction paragraph.</p>
      `;

      const project = parseDocxHtmlToProject(enHtml, 'English Paper');
      expect(project.templateType).toBe('artigo');
      expect(project.metadata.abstract).toBe('English-only summary of edge computing benchmarks.');
      expect(project.metadata.keywords).toEqual(['Edge', 'WebAssembly', 'Benchmarks']);
    });
  });

  describe('Detecção Heurística & Field Matching LaTeX / Overleaf', () => {
    it('identifica template IEEEtran, SBC, Pôster, abntex2 artigo e artigo genérico (sem fallback rígido para TCC)', () => {
      expect(detectLatexTemplate('\\documentclass[conference]{IEEEtran}\\begin{document}\\end{document}')).toBe('ieee');
      expect(detectLatexTemplate('\\documentclass{article}\\usepackage{sbc-template}\\begin{document}\\end{document}')).toBe('sbc');
      expect(detectLatexTemplate('\\documentclass{tikzposter}\\begin{document}\\end{document}')).toBe('poster');
      expect(detectLatexTemplate('\\documentclass[article]{abntex2}\\tipotrabalho{Artigo Científico}')).toBe('artigo');
      expect(detectLatexTemplate('\\documentclass{abntex2}\\chapter{Introdução}')).toBe('tcc');
      expect(detectLatexTemplate('\\documentclass{article}\\section{Intro}')).toBe('artigo');
    });

    it('extrai abstract, IEEEkeywords, autor com \\IEEEauthorblockN e chaves aninhadas no IEEE', async () => {
      const ieeeTex = `
        \\documentclass[conference]{IEEEtran}
        \\title{Federated \\textbf{TinyML} on Edge Sensors}
        \\author{\\IEEEauthorblockN{Lucas Silva} \\and \\IEEEauthorblockN{Ana Reis}}
        \\begin{document}
        \\maketitle
        \\begin{abstract}
        Low-power quantized inference for agricultural sensors.
        \\end{abstract}
        \\begin{IEEEkeywords}
        TinyML, Federated Learning, IoT
        \\end{IEEEkeywords}
        \\section{Introduction}
        Content paragraph here.
        \\end{document}
      `;

      const encoder = new TextEncoder();
      const imported = await importDocumentFile({
        name: 'paper_ieee.tex',
        arrayBuffer: async () => encoder.encode(ieeeTex).buffer,
      });

      expect(imported.templateType).toBe('ieee');
      expect(imported.metadata.title).toBe('Federated TinyML on Edge Sensors');
      expect(imported.metadata.author).toBe('Lucas Silva; Ana Reis');
      expect(imported.metadata.abstract).toBe('Low-power quantized inference for agricultural sensors.');
      expect(imported.metadata.keywords).toEqual(['TinyML', 'Federated Learning', 'IoT']);
      expect(imported.blocks.some((b) => b.content.includes('\\maketitle'))).toBe(false);
    });

    it('extrai resumo e abstract bilíngues no padrão SBC', () => {
      const sbcTex = `
        \\documentclass{article}
        \\usepackage{sbc-template}
        \\title{Plataforma RedijaApp}
        \\author{Vinícius Candeias\\inst{1}}
        \\institution{UFSCar}
        \\begin{document}
        \\begin{resumo}
        Resumo em português do artigo SBC.
        \\end{resumo}
        \\begin{abstract}
        English abstract of SBC paper.
        \\end{abstract}
        \\section{Introdução}
        Primeiro parágrafo.
        \\end{document}
      `;

      const imported = parseLatexToProject(sbcTex, 'Artigo SBC', new Map());
      expect(imported.templateType).toBe('sbc');
      expect(imported.metadata.author).toBe('Vinícius Candeias');
      expect(imported.metadata.abstract).toBe('Resumo em português do artigo SBC.');
      expect(imported.metadata.foreignAbstract).toBe('English abstract of SBC paper.');
    });
  });

  describe('Importação e Detecção de Typst (.typ e .zip)', () => {
    it('importa .typ do Typst Universe com @preview e extrai pacote, entrypoint, authors tuple e código', async () => {
      const typContent = `
        #import "@preview/charged-ieee:0.1.1": *

        #show: ieee.with(
          title: "Compilação WASM no Navegador",
          authors: ("Alice Silva", "Bruno Costa"),
          abstract: [Resumo técnico direto no show rule.],
        )

        = 1. Introdução
        Texto com *negrito* e _itálico_.

        $ E = m c^2 $

        \`\`\`rust
        fn main() {}
        \`\`\`
      `;

      const encoder = new TextEncoder();
      const imported = await importDocumentFile({
        name: 'meu_paper.typ',
        arrayBuffer: async () => encoder.encode(typContent).buffer,
      });

      expect(imported.templateType).toBe('universe_custom');
      expect(imported.templateConfig?.universePackage).toBe('@preview/charged-ieee:0.1.1');
      expect(imported.templateConfig?.universeEntrypoint).toBe('ieee');
      expect(imported.metadata.title).toBe('Compilação WASM no Navegador');
      expect(imported.metadata.author).toBe('Alice Silva; Bruno Costa');
      expect(imported.metadata.abstract).toBe('Resumo técnico direto no show rule.');

      expect(imported.blocks.some((b) => b.type === 'h1' && b.content === '1. Introdução')).toBe(true);
      expect(imported.blocks.some((b) => b.type === 'equation' && b.content === 'E = m c^2')).toBe(true);
      expect(imported.blocks.some((b) => b.type === 'code' && b.meta?.language === 'rust')).toBe(true);
    });

    it('detecta projetos Typst nativos (SBC, IEEE, Pôster, ABNT) e importa ZIP Typst com .bib e imagens', async () => {
      expect(detectTypstTemplate('#import "abnt.typ": *\n#show: abnt.with(titulo: "TCC")')).toBe('tcc');
      expect(detectTypstTemplate('#show: abnt.with(incluir-capa: false)')).toBe('artigo');
      expect(detectTypstTemplate('#show: ieee-article.with(titulo: "Paper")')).toBe('ieee');
      expect(detectTypstTemplate('#show: academic-poster.with(titulo: "Banner")')).toBe('poster');

      const sbcTyp = `
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

        = Introdução
        Texto introdutório com imagem abaixo.

        #image("assets/arquitetura.png")
      `;

      const bibCode = `
        @book{knuth1984,
          author = {Donald Knuth},
          title = {The TeXbook},
          year = {1984}
        }
      `;

      const zip = new JSZip();
      zip.file('sbc.typ', '// template helper');
      zip.file('main.typ', sbcTyp);
      zip.file('referencias.bib', bibCode);
      zip.file('assets/arquitetura.png', new Uint8Array([137, 80, 78, 71]));

      const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      const imported = await importFromZip(zipBuffer, 'projeto_sbc.zip');

      expect(imported.templateType).toBe('sbc');
      expect(imported.metadata.title).toBe('Sistemas Multi-Template');
      expect(imported.metadata.author).toBe('Carlos Eduardo');
      expect(imported.metadata.institution).toBe('UFRGS');
      expect(imported.metadata.abstract).toBe('Resumo em PT-BR.');
      expect(imported.metadata.foreignAbstract).toBe('Abstract in EN.');
      expect(imported.metadata.keywords).toEqual(['Typst', 'SBC']);
      expect(imported.metadata.foreignKeywords).toEqual(['Typst', 'WASM']);

      const imgBlock = imported.blocks.find((b) => b.type === 'image');
      expect(imgBlock?.meta?.imageDataUrl).toContain('data:image/png;base64,');
      expect(imported.references).toHaveLength(1);
      expect(imported.references[0].title).toContain('TeXbook');

      const parsedStandalone = parseTypstToProject('= Só título\n\nParágrafo simples.', 'Avulso', new Map());
      expect(parsedStandalone.templateType).toBe('artigo');
    });
  });

  describe('Registry Strategy de Importadores (IMPORTER_STRATEGIES)', () => {
    it('expõe estratégias registradas para todos os formatos suportados sem duplicação de mapeamento', () => {
      const ids = IMPORTER_STRATEGIES.map((s) => s.id);
      expect(ids).toEqual(['redija', 'docx', 'zip', 'typst', 'latex']);
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('tcc.redija'))?.id).toBe('redija');
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('artigo.docx'))?.id).toBe('docx');
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('overleaf.zip'))?.id).toBe('zip');
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('main.typ'))?.id).toBe('typst');
      expect(IMPORTER_STRATEGIES.find((s) => s.matches('main.tex'))?.id).toBe('latex');
    });
  });

  describe('Reconhecimento de Tabelas e Isolamento de Metadados Limpos', () => {
    it('garante que documentos importados iniciem com metadados de estrutura limpos (sem orientador ou dedicatória mock)', () => {
      const docxHtml = `
        <h1>Estudo Experimental de IA</h1>
        <p>Autor: Maria de Souza</p>
        <p>Texto do artigo científico.</p>
      `;
      const proj = parseDocxHtmlToProject(docxHtml, 'Artigo IA');
      expect(proj.metadata.title).toBe('Estudo Experimental de IA');
      expect(proj.metadata.author).toBe('Maria de Souza');
      // Campos não declarados devem iniciar vazios, e NÃO com os textos fictícios do template de exemplo
      expect(proj.metadata.advisor).toBe('');
      expect(proj.metadata.nature).toBe('');
      expect(proj.metadata.dedicatory).toBeUndefined();
      expect(proj.metadata.acknowledgments).toBeUndefined();
      expect(proj.metadata.committeeMembers).toBeUndefined();
    });

    it('importa tabelas e quadros do Typst (#tabela, #quadro, #figure e #table)', () => {
      const typstDoc = `
        = Artigo de Comparação

        Texto explicativo.

        #tabela(
          "Comparação de Modelos",
          "Fonte: Próprio autor (2026)",
          columns: 2,
          table.cell(fill: luma(240))[#strong[Modelo]], table.cell(fill: luma(240))[#strong[Acurácia]],
          [GPT-4], [95%],
          [Claude], [96%],
        )

        #quadro(
          "Vantagens e Desvantagens",
          "Fonte: Elaborado pelos autores",
          columns: 2,
          table.cell(fill: luma(240))[#strong[Vantagem]], table.cell(fill: luma(240))[#strong[Desvantagem]],
          [Rápido], [Custo],
        )

        #figure(
          table(
            columns: (auto, auto),
            [Item], [Valor],
            [A], [10],
          ),
          caption: [Resultados Numéricos],
        )
      `;

      const proj = parseTypstToProject(typstDoc, 'Typst Tables', new Map());
      const tables = proj.blocks.filter((b) => b.type === 'table');
      const boxes = proj.blocks.filter((b) => b.type === 'box');

      expect(tables).toHaveLength(2);
      expect(boxes).toHaveLength(1);

      // 1. Tabela Helper Redija
      expect(tables[0].meta?.caption).toBe('Comparação de Modelos');
      expect(tables[0].meta?.source).toBe('Fonte: Próprio autor (2026)');
      expect(tables[0].meta?.headers).toEqual(['Modelo', 'Acurácia']);
      expect(tables[0].meta?.rows).toEqual([
        ['GPT-4', '95%'],
        ['Claude', '96%'],
      ]);

      // 2. Quadro Helper Redija
      expect(boxes[0].meta?.caption).toBe('Vantagens e Desvantagens');
      expect(boxes[0].meta?.source).toBe('Fonte: Elaborado pelos autores');
      expect(boxes[0].meta?.headers).toEqual(['Vantagem', 'Desvantagem']);
      expect(boxes[0].meta?.rows).toEqual([['Rápido', 'Custo']]);

      // 3. Typst Native #figure(table(...))
      expect(tables[1].meta?.caption).toBe('Resultados Numéricos');
      expect(tables[1].meta?.headers).toEqual(['Item', 'Valor']);
      expect(tables[1].meta?.rows).toEqual([['A', '10']]);
    });

    it('importa tabelas LaTeX com \\begin{table} e \\begin{tabular}', () => {
      const latexDoc = `
        \\documentclass{article}
        \\title{Artigo SBC com Tabelas}
        \\author{João da Silva}
        \\begin{document}
        \\section{Resultados}

        \\begin{table}[ht]
          \\caption{Parâmetros dos Testes}
          \\label{tab:params}
          \\begin{tabular}{|l|c|}
            \\hline
            Parâmetro & Valor \\\\
            \\hline
            Taxa & 0.01 \\\\
            Épocas & 50 \\\\
            \\hline
          \\end{tabular}
          \\fonte{Autores (2026)}
        \\end{table}

        \\end{document}
      `;

      const proj = parseLatexToProject(latexDoc, 'LaTeX Tables', new Map());
      const tableBlock = proj.blocks.find((b) => b.type === 'table');
      expect(tableBlock).toBeDefined();
      expect(tableBlock?.meta?.caption).toBe('Parâmetros dos Testes');
      expect(tableBlock?.meta?.source).toBe('Autores (2026)');
      expect(tableBlock?.meta?.headers).toEqual(['Parâmetro', 'Valor']);
      expect(tableBlock?.meta?.rows).toEqual([
        ['Taxa', '0.01'],
        ['Épocas', '50'],
      ]);
    });

    it('importa tabelas DOCX vinculando legenda anterior e fonte posterior', () => {
      const docxHtml = `
        <h1>Seção Principal</h1>
        <p><strong>Tabela 1</strong> – Desempenho dos Algoritmos</p>
        <table>
          <tr><th>Algoritmo</th><th>Tempo</th></tr>
          <tr><td>QuickSort</td><td>12ms</td></tr>
          <tr><td>MergeSort</td><td>15ms</td></tr>
        </table>
        <p>Fonte: Adaptado de Cormen et al. (2009)</p>
      `;

      const proj = parseDocxHtmlToProject(docxHtml, 'Docx Tables');
      const tableBlock = proj.blocks.find((b) => b.type === 'table');
      expect(tableBlock).toBeDefined();
      expect(tableBlock?.meta?.caption).toBe('Tabela 1 – Desempenho dos Algoritmos');
      expect(tableBlock?.meta?.source).toBe('Adaptado de Cormen et al. (2009)');
      expect(tableBlock?.meta?.headers).toEqual(['Algoritmo', 'Tempo']);
      expect(tableBlock?.meta?.rows).toEqual([
        ['QuickSort', '12ms'],
        ['MergeSort', '15ms'],
      ]);

      // Garante que o parágrafo de legenda e de fonte não foram duplicados como blocos de texto soltos
      const plainParagraphs = proj.blocks.filter((b) => b.type === 'paragraph');
      expect(plainParagraphs.some((p) => p.content.includes('Tabela 1'))).toBe(false);
      expect(plainParagraphs.some((p) => p.content.includes('Fonte: Adaptado'))).toBe(false);
    });
  });
});
