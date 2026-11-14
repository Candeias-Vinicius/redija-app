import {
  AcademicReference,
  Block,
  DocumentMetadata,
  DocumentProject,
  ProjectTemplateType,
} from '@/types/document';
import { createProjectFromTemplate } from '../../projectTemplates';
import { detectDocxTemplate } from '../docxParser';
import { detectLatexTemplate, parseLatexToProject } from '../latexParser';
import { detectTypstTemplate, parseTypstToProject } from '../typstParser';
import { cslToReference } from './cslToReference';
import { extractLatexMetadata } from './latexMetadata';
import {
  ConvertResponse,
  PandocBlock,
  PandocCitation,
  PandocInline,
  PandocMetaValue,
} from './types';

/* -------------------------------------------------------------------------- */
/* Utilitários de texto                                                        */
/* -------------------------------------------------------------------------- */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.:]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Texto puro de uma lista de inlines (sem marcação). */
export function inlinesToText(inlines: PandocInline[]): string {
  let out = '';
  for (const node of inlines) {
    switch (node.t) {
      case 'Str':
        out += node.c;
        break;
      case 'Space':
      case 'SoftBreak':
      case 'LineBreak':
        out += ' ';
        break;
      case 'Emph':
      case 'Underline':
      case 'Strong':
      case 'Strikeout':
      case 'Superscript':
      case 'Subscript':
      case 'SmallCaps':
        out += inlinesToText(node.c);
        break;
      case 'Quoted':
        out += `“${inlinesToText(node.c[1])}”`;
        break;
      case 'Cite':
        out += inlinesToText(node.c[1]);
        break;
      case 'Code':
        out += node.c[1];
        break;
      case 'Math':
        out += node.c[1];
        break;
      case 'Link':
      case 'Image':
        out += inlinesToText(node.c[1]);
        break;
      case 'Span':
        out += inlinesToText(node.c[1]);
        break;
      default:
        break;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

function blocksToText(blocks: PandocBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.t) {
        case 'Plain':
        case 'Para':
          return inlinesToText(b.c);
        case 'Header':
          return inlinesToText(b.c[2]);
        case 'LineBlock':
          return b.c.map(inlinesToText).join(' ');
        case 'BlockQuote':
          return blocksToText(b.c);
        case 'Div':
          return blocksToText(b.c[1]);
        case 'BulletList':
          return b.c.map(blocksToText).join(' ');
        case 'OrderedList':
          return b.c[1].map(blocksToText).join(' ');
        case 'CodeBlock':
          return b.c[1];
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n');
}

/* -------------------------------------------------------------------------- */
/* Contexto de conversão                                                       */
/* -------------------------------------------------------------------------- */

interface MapContext {
  mathTypst: Record<string, string>;
  media: Record<string, string>;
  citeKeyToRef: Map<string, AcademicReference>;
  /** Notas de rodapé e imagens encontradas dentro de inlines, emitidas após o bloco pai. */
  pendingNotes: Block[];
  pendingImages: Block[];
  format: ConvertResponse['format'];
}

const newId = () => crypto.randomUUID();

function firstAuthorSurname(ref: AcademicReference): string {
  const first = ref.authors.split(';')[0]?.trim() ?? '';
  const surname = first.split(',')[0]?.trim() ?? first;
  return surname || 'AUTOR';
}

function extractPage(suffix: PandocInline[]): string | undefined {
  const text = inlinesToText(suffix);
  const m = text.match(/(?:p{1,2}\.?\s*)?(\d+(?:\s*[-–]\s*\d+)?)/i);
  return m ? m[1].replace(/\s+/g, '') : undefined;
}

function citationToHtml(cit: PandocCitation, ctx: MapContext): string | null {
  const ref = ctx.citeKeyToRef.get(cit.citationId);
  if (!ref) return null;
  const mode = cit.citationMode.t === 'AuthorInText' ? 'narrative' : 'parenthetical';
  const page = extractPage(cit.citationSuffix);
  const label = `${firstAuthorSurname(ref)}, ${ref.year}`;
  const pageAttr = page ? ` data-cite-page="${escapeHtml(page)}"` : '';
  return `<cite data-cite-id="${ref.id}" data-cite-mode="${mode}"${pageAttr}>${escapeHtml(label)}</cite>`;
}

function mathToTypst(tex: string, ctx: MapContext): string | null {
  const converted = ctx.mathTypst[tex];
  return converted && converted.trim() ? converted.trim() : null;
}

function imageBlock(
  target: string,
  captionText: string,
  ctx: MapContext,
): Block {
  const dataUrl = ctx.media[target];
  return {
    id: newId(),
    type: 'image',
    content: '',
    meta: {
      caption: captionText || 'Figura importada',
      source: 'Arquivo importado',
      ...(dataUrl ? { imageDataUrl: dataUrl } : {}),
    },
  };
}

/** HTML inline compatível com o editor (TipTap) e com richTextToTypst. */
function inlinesToHtml(inlines: PandocInline[], ctx: MapContext): string {
  let out = '';
  for (const node of inlines) {
    switch (node.t) {
      case 'Str':
        out += escapeHtml(node.c);
        break;
      case 'Space':
      case 'SoftBreak':
        out += ' ';
        break;
      case 'LineBreak':
        out += '<br/>';
        break;
      case 'Emph':
        out += `<em>${inlinesToHtml(node.c, ctx)}</em>`;
        break;
      case 'Strong':
        out += `<strong>${inlinesToHtml(node.c, ctx)}</strong>`;
        break;
      case 'Underline':
        out += `<u>${inlinesToHtml(node.c, ctx)}</u>`;
        break;
      case 'Strikeout':
        out += `<s>${inlinesToHtml(node.c, ctx)}</s>`;
        break;
      case 'Superscript':
        out += `<sup>${inlinesToHtml(node.c, ctx)}</sup>`;
        break;
      case 'Subscript':
        out += `<sub>${inlinesToHtml(node.c, ctx)}</sub>`;
        break;
      case 'SmallCaps':
        out += inlinesToHtml(node.c, ctx);
        break;
      case 'Quoted': {
        const [open, close] = node.c[0].t === 'SingleQuote' ? ['‘', '’'] : ['“', '”'];
        out += `${open}${inlinesToHtml(node.c[1], ctx)}${close}`;
        break;
      }
      case 'Cite': {
        const rendered = node.c[0].map((cit) => citationToHtml(cit, ctx));
        if (rendered.every((r) => r !== null)) {
          out += rendered.join(' ');
        } else {
          out += inlinesToHtml(node.c[1], ctx);
        }
        break;
      }
      case 'Code':
        out += `<code>${escapeHtml(node.c[1])}</code>`;
        break;
      case 'Math': {
        const typst = mathToTypst(node.c[1], ctx);
        if (typst) {
          out += `<span data-inline-math="true" data-math="${escapeHtml(typst)}">${escapeHtml(typst)}</span>`;
        } else {
          out += `<code>${escapeHtml(node.c[1])}</code>`;
        }
        break;
      }
      case 'Link': {
        const url = node.c[2][0];
        const inner = inlinesToHtml(node.c[1], ctx);
        out += /^(https?:|mailto:)/i.test(url)
          ? `<a href="${escapeHtml(url)}">${inner}</a>`
          : inner;
        break;
      }
      case 'Image':
        ctx.pendingImages.push(imageBlock(node.c[2][0], inlinesToText(node.c[1]), ctx));
        break;
      case 'Note': {
        const noteText = blocksToHtmlInline(node.c, ctx);
        if (noteText) ctx.pendingNotes.push({ id: newId(), type: 'footnote', content: noteText });
        break;
      }
      case 'Span':
        out += inlinesToHtml(node.c[1], ctx);
        break;
      case 'RawInline':
        // Comandos LaTeX/Typst/HTML crus não são confiáveis nem renderizáveis no editor
        break;
      default:
        break;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Achata blocos simples (Para/Plain) em HTML inline, separando parágrafos com <br/>. */
function blocksToHtmlInline(blocks: PandocBlock[], ctx: MapContext): string {
  return blocks
    .map((b) => {
      if (b.t === 'Para' || b.t === 'Plain') return inlinesToHtml(b.c, ctx);
      if (b.t === 'LineBlock') return b.c.map((l) => inlinesToHtml(l, ctx)).join('<br/>');
      if (b.t === 'Div') return blocksToHtmlInline(b.c[1], ctx);
      return '';
    })
    .filter(Boolean)
    .join('<br/>');
}

function flushPending(ctx: MapContext, out: Block[]): void {
  out.push(...ctx.pendingImages, ...ctx.pendingNotes);
  ctx.pendingImages = [];
  ctx.pendingNotes = [];
}

/* -------------------------------------------------------------------------- */
/* Seções especiais (Resumo, Abstract, Referências…)                           */
/* -------------------------------------------------------------------------- */

type SpecialSection =
  | 'none'
  | 'resumo'
  | 'abstract'
  | 'references'
  | 'acknowledgments'
  | 'dedicatory'
  | 'epigraph'
  | 'skip';

const SPECIAL_HEADINGS: Record<string, SpecialSection> = {
  resumo: 'resumo',
  abstract: 'abstract',
  resumen: 'abstract',
  referencias: 'references',
  'referencias bibliograficas': 'references',
  bibliografia: 'references',
  references: 'references',
  agradecimentos: 'acknowledgments',
  agradecimento: 'acknowledgments',
  dedicatoria: 'dedicatory',
  epigrafe: 'epigraph',
  sumario: 'skip',
  'lista de figuras': 'skip',
  'lista de ilustracoes': 'skip',
  'lista de tabelas': 'skip',
  'lista de quadros': 'skip',
  'lista de abreviaturas e siglas': 'skip',
  'lista de siglas': 'skip',
  'lista de simbolos': 'skip',
};

const DIV_SECTIONS: Record<string, SpecialSection> = {
  resumo: 'resumo',
  abstract: 'abstract',
  dedicatoria: 'dedicatory',
  agradecimentos: 'acknowledgments',
  epigrafe: 'epigraph',
};

/**
 * `\begin{otherlanguage*}{english}` chega como Div cujo primeiro parágrafo começa com um Span
 * contendo o nome do idioma ("english"). Remove esse marcador.
 */
function stripLanguageMarker(div: Extract<PandocBlock, { t: 'Div' }>): PandocBlock[] {
  const [attr, blocks] = div.c;
  if (!attr[1].some((c) => /^(other|foreign)language\*?$/.test(c))) return blocks;
  const [first, ...rest] = blocks;
  if (!first || (first.t !== 'Para' && first.t !== 'Plain') || first.c[0]?.t !== 'Span') return blocks;
  let inlines = first.c.slice(1);
  while (inlines[0] && (inlines[0].t === 'SoftBreak' || inlines[0].t === 'Space')) inlines = inlines.slice(1);
  return [{ t: first.t, c: inlines }, ...rest];
}

/** Heurística simples para parágrafos de referências ABNT sem .bib: "AUTOR. Título. Local: Editora, Ano." */
function parseReferenceParagraph(text: string): AcademicReference | null {
  const clean = text.trim();
  if (clean.length < 10) return null;
  const yearMatch = clean.match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  const parts = clean.split('. ');
  // Iniciais abreviadas ("SILVA, J. A.") pertencem ao bloco de autoria
  let authorEnd = 0;
  while (authorEnd + 1 < parts.length && /^[A-ZÀ-Ý]$/.test(parts[authorEnd + 1].trim())) {
    authorEnd += 1;
  }
  const authorPart = parts.slice(0, authorEnd + 1).join('. ');
  const authors = /(?:^|[\s,])[A-ZÀ-Ý]$/.test(authorPart) ? `${authorPart}.` : authorPart;
  return {
    id: newId(),
    type: 'book',
    authors: authors.trim() || 'AUTOR DESCONHECIDO',
    title: (parts[authorEnd + 1] || clean).replace(/\.$/, '').trim(),
    year: yearMatch ? yearMatch[1] : '',
    city: '',
    publisher: '',
  };
}

const CAPTION_RE = /^(figura|imagem|gr[aá]fico|ilustra[cç][aã]o|fotografia|tabela|quadro)\s+\d+[a-z]?\s*[-–—:.]\s*(.+)$/i;
const SOURCE_RE = /^fonte\s*:\s*(.+)$/i;
const QUOTE_TAIL_RE = /\(([A-ZÀ-Ý][^,()]{1,80}),\s*(\d{4}[a-z]?)(?:,\s*p{1,2}\.\s*([\d\s–-]+))?\)\s*\.?\s*$/;

/* -------------------------------------------------------------------------- */
/* Conversão de blocos                                                         */
/* -------------------------------------------------------------------------- */

interface ExtractedSections {
  resumo: string[];
  abstract: string[];
  keywords: string[] | null;
  foreignKeywords: string[] | null;
  acknowledgments: string[];
  dedicatory: string[];
  epigraph: string[];
  referenceParagraphs: string[];
}

class BlockMapper {
  private readonly out: Block[] = [];
  private section: SpecialSection = 'none';
  readonly sections: ExtractedSections = {
    resumo: [],
    abstract: [],
    keywords: null,
    foreignKeywords: null,
    acknowledgments: [],
    dedicatory: [],
    epigraph: [],
    referenceParagraphs: [],
  };
  private readonly ctx: MapContext;

  constructor(ctx: MapContext) {
    this.ctx = ctx;
  }

  get blocks(): Block[] {
    return this.out;
  }

  private emit(block: Block): void {
    this.out.push(block);
    flushPending(this.ctx, this.out);
  }

  private parseKeywords(text: string, re: RegExp): string[] | null {
    const m = text.match(re);
    if (!m) return null;
    return m[1]
      .split(/[;,.]/)
      .map((k) => k.trim())
      .filter(Boolean);
  }

  /** Captura conteúdo de seções especiais; devolve true se o bloco foi consumido. */
  private captureSpecial(block: PandocBlock): boolean {
    if (this.section === 'none') return false;
    if (this.section === 'skip') return true;
    if (block.t === 'Div') {
      for (const inner of stripLanguageMarker(block)) this.captureSpecial(inner);
      return true;
    }
    const text = blocksToText([block]);
    if (!text) return true;

    switch (this.section) {
      case 'resumo': {
        const kw = this.parseKeywords(text, /^palavras[- ]chave\s*:\s*(.+)$/i);
        if (kw) this.sections.keywords = kw;
        else this.sections.resumo.push(text);
        return true;
      }
      case 'abstract': {
        const kw = this.parseKeywords(text, /^(?:keywords|key-words|index terms|palabras clave)\s*:\s*(.+)$/i);
        if (kw) this.sections.foreignKeywords = kw;
        else this.sections.abstract.push(text);
        return true;
      }
      case 'references':
        if (block.t === 'Para' || block.t === 'Plain') {
          this.sections.referenceParagraphs.push(text);
          return true;
        }
        return true;
      case 'acknowledgments':
        this.sections.acknowledgments.push(text);
        return true;
      case 'dedicatory':
        this.sections.dedicatory.push(text);
        return true;
      case 'epigraph':
        this.sections.epigraph.push(text);
        return true;
      default:
        return false;
    }
  }

  processBlocks(blocks: PandocBlock[]): void {
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      if (block.t === 'Header') {
        const title = inlinesToText(block.c[2]);
        const special = SPECIAL_HEADINGS[normalizeKey(title)];
        if (special) {
          this.section = special;
          // Mantém o título "Referências" fora do corpo: o gerador já cria a seção
          continue;
        }
        this.section = 'none';
        this.processHeader(block.c[0], block.c[1], block.c[2]);
        continue;
      }

      if (this.captureSpecial(block)) continue;

      // Legenda ABNT acima da figura/tabela ("Figura 1 – Título") seguida do elemento
      if (block.t === 'Para' || block.t === 'Plain') {
        const text = inlinesToText(block.c);
        const captionMatch = text.match(CAPTION_RE);
        const next = blocks[i + 1];
        const nextCanHoldCaption =
          next && (next.t === 'Figure' || next.t === 'Table' || next.t === 'Para' || next.t === 'Plain');
        if (captionMatch && nextCanHoldCaption) {
          const before = this.out.length;
          this.processBlock(next);
          const produced = this.out.slice(before);
          const target = produced.find((b) => b.type === 'image' || b.type === 'table');
          if (target) {
            target.meta = { ...target.meta, caption: captionMatch[2].trim() };
            if (target.type === 'table' && /^quadro/i.test(captionMatch[1])) target.type = 'box';
            i += 1;
            i = this.consumeSourceLine(blocks, i, target);
            continue;
          }
          // Não era legenda: desfaz e trata como parágrafo comum
          this.out.splice(before);
        }
      }

      const before = this.out.length;
      this.processBlock(block);
      const last = this.out.slice(before).find((b) => b.type === 'image' || b.type === 'table');
      if (last) i = this.consumeSourceLine(blocks, i, last);
    }
  }

  /** Se o próximo parágrafo for "Fonte: ...", grava na figura/tabela e o consome. */
  private consumeSourceLine(blocks: PandocBlock[], index: number, target: Block): number {
    const next = blocks[index + 1];
    if (next && (next.t === 'Para' || next.t === 'Plain')) {
      const m = inlinesToText(next.c).match(SOURCE_RE);
      if (m) {
        target.meta = { ...target.meta, source: m[1].replace(/\.$/, '').trim() };
        return index + 1;
      }
    }
    return index;
  }

  private processHeader(level: number, attr: [string, string[], unknown], inlines: PandocInline[]): void {
    const plain = inlinesToText(inlines);
    if (!plain) return;
    const unnumbered = attr[1].includes('unnumbered');
    const type: Block['type'] = unnumbered
      ? 'unnumbered_heading'
      : (`h${Math.min(Math.max(level, 1), 5)}` as Block['type']);
    // Títulos guardam texto puro no Redija
    this.emit({ id: newId(), type, content: plain });
  }

  private processParagraph(inlines: PandocInline[]): void {
    // Divide o parágrafo em torno de equações em destaque
    let current: PandocInline[] = [];
    const flushParagraph = () => {
      const html = inlinesToHtml(current, this.ctx);
      if (html) this.out.push({ id: newId(), type: 'paragraph', content: `<p>${html}</p>` });
      flushPending(this.ctx, this.out);
      current = [];
    };

    for (const node of inlines) {
      if (node.t === 'Math' && node.c[0].t === 'DisplayMath') {
        flushParagraph();
        const typst = mathToTypst(node.c[1], this.ctx);
        if (typst) {
          this.out.push({ id: newId(), type: 'equation', content: typst, meta: { equationNumbered: true } });
        } else {
          this.out.push({ id: newId(), type: 'code', content: node.c[1], meta: { language: 'latex' } });
        }
        continue;
      }
      current.push(node);
    }
    flushParagraph();
  }

  private processList(items: PandocBlock[][], type: 'bullet' | 'numbered'): void {
    for (const item of items) {
      const [first, ...rest] = item;
      if (first && (first.t === 'Plain' || first.t === 'Para')) {
        const html = inlinesToHtml(first.c, this.ctx);
        if (html) this.emit({ id: newId(), type, content: html });
        else flushPending(this.ctx, this.out);
        this.processBlocks(rest);
      } else {
        this.processBlocks(item);
      }
    }
  }

  private processQuote(blocks: PandocBlock[]): void {
    let html = blocksToHtmlInline(blocks, this.ctx);
    if (!html) return;
    const meta: Block['meta'] = {};

    // Citação com referência explícita ao final: "(SILVA, 2020, p. 12)"
    const tail = html.match(QUOTE_TAIL_RE);
    if (tail) {
      meta.author = tail[1].trim();
      meta.year = tail[2];
      if (tail[3]) meta.page = tail[3].replace(/\s+/g, '');
      html = html.slice(0, tail.index).trim();
    } else {
      const citeId = html.match(/data-cite-id="([^"]+)"/)?.[1];
      const ref = citeId ? [...this.ctx.citeKeyToRef.values()].find((r) => r.id === citeId) : undefined;
      if (ref) {
        meta.author = firstAuthorSurname(ref);
        meta.year = ref.year;
        const page = html.match(/data-cite-page="([^"]+)"/)?.[1];
        if (page) meta.page = page;
      }
    }
    this.emit({ id: newId(), type: 'quote_long', content: html, meta });
  }

  private processTable(block: Extract<PandocBlock, { t: 'Table' }>): void {
    const [, caption, , head, bodies] = block.c;
    const rowText = (row: [unknown, [unknown, unknown, number, number, PandocBlock[]][]]) =>
      row[1].map((cell) => blocksToText(cell[4]).replace(/\n/g, ' '));

    const headRows = head[1].map((r) => rowText(r));
    const bodyRows = bodies.flatMap((b) => [...b[2], ...b[3]].map((r) => rowText(r)));
    let headers = headRows[0] ?? [];
    let rows = bodyRows;
    if (headers.length === 0 && rows.length > 0) {
      headers = rows[0];
      rows = rows.slice(1);
    }
    if (headers.length === 0) return;

    const captionText = blocksToText(caption[1]);
    const captionMatch = captionText.match(CAPTION_RE);
    this.emit({
      id: newId(),
      type: captionMatch && /^quadro/i.test(captionMatch[1]) ? 'box' : 'table',
      content: '',
      meta: {
        headers,
        rows: rows.map((r) => headers.map((_, idx) => r[idx] ?? '')),
        caption: (captionMatch ? captionMatch[2] : captionText) || 'Tabela importada',
        source: 'Arquivo importado',
      },
    });
  }

  private processBlock(block: PandocBlock): void {
    switch (block.t) {
      case 'Para':
      case 'Plain':
        this.processParagraph(block.c);
        return;
      case 'LineBlock': {
        const html = block.c.map((l) => inlinesToHtml(l, this.ctx)).join('<br/>');
        if (html) this.emit({ id: newId(), type: 'paragraph', content: `<p>${html}</p>` });
        return;
      }
      case 'Header':
        this.processHeader(block.c[0], block.c[1], block.c[2]);
        return;
      case 'BulletList':
        this.processList(block.c, 'bullet');
        return;
      case 'OrderedList':
        this.processList(block.c[1], 'numbered');
        return;
      case 'DefinitionList':
        for (const [term, defs] of block.c) {
          const termHtml = inlinesToHtml(term, this.ctx);
          const defHtml = defs.map((d) => blocksToHtmlInline(d, this.ctx)).join(' ');
          this.emit({
            id: newId(),
            type: 'paragraph',
            content: `<p><strong>${termHtml}</strong>: ${defHtml}</p>`,
          });
        }
        return;
      case 'BlockQuote':
        this.processQuote(block.c);
        return;
      case 'CodeBlock': {
        const lang = block.c[0][1][0];
        this.emit({
          id: newId(),
          type: 'code',
          content: block.c[1],
          meta: lang ? { language: lang } : undefined,
        });
        return;
      }
      case 'Table':
        this.processTable(block);
        return;
      case 'Figure': {
        const [, caption, content] = block.c;
        const captionText = blocksToText(caption[1]);
        const before = this.out.length;
        this.processBlocks(content);
        const img = this.out.slice(before).find((b) => b.type === 'image' || b.type === 'table');
        if (img && captionText) {
          const m = captionText.match(CAPTION_RE);
          img.meta = { ...img.meta, caption: m ? m[2] : captionText };
        }
        return;
      }
      case 'Div': {
        const classes = block.c[0][1];
        if (classes.includes('citacao')) {
          this.processQuote(block.c[1]);
          return;
        }
        const divSection = classes.map((c) => DIV_SECTIONS[c]).find(Boolean);
        if (divSection) {
          const previous = this.section;
          // abntex2: o segundo ambiente "resumo" costuma ser o resumo em língua estrangeira
          this.section =
            divSection === 'resumo' && this.sections.resumo.length > 0 ? 'abstract' : divSection;
          for (const inner of block.c[1]) {
            if (inner.t === 'Header') continue;
            this.captureSpecial(inner);
          }
          this.section = previous;
          return;
        }
        this.processBlocks(stripLanguageMarker(block));
        return;
      }
      case 'RawBlock': {
        const [fmt, raw] = block.c;
        if (fmt === 'typst' && raw.trim()) {
          this.emit({ id: newId(), type: 'raw_typst', content: raw.trim() });
        } else if (fmt === 'latex' && /\\(?:newpage|clearpage|pagebreak)\b/.test(raw)) {
          this.emit({ id: newId(), type: 'pagebreak', content: '' });
        }
        return;
      }
      case 'HorizontalRule':
      default:
        return;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Metadados                                                                   */
/* -------------------------------------------------------------------------- */

function metaToText(value: PandocMetaValue | undefined): string {
  if (!value) return '';
  switch (value.t) {
    case 'MetaString':
      return value.c.trim();
    case 'MetaInlines':
      return inlinesToText(value.c);
    case 'MetaBlocks':
      return blocksToText(value.c);
    case 'MetaBool':
      return '';
    case 'MetaList':
      return value.c.map(metaToText).filter(Boolean).join('; ');
    case 'MetaMap':
      return metaToText(value.c.name ?? value.c.nome);
    default:
      return '';
  }
}

function metaToList(value: PandocMetaValue | undefined): string[] {
  if (!value) return [];
  if (value.t === 'MetaList') return value.c.map(metaToText).filter(Boolean);
  return metaToText(value)
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const META_KEYS: Record<string, (keyof DocumentMetadata)[]> = {
  title: ['title'],
  titulo: ['title'],
  subtitle: ['subtitle'],
  subtitulo: ['subtitle'],
  author: ['author'],
  autor: ['author'],
  autores: ['author'],
  advisor: ['advisor'],
  orientador: ['advisor'],
  orientadora: ['advisor'],
  coorientador: ['coadvisor'],
  institution: ['institution'],
  institute: ['institution'],
  instituicao: ['institution'],
  course: ['course'],
  curso: ['course'],
  location: ['location'],
  local: ['location'],
  abstract: ['abstract'],
  resumo: ['abstract'],
};

function metadataFromAst(meta: Record<string, PandocMetaValue>): {
  fields: Partial<DocumentMetadata>;
  keywords: string[];
} {
  const fields: Partial<DocumentMetadata> = {};
  for (const [rawKey, value] of Object.entries(meta)) {
    const key = normalizeKey(rawKey);
    const targets = META_KEYS[key];
    if (targets) {
      const text = metaToText(value);
      if (text) for (const t of targets) (fields as Record<string, string>)[t] = text;
    }
  }
  const dateText = metaToText(meta.date ?? meta.data ?? meta.ano ?? meta.year);
  const year = dateText.match(/\b(1[5-9]\d{2}|20\d{2})\b/)?.[1];
  if (year) fields.year = year;

  const keywords = metaToList(meta.keywords ?? meta['palavras-chave'] ?? meta.palavraschave);
  return { fields, keywords };
}

/* -------------------------------------------------------------------------- */
/* Projeto base (template + metadados do preâmbulo)                            */
/* -------------------------------------------------------------------------- */

function baseProjectFor(response: ConvertResponse, projectName: string, plainText: string): DocumentProject {
  const source = response.mainSource ?? '';
  try {
    if (response.format === 'latex' && source) {
      // Reaproveita a extração de metadados do abntex2 (\orientador, \instituicao, …) do parser legado
      return parseLatexToProject(source, projectName, new Map());
    }
    if (response.format === 'typst' && source) {
      return parseTypstToProject(source, projectName, new Map());
    }
  } catch {
    // Cai para a detecção simples abaixo
  }

  let template: ProjectTemplateType;
  if (response.format === 'latex') template = detectLatexTemplate(source);
  else if (response.format === 'typst') template = detectTypstTemplate(source);
  else template = detectDocxTemplate(plainText);
  return createProjectFromTemplate(template, projectName);
}

/**
 * Campos de conteúdo que o modelo preenche com texto de exemplo ("Estudo experimental ou revisão
 * sistemática…"). Se o documento importado não trouxe valor próprio, o exemplo não deve virar
 * conteúdo do trabalho. Campos de identificação (autor, orientador, instituição) ficam como
 * estão, pois funcionam como lembrete do que preencher na capa.
 */
const CONTENT_PLACEHOLDER_FIELDS = [
  'subtitle',
  'nature',
  'abstract',
  'keywords',
  'foreignAbstract',
  'foreignKeywords',
  'dedicatory',
  'acknowledgments',
  'epigraph',
  'epigraphAuthor',
] as const;

function clearTemplatePlaceholders(metadata: DocumentMetadata, template?: ProjectTemplateType): void {
  const defaults = createProjectFromTemplate(template ?? 'tcc').metadata;
  const record = metadata as unknown as Record<string, unknown>;
  const defaultRecord = defaults as unknown as Record<string, unknown>;
  for (const field of CONTENT_PLACEHOLDER_FIELDS) {
    const current = record[field];
    if (current === undefined || JSON.stringify(current) !== JSON.stringify(defaultRecord[field])) continue;
    record[field] = Array.isArray(current) ? [] : '';
  }
}

/* -------------------------------------------------------------------------- */
/* Ponto de entrada                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Converte a resposta do serviço de importação (AST do Pandoc + mídia + bibliografia)
 * em um DocumentProject do Redija.
 */
export function pandocResponseToProject(response: ConvertResponse, projectName: string): DocumentProject {
  const bibRefs = (response.bibliography ?? []).map((item) => ({ key: item.id, ref: cslToReference(item) }));
  const citeKeyToRef = new Map(bibRefs.map(({ key, ref }) => [key, ref]));

  const ctx: MapContext = {
    mathTypst: response.mathTypst ?? {},
    media: response.media ?? {},
    citeKeyToRef,
    pendingNotes: [],
    pendingImages: [],
    format: response.format,
  };

  const mapper = new BlockMapper(ctx);
  mapper.processBlocks(response.ast.blocks ?? []);
  const blocks = mapper.blocks;
  const { sections } = mapper;

  const astMeta = metadataFromAst(response.ast.meta ?? {});
  const plainText = [astMeta.fields.title ?? '', blocksToText(response.ast.blocks ?? [])].join('\n');
  const base = baseProjectFor(response, projectName, plainText);
  const sourceMeta =
    response.format === 'latex' && response.mainSource ? extractLatexMetadata(response.mainSource) : {};

  const metadata: DocumentMetadata = { ...base.metadata, ...sourceMeta, ...astMeta.fields };
  if (sections.resumo.length > 0) {
    metadata.abstract = sections.resumo.join('\n');
    if (sections.abstract.length > 0) metadata.foreignAbstract = sections.abstract.join('\n');
  } else if (sections.abstract.length > 0) {
    if (astMeta.fields.abstract) metadata.foreignAbstract = sections.abstract.join('\n');
    else metadata.abstract = sections.abstract.join('\n');
  }
  if (sections.keywords?.length) metadata.keywords = sections.keywords;
  else if (astMeta.keywords.length > 0) metadata.keywords = astMeta.keywords;
  if (sections.foreignKeywords?.length) metadata.foreignKeywords = sections.foreignKeywords;
  if (sections.acknowledgments.length > 0) metadata.acknowledgments = sections.acknowledgments.join('\n');
  if (sections.dedicatory.length > 0) metadata.dedicatory = sections.dedicatory.join('\n');
  if (sections.epigraph.length > 0) metadata.epigraph = sections.epigraph.join('\n');

  // Word/Markdown sem estilo "Título": usa o primeiro h1 como título do trabalho
  if (!astMeta.fields.title && (response.format === 'docx' || response.format === 'markdown')) {
    const firstH1 = blocks.find((b) => b.type === 'h1');
    if (firstH1) metadata.title = firstH1.content;
  }

  clearTemplatePlaceholders(metadata, base.templateType);

  let references: AcademicReference[] = bibRefs.map(({ ref }) => ref);
  if (references.length === 0) {
    references = sections.referenceParagraphs
      .map(parseReferenceParagraph)
      .filter((r): r is AcademicReference => r !== null);
  }
  if (references.length === 0 && (response.format === 'latex' || response.format === 'typst')) {
    references = base.references;
  }

  return {
    ...base,
    name: projectName,
    metadata,
    blocks: blocks.length > 0 ? blocks : base.blocks,
    references,
    updatedAt: new Date().toISOString(),
  };
}
