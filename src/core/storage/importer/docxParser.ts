import mammoth from 'mammoth';
import {
  AcademicReference,
  Block,
  DocumentProject,
  ProjectTemplateType,
} from '@/types/document';
import { stripHtmlTags } from '../../transpiler/escape';
import { createProjectBaseForImport, cleanInlineFormatting } from './shared';

/**
 * Converte um arquivo Microsoft Word (.docx) em DocumentProject usando Mammoth.
 */
export async function importFromDocx(
  arrayBuffer: ArrayBuffer,
  fileName: string,
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
      normalized,
    );

  if (hasMonographMarkers) {
    return 'tcc';
  }

  if (/\b(?:relatorio tecnico|relatorio de estagio|estagio supervisionado)\b/.test(normalized)) {
    return 'relatorio';
  }

  if (
    /\b(?:projeto de pesquisa|justificativa|objetivos especificos)\b/.test(normalized) &&
    !/\bresumo\b/.test(normalized)
  ) {
    return 'projeto_pesquisa';
  }

  return 'artigo';
}

function parseHtmlTable(
  tableHtml: string,
  inheritedCaption?: string,
  inheritedSource?: string,
  isBox?: boolean,
): Block | null {
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  const rowsData: string[][] = [];

  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowContent = rowMatch[1];
    const cellRegex = /<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const cellText = stripHtmlTags(cellMatch[1].replace(/<\/p>\s*<p>/gi, ' ')).trim();
      cells.push(cellText);
    }
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

  const captionMatch = tableHtml.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i);
  const internalCaption = captionMatch ? stripHtmlTags(captionMatch[1]).trim() : '';

  const caption =
    inheritedCaption ||
    internalCaption ||
    (isBox ? 'Quadro comparativo' : 'Tabela de dados');
  const source = inheritedSource || 'do autor';

  return {
    id: crypto.randomUUID(),
    type: isBox ? 'box' : 'table',
    content: '',
    meta: {
      headers,
      rows: bodyRows.length > 0 ? bodyRows : [Array(headers.length).fill('')],
      caption,
      source,
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

/**
 * Converte o HTML gerado pelo Mammoth a partir de um arquivo .docx
 * em blocos estruturados do RedijaApp, realizando match semântico de campos e referências.
 */
export function parseDocxHtmlToProject(html: string, projectName: string): DocumentProject {
  const detectedTemplate = detectDocxTemplate(html);
  const base = createProjectBaseForImport(detectedTemplate, projectName);
  const blocks: Block[] = [];
  const references: AcademicReference[] = [];

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

    // 1. Títulos (h1..h6)
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

    // Field matching de cabeçalhos pré-textuais explícitos (antes da introdução ou nos primeiros blocos)
    if (tag === 'p' && (blocks.length <= 6 || !seenFirstHeading)) {
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
      const instMetaMatch = plainText.match(
        /^(?:institui[çc][ãa]o|universidade|institution):\s*(.+)$/i,
      );
      if (instMetaMatch) {
        base.metadata.institution = instMetaMatch[1].trim();
        continue;
      }
      const courseMetaMatch = plainText.match(
        /^(?:curso|departamento|course|department):\s*(.+)$/i,
      );
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

    if (tag === 'p') {
      const srcMatch = plainText.match(/^(?:fonte|source):\s*(.+)$/i);
      const lastBlock = blocks[blocks.length - 1];
      if (srcMatch && lastBlock && (lastBlock.type === 'table' || lastBlock.type === 'box')) {
        lastBlock.meta = {
          ...lastBlock.meta,
          source: srcMatch[1].trim(),
        };
        continue;
      }

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
      let candidateCaption = '';
      const candidateSource = '';
      let isBox = false;

      const lastBlock = blocks[blocks.length - 1];
      if (lastBlock && lastBlock.type === 'paragraph') {
        const textOnly = stripHtmlTags(lastBlock.content).trim();
        if (
          /^(?:tabela|quadro|table)\s*[\d.:\-–—]/i.test(textOnly) ||
          /^(?:tabela|quadro|table)\b/i.test(textOnly)
        ) {
          candidateCaption = textOnly;
          isBox = /^quadro\b/i.test(textOnly);
          blocks.pop();
        }
      }

      const tableBlock = parseHtmlTable(innerHtml, candidateCaption, candidateSource, isBox);
      if (tableBlock) {
        blocks.push(tableBlock);
      }
      continue;
    }

    // 4. Listas
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

    // 5. Citação Direta Longa
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

    // 6. Imagem segura
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
