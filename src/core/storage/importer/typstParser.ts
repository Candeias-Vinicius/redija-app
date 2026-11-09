import {
  AcademicReference,
  Block,
  DocumentProject,
  ProjectTemplateType,
} from '@/types/document';
import { createProjectBaseForImport } from './shared';

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

function extractTypstTableBlock(snippet: string): Block | null {
  const isBox = /^\s*#?quadro\b/i.test(snippet) || /kind:\s*["']quadro["']/i.test(snippet);

  // 1. Caption
  let caption = isBox ? 'Quadro comparativo' : 'Tabela de dados';
  const figureCapMatch =
    snippet.match(/caption:\s*\[([\s\S]*?)\]/i) || snippet.match(/caption:\s*"([^"]+)"/i);
  if (figureCapMatch) {
    caption = figureCapMatch[1].trim();
  } else {
    const helperCapMatch =
      snippet.match(/#?(?:tabela|quadro)\s*\(\s*"([^"]+)"/i) ||
      snippet.match(/#?(?:tabela|quadro)\s*\(\s*\[([\s\S]*?)\]/i);
    if (helperCapMatch) {
      caption = helperCapMatch[1].trim();
    }
  }

  // 2. Source
  let source = 'do autor';
  const helperSrcMatch = snippet.match(
    /#?(?:tabela|quadro)\s*\(\s*(?:"[^"]*"|\[[\s\S]*?\])\s*,\s*(?:"([^"]+)"|\[([\s\S]*?)\])/i,
  );
  if (helperSrcMatch) {
    source = (helperSrcMatch[1] || helperSrcMatch[2] || '').trim();
  } else {
    const genericSrcMatch = snippet.match(/(?:fonte|source):\s*(?:\[([\s\S]*?)\]|"([^"]+)")/i);
    if (genericSrcMatch) {
      source = (genericSrcMatch[1] || genericSrcMatch[2] || '').trim();
    }
  }

  // 3. Colunas
  let colCount = 2;
  const colNumMatch = snippet.match(/columns:\s*(\d+)/i);
  const colTupleMatch = snippet.match(/columns:\s*\(([^)]+)\)/i);
  if (colNumMatch) {
    colCount = parseInt(colNumMatch[1], 10) || 2;
  } else if (colTupleMatch) {
    const items = colTupleMatch[1].split(',').filter((s) => s.trim().length > 0);
    if (items.length > 0) colCount = items.length;
  }

  // 4. Células com suporte a colchetes aninhados ([#strong[Texto]])
  let cellArea = snippet;
  cellArea = cellArea.replace(/caption:\s*\[[\s\S]*?\]/gi, '');
  cellArea = cellArea.replace(
    /#?(?:tabela|quadro)\s*\(\s*(?:"[^"]*"|\[[\s\S]*?\])\s*,\s*(?:"[^"]*"|\[[\s\S]*?\])\s*,/i,
    '',
  );
  cellArea = cellArea.replace(/columns:\s*(?:\([^)]*\)|\d+)/gi, '');

  const cells: string[] = [];
  let charIdx = 0;
  while (charIdx < cellArea.length) {
    const openBracket = cellArea.indexOf('[', charIdx);
    if (openBracket === -1) break;

    let depth = 1;
    let endIdx = openBracket + 1;
    while (endIdx < cellArea.length && depth > 0) {
      if (cellArea[endIdx] === '[') depth++;
      else if (cellArea[endIdx] === ']') depth--;
      endIdx++;
    }

    const rawCell = cellArea.slice(openBracket + 1, endIdx - 1);
    const cleanCell = rawCell
      .replace(/#strong\[([\s\S]*?)\]/g, '$1')
      .replace(/#emph\[([\s\S]*?)\]/g, '$1')
      .replace(/\[([\s\S]*?)\]/g, '$1')
      .replace(/\\/g, '')
      .trim();

    if (cleanCell) {
      cells.push(cleanCell);
    }
    charIdx = endIdx;
  }

  if (cells.length === 0) return null;

  const headers = cells.slice(0, colCount);
  const bodyCells = cells.slice(colCount);
  const rows: string[][] = [];

  for (let i = 0; i < bodyCells.length; i += colCount) {
    const row = bodyCells.slice(i, i + colCount);
    while (row.length < colCount) {
      row.push('');
    }
    rows.push(row);
  }

  return {
    id: crypto.randomUUID(),
    type: isBox ? 'box' : 'table',
    content: '',
    meta: {
      headers: headers.length > 0 ? headers : Array(colCount).fill('Coluna'),
      rows: rows.length > 0 ? rows : [Array(colCount).fill('')],
      caption,
      source,
    },
  };
}

/**
 * Converte um arquivo Typst (.typ) em um DocumentProject realizando field matching e extração de blocos.
 */
export function parseTypstToProject(
  typContent: string,
  projectName: string,
  imageMap: Map<string, string>,
  existingRefs: AcademicReference[] = [],
): DocumentProject {
  const detectedTemplate = detectTypstTemplate(typContent);
  const base = createProjectBaseForImport(detectedTemplate, projectName);

  // Extrai pacote e entrypoint se for Typst Universe
  const universePkgMatch = typContent.match(/#import\s+"(@preview\/[^"]+)"/);
  const showEntryMatch = typContent.match(/#show:\s*([a-zA-Z0-9_-]+)\.with\(/);
  if (detectedTemplate === 'universe_custom' && base.templateConfig) {
    if (universePkgMatch) base.templateConfig.universePackage = universePkgMatch[1];
    if (showEntryMatch) base.templateConfig.universeEntrypoint = showEntryMatch[1];
  }

  // Field Matching sobre parâmetros nomeados no show rule
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

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const rawLine = lines[lineIndex];
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

    // Figuras compostas (#figure(image(...)) ou #figure(table(...)))
    if (line.startsWith('#figure(')) {
      flushParagraph();
      let figureCode = rawLine;
      let depth = 0;
      for (const ch of rawLine) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
      }
      while (depth > 0 && lineIndex + 1 < lines.length) {
        lineIndex++;
        const nextLine = lines[lineIndex];
        figureCode += '\n' + nextLine;
        for (const ch of nextLine) {
          if (ch === '(') depth++;
          else if (ch === ')') depth--;
        }
      }

      if (/table\b|tabela\b|quadro\b/i.test(figureCode)) {
        const tableBlock = extractTypstTableBlock(figureCode);
        if (tableBlock) blocks.push(tableBlock);
        continue;
      }

      const imgMatch = figureCode.match(/image\(\s*"([^"]+)"/i);
      if (imgMatch) {
        const rawPath = imgMatch[1].trim();
        const normalizedKey = rawPath.replace(/^\/+/, '').toLowerCase();
        const baseName = rawPath.split('/').pop()?.toLowerCase() || '';
        const dataUrl = imageMap.get(normalizedKey) || imageMap.get(baseName);
        const capMatch =
          figureCode.match(/caption:\s*\[([\s\S]*?)\]/i) ||
          figureCode.match(/caption:\s*"([^"]+)"/i);
        const srcMatch = figureCode.match(/(?:fonte|source):\s*(?:\[([\s\S]*?)\]|"([^"]+)")/i);
        blocks.push({
          id: crypto.randomUUID(),
          type: 'image',
          content: '',
          meta: {
            caption: capMatch ? capMatch[1].trim() : 'Figura importada do Typst',
            source: srcMatch ? srcMatch[1].trim() : 'Arquivo importado',
            imageDataUrl: dataUrl,
          },
        });
        continue;
      }
      continue;
    }

    // Tabelas e Quadros (#table, #tabela, #quadro)
    if (
      line.startsWith('#table(') ||
      line.startsWith('#tabela(') ||
      line.startsWith('#quadro(')
    ) {
      flushParagraph();
      let tableCode = rawLine;
      let depth = 0;
      for (const ch of rawLine) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
      }
      while (depth > 0 && lineIndex + 1 < lines.length) {
        lineIndex++;
        const nextLine = lines[lineIndex];
        tableCode += '\n' + nextLine;
        for (const ch of nextLine) {
          if (ch === '(') depth++;
          else if (ch === ')') depth--;
        }
      }
      const tableBlock = extractTypstTableBlock(tableCode);
      if (tableBlock) {
        blocks.push(tableBlock);
      }
      continue;
    }

    // Citação longa (#quote(...) ou #quote[...])
    if (line.startsWith('#quote(') || line.startsWith('#quote[')) {
      flushParagraph();
      let quoteCode = rawLine;
      let depth = 0;
      const openChar = line.startsWith('#quote(') ? '(' : '[';
      const closeChar = openChar === '(' ? ')' : ']';
      for (const ch of rawLine) {
        if (ch === openChar) depth++;
        else if (ch === closeChar) depth--;
      }
      while (depth > 0 && lineIndex + 1 < lines.length) {
        lineIndex++;
        const nextLine = lines[lineIndex];
        quoteCode += '\n' + nextLine;
        for (const ch of nextLine) {
          if (ch === openChar) depth++;
          else if (ch === closeChar) depth--;
        }
      }
      const innerTextMatch = quoteCode.match(/\[([\s\S]*?)\]\s*$/);
      const quoteText = innerTextMatch
        ? innerTextMatch[1].trim()
        : quoteCode.replace(/^#quote(?:\([^)]*\))?/, '').trim();
      if (quoteText) {
        blocks.push({
          id: crypto.randomUUID(),
          type: 'quote_long',
          content: quoteText,
          meta: { author: 'Autor', year: '2024' },
        });
      }
      continue;
    }

    // Imagem Typst isolada (#image("..."))
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

    // Listas (- e + e 1. )
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
    const numListMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numListMatch) {
      flushParagraph();
      blocks.push({
        id: crypto.randomUUID(),
        type: 'numbered',
        content: numListMatch[2].trim(),
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
