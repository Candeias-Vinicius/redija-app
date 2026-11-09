// =====================================================================
// RedijaApp: Importador Inteligente Unificado de Documentos
// Suporta:
// 1. Arquivos Microsoft Word (.docx) com texto, tabelas, imagens e referências
// 2. Pacotes .zip de projetos RedijaApp, Overleaf/LaTeX (.tex/.bib) ou Typst (.typ)
// 3. Arquivos individuais .typ (Typst), .tex (LaTeX) e backups nativos (.redija)
// =====================================================================

import JSZip from 'jszip';
import mammoth from 'mammoth';
import {
  DocumentProject,
  Block,
  AcademicReference,
  ProjectTemplateType,
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

  if (lowerName.endsWith('.typ')) {
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const typContent = decoder.decode(buffer);
    const cleanName = file.name.replace(/\.typ$/i, '').trim() || 'Projeto Typst';
    return parseTypstToProject(typContent, cleanName, new Map());
  }

  if (lowerName.endsWith('.tex')) {
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const texContent = decoder.decode(buffer);
    const cleanName = file.name.replace(/\.tex$/i, '').trim() || 'Projeto LaTeX';
    return parseLatexToProject(texContent, cleanName, new Map());
  }

  throw new Error(
    'Formato de arquivo não suportado. Envie um arquivo .docx (Word), .zip (RedijaApp, Overleaf ou Typst), .typ, .tex ou .redija.'
  );
}

// ============================================================================
// IMPORTAÇÃO DE ARQUIVOS .ZIP (REDIJA, OVERLEAF OU TYPST)
// ============================================================================

export async function importFromZip(
  arrayBuffer: ArrayBuffer,
  zipFileName: string
): Promise<DocumentProject> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const fileNames = Object.keys(zip.files).filter((n) => !zip.files[n].dir);

  // CENÁRIO 1: PROJETO DO REDIJAAPP (.zip contendo *.redija)
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

  // CENÁRIO 3: PROJETO TYPST (.zip contendo *.typ)
  const typFiles = fileNames.filter((n) => n.toLowerCase().endsWith('.typ'));
  if (typFiles.length > 0) {
    return await importFromTypstZip(zip, fileNames, typFiles, zipFileName);
  }

  throw new Error(
    'O arquivo ZIP selecionado não foi reconhecido. Envie um projeto exportado pelo RedijaApp (.zip), Overleaf (.tex) ou Typst (.typ).'
  );
}

async function extractReferencesAndImagesFromZip(
  zip: JSZip,
  fileNames: string[]
): Promise<{ references: AcademicReference[]; imageMap: Map<string, string> }> {
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
      imageMap.set(baseName.replace(/\.[^.]+$/, ''), dataUrl);
    } catch (err) {
      console.warn(`Erro ao ler imagem ${imgName}:`, err);
    }
  }

  return { references, imageMap };
}

async function importFromTypstZip(
  zip: JSZip,
  fileNames: string[],
  typFiles: string[],
  zipFileName: string
): Promise<DocumentProject> {
  const preferredNames = ['main.typ', 'paper.typ', 'article.typ', 'artigo.typ', 'tcc.typ', 'document.typ'];
  let mainTypFile = typFiles.find((n) => {
    const base = n.split('/').pop()?.toLowerCase();
    return base && preferredNames.includes(base);
  });

  if (!mainTypFile) {
    mainTypFile = typFiles.find((n) => {
      const base = n.split('/').pop()?.toLowerCase() || '';
      return !['abnt.typ', 'sbc.typ', 'ieee.typ', 'poster.typ', 'template.typ'].includes(base);
    }) ?? typFiles[0];
  }

  const typContent = await zip.files[mainTypFile].async('string');
  const { references, imageMap } = await extractReferencesAndImagesFromZip(zip, fileNames);
  const cleanProjectName = zipFileName.replace(/\.zip$/i, '').trim() || 'Projeto Typst';

  return parseTypstToProject(typContent, cleanProjectName, imageMap, references);
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

  // 2. Extrai referências BibTeX (.bib) e imagens do zip
  const { references, imageMap } = await extractReferencesAndImagesFromZip(zip, fileNames);

  // 3. Analisa o LaTeX e converte em blocos e metadados
  const cleanProjectName = zipFileName.replace(/\.zip$/i, '').trim() || 'Projeto Overleaf';
  return parseLatexToProject(texContent, cleanProjectName, imageMap, references);
}

/**
 * Detecta heuristicamente o modelo do projeto a partir do preâmbulo e comandos LaTeX.
 */
export function detectLatexTemplate(texContent: string): ProjectTemplateType {
  if (/\\documentclass(?:\[[^\]]*\])?\{(?:IEEEtran|ieeecolor)\}/i.test(texContent) || /\\begin\{IEEEkeywords\}/i.test(texContent)) {
    return 'ieee';
  }
  if (/\\documentclass(?:\[[^\]]*\])?\{sbc[^}]*\}/i.test(texContent) || /\\usepackage(?:\[[^\]]*\])?\{sbc[^}]*\}/i.test(texContent)) {
    return 'sbc';
  }
  if (/\\documentclass(?:\[[^\]]*\])?\{(?:tikzposter|baposter|a0poster|beamerposter)\}/i.test(texContent)) {
    return 'poster';
  }
  if (/\\documentclass(?:\[([^\]]*)\])?\{abntex2\}/i.test(texContent) || /\\usepackage(?:\[[^\]]*\])?\{abntex2/i.test(texContent)) {
    const optsMatch = texContent.match(/\\documentclass\[([^\]]*)\]\{abntex2\}/i);
    const tipoMatch = texContent.match(/\\tipotrabalho\{([^}]+)\}/i);
    const tipoStr = (tipoMatch?.[1] || optsMatch?.[1] || '').toLowerCase();
    if (tipoStr.includes('artigo') || tipoStr.includes('article')) return 'artigo';
    if (tipoStr.includes('relatorio') || tipoStr.includes('relatório')) return 'relatorio';
    if (tipoStr.includes('projeto')) return 'projeto_pesquisa';
    return 'tcc';
  }

  const hasMonographMarkers =
    /\\(?:chapter|imprimircapa|imprimirfolhaderosto|begin\{dedicatoria\}|begin\{agradecimentos\})\b/i.test(texContent) ||
    /\\documentclass(?:\[[^\]]*\])?\{(?:book|report|memoir)\}/i.test(texContent);

  if (hasMonographMarkers) {
    return 'tcc';
  }

  return 'artigo';
}

function extractLatexCommandArg(content: string, commandRegex: RegExp): string | undefined {
  const match = commandRegex.exec(content);
  if (!match || match.index === undefined) return undefined;
  let idx = match.index + match[0].length;
  while (idx < content.length && content[idx] !== '{') idx++;
  if (content[idx] !== '{') return undefined;
  idx++; // skip opening {
  let depth = 1;
  let result = '';
  while (idx < content.length && depth > 0) {
    const ch = content[idx];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth > 0) result += ch;
    idx++;
  }
  return result.trim();
}

function parseKeywordsList(raw: string): string[] {
  return cleanLatexText(raw)
    .split(/[;,]|\band\b/i)
    .map((k) => k.replace(/\.+$/, '').trim())
    .filter(Boolean);
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
  const detectedTemplate = detectLatexTemplate(texContent);
  const base = createProjectFromTemplate(detectedTemplate, projectName);

  // Extrai metadados do preâmbulo com suporte a chaves aninhadas
  const rawTitle = extractLatexCommandArg(texContent, /\\title\s*(?:\[[^\]]*\])?\s*(?=\{)/);
  const rawSubtitle = extractLatexCommandArg(texContent, /\\(?:subtitle|subtitulo)\s*(?=\{)/i);
  const rawAuthor = extractLatexCommandArg(texContent, /\\author\s*(?:\[[^\]]*\])?\s*(?=\{)/);
  const rawInstitution = extractLatexCommandArg(texContent, /\\(?:institution|instituicao|affiliation)\s*(?=\{)/i);
  const rawAdvisor = extractLatexCommandArg(texContent, /\\(?:orientador|advisor)\s*(?:\[[^\]]*\])?\s*(?=\{)/i);
  const rawLocation = extractLatexCommandArg(texContent, /\\local\s*(?=\{)/i);
  const rawDate = extractLatexCommandArg(texContent, /\\(?:data|date)\s*(?=\{)/i);

  if (rawTitle) base.metadata.title = cleanLatexText(rawTitle.replace(/\\\\/g, ' '));
  if (rawSubtitle) base.metadata.subtitle = cleanLatexText(rawSubtitle);
  if (rawAuthor) {
    const cleanedAuthor = rawAuthor
      .replace(/\\thanks\{[^}]*\}/g, '')
      .replace(/\\inst\{[^}]*\}/g, '')
      .replace(/\\IEEEauthorblockN\{([^}]+)\}/g, '$1')
      .replace(/\s*\\and\b\s*/g, '; ')
      .replace(/\s*\\\\\s*/g, ', ');
    base.metadata.author = cleanLatexText(cleanedAuthor)
      .replace(/\s*;\s*/g, '; ')
      .replace(/\s*,\s*$/, '')
      .trim();
  }
  if (rawInstitution) base.metadata.institution = cleanLatexText(rawInstitution.replace(/\\\\/g, ' — '));
  if (rawAdvisor) base.metadata.advisor = cleanLatexText(rawAdvisor);
  if (rawLocation) base.metadata.location = cleanLatexText(rawLocation);
  if (rawDate) {
    const yearMatch = rawDate.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) base.metadata.year = yearMatch[1];
  }

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

  // Extração semântica de Resumo / Abstract e Palavras-chave / Keywords
  const resumoMatch = body.match(/\\begin\{resumo\}([\s\S]*?)\\end\{resumo\}/i);
  const abstractMatch = body.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/i);

  if (resumoMatch && abstractMatch) {
    base.metadata.abstract = cleanLatexText(resumoMatch[1]);
    base.metadata.foreignAbstract = cleanLatexText(abstractMatch[1]);
  } else if (resumoMatch) {
    base.metadata.abstract = cleanLatexText(resumoMatch[1]);
  } else if (abstractMatch) {
    base.metadata.abstract = cleanLatexText(abstractMatch[1]);
  }

  const ieeeKeywordsMatch = body.match(/\\begin\{IEEEkeywords\}([\s\S]*?)\\end\{IEEEkeywords\}/i);
  const keywordsCmdRaw = extractLatexCommandArg(texContent, /\\(?:keywords|palavraschave|palavras-chave)\s*(?=\{)/i);
  if (ieeeKeywordsMatch) {
    base.metadata.keywords = parseKeywordsList(ieeeKeywordsMatch[1]);
  } else if (keywordsCmdRaw) {
    base.metadata.keywords = parseKeywordsList(keywordsCmdRaw);
  }

  // Remove ambientes de resumo/keywords já extraídos para não duplicar como texto corrido
  body = body
    .replace(/\\begin\{resumo\}[\s\S]*?\\end\{resumo\}/gi, '')
    .replace(/\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/gi, '')
    .replace(/\\begin\{IEEEkeywords\}[\s\S]*?\\end\{IEEEkeywords\}/gi, '');

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

    // Comentários e comandos estruturais automáticos
    if (line.startsWith('%')) continue;
    if (/^\\(?:maketitle|imprimircapa|imprimirfolhaderosto|tableofcontents|listoffigures|listoftables|printbibliography)\b/.test(line)) {
      continue;
    }
    if (/^\\(?:bibliography|bibliographystyle)\s*\{/.test(line)) {
      continue;
    }

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
 * Detecta heuristicamente o modelo do projeto a partir da estrutura HTML gerada do DOCX.
 */
export function detectDocxTemplate(html: string): ProjectTemplateType {
  const normalized = stripHtmlTags(html.replace(/>/g, '> '))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const hasMonographMarkers =
    /\b(?:folha de aprovacao|folha de rosto|dedicatoria|epigrafe|lista de figuras|lista de ilustracoes|lista de tabelas|trabalho de conclusao de curso|monografia|dissertacao|banca examinadora)\b/.test(
      normalized
    );

  if (hasMonographMarkers) {
    return 'tcc';
  }

  if (/\b(?:relatorio tecnico|relatorio de estagio|estagio supervisionado)\b/.test(normalized)) {
    return 'relatorio';
  }

  if (/\b(?:projeto de pesquisa|justificativa|objetivos especificos)\b/.test(normalized) && !/\bresumo\b/.test(normalized)) {
    return 'projeto_pesquisa';
  }

  return 'artigo';
}

/**
 * Converte o HTML gerado pelo Mammoth a partir de um arquivo .docx
 * em blocos estruturados do RedijaApp, realizando match semântico de campos e referências.
 */
export function parseDocxHtmlToProject(html: string, projectName: string): DocumentProject {
  const detectedTemplate = detectDocxTemplate(html);
  const base = createProjectFromTemplate(detectedTemplate, projectName);
  const blocks: Block[] = [];
  const references: AcademicReference[] = [];

  // Divide o HTML em elementos principais (h1, h2, h3, h4, p, table, ul, ol, blockquote)
  const tagRegex = /<(h[1-6]|p|table|ul|ol|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  let activeSpecialSection: 'none' | 'references' | 'resumo' | 'abstract' = 'none';
  const extractedResumoParts: string[] = [];
  const extractedAbstractParts: string[] = [];
  let extractedPtKeywords: string[] | null = null;
  let extractedEnKeywords: string[] | null = null;
  let seenFirstHeading = false;

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

      seenFirstHeading = true;

      if (/^refer[êe]ncias(\s+bibliogr[áa]ficas)?$/i.test(plainText)) {
        activeSpecialSection = 'references';
      } else if (/^resumo$/i.test(plainText)) {
        activeSpecialSection = 'resumo';
        continue;
      } else if (/^abstract$/i.test(plainText)) {
        activeSpecialSection = 'abstract';
        continue;
      } else {
        activeSpecialSection = 'none';
      }

      blocks.push({
        id: crypto.randomUUID(),
        type: blockType,
        content: plainText,
      });
      continue;
    }

    // 2. Seções especiais semânticas (Resumo, Abstract, Palavras-chave, Referências)
    if (activeSpecialSection === 'references' && tag === 'p') {
      const ref = parseReferenceParagraph(plainText);
      if (ref) {
        references.push(ref);
        continue;
      }
    }

    if (activeSpecialSection === 'resumo' && tag === 'p') {
      const kwMatch = plainText.match(/^palavras[- ]chave:\s*(.+)$/i);
      if (kwMatch) {
        extractedPtKeywords = kwMatch[1]
          .split(/[;,]/)
          .map((k) => k.replace(/\.+$/, '').trim())
          .filter(Boolean);
      } else {
        extractedResumoParts.push(plainText);
      }
      continue;
    }

    if (activeSpecialSection === 'abstract' && tag === 'p') {
      const kwMatch = plainText.match(/^(?:keywords|index terms):\s*(.+)$/i);
      if (kwMatch) {
        extractedEnKeywords = kwMatch[1]
          .split(/[;,]/)
          .map((k) => k.replace(/\.+$/, '').trim())
          .filter(Boolean);
      } else {
        extractedAbstractParts.push(plainText);
      }
      continue;
    }

    // Field matching de cabeçalhos pré-textuais explícitos (ex: "Autor: João", "Orientador: Dra. Ana")
    if (tag === 'p' && !seenFirstHeading) {
      const subtitleMetaMatch = plainText.match(/^(?:subt[íi]tulo|subtitle):\s*(.+)$/i);
      if (subtitleMetaMatch) {
        base.metadata.subtitle = subtitleMetaMatch[1].trim();
        continue;
      }
      const authorMetaMatch = plainText.match(/^(?:autor(?:a|es)?|author(?:s)?):\s*(.+)$/i);
      if (authorMetaMatch) {
        base.metadata.author = authorMetaMatch[1].trim();
        continue;
      }
      const advisorMetaMatch = plainText.match(/^(?:orientador(?:a)?|advisor):\s*(.+)$/i);
      if (advisorMetaMatch) {
        base.metadata.advisor = advisorMetaMatch[1].trim();
        continue;
      }
      const instMetaMatch = plainText.match(/^(?:institui[çc][ãa]o|universidade|institution):\s*(.+)$/i);
      if (instMetaMatch) {
        base.metadata.institution = instMetaMatch[1].trim();
        continue;
      }
      const courseMetaMatch = plainText.match(/^(?:curso|departamento|course|department):\s*(.+)$/i);
      if (courseMetaMatch) {
        base.metadata.course = courseMetaMatch[1].trim();
        continue;
      }
      const locMetaMatch = plainText.match(/^(?:cidade|local|location):\s*(.+)$/i);
      if (locMetaMatch) {
        base.metadata.location = locMetaMatch[1].trim();
        continue;
      }
      const yearMetaMatch = plainText.match(/^(?:ano|year):\s*(.+)$/i);
      if (yearMetaMatch) {
        base.metadata.year = yearMetaMatch[1].trim();
        continue;
      }
    }

    // Match direto de palavras-chave soltas no início
    if (tag === 'p') {
      const kwStandalone = plainText.match(/^palavras[- ]chave:\s*(.+)$/i);
      if (kwStandalone && blocks.length <= 3) {
        extractedPtKeywords = kwStandalone[1]
          .split(/[;,]/)
          .map((k) => k.replace(/\.+$/, '').trim())
          .filter(Boolean);
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

  if (extractedResumoParts.length > 0) {
    base.metadata.abstract = extractedResumoParts.join('\n');
    if (extractedAbstractParts.length > 0) {
      base.metadata.foreignAbstract = extractedAbstractParts.join('\n');
    }
  } else if (extractedAbstractParts.length > 0) {
    base.metadata.abstract = extractedAbstractParts.join('\n');
  }

  if (extractedPtKeywords && extractedPtKeywords.length > 0) {
    base.metadata.keywords = extractedPtKeywords;
    if (extractedEnKeywords && extractedEnKeywords.length > 0) {
      base.metadata.foreignKeywords = extractedEnKeywords;
    }
  } else if (extractedEnKeywords && extractedEnKeywords.length > 0) {
    if (extractedResumoParts.length > 0) {
      base.metadata.foreignKeywords = extractedEnKeywords;
    } else {
      base.metadata.keywords = extractedEnKeywords;
    }
  }

  // Tenta extrair título caso esteja no primeiro h1
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
// IMPORTAÇÃO DE DOCUMENTOS TYPST (.TYP)
// ============================================================================

/**
 * Detecta heuristicamente o modelo de projeto a partir de imports e show rules Typst.
 */
export function detectTypstTemplate(typContent: string): ProjectTemplateType {
  if (/^\s*#import\s+"@preview\//m.test(typContent)) return 'universe_custom';
  if (/sbc-article\.with|sbc\.typ/i.test(typContent)) return 'sbc';
  if (/ieee-article\.with|ieee\.typ/i.test(typContent)) return 'ieee';
  if (/academic-poster\.with|poster\.typ/i.test(typContent)) return 'poster';
  if (/abnt\.with|abnt\.typ/i.test(typContent)) {
    if (/incluir-capa:\s*false|colunas:\s*2/i.test(typContent)) return 'artigo';
    return 'tcc';
  }
  if (/^=\s+/m.test(typContent)) return 'artigo';
  return 'em_branco';
}

/**
 * Converte um arquivo Typst (.typ) em um DocumentProject realizando field matching e extração de blocos.
 */
export function parseTypstToProject(
  typContent: string,
  projectName: string,
  imageMap: Map<string, string>,
  existingRefs: AcademicReference[] = []
): DocumentProject {
  const detectedTemplate = detectTypstTemplate(typContent);
  const base = createProjectFromTemplate(detectedTemplate, projectName);

  // Extrai pacote e entrypoint se for Typst Universe
  const universePkgMatch = typContent.match(/#import\s+"(@preview\/[^"]+)"/);
  const showEntryMatch = typContent.match(/#show:\s*([a-zA-Z0-9_-]+)\.with\(/);
  if (detectedTemplate === 'universe_custom' && base.templateConfig) {
    if (universePkgMatch) base.templateConfig.universePackage = universePkgMatch[1];
    if (showEntryMatch) base.templateConfig.universeEntrypoint = showEntryMatch[1];
  }

  // Field Matching sobre parâmetros nomeados no show rule (titulo/title, autor/author, etc.)
  const extractTypstStringParam = (keys: string[]): string | undefined => {
    for (const k of keys) {
      const regex = new RegExp(`\\b${k}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i');
      const m = typContent.match(regex);
      if (m) return m[1].replace(/\\"/g, '"').trim();
    }
    return undefined;
  };

  const titleVal = extractTypstStringParam(['titulo', 'title']);
  const subtitleVal = extractTypstStringParam(['subtitulo', 'subtitle']);
  const authorVal = extractTypstStringParam(['autor', 'author']);
  const instVal = extractTypstStringParam(['instituicao', 'institution']);
  const courseVal = extractTypstStringParam(['curso', 'course', 'department']);
  const locVal = extractTypstStringParam(['local', 'location']);
  const yearVal = extractTypstStringParam(['ano', 'year']);
  const advisorVal = extractTypstStringParam(['orientador', 'advisor']);

  if (titleVal) base.metadata.title = titleVal;
  if (subtitleVal) base.metadata.subtitle = subtitleVal;
  if (authorVal) base.metadata.author = authorVal;
  if (instVal) base.metadata.institution = instVal;
  if (courseVal) base.metadata.course = courseVal;
  if (locVal) base.metadata.location = locVal;
  if (yearVal) base.metadata.year = yearVal;
  if (advisorVal) base.metadata.advisor = advisorVal;

  const authorsTupleMatch = typContent.match(/\bauthors\s*:\s*\(([^)]+)\)/i);
  if (authorsTupleMatch && !authorVal) {
    const authors = authorsTupleMatch[1]
      .split(',')
      .map((s) => s.replace(/["']/g, '').trim())
      .filter(Boolean);
    if (authors.length > 0) base.metadata.author = authors.join('; ');
  }

  const resumoContentMatch = typContent.match(/\bresumo\s*:\s*\[([^\]]+)\]/i);
  const abstractContentMatch = typContent.match(/\babstract\s*:\s*\[([^\]]+)\]/i);
  if (resumoContentMatch && abstractContentMatch) {
    base.metadata.abstract = resumoContentMatch[1].trim();
    base.metadata.foreignAbstract = abstractContentMatch[1].trim();
  } else if (resumoContentMatch) {
    base.metadata.abstract = resumoContentMatch[1].trim();
  } else if (abstractContentMatch) {
    base.metadata.abstract = abstractContentMatch[1].trim();
  }

  const parseTupleItems = (rawTuple: string) =>
    rawTuple
      .split(',')
      .map((s) => s.replace(/["']/g, '').trim())
      .filter(Boolean);

  const ptKwTupleMatch = typContent.match(/\bpalavras-chave\s*:\s*\(([^)]+)\)/i);
  const enKwTupleMatch = typContent.match(/\bkeywords\s*:\s*\(([^)]+)\)/i);
  if (ptKwTupleMatch && enKwTupleMatch) {
    base.metadata.keywords = parseTupleItems(ptKwTupleMatch[1]);
    base.metadata.foreignKeywords = parseTupleItems(enKwTupleMatch[1]);
  } else if (ptKwTupleMatch) {
    base.metadata.keywords = parseTupleItems(ptKwTupleMatch[1]);
  } else if (enKwTupleMatch) {
    base.metadata.keywords = parseTupleItems(enKwTupleMatch[1]);
  }

  // Isola o corpo do texto após cabeçalhos #import / #show
  const lines = typContent.split(/\r?\n/);
  const blocks: Block[] = [];
  let inShowBlock = false;
  let showParenDepth = 0;
  let inCodeFence = false;
  let codeLang = 'typst';
  let codeLines: string[] = [];
  let currentParagraph = '';

  const flushParagraph = () => {
    const trimmed = currentParagraph.trim();
    if (trimmed) {
      blocks.push({
        id: crypto.randomUUID(),
        type: 'paragraph',
        content: `<p>${trimmed.replace(/\*([^*]+)\*/g, '<strong>$1</strong>').replace(/_([^_]+)_/g, '<em>$1</em>')}</p>`,
      });
    }
    currentParagraph = '';
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (inCodeFence) {
      if (line.startsWith('```')) {
        inCodeFence = false;
        blocks.push({
          id: crypto.randomUUID(),
          type: 'code',
          content: codeLines.join('\n'),
          meta: { language: codeLang || 'text' },
        });
        codeLines = [];
      } else {
        codeLines.push(rawLine);
      }
      continue;
    }

    if (line.startsWith('```')) {
      flushParagraph();
      inCodeFence = true;
      codeLang = line.slice(3).trim() || 'text';
      codeLines = [];
      continue;
    }

    // Ignora blocos #import e #show: ...with(...)
    if (inShowBlock) {
      for (const ch of line) {
        if (ch === '(') showParenDepth++;
        else if (ch === ')') showParenDepth--;
      }
      if (showParenDepth <= 0) inShowBlock = false;
      continue;
    }

    if (line.startsWith('#import ') || line.startsWith('//')) {
      continue;
    }

    if (line.startsWith('#show:')) {
      inShowBlock = true;
      showParenDepth = 0;
      for (const ch of line) {
        if (ch === '(') showParenDepth++;
        else if (ch === ')') showParenDepth--;
      }
      if (showParenDepth <= 0 && line.includes(')')) inShowBlock = false;
      continue;
    }

    // Headings Typst (=, ==, ===, ====)
    const headingMatch = line.match(/^(={1,4})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      const type: Block['type'] =
        level === 1 ? 'h1' : level === 2 ? 'h2' : level === 3 ? 'h3' : 'h4';
      blocks.push({
        id: crypto.randomUUID(),
        type,
        content: headingMatch[2].trim(),
      });
      continue;
    }

    // Equação display Typst ($ ... $)
    const eqMatch = line.match(/^\$\s+([\s\S]+?)\s+\$$/);
    if (eqMatch) {
      flushParagraph();
      blocks.push({
        id: crypto.randomUUID(),
        type: 'equation',
        content: eqMatch[1].trim(),
      });
      continue;
    }

    // Imagem Typst (#image("..."))
    const imgMatch = line.match(/#image\(\s*"([^"]+)"/);
    if (imgMatch) {
      flushParagraph();
      const rawPath = imgMatch[1].trim();
      const normalizedKey = rawPath.replace(/^\/+/, '').toLowerCase();
      const baseName = rawPath.split('/').pop()?.toLowerCase() || '';
      const dataUrl = imageMap.get(normalizedKey) || imageMap.get(baseName);
      blocks.push({
        id: crypto.randomUUID(),
        type: 'image',
        content: '',
        meta: {
          caption: 'Figura importada do Typst',
          source: 'Arquivo importado',
          imageDataUrl: dataUrl,
        },
      });
      continue;
    }

    // Listas (- e +)
    if (line.startsWith('- ')) {
      flushParagraph();
      blocks.push({
        id: crypto.randomUUID(),
        type: 'bullet',
        content: line.slice(2).trim(),
      });
      continue;
    }
    if (line.startsWith('+ ')) {
      flushParagraph();
      blocks.push({
        id: crypto.randomUUID(),
        type: 'numbered',
        content: line.slice(2).trim(),
      });
      continue;
    }

    if (!line) {
      flushParagraph();
      continue;
    }

    if (line.startsWith('#')) {
      continue;
    }

    currentParagraph = currentParagraph ? `${currentParagraph} ${line}` : line;
  }

  flushParagraph();

  return {
    ...base,
    blocks: blocks.length > 0 ? blocks : base.blocks,
    references: existingRefs.length > 0 ? existingRefs : base.references,
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
