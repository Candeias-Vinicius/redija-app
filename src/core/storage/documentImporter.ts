// =====================================================================
// RedijaApp: Importador Inteligente Unificado de Documentos
// Suporta:
// 1. Arquivos Microsoft Word (.docx) com texto, tabelas, imagens e referências
// 2. Pacotes .zip de projetos RedijaApp ou do Overleaf/LaTeX (com .tex, .bib e imagens)
// 3. Arquivos de backup nativos (.redija)
// =====================================================================

import JSZip from 'jszip';
import mammoth from 'mammoth';
import {
  DocumentProject,
  Block,
  AcademicReference,
} from '@/types/document';
import { createProjectFromTemplate } from './projectTemplates';
import { parseBackup } from './db';
import { parseBibtex } from '../transpiler/abntLinter';
import { stripHtmlTags } from '../transpiler/escape';

export interface ImportFileInput {
  name: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

/**
 * Ponto de entrada unificado para importação de qualquer arquivo compatível.
 */
export async function importDocumentFile(file: ImportFileInput): Promise<DocumentProject> {
  const lowerName = file.name.toLowerCase().trim();

  if (lowerName.endsWith('.redija')) {
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(buffer);
    return parseBackup(jsonString);
  }

  if (lowerName.endsWith('.docx')) {
    const buffer = await file.arrayBuffer();
    return await importFromDocx(buffer, file.name);
  }

  if (lowerName.endsWith('.zip')) {
    const buffer = await file.arrayBuffer();
    return await importFromZip(buffer, file.name);
  }

  throw new Error(
    'Formato de arquivo não suportado. Envie um arquivo .docx (Word), .zip (RedijaApp ou Overleaf) ou .redija.'
  );
}

// ============================================================================
// IMPORTAÇÃO DE ARQUIVOS .ZIP (REDIJA OU OVERLEAF)
// ============================================================================

export async function importFromZip(
  arrayBuffer: ArrayBuffer,
  zipFileName: string
): Promise<DocumentProject> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const fileNames = Object.keys(zip.files).filter((n) => !zip.files[n].dir);

  // CENÁRIO 1: PROJETO DO REDIJAAPP (.zip contendo *.redija ou main.typ + abnt.typ)
  const redijaEntry = fileNames.find((n) => n.toLowerCase().endsWith('.redija'));
  if (redijaEntry) {
    const jsonContent = await zip.files[redijaEntry].async('string');
    const project = parseBackup(jsonContent);

    // Se o backup tiver referências a imagens da pasta assets/ que não tinham dataURL
    for (const block of project.blocks) {
      if (block.type === 'image' && !block.meta?.imageDataUrl) {
        const candidateAsset = fileNames.find((n) =>
          n.toLowerCase().includes(`img_${block.id.toLowerCase()}`)
        );
        if (candidateAsset) {
          const bytes = await zip.files[candidateAsset].async('uint8array');
          const ext = candidateAsset.split('.').pop() || 'png';
          block.meta = {
            ...block.meta,
            caption: block.meta?.caption || 'Figura importada',
            source: block.meta?.source || 'do autor',
            imageDataUrl: uint8ArrayToDataUrl(bytes, ext),
          };
        }
      }
    }

    return project;
  }

  // CENÁRIO 2: PROJETO DO OVERLEAF / LATEX (.zip contendo *.tex)
  const texFiles = fileNames.filter((n) => n.toLowerCase().endsWith('.tex'));
  if (texFiles.length > 0) {
    return await importFromOverleafZip(zip, fileNames, texFiles, zipFileName);
  }

  throw new Error(
    'O arquivo ZIP selecionado não foi reconhecido. Envie um projeto exportado pelo RedijaApp (.zip) ou um projeto fonte do Overleaf contendo arquivo .tex e imagens.'
  );
}

async function importFromOverleafZip(
  zip: JSZip,
  fileNames: string[],
  texFiles: string[],
  zipFileName: string
): Promise<DocumentProject> {
  // 1. Identifica o arquivo .tex principal
  const preferredNames = ['main.tex', 'tcc.tex', 'artigo.tex', 'document.tex', 'trabalho.tex'];
  let mainTexFile = texFiles.find((n) => {
    const base = n.split('/').pop()?.toLowerCase();
    return base && preferredNames.includes(base);
  });

  if (!mainTexFile) {
    // Escolhe o arquivo .tex com maior tamanho em bytes
    let maxSize = -1;
    for (const t of texFiles) {
      const entry = zip.files[t];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const size = (entry as any)._data?.uncompressedSize ?? 0;
      if (size > maxSize) {
        maxSize = size;
        mainTexFile = t;
      }
    }
  }

  if (!mainTexFile) {
    mainTexFile = texFiles[0];
  }

  const texContent = await zip.files[mainTexFile].async('string');

  // 2. Extrai referências BibTeX (.bib) se existirem no zip
  let references: AcademicReference[] = [];
  const bibFiles = fileNames.filter((n) => n.toLowerCase().endsWith('.bib'));
  for (const bibName of bibFiles) {
    try {
      const bibContent = await zip.files[bibName].async('string');
      const parsed = parseBibtex(bibContent);
      references = [...references, ...parsed];
    } catch (err) {
      console.warn(`Erro ao processar arquivo bibtex ${bibName}:`, err);
    }
  }

  // 3. Mapeia imagens contidas no zip para Data URLs
  const imageMap = new Map<string, string>();
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
  const imageEntries = fileNames.filter((n) =>
    imageExtensions.some((ext) => n.toLowerCase().endsWith(ext))
  );

  for (const imgName of imageEntries) {
    try {
      const bytes = await zip.files[imgName].async('uint8array');
      const ext = imgName.split('.').pop()?.toLowerCase() || 'png';
      const dataUrl = uint8ArrayToDataUrl(bytes, ext);
      const baseName = imgName.split('/').pop()?.toLowerCase() || imgName.toLowerCase();

      imageMap.set(imgName.toLowerCase(), dataUrl);
      imageMap.set(baseName, dataUrl);
      imageMap.set(baseName.replace(/\.[^.]+$/, ''), dataUrl); // sem extensão
    } catch (err) {
      console.warn(`Erro ao ler imagem ${imgName}:`, err);
    }
  }

  // 4. Analisa o LaTeX e converte em blocos e metadados
  const cleanProjectName = zipFileName.replace(/\.zip$/i, '').trim() || 'Projeto Overleaf';
  return parseLatexToProject(texContent, cleanProjectName, imageMap, references);
}

/**
 * Converte o conteúdo de um arquivo LaTeX em um DocumentProject do RedijaApp.
 */
export function parseLatexToProject(
  texContent: string,
  projectName: string,
  imageMap: Map<string, string>,
  existingRefs: AcademicReference[] = []
): DocumentProject {
  const base = createProjectFromTemplate('tcc', projectName);

  // Extrai metadados do preâmbulo
  const titleMatch = texContent.match(/\\title\{([^{}]+)\}/);
  const authorMatch = texContent.match(/\\author\{([^{}]+)\}/);
  const institutionMatch = texContent.match(/\\(?:institution|instituicao)\{([^{}]+)\}/i);

  if (titleMatch) base.metadata.title = cleanLatexText(titleMatch[1]);
  if (authorMatch) base.metadata.author = cleanLatexText(authorMatch[1]);
  if (institutionMatch) base.metadata.institution = cleanLatexText(institutionMatch[1]);

  // Remove preâmbulo e foca no corpo entre \begin{document} e \end{document}
  let body = texContent;
  const beginDoc = texContent.indexOf('\\begin{document}');
  if (beginDoc !== -1) {
    body = texContent.slice(beginDoc + '\\begin{document}'.length);
  }
  const endDoc = body.indexOf('\\end{document}');
  if (endDoc !== -1) {
    body = body.slice(0, endDoc);
  }

  const blocks: Block[] = [];
  // Divide o texto por quebras de linha duplas ou ambientes principais
  const lines = body.split(/\r?\n/);
  let currentParagraph = '';

  const flushParagraph = () => {
    const trimmed = currentParagraph.trim();
    if (trimmed) {
      blocks.push({
        id: crypto.randomUUID(),
        type: 'paragraph',
        content: `<p>${latexInlineToHtml(trimmed)}</p>`,
      });
    }
    currentParagraph = '';
  };

  let inFigure = false;
  let figureCaption = '';
  let figureSource = 'do autor';
  let figureImageKey = '';

  let inEquation = false;
  let equationContent = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Comentários
    if (line.startsWith('%')) continue;

    // AMBIENTE: FIGURA (\begin{figure} ... \end{figure})
    if (line.includes('\\begin{figure}')) {
      flushParagraph();
      inFigure = true;
      figureCaption = '';
      figureSource = 'do autor';
      figureImageKey = '';
      continue;
    }
    if (inFigure) {
      if (line.includes('\\end{figure}')) {
        inFigure = false;
        const dataUrl =
          imageMap.get(figureImageKey.toLowerCase()) ||
          imageMap.get(figureImageKey.split('/').pop()?.toLowerCase() || '') ||
          undefined;

        blocks.push({
          id: crypto.randomUUID(),
          type: 'image',
          content: '',
          meta: {
            caption: figureCaption || 'Figura do documento',
            source: figureSource,
            imageDataUrl: dataUrl,
          },
        });
        continue;
      }
      const incMatch = line.match(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/);
      if (incMatch) figureImageKey = incMatch[1].trim();

      const capMatch = line.match(/\\caption\{([^}]+)\}/);
      if (capMatch) figureCaption = cleanLatexText(capMatch[1]);

      const srcMatch = line.match(/(?:fonte|source):\s*([^\n\\]+)/i);
      if (srcMatch) figureSource = cleanLatexText(srcMatch[1]);
      continue;
    }

    // AMBIENTE: EQUAÇÃO (\begin{equation} ... \end{equation} ou \[ ... \])
    if (line.includes('\\begin{equation}') || line.includes('\\[') || line.includes('\\begin{align}')) {
      flushParagraph();
      inEquation = true;
      equationContent = line
        .replace(/\\begin\{equation\*?\}/, '')
        .replace(/\\begin\{align\*?\}/, '')
        .replace(/\\\[/, '');
      if (line.includes('\\end{equation}') || line.includes('\\]') || line.includes('\\end{align}')) {
        inEquation = false;
        equationContent = equationContent
          .replace(/\\end\{equation\*?\}/, '')
          .replace(/\\end\{align\*?\}/, '')
          .replace(/\\\]/, '')
          .trim();
        if (equationContent) {
          blocks.push({
            id: crypto.randomUUID(),
            type: 'equation',
            content: latexMathToTypst(equationContent),
          });
        }
      }
      continue;
    }
    if (inEquation) {
      if (line.includes('\\end{equation}') || line.includes('\\]') || line.includes('\\end{align}')) {
        inEquation = false;
        equationContent += ' ' + line
          .replace(/\\end\{equation\*?\}/, '')
          .replace(/\\end\{align\*?\}/, '')
          .replace(/\\\]/, '');
        if (equationContent.trim()) {
          blocks.push({
            id: crypto.randomUUID(),
            type: 'equation',
            content: latexMathToTypst(equationContent.trim()),
          });
        }
        equationContent = '';
        continue;
      }
      equationContent += ' ' + line;
      continue;
    }

    // CITAÇÃO LONGA (\begin{citacao} ou \begin{quote})
    if (line.includes('\\begin{citacao}') || line.includes('\\begin{quote}')) {
      flushParagraph();
      let quoteText = '';
      i++;
      while (i < lines.length && !lines[i].includes('\\end{citacao}') && !lines[i].includes('\\end{quote}')) {
        quoteText += ' ' + lines[i].trim();
        i++;
      }
      blocks.push({
        id: crypto.randomUUID(),
        type: 'quote_long',
        content: latexInlineToHtml(quoteText.trim()),
        meta: {
          author: 'Autor',
          year: '2024',
        },
      });
      continue;
    }

    // TÍTULOS E CAPÍTULOS
    const chapterMatch = line.match(/\\chapter\{([^}]+)\}/);
    if (chapterMatch) {
      flushParagraph();
      blocks.push({
        id: crypto.randomUUID(),
        type: 'h1',
        content: cleanLatexText(chapterMatch[1]),
      });
      continue;
    }

    const secMatch = line.match(/\\section\{([^}]+)\}/);
    if (secMatch) {
      flushParagraph();
      blocks.push({
        id: crypto.randomUUID(),
        type: 'h1',
        content: cleanLatexText(secMatch[1]),
      });
      continue;
    }

    const subSecMatch = line.match(/\\subsection\{([^}]+)\}/);
    if (subSecMatch) {
      flushParagraph();
      blocks.push({
        id: crypto.randomUUID(),
        type: 'h2',
        content: cleanLatexText(subSecMatch[1]),
      });
      continue;
    }

    const subSubMatch = line.match(/\\subsubsection\{([^}]+)\}/);
    if (subSubMatch) {
      flushParagraph();
      blocks.push({
        id: crypto.randomUUID(),
        type: 'h3',
        content: cleanLatexText(subSubMatch[1]),
      });
      continue;
    }

    // Linha vazia indica quebra de parágrafo
    if (!line) {
      flushParagraph();
      continue;
    }

    // Linha de texto normal
    if (currentParagraph) {
      currentParagraph += ' ' + line;
    } else {
      currentParagraph = line;
    }
  }

  flushParagraph();

  return {
    ...base,
    blocks: blocks.length > 0 ? blocks : base.blocks,
    references: existingRefs.length > 0 ? existingRefs : base.references,
  };
}

// ============================================================================
// IMPORTAÇÃO DE DOCUMENTOS MICROSOFT WORD (.DOCX)
// ============================================================================

export async function importFromDocx(
  arrayBuffer: ArrayBuffer,
  fileName: string
): Promise<DocumentProject> {
  const imagesFound: Array<{ id: string; dataUrl: string }> = [];

  const options: mammoth.Options = {
    arrayBuffer,
    convertImage: mammoth.images.imgElement((image: mammoth.ImageElement) => {
      return image.read('base64').then((imageBuffer: string) => {
        const dataUrl = `data:${image.contentType};base64,${imageBuffer}`;
        const id = crypto.randomUUID();
        imagesFound.push({ id, dataUrl });
        return {
          src: dataUrl,
        };
      });
    }),
  };

  const { value: rawHtml } = await mammoth.convertToHtml({ arrayBuffer }, options);

  const cleanProjectName = fileName.replace(/\.docx$/i, '').trim() || 'Documento Word';
  return parseDocxHtmlToProject(rawHtml, cleanProjectName);
}

/**
 * Converte o HTML gerado pelo Mammoth a partir de um arquivo .docx
 * em blocos estruturados do RedijaApp e extrai referências bibliográficas.
 */
export function parseDocxHtmlToProject(html: string, projectName: string): DocumentProject {
  const base = createProjectFromTemplate('tcc', projectName);
  const blocks: Block[] = [];
  const references: AcademicReference[] = [];

  // Divide o HTML em elementos principais (h1, h2, h3, h4, p, table, ul, ol, blockquote)
  const tagRegex = /<(h[1-6]|p|table|ul|ol|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  let isInsideReferences = false;

  while ((match = tagRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const innerHtml = match[2].trim();
    const plainText = stripHtmlTags(innerHtml).trim();

    if (!plainText && !innerHtml.includes('<img')) {
      continue;
    }

    // 1. Identifica se é título (h1, h2, h3, h4, h5, h6)
    if (tag.startsWith('h')) {
      const level = Number(tag[1]);
      const blockType: Block['type'] =
        level === 1 ? 'h1' : level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4';

      // Verifica se entrou na seção de Referências
      if (/^refer[êe]ncias(\s+bibliogr[áa]ficas)?$/i.test(plainText)) {
        isInsideReferences = true;
      } else {
        isInsideReferences = false;
      }

      blocks.push({
        id: crypto.randomUUID(),
        type: blockType,
        content: plainText,
      });
      continue;
    }

    // 2. Se estiver na seção de Referências do documento Word, extrai como AcademicReference
    if (isInsideReferences && tag === 'p') {
      const ref = parseReferenceParagraph(plainText);
      if (ref) {
        references.push(ref);
        continue;
      }
    }

    // 3. Tabela
    if (tag === 'table') {
      const tableBlock = parseHtmlTable(innerHtml);
      if (tableBlock) {
        blocks.push(tableBlock);
      }
      continue;
    }

    // 4. Lista com marcadores (ul) ou numerada (ol)
    if (tag === 'ul' || tag === 'ol') {
      const itemRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null;
      while ((liMatch = itemRegex.exec(innerHtml)) !== null) {
        const liContent = cleanInlineFormatting(liMatch[1].trim());
        if (liContent) {
          blocks.push({
            id: crypto.randomUUID(),
            type: tag === 'ul' ? 'bullet' : 'numbered',
            content: liContent,
          });
        }
      }
      continue;
    }

    // 5. Citação Direta Longa (blockquote)
    if (tag === 'blockquote') {
      blocks.push({
        id: crypto.randomUUID(),
        type: 'quote_long',
        content: cleanInlineFormatting(innerHtml),
        meta: {
          author: 'Autor',
          year: '2024',
        },
      });
      continue;
    }

    // 6. Parágrafo contendo Imagem (<img src="..." />)
    const imgMatch = innerHtml.match(/<img\b[^>]*src="([^"]+)"[^>]*>/i);
    if (imgMatch) {
      const src = imgMatch[1].trim();
      const isSafeImage =
        /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/i.test(src) ||
        /^https?:\/\//i.test(src);
      if (isSafeImage) {
        blocks.push({
          id: crypto.randomUUID(),
          type: 'image',
          content: '',
          meta: {
            caption: 'Figura importada do Word',
            source: 'Arquivo importado',
            imageDataUrl: src,
          },
        });
        continue;
      }
    }

    // 7. Parágrafo comum
    blocks.push({
      id: crypto.randomUUID(),
      type: 'paragraph',
      content: `<p>${cleanInlineFormatting(innerHtml)}</p>`,
    });
  }

  // Tenta extrair título e autor caso estejam no primeiro h1 / p
  const firstH1 = blocks.find((b) => b.type === 'h1');
  if (firstH1) {
    base.metadata.title = firstH1.content;
  }

  return {
    ...base,
    blocks: blocks.length > 0 ? blocks : base.blocks,
    references: references.length > 0 ? references : base.references,
  };
}

// ============================================================================
// AUXILIARES E PARSERS INTERNOS
// ============================================================================

function uint8ArrayToDataUrl(bytes: Uint8Array, ext: string): string {
  let mime = 'image/png';
  if (ext.includes('jpg') || ext.includes('jpeg')) mime = 'image/jpeg';
  else if (ext.includes('webp')) mime = 'image/webp';
  else if (ext.includes('svg')) mime = 'image/svg+xml';
  else if (ext.includes('gif')) mime = 'image/gif';

  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

function cleanLatexText(str: string): string {
  return stripHtmlTags(
    str
      .replace(/\\textbf\{([^}]+)\}/g, '$1')
      .replace(/\\textit\{([^}]+)\}/g, '$1')
      .replace(/\\emph\{([^}]+)\}/g, '$1')
      .replace(/\\&/g, '&')
      .replace(/\\%/g, '%')
      .replace(/\\#/g, '#')
      .replace(/\\_/g, '_')
      .replace(/\\~/g, '~')
      .replace(/[{}]/g, '')
  ).trim();
}

function latexInlineToHtml(latex: string): string {
  // Escapa entidades HTML brutas para evitar injeção XSS a partir do LaTeX
  const escaped = latex
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return escaped
    .replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>')
    .replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>')
    .replace(/\\underline\{([^}]+)\}/g, '<u>$1</u>')
    .replace(/\\cite\{([^}]+)\}/g, '($1)')
    .replace(/\\&amp;/g, '&amp;')
    .replace(/\\%/g, '%')
    .replace(/\\#/g, '#')
    .replace(/\\_/g, '_')
    .replace(/\\~/g, '~');
}

function latexMathToTypst(math: string): string {
  return math
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1) / ($2)')
    .replace(/\\sum\b/g, 'sum')
    .replace(/\\int\b/g, 'integral')
    .replace(/\\infty\b/g, 'oo')
    .replace(/\\times\b/g, 'times')
    .replace(/\\cdot\b/g, 'dot')
    .replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)')
    .replace(/\\alpha\b/g, 'alpha')
    .replace(/\\beta\b/g, 'beta')
    .replace(/\\gamma\b/g, 'gamma')
    .replace(/\\sigma\b/g, 'sigma')
    .replace(/\\mu\b/g, 'mu')
    .replace(/\\theta\b/g, 'theta')
    .replace(/\\pi\b/g, 'pi')
    .replace(/[{}]/g, '')
    .trim();
}

/**
 * Sanitiza fragmentos de HTML para permitir apenas tags de formatação semântica seguras
 * e sem atributos executáveis ou manipuladores de eventos maliciosos (on*, javascript:, etc.).
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // 1. Remove tags executáveis ou perigosas por completo com seu conteúdo interno
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  cleaned = cleaned.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  cleaned = cleaned.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  cleaned = cleaned.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  cleaned = cleaned.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');
  cleaned = cleaned.replace(/<math\b[^<]*(?:(?!<\/math>)<[^<]*)*<\/math>/gi, '');

  // 2. Remove handlers de eventos (onload=, onerror=, onclick=, etc.) e links javascript:
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
  cleaned = cleaned.replace(/href\s*=\s*(?:'javascript:[^']*'|"javascript:[^"]*"|javascript:[^\s>]+)/gi, 'href="#"');

  // 3. Remove tags não permitidas mantendo o conteúdo interno
  cleaned = cleaned.replace(/<(\/?)(\w+)([^>]*)>/gi, (_match, isClosing, tagName) => {
    const tag = tagName.toLowerCase();
    const safeTags = ['strong', 'em', 'u', 'sup', 'sub', 'p', 'br', 'code', 's', 'b', 'i'];
    if (!safeTags.includes(tag)) {
      return '';
    }
    if (isClosing) {
      return `</${tag}>`;
    }
    if (tag === 'br') {
      return '<br/>';
    }
    return `<${tag}>`;
  });

  return cleaned.replace(/\s+/g, ' ').trim();
}

function cleanInlineFormatting(html: string): string {
  return sanitizeHtml(html);
}

function parseHtmlTable(tableHtml: string): Block | null {
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  const rowsData: string[][] = [];

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowContent = rowMatch[1];
    const cellRegex = /<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      cells.push(stripHtmlTags(cellMatch[1]).trim());
    }
    if (cells.length > 0) {
      rowsData.push(cells);
    }
  }

  if (rowsData.length === 0) return null;

  const headers = rowsData[0];
  const bodyRows = rowsData.slice(1);

  return {
    id: crypto.randomUUID(),
    type: 'table',
    content: '',
    meta: {
      headers: headers.length > 0 ? headers : ['Coluna 1', 'Coluna 2'],
      rows: bodyRows.length > 0 ? bodyRows : [['', '']],
      caption: 'Tabela importada do documento Word',
      source: 'Arquivo importado',
    },
  };
}

/**
 * Tenta decompor um parágrafo da seção de Referências da ABNT em campos estruturados:
 * AUTORES. Título da obra: subtítulo. Local: Editora, Ano.
 */
function parseReferenceParagraph(text: string): AcademicReference | null {
  const clean = text.trim();
  if (clean.length < 10) return null;

  const yearMatch = clean.match(/\b(19\d{2}|20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : '2024';

  const parts = clean.split('.');
  const authors = (parts[0] || 'AUTOR DESCONHECIDO').trim().toUpperCase();
  const title = (parts[1] || clean).trim();

  return {
    id: crypto.randomUUID(),
    type: 'book',
    authors,
    title,
    year,
    city: 'Local',
    publisher: 'Editora',
  };
}
