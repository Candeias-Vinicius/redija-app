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
  const flags = commandRegex.flags.includes('g') ? commandRegex.flags : commandRegex.flags + 'g';
  const regex = new RegExp(commandRegex.source, flags);
  let match: RegExpExecArray | null;
  let fallbackResult: string | undefined = undefined;

  while ((match = regex.exec(content)) !== null) {
    // Ignora ocorrências comentadas (% na mesma linha antes do comando)
    const lineStart = content.lastIndexOf('\n', match.index);
    const linePrefix = content.slice(lineStart === -1 ? 0 : lineStart + 1, match.index);
    if (linePrefix.includes('%')) {
      continue;
    }

    let idx = match.index + match[0].length;
    while (idx < content.length && content[idx] !== '{') idx++;
    if (content[idx] !== '{') continue;
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
    const trimmed = result.trim();
    if (trimmed) {
      return trimmed;
    }
    if (fallbackResult === undefined) {
      fallbackResult = trimmed;
    }
  }

  return fallbackResult;
}

function removeLatexCommandAndArg(content: string, commandRegex: RegExp): string {
  let result = content;
  let match = commandRegex.exec(result);
  while (match && match.index !== undefined) {
    let idx = match.index + match[0].length;
    while (idx < result.length && result[idx] !== '{') idx++;
    if (idx >= result.length || result[idx] !== '{') {
      result = result.slice(0, match.index) + result.slice(idx);
      match = commandRegex.exec(result);
      continue;
    }
    idx++; // skip opening {
    let depth = 1;
    while (idx < result.length && depth > 0) {
      if (result[idx] === '{') depth++;
      else if (result[idx] === '}') depth--;
      idx++;
    }
    result = result.slice(0, match.index) + result.slice(idx);
    match = commandRegex.exec(result);
  }
  return result;
}

function extractLatexEnvironment(content: string, envName: string): string | undefined {
  const regex = new RegExp(`\\\\begin\\{${envName}\\}([\\s\\S]*?)\\\\end\\{${envName}\\}`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : undefined;
}

function cleanLatexText(str: string): string {
  return stripHtmlTags(
    str
      .replace(/\\textbf\{([^}]+)\}/g, '$1')
      .replace(/\\textit\{([^}]+)\}/g, '$1')
      .replace(/\\emph\{([^}]+)\}/g, '$1')
      .replace(/\\textsc\{([^}]+)\}/g, '$1')
      .replace(/\\underline\{([^}]+)\}/g, '$1')
      .replace(/\\blindtext\b/g, '')
      .replace(/\\lipsum\b/g, '')
      .replace(/\\&/g, '&')
      .replace(/\\%/g, '%')
      .replace(/\\#/g, '#')
      .replace(/\\_/g, '_')
      .replace(/\\~/g, '~')
      .replace(/\\label\{[^}]+\}/g, '')
      .replace(/[{}]/g, ''),
  ).trim();
}

function parseKeywordsList(raw: string): string[] {
  const clean = cleanLatexText(raw);
  return clean
    .split(/\r?\n|[;,]|\band\b|(?:\s*\d+\.\s+)/i)
    .map((k) => k.replace(/^\d+\.\s*/, '').replace(/\.+$/, '').trim())
    .filter((k) => k.length > 0 && !/^\d+$/.test(k));
}

function extractLatexAbbreviations(texContent: string): string | undefined {
  const tabbingMatch = texContent.match(/\\begin\{tabbing\}([\s\S]*?)\\end\{tabbing\}/i);
  if (!tabbingMatch) return undefined;
  const lines = tabbingMatch[1].split(/\\\\|\r?\n/);
  const pairs: string[] = [];
  for (const l of lines) {
    const trimmed = l.trim();
    if (!trimmed || trimmed.includes('\\kill')) continue;
    if (trimmed.includes('\\>')) {
      const parts = trimmed.split('\\>');
      const sigla = cleanLatexText(parts[0]).trim();
      const desc = cleanLatexText(parts.slice(1).join(' ')).trim();
      if (sigla && desc) {
        pairs.push(`${sigla} - ${desc}`);
      }
    }
  }
  return pairs.length > 0 ? pairs.join('\n') : undefined;
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

function latexInlineToHtml(latex: string, references?: AcademicReference[]): string {
  // Escapa entidades HTML brutas para evitar injeção XSS a partir do LaTeX
  let text = latex
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Citações narrativas: \citeonline{...}, \citet{...}
  text = text.replace(/\\(?:citeonline|citet)\{([^}]+)\}/g, (_m, keysStr: string) => {
    const keys = keysStr.split(',').map((k) => k.trim());
    return keys
      .map((key) => {
        const ref = references?.find((r) => r.id === key);
        const surname = ref ? ref.authors.split(';')[0].split(',')[0].trim() : key;
        const year = ref?.year || '';
        const label = year ? `${surname} (${year})` : surname;
        return `<cite data-cite-id="${key}" data-cite-mode="narrative">${label}</cite>`;
      })
      .join(', ');
  });

  // Citações parentéticas: \cite{...}, \citep{...}, \parencite{...}
  text = text.replace(/\\(?:cite|citep|parencite)\{([^}]+)\}/g, (_m, keysStr: string) => {
    const keys = keysStr.split(',').map((k) => k.trim());
    return keys
      .map((key) => {
        const ref = references?.find((r) => r.id === key);
        const surname = ref ? ref.authors.split(';')[0].split(',')[0].trim() : key;
        const year = ref?.year || '';
        const label = year ? `(${surname}, ${year})` : `(${key})`;
        return `<cite data-cite-id="${key}" data-cite-mode="parenthetical">${label}</cite>`;
      })
      .join('; ');
  });

  return text
    .replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>')
    .replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>')
    .replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>')
    .replace(/\\underline\{([^}]+)\}/g, '<u>$1</u>')
    .replace(/\\textsc\{([^}]+)\}/g, '$1')
    .replace(/\\blindtext\b/g, '')
    .replace(/\\lipsum\b/g, '')
    .replace(/\\&amp;/g, '&amp;')
    .replace(/\\%/g, '%')
    .replace(/\\#/g, '#')
    .replace(/\\_/g, '_')
    .replace(/\\~/g, '~')
    .replace(/\\label\{[^}]+\}/g, '')
    .replace(/\\ref\{([^}]+)\}/g, '$1')
    .replace(/\\prettyref\{([^}]+)\}/g, '$1')
    .replace(/\\pageref\{([^}]+)\}/g, '$1');
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

  // 1. Extração de Metadados do Preâmbulo
  const rawTitle = extractLatexCommandArg(
    texContent,
    /\\(?:titulo|title|titulotrabalho)\s*(?:\[[^\]]*\])?\s*(?=\{)/i,
  );
  const rawSubtitle = extractLatexCommandArg(
    texContent,
    /\\(?:subtitle|subtitulo)\s*(?=\{)/i,
  );
  const rawAuthor = extractLatexCommandArg(
    texContent,
    /\\(?:DEELautor|autor|author)\s*(?:\[[^\]]*\])?\s*(?=\{)/i,
  );
  const rawInstitution = extractLatexCommandArg(
    texContent,
    /\\(?:institution|instituicao|affiliation|universidade|faculdade)\s*(?=\{)/i,
  );
  const rawCourse = extractLatexCommandArg(
    texContent,
    /\\(?:curso|course|programa|departamento)\s*(?=\{)/i,
  );
  const rawAdvisor = extractLatexCommandArg(
    texContent,
    /\\(?:orientador|advisor|orientadora)\s*(?:\[[^\]]*\])?\s*(?=\{)/i,
  );
  const rawCoAdvisor = extractLatexCommandArg(
    texContent,
    /\\(?:coorientador|coadvisor|co-orientador)\s*(?:\[[^\]]*\])?\s*(?=\{)/i,
  );
  const rawLocation = extractLatexCommandArg(texContent, /\\local\s*(?=\{)/i);
  const rawDate = extractLatexCommandArg(texContent, /\\(?:data|date|ano)\s*(?=\{)/i);

  if (rawTitle) {
    const cleanTitle = cleanLatexText(rawTitle.replace(/\\\\/g, ' '));
    if (cleanTitle.includes(':') && !rawSubtitle) {
      const colonIdx = cleanTitle.indexOf(':');
      base.metadata.title = cleanTitle.slice(0, colonIdx).trim();
      base.metadata.subtitle = cleanTitle.slice(colonIdx + 1).trim();
    } else {
      base.metadata.title = cleanTitle;
    }
  }
  if (rawSubtitle) base.metadata.subtitle = cleanLatexText(rawSubtitle);
  if (rawAuthor) {
    const cleanedAuthor = rawAuthor
      .replace(/\\thanks\{[^}]*\}/g, '')
      .replace(/\\inst\{[^}]*\}/g, '')
      .replace(/\\IEEEauthorblockN\{([^}]+)\}/g, '$1')
      .replace(/\s*\\and\b\s*/g, '; ')
      .replace(/\s*\\newline\b\s*/g, '; ')
      .replace(/\s*\\\\\s*/g, '; ');
    const authorsList = cleanedAuthor
      .split(';')
      .map((a) => cleanLatexText(a).trim())
      .filter(Boolean);
    base.metadata.author = authorsList.join('; ');
  }
  if (rawCourse) base.metadata.course = cleanLatexText(rawCourse);
  if (rawInstitution) {
    base.metadata.institution = cleanLatexText(rawInstitution.replace(/\\\\/g, ' — '));
  } else if (/universidade cat[oó]lica do salvador|ucsal/i.test(texContent)) {
    base.metadata.institution = 'Universidade Católica do Salvador';
  }

  if (rawAdvisor) base.metadata.advisor = cleanLatexText(rawAdvisor);
  if (rawCoAdvisor) base.metadata.coadvisor = cleanLatexText(rawCoAdvisor);
  if (rawLocation) base.metadata.location = cleanLatexText(rawLocation);
  if (rawDate) {
    const yearMatch = rawDate.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch) base.metadata.year = yearMatch[1];
  }

  // Membros de banca (NBR 14724)
  const committeeMembers: string[] = [];
  const memberMatches = texContent.matchAll(
    /\\(?:membro[a-z]?|examinador[a-z]?|banca)\s*(?:\[[^\]]*\])?\{([^}]+)\}/gi,
  );
  for (const m of memberMatches) {
    const member = cleanLatexText(m[1]).trim();
    if (member && !committeeMembers.includes(member)) {
      committeeMembers.push(member);
    }
  }
  if (committeeMembers.length > 0) {
    base.metadata.committeeMembers = committeeMembers;
    base.metadata.includeApprovalPage = true;
  }

  // 2. Extração de elementos pré-textuais
  const rawDedicatory =
    extractLatexCommandArg(texContent, /\\(?:DEELdedicatoria|dedicatoria)\s*(?=\{)/i) ||
    extractLatexEnvironment(texContent, 'dedicatoria');
  if (rawDedicatory) {
    base.metadata.dedicatory = cleanLatexText(rawDedicatory.replace(/\\\\/g, '\n'));
  }

  const rawAgradecimentos =
    extractLatexCommandArg(texContent, /\\(?:DEELagradecimentos|agradecimentos)\s*(?=\{)/i) ||
    extractLatexEnvironment(texContent, 'agradecimentos');
  if (rawAgradecimentos) {
    base.metadata.acknowledgments = cleanLatexText(rawAgradecimentos.replace(/\\\\/g, '\n'));
  }

  const rawEpigrafe =
    extractLatexCommandArg(texContent, /\\(?:DEELepigrafe|epigrafe)\s*(?=\{)/i) ||
    extractLatexEnvironment(texContent, 'epigrafe');
  if (rawEpigrafe) {
    let cleanEpig = cleanLatexText(rawEpigrafe.replace(/\\\\/g, ' '));
    const authorMatch = cleanEpig.match(/\(([^)]+)\)\s*$/);
    if (authorMatch) {
      base.metadata.epigraphAuthor = authorMatch[1].trim();
      cleanEpig = cleanEpig.replace(/\(([^)]+)\)\s*$/, '').trim();
    }
    base.metadata.epigraph = cleanEpig
      .replace(/^["'“”«»]\s*/, '')
      .replace(/\s*["'“”«»]$/, '')
      .trim();
  }

  const rawResumo =
    extractLatexCommandArg(texContent, /\\(?:DEELresumo|resumo)\s*(?=\{)/i) ||
    extractLatexEnvironment(texContent, 'resumo');

  const rawAbstract =
    extractLatexCommandArg(texContent, /\\(?:DEELabstract|abstract)\s*(?=\{)/i) ||
    extractLatexEnvironment(texContent, 'abstract');

  if (rawResumo && rawAbstract) {
    base.metadata.abstract = cleanLatexText(rawResumo);
    base.metadata.foreignAbstract = cleanLatexText(rawAbstract);
  } else if (rawResumo) {
    base.metadata.abstract = cleanLatexText(rawResumo);
  } else if (rawAbstract) {
    base.metadata.abstract = cleanLatexText(rawAbstract);
  }

  const ieeeKeywordsMatch = texContent.match(
    /\\begin\{IEEEkeywords\}([\s\S]*?)\\end\{IEEEkeywords\}/i,
  );
  const rawKeywords = extractLatexCommandArg(
    texContent,
    /\\(?:palavraschave|palavras-chave|palavras_chave)\s*(?=\{)/i,
  );
  if (ieeeKeywordsMatch) {
    base.metadata.keywords = parseKeywordsList(ieeeKeywordsMatch[1]);
  } else if (rawKeywords) {
    base.metadata.keywords = parseKeywordsList(rawKeywords);
  }

  const rawForeignKeywords = extractLatexCommandArg(texContent, /\\keywords\s*(?=\{)/i);
  if (rawForeignKeywords) {
    const parsedFk = parseKeywordsList(rawForeignKeywords);
    if (base.metadata.keywords.length === 0) {
      base.metadata.keywords = parsedFk;
    } else {
      base.metadata.foreignKeywords = parsedFk;
    }
  }

  // Abreviaturas / Siglas
  const abbreviations = extractLatexAbbreviations(texContent);
  if (abbreviations) {
    base.metadata.abbreviations = abbreviations;
  }

  // Logotipo institucional
  const logoKey = Array.from(imageMap.keys()).find((k) =>
    /logo|brasao|brasão|emblema/i.test(k),
  );
  if (logoKey) {
    base.metadata.institutionLogoDataUrl = imageMap.get(logoKey);
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

  // Remove comandos pré-textuais e macros já mapeadas para que não vazem como parágrafos
  body = removeLatexCommandAndArg(body, /\\(?:DEELdedicatoria|dedicatoria)\s*(?=\{)/i);
  body = removeLatexCommandAndArg(body, /\\(?:DEELagradecimentos|agradecimentos)\s*(?=\{)/i);
  body = removeLatexCommandAndArg(body, /\\(?:DEELepigrafe|epigrafe)\s*(?=\{)/i);
  body = removeLatexCommandAndArg(body, /\\(?:DEELresumo|resumo)\s*(?=\{)/i);
  body = removeLatexCommandAndArg(body, /\\(?:DEELabstract|abstract)\s*(?=\{)/i);
  body = removeLatexCommandAndArg(body, /\\(?:DEELautor|autor|author)\s*(?:\[[^\]]*\])?\s*(?=\{)/i);
  body = removeLatexCommandAndArg(
    body,
    /\\(?:titulo|title|titulotrabalho|tituloingles|titulouk)\s*(?:\[[^\]]*\])?\s*(?=\{)/i,
  );
  body = removeLatexCommandAndArg(body, /\\(?:palavraschave|keywords)\s*(?=\{)/i);
  body = removeLatexCommandAndArg(
    body,
    /\\(?:curso|orientador|membrob|membroc|local|data)\s*(?=\{)/i,
  );
  body = removeLatexCommandAndArg(body, /\\(?:preambulo|pretextualchapter)\s*(?=\{)/i);

  body = body
    .replace(/\\begin\{resumo\}[\s\S]*?\\end\{resumo\}/gi, '')
    .replace(/\\begin\{abstract\}[\s\S]*?\\end\{abstract\}/gi, '')
    .replace(/\\begin\{dedicatoria\}[\s\S]*?\\end\{dedicatoria\}/gi, '')
    .replace(/\\begin\{agradecimentos\}[\s\S]*?\\end\{agradecimentos\}/gi, '')
    .replace(/\\begin\{epigrafe\}[\s\S]*?\\end\{epigrafe\}/gi, '')
    .replace(/\\begin\{IEEEkeywords\}[\s\S]*?\\end\{IEEEkeywords\}/gi, '')
    .replace(/\\begin\{tabbing\}[\s\S]*?\\end\{tabbing\}/gi, '');

  const blocks: Block[] = [];
  const lines = body.split(/\r?\n/);
  let currentParagraph = '';

  const flushParagraph = () => {
    const trimmed = currentParagraph.trim();
    if (trimmed) {
      const htmlContent = latexInlineToHtml(trimmed, existingRefs);
      if (htmlContent.replace(/<[^>]+>/g, '').trim()) {
        blocks.push({
          id: crypto.randomUUID(),
          type: 'paragraph',
          content: `<p>${htmlContent}</p>`,
        });
      }
    }
    currentParagraph = '';
  };

  let inFigure = false;
  let figureCaption = '';
  let figureSource = 'do autor';
  let figureImageKey = '';

  let inEquation = false;
  let equationContent = '';

  let inList: 'bullet' | 'numbered' | null = null;
  let currentListItem = '';

  const flushListItem = () => {
    const trimmed = currentListItem.trim();
    if (trimmed && inList) {
      blocks.push({
        id: crypto.randomUUID(),
        type: inList,
        content: `<p>${latexInlineToHtml(trimmed, existingRefs)}</p>`,
      });
    }
    currentListItem = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Pula comentários, marcadores de inclusão e macros estruturais
    if (line.startsWith('%')) continue;
    if (
      /^\\(?:maketitle|imprimircapa|imprimirfolhaderosto|tableofcontents|listoffigures|listoftables|printbibliography)\b/i.test(
        line,
      ) ||
      /^\\(?:ElementosPreTextuais|ListaDeFiguras|ListaDeTabelas|Sumario|textual|pretextual|postextual)\b/i.test(
        line,
      ) ||
      /^\\(?:onehalfspacing|SingleSpacing|doublespacing|selectlanguage|ifx|else|fi)\b/i.test(
        line,
      ) ||
      /^\\(?:newpage|clearpage|cleardoublepage|vspace|hspace|center|centering)\b/i.test(
        line,
      ) ||
      /^\\(?:appendix|apendice|anexo|anexos)\b/i.test(line) ||
      /^\\(?:bibliography|bibliographystyle|Bibliografia)\s*\{/i.test(line) ||
      /^\\(?:include|input)\s*\{/i.test(line) ||
      /^\\(?:blindtext|lipsum)\b/i.test(line)
    ) {
      continue;
    }

    // AMBIENTE: LISTAS (\begin{itemize} ou \begin{enumerate})
    if (line.includes('\\begin{itemize}')) {
      flushParagraph();
      flushListItem();
      inList = 'bullet';
      continue;
    }
    if (line.includes('\\begin{enumerate}')) {
      flushParagraph();
      flushListItem();
      inList = 'numbered';
      continue;
    }
    if (line.includes('\\end{itemize}') || line.includes('\\end{enumerate}')) {
      flushListItem();
      inList = null;
      continue;
    }
    if (inList) {
      if (line.startsWith('\\item')) {
        flushListItem();
        currentListItem = line.replace(/^\\item\s*/, '');
        continue;
      }
      currentListItem = currentListItem ? `${currentListItem} ${line}` : line;
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
        content: latexInlineToHtml(quoteText.trim(), existingRefs),
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
