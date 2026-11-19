import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import {
  buildDocxArchive,
  DOCX_CONVERSION_NOTICE_TEXT,
  DocxExportUnavailableError,
  exportProjectToDocx,
  getDocxFileName,
  isDocxConversionNoticeDismissed,
  resetDocxConversionNotice,
  resolveEffectiveDocxLayout,
} from '../docxExporter';
import { convertMathToOmml } from '../mathToOmml';
import { createProjectFromTemplate, PROJECT_TEMPLATES } from '@/core/storage/projectTemplates';
import { DEFAULT_TEMPLATE_CONFIG, DocumentProject } from '@/types/document';
import { downloadProjectDocx } from '@/hooks/useDocumentExport';
import { getToasts, dismissToast } from '@/components/ui/toastStore';

// PNG 1x1 válido em base64
const VALID_PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Cria um cabeçalho PNG sintético com dimensões arbitrárias (widthPx x heightPx) para testar redimensionamento
function createPngWithDimensions(widthPx: number, heightPx: number): string {
  const bytes = new Uint8Array(33);
  // Assinatura PNG
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // IHDR length (13) + 'IHDR'
  bytes.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, widthPx, false);
  view.setUint32(20, heightPx, false);
  bytes[24] = 8; // bit depth
  bytes[25] = 2; // color type
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:image/png;base64,${btoa(binary)}`;
}

async function unzipDocxXml(bytes: Uint8Array): Promise<{
  zip: JSZip;
  documentXml: string;
  stylesXml: string;
  numberingXml: string;
  relsXml: string;
  contentTypesXml: string;
}> {
  const zip = await JSZip.loadAsync(bytes);
  const documentXml = await zip.file('word/document.xml')!.async('string');
  const stylesXml = await zip.file('word/styles.xml')!.async('string');
  const numberingXml = await zip.file('word/numbering.xml')!.async('string');
  const relsXml = await zip.file('word/_rels/document.xml.rels')!.async('string');
  const contentTypesXml = await zip.file('[Content_Types].xml')!.async('string');
  return { zip, documentXml, stylesXml, numberingXml, relsXml, contentTypesXml };
}

/** Extrai o texto puro concatenado de todos os <w:t> de um trecho XML do Word. */
function extractPlainTextFromWordXml(xml: string): string {
  const matches = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)];
  return matches
    .map((m) =>
      m[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'"),
    )
    .join('');
}

describe('Épico RDJ-01: Exportar o trabalho para Word (.docx)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetDocxConversionNotice();
    for (const t of getToasts()) dismissToast(t.id);
  });

  describe('Critério do Épico (#71): 9 modelos iniciais exportam sem erro', () => {
    it.each(PROJECT_TEMPLATES.map((t) => t.type))(
      'exporta projeto criado a partir do modelo "%s" gerando pacote OpenXML (.docx) íntegro',
      async (templateType) => {
        const project = createProjectFromTemplate(templateType, `Projeto ${templateType}`);
        const result = await exportProjectToDocx(project);

        expect(result.fileName).toBe(`Projeto ${templateType}.docx`);
        expect(result.bytes.byteLength).toBeGreaterThan(1000);

        const { zip, documentXml, stylesXml, contentTypesXml } = await unzipDocxXml(result.bytes);
        expect(zip.file('_rels/.rels')).not.toBeNull();
        expect(zip.file('docProps/core.xml')).not.toBeNull();
        expect(zip.file('docProps/app.xml')).not.toBeNull();
        expect(zip.file('word/settings.xml')).not.toBeNull();
        expect(zip.file('word/fontTable.xml')).not.toBeNull();
        expect(contentTypesXml).toContain('/word/document.xml');
        expect(stylesXml).toContain('w:styleId="Heading1"');
        expect(documentXml).toContain('<w:body>');
        expect(documentXml).toContain('<w:sectPr>');
      },
    );
  });

  describe('RDJ-01.1 (#72): Estrutura, formatação de texto, layout da norma e avisos', () => {
    it('Cenário 1: sanitiza o nome do arquivo .docx removendo caracteres inválidos do sistema de arquivos', () => {
      expect(getDocxFileName('Meu TCC: Inteligência Artificial / 2026?*<>|')).toBe(
        'Meu TCC Inteligência Artificial 2026.docx',
      );
      expect(getDocxFileName(' Relatório.redija ')).toBe('Relatório.docx');
      expect(getDocxFileName('***')).toBe('projeto_redija.docx');
    });

    it('Cenário 2: converte títulos de nível 1, 2 e 3 nos estilos nativos Heading1, Heading2 e Heading3 com outlineLvl', async () => {
      const project = createProjectFromTemplate('tcc', 'TCC Títulos');
      project.blocks = [
        { id: 'h1', type: 'h1', content: 'Introdução' },
        { id: 'h2', type: 'h2', content: 'Objetivos' },
        { id: 'h3', type: 'h3', content: 'Objetivo Específico' },
      ];

      const res = await buildDocxArchive(project);
      const { documentXml, stylesXml } = await unzipDocxXml(res.bytes);

      // Estilos nativos com aliases em português para reconhecimento pelo Sumário Automático do Word
      expect(stylesXml).toContain('<w:name w:val="heading 1"/>');
      expect(stylesXml).toContain('<w:aliases w:val="Título 1"/>');
      expect(stylesXml).toContain('<w:name w:val="heading 2"/>');
      expect(stylesXml).toContain('<w:aliases w:val="Título 2"/>');
      expect(stylesXml).toContain('<w:name w:val="heading 3"/>');
      expect(stylesXml).toContain('<w:aliases w:val="Título 3"/>');

      expect(documentXml).toContain('<w:pStyle w:val="Heading1"/><w:outlineLvl w:val="0"/>');
      expect(documentXml).toContain('<w:pStyle w:val="Heading2"/><w:outlineLvl w:val="1"/>');
      expect(documentXml).toContain('<w:pStyle w:val="Heading3"/><w:outlineLvl w:val="2"/>');
      expect(extractPlainTextFromWordXml(documentXml)).toContain('1 INTRODUÇÃO');
      expect(extractPlainTextFromWordXml(documentXml)).toContain('1.1 Objetivos');
      expect(extractPlainTextFromWordXml(documentXml)).toContain('1.1.1 Objetivo Específico');
    });

    it('Cenário 3: preserva negrito, itálico, sublinhado, sobrescrito, subscrito, listas numeradas e com marcadores', async () => {
      const project = createProjectFromTemplate('artigo', 'Formatação Rica');
      project.blocks = [
        {
          id: 'p1',
          type: 'paragraph',
          content:
            '<p>Texto com <strong>negrito</strong>, <em>itálico</em>, <u>sublinhado</u>, x<sup>2</sup> e H<sub>2</sub>O.</p>',
        },
        { id: 'b1', type: 'bullet', content: '<p>Item com marcador 1</p>' },
        { id: 'b2', type: 'bullet', content: '<p>Item com marcador 2</p>' },
        { id: 'n1', type: 'numbered', content: '<p>Primeiro passo numerado</p>' },
        { id: 'n2', type: 'numbered', content: '<p>Segundo passo numerado</p>' },
      ];

      const res = await buildDocxArchive(project);
      const { documentXml, numberingXml } = await unzipDocxXml(res.bytes);

      expect(documentXml).toContain('<w:b/><w:bCs/></w:rPr><w:t>negrito</w:t>');
      expect(documentXml).toContain('<w:i/><w:iCs/></w:rPr><w:t>itálico</w:t>');
      expect(documentXml).toContain('<w:u w:val="single"/></w:rPr><w:t>sublinhado</w:t>');
      expect(documentXml).toContain('<w:vertAlign w:val="superscript"/></w:rPr><w:t>2</w:t>');
      expect(documentXml).toContain('<w:vertAlign w:val="subscript"/></w:rPr><w:t>2</w:t>');

      // Listas com marcadores (numId="1") e numeradas (numId="2")
      expect(documentXml).toContain('<w:numId w:val="1"/>');
      expect(documentXml).toContain('<w:numId w:val="2"/>');
      expect(numberingXml).toContain('<w:numFmt w:val="bullet"/>');
      expect(numberingXml).toContain('<w:numFmt w:val="decimal"/>');
    });

    it('Cenário 4: aplica o layout da norma ABNT (margens 3/2/3/2 cm, fonte 12 pt, entrelinha 1,5) e medidas de outros presets', async () => {
      const abntProj = createProjectFromTemplate('tcc', 'TCC ABNT');
      const abntLayout = resolveEffectiveDocxLayout(abntProj);
      expect(abntLayout.marginTopCm).toBe(3);
      expect(abntLayout.marginBottomCm).toBe(2);
      expect(abntLayout.marginLeftCm).toBe(3);
      expect(abntLayout.marginRightCm).toBe(2);
      expect(abntLayout.fontSizePt).toBe(12);
      expect(abntLayout.lineSpacing).toBe('1.5');

      const abntRes = await buildDocxArchive(abntProj);
      const { documentXml: abntDocXml, stylesXml: abntStylesXml } = await unzipDocxXml(abntRes.bytes);
      // 3cm = 1701 twips, 2cm = 1134 twips, 12pt = 24 half-points, entrelinha 1,5 = 360
      expect(abntDocXml).toContain('w:top="1701" w:right="1134" w:bottom="1134" w:left="1701"');
      expect(abntStylesXml).toContain('<w:sz w:val="24"/>');
      expect(abntStylesXml).toContain('w:line="360"');

      // IEEE: fonte 10pt (20 half-pts), entrelinha 1.0 (240), 2 colunas, margens 1.9/2.54/1.57/1.57 cm
      const ieeeProj = createProjectFromTemplate('ieee', 'Paper IEEE');
      const ieeeRes = await buildDocxArchive(ieeeProj);
      const { documentXml: ieeeDocXml, stylesXml: ieeeStylesXml } = await unzipDocxXml(ieeeRes.bytes);
      expect(ieeeStylesXml).toContain('<w:sz w:val="20"/>');
      expect(ieeeStylesXml).toContain('w:line="240"');
      expect(ieeeDocXml).toContain('<w:cols w:num="2"');

      // APA 7: entrelinha 2.0 (480), margens 2.54 cm (1440 twips)
      const apaProj = createProjectFromTemplate('tcc', 'Trabalho APA');
      apaProj.templateConfig = {
        ...DEFAULT_TEMPLATE_CONFIG,
        ...resolveEffectiveDocxLayout({
          ...apaProj,
          templateConfig: { ...DEFAULT_TEMPLATE_CONFIG, preset: 'apa_7' },
        }).effectiveConfig,
      };
      const apaRes = await buildDocxArchive(apaProj);
      const { documentXml: apaDocXml, stylesXml: apaStylesXml } = await unzipDocxXml(apaRes.bytes);
      expect(apaStylesXml).toContain('w:line="480"');
      expect(apaDocXml).toContain('w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"');
    });

    it('Cenário 5: exibe o aviso de primeira conversão com opção "Não mostrar novamente"', async () => {
      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn(() => 'blob:mock-docx'),
        revokeObjectURL: vi.fn(),
      });

      const proj = createProjectFromTemplate('artigo', 'Teste Aviso');
      expect(isDocxConversionNoticeDismissed()).toBe(false);

      await downloadProjectDocx(proj);
      const activeToasts = getToasts();
      const noticeToast = activeToasts.find((t) => t.message.includes(DOCX_CONVERSION_NOTICE_TEXT));
      expect(noticeToast).toBeDefined();
      expect(noticeToast?.action?.label).toBe('Não mostrar novamente');

      // Simula clique em "Não mostrar novamente"
      noticeToast?.action?.onClick();
      expect(isDocxConversionNoticeDismissed()).toBe(true);

      for (const t of getToasts()) dismissToast(t.id);
      await downloadProjectDocx(proj);
      expect(getToasts().some((t) => t.message.includes(DOCX_CONVERSION_NOTICE_TEXT))).toBe(false);
    });

    it('Cenário 6: falha com mensagem clara e sem baixar arquivo parcial quando offline ou serviço indisponível', async () => {
      vi.stubEnv('VITE_IMPORT_API_URL', 'http://localhost:9999');
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

      const proj = createProjectFromTemplate('tcc', 'TCC Offline');
      await expect(exportProjectToDocx(proj)).rejects.toThrow(DocxExportUnavailableError);
    });

    it('exporta trabalho extenso (~60 páginas / 240 parágrafos) em menos de 10 segundos', async () => {
      const proj = createProjectFromTemplate('tcc', 'TCC 60 Paginas');
      proj.blocks = Array.from({ length: 240 }, (_, i) =>
        i % 20 === 0
          ? { id: `h_${i}`, type: 'h1' as const, content: `Capítulo ${i / 20 + 1}` }
          : {
              id: `p_${i}`,
              type: 'paragraph' as const,
              content:
                '<p>Parágrafo acadêmico extenso com <strong>destaque</strong>, <em>termos et al.</em> e desenvolvimento metodológico detalhado para simular um trabalho completo de 60 páginas.</p>',
            },
      );

      const start = performance.now();
      const res = await exportProjectToDocx(proj);
      const elapsedMs = performance.now() - start;

      expect(elapsedMs).toBeLessThan(10_000);
      expect(res.bytes.byteLength).toBeGreaterThan(5000);
    });
  });

  describe('RDJ-01.2 (#73): Preservar tabelas, figuras e legendas no .docx', () => {
    it('Cenário 1: exporta tabela nativa e editável (<w:tbl>) com linha de cabeçalho destacada e estilo Legenda', async () => {
      const proj = createProjectFromTemplate('tcc', 'TCC Tabelas');
      proj.blocks = [
        {
          id: 'tbl_1',
          type: 'table',
          content: '',
          meta: {
            caption: 'Comparativo de latência',
            source: 'Dados da pesquisa (2026)',
            headers: ['Cenário', 'Latência (ms)', 'Taxa de Sucesso'],
            rows: [
              ['Local WASM', '42', '100%'],
              ['Remoto', '310', '99,8%'],
            ],
          },
        },
      ];

      const res = await buildDocxArchive(proj);
      const { documentXml } = await unzipDocxXml(res.bytes);

      expect(documentXml).toContain('<w:pStyle w:val="Caption"/>');
      expect(extractPlainTextFromWordXml(documentXml)).toContain('Tabela 1 – Comparativo de latência');
      expect(documentXml).toContain('<w:tbl>');
      expect(documentXml).toContain('<w:tblHeader/>');
      expect(documentXml).toContain('w:fill="F0F0F0"');
      expect(extractPlainTextFromWordXml(documentXml)).toContain('Latência (ms)');
      expect(extractPlainTextFromWordXml(documentXml)).toContain('Local WASM');
      expect(extractPlainTextFromWordXml(documentXml)).toContain('Fonte: Dados da pesquisa (2026).');
    });

    it('Cenário 2: embute figura com 1 imagem mantendo bytes originais sem recompressão, legenda acima e fonte abaixo', async () => {
      const proj = createProjectFromTemplate('tcc', 'TCC Figura');
      proj.blocks = [
        {
          id: 'fig_1',
          type: 'image',
          content: '',
          meta: {
            caption: 'Arquitetura proposta',
            source: 'Elaborado pelo autor',
            imageDataUrl: VALID_PNG_1X1,
          },
        },
      ];

      const res = await buildDocxArchive(proj);
      const { zip, documentXml, relsXml } = await unzipDocxXml(res.bytes);

      const mediaFile = zip.file('word/media/image1.png');
      expect(mediaFile).not.toBeNull();

      // Verifica que os bytes da imagem são idênticos ao original (zero recompressão)
      const embeddedBytes = await mediaFile!.async('uint8array');
      const expectedBase64 = VALID_PNG_1X1.split(',')[1];
      const expectedBytes = Uint8Array.from(atob(expectedBase64), (c) => c.charCodeAt(0));
      expect(embeddedBytes).toEqual(expectedBytes);

      expect(relsXml).toContain('Target="media/image1.png"');
      expect(documentXml).toContain('<w:drawing>');

      const idxCaption = documentXml.indexOf('Figura 1 – Arquitetura proposta');
      const idxDrawing = documentXml.indexOf('<w:drawing>');
      const idxSource = documentXml.indexOf('Fonte: Elaborado pelo autor.');
      expect(idxCaption).toBeGreaterThan(-1);
      expect(idxDrawing).toBeGreaterThan(idxCaption);
      expect(idxSource).toBeGreaterThan(idxDrawing);
    });

    it('Cenário 3: agrupa figura composta de 2 a 4 imagens na mesma disposição do PDF com legenda e fonte únicas', async () => {
      const proj = createProjectFromTemplate('tcc', 'TCC Multi Imagens');
      proj.blocks = [
        {
          id: 'fig_grid',
          type: 'image',
          content: '',
          meta: {
            caption: 'Etapas do experimento',
            source: 'Laboratório Central',
            imageLayout: 'grid_2x2',
            subImages: [
              { id: 's1', dataUrl: VALID_PNG_1X1, label: 'Início' },
              { id: 's2', dataUrl: VALID_PNG_1X1, label: 'Meio' },
              { id: 's3', dataUrl: VALID_PNG_1X1, label: 'Avanço' },
              { id: 's4', dataUrl: VALID_PNG_1X1, label: 'Fim' },
            ],
          },
        },
      ];

      const res = await buildDocxArchive(proj);
      const { zip, documentXml } = await unzipDocxXml(res.bytes);

      expect(zip.file('word/media/image1.png')).not.toBeNull();
      expect(zip.file('word/media/image2.png')).not.toBeNull();
      expect(zip.file('word/media/image3.png')).not.toBeNull();
      expect(zip.file('word/media/image4.png')).not.toBeNull();

      const plain = extractPlainTextFromWordXml(documentXml);
      expect(plain).toContain('Figura 1 – Etapas do experimento');
      expect(plain).toContain('(a) Início');
      expect(plain).toContain('(b) Meio');
      expect(plain).toContain('(c) Avanço');
      expect(plain).toContain('(d) Fim');
      expect(plain).toContain('Fonte: Laboratório Central.');
    });

    it('Cenário 4: redimensiona imagem maior que a página para caber na largura útil mantendo a proporção', async () => {
      // Imagem de 4000 x 2000 px (proporção 2:1, muito maior que os 16cm da largura útil A4 ABNT)
      const widePng = createPngWithDimensions(4000, 2000);
      const proj = createProjectFromTemplate('tcc', 'TCC Imagem Grande');
      proj.blocks = [
        {
          id: 'fig_wide',
          type: 'image',
          content: '',
          meta: {
            caption: 'Panorama de alta resolução',
            source: 'Satélite',
            imageDataUrl: widePng,
            imageWidthPct: 100,
          },
        },
      ];

      const layout = resolveEffectiveDocxLayout(proj);
      const res = await buildDocxArchive(proj);
      const { documentXml } = await unzipDocxXml(res.bytes);

      const extentMatch = documentXml.match(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/);
      expect(extentMatch).not.toBeNull();
      const cx = Number(extentMatch![1]);
      const cy = Number(extentMatch![2]);

      // Cabe exatamente na largura útil (16 cm = 5.760.000 EMUs) e mantém proporção 2:1 (cx / cy === 2)
      expect(cx).toBeLessThanOrEqual(layout.usableWidthEmu);
      expect(Math.abs(cx / cy - 2)).toBeLessThan(0.01);
    });

    it('Cenário 5: conclui exportação quando imagem está ausente ou corrompida, exibindo "[imagem indisponível]" e listando no aviso final', async () => {
      const proj = createProjectFromTemplate('tcc', 'TCC Imagem Corrompida');
      proj.blocks = [
        {
          id: 'fig_corrupt',
          type: 'image',
          content: '',
          meta: {
            caption: 'Gráfico corrompido',
            source: 'Autor',
            imageDataUrl: 'data:image/png;base64,Y29ycm9tcGlkbw==', // bytes não são PNG válido
          },
        },
      ];

      const res = await buildDocxArchive(proj);
      const { documentXml } = await unzipDocxXml(res.bytes);

      expect(extractPlainTextFromWordXml(documentXml)).toContain('[imagem indisponível]');
      expect(res.missingImages).toHaveLength(1);
      expect(res.missingImages[0]).toMatchObject({
        figureNumber: 1,
        caption: 'Gráfico corrompido',
      });
      expect(res.warnings.some((w) => w.includes('Figura 1 ("Gráfico corrompido")'))).toBe(true);
    });
  });

  describe('RDJ-01.3 (#74): Exportar equações editáveis para o Word (OMML)', () => {
    it('Cenários 1, 2 e 3: exporta equações em bloco (numeradas à direita) e inline como OMML nativo editável', async () => {
      const proj = createProjectFromTemplate('tcc', 'TCC Equações');
      proj.blocks = [
        { id: 'h1', type: 'h1', content: 'Modelagem Matemática' },
        {
          id: 'p_inline',
          type: 'paragraph',
          content:
            '<p>A energia <span data-inline-math="true" data-math="E = m c^2">E = m c^2</span> é fundamental.</p>',
        },
        {
          id: 'eq_block_1',
          type: 'equation',
          content: 'f(x) = sum_(i=1)^n (x_i - mu)^2 / sigma^2',
        },
        {
          id: 'eq_block_2',
          type: 'equation',
          content: 'integral_0^oo sqrt(alpha + beta) = pi / 2',
        },
      ];

      const res = await buildDocxArchive(proj);
      const { zip, documentXml } = await unzipDocxXml(res.bytes);

      // Equações nunca saem como imagem
      const mediaFiles = Object.keys(zip.files).filter((f) => f.startsWith('word/media/'));
      expect(mediaFiles).toHaveLength(0);

      // Equação inline (<m:oMath>) e em bloco (<m:oMathPara>) presentes
      expect(documentXml).toContain('<m:oMath>');
      expect(documentXml).toContain('<m:oMathPara>');
      expect(documentXml).toContain('<m:sSup>');
      expect(documentXml).toContain('<m:nary>');
      expect(documentXml).toContain('<m:f>');
      expect(documentXml).toContain('<m:rad>');

      // Numeração preservada e alinhada à direita: (1) e (2)
      expect(documentXml).toContain('<w:t>(1)</w:t>');
      expect(documentXml).toContain('<w:t>(2)</w:t>');
      expect(res.failedEquations).toHaveLength(0);
    });

    it('Cenário 4: quando uma equação usa construção não suportada, mantém o código como texto e informa "N equações não puderam ser convertidas" com localização', async () => {
      const proj = createProjectFromTemplate('tcc', 'TCC Equação Inválida');
      proj.blocks = [
        { id: 'h1', type: 'h1', content: 'Cálculo Avançado' },
        {
          id: 'eq_bad_1',
          type: 'equation',
          content: 'frac(a + b, (c + d)', // parêntese não fechado
        },
        {
          id: 'p_bad_2',
          type: 'paragraph',
          content:
            '<p>Fórmula com macro inválida: <span data-inline-math="true" data-math="#let x = 1; x">#let x = 1; x</span>.</p>',
        },
      ];

      const res = await buildDocxArchive(proj);
      const { documentXml } = await unzipDocxXml(res.bytes);
      const plain = extractPlainTextFromWordXml(documentXml);

      expect(plain).toContain('frac(a + b, (c + d)');
      expect(plain).toContain('#let x = 1; x');
      expect(res.failedEquations).toHaveLength(2);
      expect(res.warnings.some((w) => w.includes('2 equações não puderam ser convertidas'))).toBe(true);
      expect(res.warnings.some((w) => w.includes('Seção "1 Cálculo Avançado"'))).toBe(true);
    });

    it('converte matrizes, raízes enésimas, limites e acentos para OMML válido', () => {
      const matRes = convertMathToOmml('mat(a, b; c, d)', true);
      expect(matRes.ok).toBe(true);
      expect(matRes.omml).toContain('<m:m><m:mr>');

      const rootRes = convertMathToOmml('root(3, x^2 + 1)', false);
      expect(rootRes.ok).toBe(true);
      expect(rootRes.omml).toContain('<m:rad><m:deg>');

      const limRes = convertMathToOmml('lim_(x -> oo) 1 / x = 0', false);
      expect(limRes.ok).toBe(true);
      expect(limRes.omml).toContain('<m:limLow>');

      const accRes = convertMathToOmml('hat(x) + arrow(v)', false);
      expect(accRes.ok).toBe(true);
      expect(accRes.omml).toContain('<m:acc>');
    });
  });

  describe('RDJ-01.4 (#75): Exportar citações e referências no padrão da norma para o .docx', () => {
    const sampleRefs: DocumentProject['references'] = [
      {
        id: 'ref_silva',
        type: 'book',
        authors: 'SILVA, João',
        title: 'Arquitetura de Software',
        subtitle: 'Fundamentos',
        edition: '2',
        city: 'São Paulo',
        publisher: 'Editora Alfa',
        year: '2020',
      },
      {
        id: 'ref_almeida',
        type: 'article',
        authors: 'ALMEIDA, Carla; SOUZA, Pedro',
        title: 'Sistemas Distribuídos Modernos',
        journal: 'Revista Brasileira de Computação',
        volume: '10',
        issue: '2',
        pages: '15-30',
        city: 'Porto Alegre',
        publisher: 'SBC',
        year: '2022',
      },
    ];

    it('Cenário 1 e 3: exporta citação autor-data ABNT "(SILVA, 2020, p. 15)" e lista de referências com título em negrito (NBR 6023)', async () => {
      const proj = createProjectFromTemplate('tcc', 'TCC Citações ABNT');
      proj.templateConfig = {
        ...DEFAULT_TEMPLATE_CONFIG,
        preset: 'abnt_classic',
        citationStyle: 'uppercase',
        citationFormat: 'abnt_upper',
        referenceHighlight: 'bold',
        referenceOrdering: 'alphabetical',
      };
      proj.references = sampleRefs;
      proj.blocks = [
        { id: 'h1', type: 'h1', content: 'Referencial Teórico' },
        {
          id: 'p1',
          type: 'paragraph',
          content:
            '<p>Conforme demonstrado na literatura <cite data-cite-id="ref_silva" data-cite-mode="parenthetical" data-cite-page="15">(SILVA, 2020, p. 15)</cite>, a modularidade é essencial.</p>',
        },
      ];

      const res = await buildDocxArchive(proj);
      const { documentXml } = await unzipDocxXml(res.bytes);
      const plain = extractPlainTextFromWordXml(documentXml);

      expect(plain).toContain('(SILVA, 2020, p. 15)');
      // Ordem alfabética: ALMEIDA vem antes de SILVA
      const idxAlmeida = plain.indexOf('ALMEIDA, CARLA; SOUZA, PEDRO.');
      const idxSilva = plain.indexOf('SILVA, JOÃO.');
      expect(idxAlmeida).toBeGreaterThan(-1);
      expect(idxSilva).toBeGreaterThan(idxAlmeida);

      // Destaque em negrito no título do livro e periódico (NBR 6023)
      expect(documentXml).toContain('<w:b/><w:bCs/></w:rPr><w:t>Arquitetura de Software</w:t>');
      expect(documentXml).toContain('<w:b/><w:bCs/></w:rPr><w:t>Revista Brasileira de Computação</w:t>');
    });

    it('Cenário 2: exporta citações numéricas IEEE ("[1]", "[2]") batendo com a ordem de citação da lista de referências', async () => {
      const proj = createProjectFromTemplate('ieee', 'Artigo IEEE Citações');
      // Cita primeiro SILVA e depois ALMEIDA; em citation_order, SILVA é [1] e ALMEIDA é [2]
      proj.references = sampleRefs;
      proj.blocks = [
        { id: 'h1', type: 'h1', content: 'I. Introduction' },
        {
          id: 'p1',
          type: 'paragraph',
          content:
            '<p>First study <cite data-cite-id="ref_silva" data-cite-mode="parenthetical">[1]</cite> and second study <cite data-cite-id="ref_almeida" data-cite-mode="parenthetical">[2]</cite>.</p>',
        },
      ];

      const res = await buildDocxArchive(proj);
      const { documentXml } = await unzipDocxXml(res.bytes);
      const plain = extractPlainTextFromWordXml(documentXml);

      expect(plain).toContain('First study [1] and second study [2].');
      const idxRef1 = plain.indexOf('[1] J. Silva');
      const idxRef2 = plain.indexOf('[2] C. Almeida and P. Souza');
      expect(idxRef1).toBeGreaterThan(-1);
      expect(idxRef2).toBeGreaterThan(idxRef1);
    });

    it('Cenário 4: mantém marcação de erro quando citação aponta para referência inexistente e lista no aviso final', async () => {
      const proj = createProjectFromTemplate('tcc', 'TCC Citação Órfã');
      proj.references = sampleRefs;
      proj.blocks = [
        { id: 'h1', type: 'h1', content: 'Discussão' },
        {
          id: 'p_orphan',
          type: 'paragraph',
          content:
            '<p>Estudo removido <cite data-cite-id="id_inexistente" data-cite-mode="parenthetical">[Ref removida]</cite> no texto.</p>',
        },
      ];

      const res = await buildDocxArchive(proj);
      const { documentXml } = await unzipDocxXml(res.bytes);
      const plain = extractPlainTextFromWordXml(documentXml);

      expect(plain).toContain('[Ref removida]');
      expect(res.missingCitations).toHaveLength(1);
      expect(res.missingCitations[0]).toMatchObject({
        citeId: 'id_inexistente',
        label: '[Ref removida]',
      });
      expect(res.warnings.some((w) => w.includes('[Ref removida]'))).toBe(true);
    });
  });
});
