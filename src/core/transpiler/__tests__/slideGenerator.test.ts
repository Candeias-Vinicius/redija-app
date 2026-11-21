import 'fake-indexeddb/auto';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';
import { db } from '@/core/storage/db';
import { MAX_PROJECT_IMAGE_BYTES } from '@/core/storage/imageQuota';
import { getTemplateCapabilities } from '@/core/templates/templateCapabilities';
import { runDocumentLinter } from '@/core/transpiler/linters';
import { generateStandaloneTypst, generateTypstFiles, MAIN_FILE } from '@/core/transpiler/typstGenerator';
import {
  canGenerateDefenseFromProject,
  copyVisualBlockToPresentation,
  generateDefenseSlidesProject,
  generatePosterFromWorkProject,
  listSourceVisualBlocks,
} from '@/core/transpiler/slideGenerator';
import {
  ensurePresentationSlidesPackageReady,
  OfflineSlidesPackageRequiredError,
} from '@/core/typst/projectCompiler';
import { getSlashOptionsForTemplate } from '@/components/editor/blockHelpers';
import { DocumentProject } from '@/types/document';

const DUMMY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('Épico 9 (RDJ-09): Do TCC aos Slides de Defesa e Pôster em 1 Clique', () => {
  beforeEach(async () => {
    await db.universePackages.clear();
  });

  describe('RDJ-09.2 — Gerar slides de defesa a partir do trabalho', () => {
    it('Cenário 1, 2, 3 e 4: gera apresentação com capa, 1 slide por seção (até 5 tópicos), agradecimentos e até 5 referências citadas sem alterar o original', () => {
      const tcc = createProjectFromTemplate('tcc', 'Meu TCC Original');
      tcc.metadata = {
        ...tcc.metadata,
        title: 'Plataforma WebAssembly para Tipografia Acadêmica',
        subtitle: 'Um estudo sobre compilação local',
        author: 'Ana Carolina Souza',
        advisor: 'Prof. Dr. Marcos Vinícius',
        institution: 'Universidade de São Paulo (USP)',
        course: 'Engenharia de Computação',
        location: 'São Paulo',
        year: '2026',
      };

      // Cria 3 seções H1, sendo a primeira com 7 parágrafos (deve limitar a 5 tópicos)
      tcc.blocks = [
        { id: 'sec1', type: 'h1', content: '1 Introdução' },
        { id: 'p1', type: 'paragraph', content: '<p>Primeira frase do parágrafo um. Segunda frase ignorada.</p>' },
        { id: 'p2', type: 'paragraph', content: '<p>Primeira frase do parágrafo dois. Detalhe adicional.</p>' },
        { id: 'p3', type: 'paragraph', content: '<p>Primeira frase do parágrafo três.</p>' },
        { id: 'p4', type: 'paragraph', content: '<p>Primeira frase do parágrafo quatro.</p>' },
        { id: 'p5', type: 'paragraph', content: '<p>Primeira frase do parágrafo cinco.</p>' },
        { id: 'p6', type: 'paragraph', content: '<p>Sexto parágrafo que não deve entrar no limite de 5 tópicos.</p>' },
        { id: 'p7', type: 'paragraph', content: '<p>Sétimo parágrafo excedente.</p>' },
        { id: 'sec2', type: 'h1', content: '2 Metodologia' },
        { id: 'm1', type: 'paragraph', content: '<p>A metodologia baseia-se em pesquisa experimental controlada.</p>' },
        { id: 'sec3', type: 'h1', content: '3 Resultados' },
        { id: 'r1', type: 'paragraph', content: '<p>Os resultados demonstram compilação abaixo de 50 milissegundos.</p>' },
      ];

      // 7 referências no trabalho original -> apresentação deve conter até 5
      tcc.references = Array.from({ length: 7 }, (_, i) => ({
        id: `ref_${i + 1}`,
        type: 'book',
        authors: `AUTOR${i + 1}, Nome`,
        title: `Obra Científica Número ${i + 1}`,
        city: 'São Paulo',
        publisher: 'Editora USP',
        year: String(2020 + i),
      }));

      const originalSnapshot = JSON.stringify(tcc);
      const startMs = performance.now();
      const presentation = generateDefenseSlidesProject(tcc, [tcc]);
      const elapsedMs = performance.now() - startMs;

      // Performance < 3000ms (regra de negócio: até 3 segundos para trabalho de ~60 páginas)
      expect(elapsedMs).toBeLessThan(3000);

      // O projeto original nunca é modificado
      expect(JSON.stringify(tcc)).toBe(originalSnapshot);

      // Novo projeto do tipo Apresentação e vínculo com projeto de origem
      expect(presentation.id).not.toBe(tcc.id);
      expect(presentation.templateType).toBe('presentation');
      expect(presentation.sourceProjectId).toBe(tcc.id);
      expect(presentation.sourceProjectName).toBe('Meu TCC Original');
      expect(presentation.generatedFrom).toEqual({
        id: tcc.id,
        name: 'Meu TCC Original',
      });

      // Capa traz título, autor, orientador e instituição
      expect(presentation.metadata.title).toBe('Plataforma WebAssembly para Tipografia Acadêmica');
      expect(presentation.metadata.author).toBe('Ana Carolina Souza');
      expect(presentation.metadata.advisor).toBe('Prof. Dr. Marcos Vinícius');
      expect(presentation.metadata.institution).toBe('Universidade de São Paulo (USP)');

      // Slides gerados (H1): Introdução, Metodologia, Resultados, Agradecimentos
      const h1Blocks = presentation.blocks.filter((b) => b.type === 'h1');
      expect(h1Blocks.map((b) => b.content)).toEqual([
        'Introdução',
        'Metodologia',
        'Resultados',
        'Agradecimentos',
      ]);

      // Tópicos da seção Introdução: exatamente 5 tópicos extraídos das primeiras frases
      const introIdx = presentation.blocks.findIndex((b) => b.type === 'h1' && b.content === 'Introdução');
      const metodoIdx = presentation.blocks.findIndex((b) => b.type === 'h1' && b.content === 'Metodologia');
      const introBullets = presentation.blocks
        .slice(introIdx + 1, metodoIdx)
        .filter((b) => b.type === 'bullet');
      expect(introBullets).toHaveLength(5);
      expect(introBullets[0].content).toBe('Primeira frase do parágrafo um.');
      expect(introBullets[4].content).toBe('Primeira frase do parágrafo cinco.');

      // Até 5 referências no encerramento
      expect(presentation.references).toHaveLength(5);

      // Gerar de novo cria outra apresentação sem sobrescrever a anterior
      const secondPresentation = generateDefenseSlidesProject(tcc, [tcc, presentation]);
      expect(secondPresentation.id).not.toBe(presentation.id);
      expect(secondPresentation.name).toBe('Slides de Defesa — Meu TCC Original (2)');
    });

    it('Cenário 5: trabalho sem seções de nível 1 gera apresentação com capa e slide único com aviso explicativo', () => {
      const noH1Project = createProjectFromTemplate('em_branco', 'Rascunho Sem Capítulos');
      noH1Project.blocks = [
        { id: 'p1', type: 'paragraph', content: '<p>Texto corrido inicial sem nenhum título H1.</p>' },
        { id: 'h2_only', type: 'h2', content: 'Apenas subtítulo secundário' },
      ];

      const presentation = generateDefenseSlidesProject(noH1Project);
      const h1Slides = presentation.blocks.filter((b) => b.type === 'h1');
      expect(h1Slides).toHaveLength(1);

      const warningParagraph = presentation.blocks.find(
        (b) => b.type === 'paragraph' && b.content.includes('não possui seções de nível 1'),
      );
      expect(warningParagraph).toBeDefined();
    });

    it('Cenário 6: desabilita opção "Gerar slides de defesa" quando o projeto é pôster ou apresentação', () => {
      const tcc = createProjectFromTemplate('tcc');
      const artigo = createProjectFromTemplate('artigo');
      const poster = createProjectFromTemplate('poster');
      const presentation = createProjectFromTemplate('presentation');

      expect(canGenerateDefenseFromProject(tcc)).toBe(true);
      expect(canGenerateDefenseFromProject(artigo)).toBe(true);
      expect(canGenerateDefenseFromProject(poster)).toBe(false);
      expect(canGenerateDefenseFromProject(presentation)).toBe(false);
    });
  });

  describe('RDJ-09.3 — Editar slides no editor de blocos e filtrar menu "/"', () => {
    it('disponibiliza no menu "/" apenas os blocos que fazem sentido em slides', () => {
      const slideOptions = getSlashOptionsForTemplate('presentation');
      const types = slideOptions.map((o) => o.type);

      expect(types).toContain('h1');
      expect(types).toContain('h2');
      expect(types).toContain('bullet');
      expect(types).toContain('image');
      expect(types).toContain('table');
      expect(types).toContain('equation');

      // Não devem aparecer em slides: h3, h4, h5, unnumbered_heading, footnote, pagebreak
      expect(types).not.toContain('h3');
      expect(types).not.toContain('h4');
      expect(types).not.toContain('h5');
      expect(types).not.toContain('unnumbered_heading');
      expect(types).not.toContain('footnote');
      expect(types).not.toContain('pagebreak');
    });
  });

  describe('RDJ-09.4 — Inserir figuras e tabelas do trabalho nos slides', () => {
    it('Cenário 1, 2, 3 e 4: copia 1ª figura/tabela na geração, preserva 2 a 4 sub-imagens, permite inserção manual independente do original e respeita quota', () => {
      const tcc = createProjectFromTemplate('tcc', 'TCC Com Figuras');
      tcc.blocks = [
        { id: 'h1_1', type: 'h1', content: '1 Resultados Experimentais' },
        { id: 'p_1', type: 'paragraph', content: '<p>Análise visual dos sensores.</p>' },
        {
          id: 'fig_multi',
          type: 'image',
          content: '',
          meta: {
            caption: 'Comparativo de sensores em 3 cenários',
            source: 'Laboratório (2026)',
            imageLayout: 'row',
            imageWidthPct: 100,
            subImages: [
              { id: 'sub1', dataUrl: DUMMY_PNG_DATA_URL, mime: 'image/png', label: 'Cenário A' },
              { id: 'sub2', dataUrl: DUMMY_PNG_DATA_URL, mime: 'image/png', label: 'Cenário B' },
              { id: 'sub3', dataUrl: DUMMY_PNG_DATA_URL, mime: 'image/png', label: 'Cenário C' },
            ],
          },
        },
        {
          id: 'tab_extra',
          type: 'table',
          content: '',
          meta: {
            caption: 'Tabela de latência média',
            source: 'Dados da pesquisa',
            headers: ['Nó', 'Latência (ms)'],
            rows: [['Edge 1', '12 ms']],
          },
        },
      ];

      // 1. Geração copia a primeira figura da seção automaticamente, preservando as 3 sub-imagens e layout
      const presentation = generateDefenseSlidesProject(tcc);
      const copiedImageBlock = presentation.blocks.find((b) => b.type === 'image');
      expect(copiedImageBlock).toBeDefined();
      expect(copiedImageBlock!.id).not.toBe('fig_multi');
      expect(copiedImageBlock!.meta?.caption).toBe('Comparativo de sensores em 3 cenários');
      expect(copiedImageBlock!.meta?.imageLayout).toBe('row');
      expect(copiedImageBlock!.meta?.subImages).toHaveLength(3);

      // 2. Lista figuras e tabelas do trabalho de origem para inserção manual
      const availableVisuals = listSourceVisualBlocks(tcc);
      expect(availableVisuals).toHaveLength(2);
      expect(availableVisuals[0].caption).toBe('Comparativo de sensores em 3 cenários');
      expect(availableVisuals[0].imageCount).toBe(3);
      expect(availableVisuals[1].caption).toBe('Tabela de latência média');

      // 3. Insere manualmente a segunda (tabela) no slide
      const insertRes = copyVisualBlockToPresentation(
        presentation,
        availableVisuals[1].block,
        copiedImageBlock!.id,
      );
      expect(insertRes.error).toBeUndefined();
      presentation.blocks = insertRes.updatedBlocks;
      expect(presentation.blocks.some((b) => b.type === 'table' && b.meta?.caption === 'Tabela de latência média')).toBe(
        true,
      );

      // 4. Se a figura for removida do trabalho original, ela continua intacta na apresentação
      tcc.blocks = tcc.blocks.filter((b) => b.type !== 'image' && b.type !== 'table');
      const stillInPresentation = presentation.blocks.find((b) => b.type === 'image');
      expect(stillInPresentation).toBeDefined();
      expect(stillInPresentation!.meta?.subImages).toHaveLength(3);

      // 5. Respeita a cota de 250 MB
      const hugeFakeBase64 = `data:image/png;base64,${'A'.repeat(Math.ceil((MAX_PROJECT_IMAGE_BYTES + 1024) * (4 / 3)))}`;
      const hugeBlock = {
        id: 'huge_img',
        type: 'image' as const,
        content: '',
        meta: {
          caption: 'Imagem acima da cota',
          imageDataUrl: hugeFakeBase64,
        },
      };
      const quotaRes = copyVisualBlockToPresentation(presentation, hugeBlock);
      expect(quotaRes.error).toContain('Limite de 250 MB');
    });
  });

  describe('RDJ-09.5 & RDJ-09.6 — Temas, proporção (16:9 e 4:3), compilação PDF WASM e modo offline', () => {
    it('compila apresentação em PDF nos temas institucional, sóbrio e dark e nas proporções 16:9 e 4:3 preservando conteúdo', () => {
      const tcc = createProjectFromTemplate('tcc', 'TCC Completo Defesa');
      const presentation = generateDefenseSlidesProject(tcc);
      const workspace = process.cwd().replace(/\\/g, '/');

      for (const theme of ['institucional', 'sobrio', 'dark'] as const) {
        for (const ratio of ['16:9', '4:3'] as const) {
          const updated: DocumentProject = {
            ...presentation,
            templateConfig: {
              ...presentation.templateConfig!,
              presentationTheme: theme,
              presentationAspectRatio: ratio,
            },
          };

          const files = generateTypstFiles(updated);
          expect(files[MAIN_FILE]).toContain('#import "presentation.typ": *');
          expect(files[MAIN_FILE]).toContain(`tema: "${theme}"`);
          expect(files[MAIN_FILE]).toContain(
            `proporcao: "${ratio === '4:3' ? '4-3' : '16-9'}"`,
          );

          const standalone = generateStandaloneTypst(updated);
          const compiler = NodeCompiler.create({ workspace });
          const res = compiler.compile({ mainFileContent: standalone });
          expect(res.hasError()).toBe(false);
          const pdfBytes = compiler.pdf(res.result!);
          expect(pdfBytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
        }
      }
    });

    it('RDJ-09.6 Cenários 2 e 3: avisa quando offline sem pacote em cache, e permite exportar offline quando o pacote já foi baixado', async () => {
      // Cenário 3: Offline sem pacote em cache -> lança OfflineSlidesPackageRequiredError com mensagem clara
      await expect(
        ensurePresentationSlidesPackageReady({ isOffline: true }),
      ).rejects.toThrow(OfflineSlidesPackageRequiredError);
      await expect(
        ensurePresentationSlidesPackageReady({ isOffline: true }),
      ).rejects.toThrow(/conectar|conecte-se/i);

      // Baixa / prepara pacote uma vez enquanto online
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }) as unknown as typeof fetch;

      try {
        await ensurePresentationSlidesPackageReady({ isOffline: false });

        // Cenário 2: Agora offline com pacote já em cache -> funciona sem erro!
        const cachedAssets = await ensurePresentationSlidesPackageReady({ isOffline: true });
        expect(cachedAssets.extraFiles).toBeDefined();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('RDJ-09.7 — Gerar pôster A0 a partir do trabalho', () => {
    it('gera pôster A0 a partir do TCC, passa no posterLinter sem avisos estruturais, compila em PDF e preserva o original', () => {
      const tcc = createProjectFromTemplate('tcc', 'TCC Base para Pôster');
      const originalSnapshot = JSON.stringify(tcc);

      const poster = generatePosterFromWorkProject(tcc, [tcc]);

      // Original preservado
      expect(JSON.stringify(tcc)).toBe(originalSnapshot);

      // Vínculo e estrutura A0
      expect(poster.templateType).toBe('poster');
      expect(poster.templateConfig?.posterDimensions).toBe('a0');
      expect(poster.sourceProjectId).toBe(tcc.id);
      expect(poster.sourceProjectName).toBe('TCC Base para Pôster');

      // Validação no posterLinter: zero avisos de cabeçalho incompleto, corpo vazio, excesso de palavras ou falta de elemento visual
      const caps = getTemplateCapabilities(poster);
      const lintReport = runDocumentLinter(poster, caps);
      expect(lintReport.kind).toBe('poster');
      const structuralWarnings = lintReport.warnings.filter((w) =>
        [
          'poster-header-incomplete',
          'poster-body-empty',
          'poster-word-density',
          'poster-visual-elements',
        ].includes(w.id),
      );
      expect(structuralWarnings).toEqual([]);

      // Compila em PDF válido sem erros
      const standalone = generateStandaloneTypst(poster);
      const compiler = NodeCompiler.create();
      const compileRes = compiler.compile({ mainFileContent: standalone });
      expect(compileRes.hasError()).toBe(false);
      const pdfBytes = compiler.pdf(compileRes.result!);
      expect(pdfBytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });
  });
});
