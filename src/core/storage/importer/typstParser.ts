import {
  AcademicReference,
  Block,
  DocumentProject,
  ProjectTemplateType,
} from '@/types/document';
import { createProjectFromTemplate } from '../projectTemplates';

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
  existingRefs: AcademicReference[] = [],
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
