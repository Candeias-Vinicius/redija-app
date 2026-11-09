import {
  AcademicReference,
  Block,
  DocumentProject,
  ProjectTemplateType,
} from '@/types/document';
import { createProjectBaseForImport } from './shared';
import { stripHtmlTags } from '../../transpiler/escape';

/**
 * Detecta heuristicamente o modelo do projeto a partir do preâmbulo e comandos LaTeX.
 */
export function detectLatexTemplate(texContent: string): ProjectTemplateType {
  if (
    /\\documentclass(?:\[[^\]]*\])?\{(?:IEEEtran|ieeecolor)\}/i.test(texContent) ||
    /\\begin\{IEEEkeywords\}/i.test(texContent)
  ) {
    return 'ieee';
  }
  if (
    /\\documentclass(?:\[[^\]]*\])?\{sbc[^}]*\}/i.test(texContent) ||
    /\\usepackage(?:\[[^\]]*\])?\{sbc[^}]*\}/i.test(texContent)
  ) {
    return 'sbc';
  }
  if (
    /\\documentclass(?:\[[^\]]*\])?\{(?:tikzposter|baposter|a0poster|beamerposter)\}/i.test(
      texContent,
    )
  ) {
    return 'poster';
  }
  if (
    /\\documentclass(?:\[([^\]]*)\])?\{abntex2\}/i.test(texContent) ||
    /\\usepackage(?:\[[^\]]*\])?\{abntex2/i.test(texContent)
  ) {
    const optsMatch = texContent.match(/\\documentclass\[([^\]]*)\]\{abntex2\}/i);
    const tipoMatch = texContent.match(/\\tipotrabalho\{([^}]+)\}/i);
    const tipoStr = (tipoMatch?.[1] || optsMatch?.[1] || '').toLowerCase();
    if (tipoStr.includes('artigo') || tipoStr.includes('article')) return 'artigo';
    if (tipoStr.includes('relatorio') || tipoStr.includes('relatório')) return 'relatorio';
    if (tipoStr.includes('projeto')) return 'projeto_pesquisa';
    return 'tcc';
  }

  const hasMonographMarkers =
    /\\(?:chapter|imprimircapa|imprimirfolhaderosto|begin\{dedicatoria\}|begin\{agradecimentos\})\b/i.test(
      texContent,
    ) ||
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
      .replace(/[{}]/g, ''),
  ).trim();
}

function parseKeywordsList(raw: string): string[] {
  return cleanLatexText(raw)
    .split(/[;,]|\band\b/i)
    .map((k) => k.replace(/\.+$/, '').trim())
    .filter(Boolean);
}

function extractLatexTableBlock(snippet: string): Block | null {
  const capMatch = snippet.match(/\\caption\{([^}]+)\}/);
  const caption = capMatch ? cleanLatexText(capMatch[1]) : 'Tabela de dados';

  const srcMatch =
    snippet.match(/\\(?:fonte|source)\{([^}]+)\}/i) ||
    snippet.match(/(?:fonte|source):\s*([^\n\\]+)/i);
  const source = srcMatch ? cleanLatexText(srcMatch[1]) : 'do autor';

  const tabularMatch = snippet.match(
    /\\begin\{tabular\*?\}(?:\{[^}]*\})?([\s\S]*?)\\end\{tabular\*?\}/i,
  );
  const tabularBody = tabularMatch ? tabularMatch[1] : snippet;

  const rawRows = tabularBody.split(/\\\\/);
  const rowsData: string[][] = [];

  for (const rawRow of rawRows) {
    const cleanedRow = rawRow
      .replace(/\\hline/g, '')
      .replace(/\\toprule/g, '')
      .replace(/\\midrule/g, '')
      .replace(/\\bottomrule/g, '')
      .trim();

    if (!cleanedRow) continue;

    const cells = cleanedRow.split('&').map((c) => cleanLatexText(c));
    if (cells.length > 0 && cells.some((c) => c !== '')) {
      rowsData.push(cells);
    }
  }

  if (rowsData.length === 0) return null;

  const maxCols = Math.max(...rowsData.map((r) => r.length), 1);
  const normalizedRows = rowsData.map((r) => {
    if (r.length < maxCols) {
      return [...r, ...Array(maxCols - r.length).fill('')];
    }
    return r;
  });

  const headers = normalizedRows[0];
  const bodyRows = normalizedRows.length > 1 ? normalizedRows.slice(1) : [];

  return {
    id: crypto.randomUUID(),
    type: 'table',
    content: '',
    meta: {
      headers,
      rows: bodyRows.length > 0 ? bodyRows : [Array(headers.length).fill('')],
      caption,
      source,
    },
  };
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
 * Converte o conteúdo de um arquivo LaTeX em um DocumentProject do RedijaApp.
 */
export function parseLatexToProject(
  texContent: string,
  projectName: string,
  imageMap: Map<string, string>,
  existingRefs: AcademicReference[] = [],
): DocumentProject {
  const detectedTemplate = detectLatexTemplate(texContent);
  const base = createProjectBaseForImport(detectedTemplate, projectName);

  // Extrai metadados do preâmbulo com suporte a chaves aninhadas
  const rawTitle = extractLatexCommandArg(texContent, /\\title\s*(?:\[[^\]]*\])?\s*(?=\{)/);
  const rawSubtitle = extractLatexCommandArg(texContent, /\\(?:subtitle|subtitulo)\s*(?=\{)/i);
  const rawAuthor = extractLatexCommandArg(texContent, /\\author\s*(?:\[[^\]]*\])?\s*(?=\{)/);
  const rawInstitution = extractLatexCommandArg(
    texContent,
    /\\(?:institution|instituicao|affiliation)\s*(?=\{)/i,
  );
  const rawAdvisor = extractLatexCommandArg(
    texContent,
    /\\(?:orientador|advisor)\s*(?:\[[^\]]*\])?\s*(?=\{)/i,
  );
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
  const keywordsCmdRaw = extractLatexCommandArg(
    texContent,
    /\\(?:keywords|palavraschave|palavras-chave)\s*(?=\{)/i,
  );
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

    if (line.startsWith('%')) continue;
    if (
      /^\\(?:maketitle|imprimircapa|imprimirfolhaderosto|tableofcontents|listoffigures|listoftables|printbibliography)\b/.test(
        line,
      )
    ) {
      continue;
    }
    if (/^\\(?:bibliography|bibliographystyle)\s*\{/.test(line)) {
      continue;
    }

    // AMBIENTE: TABELA (\begin{table} ... \end{table} ou \begin{tabular} ... \end{tabular})
    if (line.includes('\\begin{table}') || line.includes('\\begin{tabular}')) {
      flushParagraph();
      const isStandaloneTabular =
        !line.includes('\\begin{table}') && line.includes('\\begin{tabular}');
      const endMarker = isStandaloneTabular ? '\\end{tabular}' : '\\end{table}';
      let tableContent = rawLine;
      while (i + 1 < lines.length && !tableContent.includes(endMarker)) {
        i++;
        tableContent += '\n' + lines[i];
      }
      const tableBlock = extractLatexTableBlock(tableContent);
      if (tableBlock) {
        blocks.push(tableBlock);
      }
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
    if (
      line.includes('\\begin{equation}') ||
      line.includes('\\[') ||
      line.includes('\\begin{align}')
    ) {
      flushParagraph();
      inEquation = true;
      equationContent = line
        .replace(/\\begin\{equation\*?\}/, '')
        .replace(/\\begin\{align\*?\}/, '')
        .replace(/\\\[/, '');
      if (
        line.includes('\\end{equation}') ||
        line.includes('\\]') ||
        line.includes('\\end{align}')
      ) {
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
      if (
        line.includes('\\end{equation}') ||
        line.includes('\\]') ||
        line.includes('\\end{align}')
      ) {
        inEquation = false;
        equationContent +=
          ' ' +
          line
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
      while (
        i < lines.length &&
        !lines[i].includes('\\end{citacao}') &&
        !lines[i].includes('\\end{quote}')
      ) {
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

    if (!line) {
      flushParagraph();
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
