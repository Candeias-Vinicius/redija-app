import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { config } from './config.ts';
import { runPandoc } from './pandoc.ts';
import { findUnsafeLatexIncludes, findUnsafeTypstIncludes, resolveInside } from './pathSafety.ts';
import { ImportError, safeUnzip } from './zip.ts';

export type SourceFormat = 'docx' | 'latex' | 'markdown' | 'typst';

/**
 * Contrato da resposta de POST /convert. O front (src/core/storage/importer/pandoc/types.ts)
 * mantém uma cópia deste tipo — altere os dois juntos.
 */
export interface ConvertResponse {
  /** Formato de origem detectado para o arquivo principal. */
  format: SourceFormat;
  /** Caminho (relativo ao upload) do arquivo principal convertido. */
  mainFile: string;
  /** AST JSON do Pandoc (`pandoc -t json`). */
  ast: unknown;
  /** Equações: TeX original (como aparece no AST) → sintaxe matemática Typst. */
  mathTypst: Record<string, string>;
  /** Imagens referenciadas no AST: alvo do `Image` → data URL. */
  media: Record<string, string>;
  /** Entradas CSL-JSON extraídas de arquivos .bib do upload. */
  bibliography: unknown[];
  /** Fonte do arquivo principal (LaTeX/Typst) para extração de metadados de template no front. */
  mainSource?: string;
  warnings: string[];
}

const PANDOC_READER: Record<SourceFormat, string> = {
  docx: 'docx',
  latex: 'latex',
  markdown: 'markdown',
  typst: 'typst',
};

const EXT_TO_FORMAT: Record<string, SourceFormat> = {
  '.docx': 'docx',
  '.tex': 'latex',
  '.latex': 'latex',
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.typ': 'typst',
};

const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

export function formatFromFileName(name: string): SourceFormat | 'zip' | null {
  const ext = path.extname(name).toLowerCase();
  if (ext === '.zip') return 'zip';
  return EXT_TO_FORMAT[ext] ?? null;
}

/** Escolhe o arquivo principal de um projeto descompactado (Overleaf, Typst, Markdown ou Word). */
export function pickMainFile(files: string[], readText: (f: string) => string): string | null {
  const byDepth = (a: string, b: string) => a.split('/').length - b.split('/').length || a.localeCompare(b);
  const ofExt = (exts: string[]) =>
    files.filter((f) => exts.includes(path.extname(f).toLowerCase())).sort(byDepth);

  const texFiles = ofExt(['.tex', '.latex']);
  const preferName = (list: string[]) =>
    list.find((f) => /^(main|documento|tese|tcc|monografia|dissertacao)\.tex$/i.test(path.basename(f))) ?? list[0];
  // O principal é quem tem \begin{document}; o \documentclass pode estar num preâmbulo incluído via \input
  const texWithBody = texFiles.filter((f) => /^[^%\n]*\\begin\s*\{document\}/m.test(readText(f)));
  if (texWithBody.length > 0) {
    const withClass = texWithBody.filter((f) => /\\documentclass\b/.test(readText(f)));
    return preferName(withClass.length > 0 ? withClass : texWithBody);
  }
  const texWithClass = texFiles.filter((f) => /\\documentclass\b/.test(readText(f)));
  if (texWithClass.length > 0) return preferName(texWithClass);

  const typFiles = ofExt(['.typ']);
  if (typFiles.length > 0) {
    const preferred = typFiles.find((f) => /^(main|documento|tese|tcc)\.typ$/i.test(path.basename(f)));
    return preferred ?? typFiles.find((f) => /^#(show|set)\b/m.test(readText(f))) ?? typFiles[0];
  }

  const mdFiles = ofExt(['.md', '.markdown']);
  if (mdFiles.length > 0) {
    return mdFiles.find((f) => !/^readme\.md$/i.test(path.basename(f))) ?? mdFiles[0];
  }

  const docxFiles = ofExt(['.docx']);
  if (docxFiles.length > 0) return docxFiles[0];

  return texFiles[0] ?? null;
}

/**
 * Remove imports de pacotes do Typst Universe e o `#show: template.with(...)` correspondente:
 * o leitor Typst do Pandoc não baixa pacotes e falharia ao avaliá-los. Os metadados do template
 * continuam disponíveis no front via `mainSource`.
 */
export function stripTypstTemplateWrappers(source: string): string {
  let out = source.replace(/^[ \t]*#import\s+"@[^"]+"[^\n]*$/gm, '');
  const showRe = /#show:\s*[\w.-]+\.with\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = showRe.exec(out)) !== null) {
    let depth = 1;
    let i = m.index + m[0].length;
    let inString = false;
    for (; i < out.length && depth > 0; i++) {
      const ch = out[i];
      if (inString) {
        if (ch === '\\') i++;
        else if (ch === '"') inString = false;
      } else if (ch === '"') inString = true;
      else if (ch === '(') depth++;
      else if (ch === ')') depth--;
    }
    out = out.slice(0, m.index) + out.slice(i);
    showRe.lastIndex = m.index;
  }
  return out;
}

/**
 * Macros do abntex2 que o Pandoc descarta. Definidas com \providecommand para que uma definição
 * do próprio documento prevaleça. Viram parágrafos "Fonte: …" que o front associa à figura/tabela.
 */
export const LATEX_PRELUDE = [
  '\\providecommand{\\legend}[1]{\\par #1\\par}',
  '\\providecommand{\\fonte}[1]{\\par Fonte: #1\\par}',
  '\\providecommand{\\nota}[1]{\\par Nota: #1\\par}',
  // abntex2cite → comandos natbib que o Pandoc reconhece como citação
  '\\providecommand{\\citeonline}[2][]{\\citet[#1]{#2}}',
  '\\providecommand{\\citeauthoronline}[1]{\\citeauthor{#1}}',
  '\\providecommand{\\apud}[3][]{\\citep{#2} apud \\citep[#1]{#3}}',
  '\\providecommand{\\apudonline}[3][]{\\citet{#2} apud \\citet[#1]{#3}}',
].join('\n');

const BRACED_ARG = String.raw`\{(?:[^{}]|\{[^{}]*\})*\}`;
const TABLE_ENV = /\\begin\{table\*?\}[\s\S]*?\\end\{table\*?\}/g;
const TABLE_NOTE = new RegExp(String.raw`\\(?:fonte|legend|nota)\s*(?:\[[^\]]*\])?\s*${BRACED_ARG}`, 'g');

/**
 * Reescreve ambientes do abntex2 que o Pandoc não entende para equivalentes que ele entende,
 * envolvidos num ambiente marcador que vira `Div` com a classe correspondente no AST:
 * - `siglas`/`simbolos` (listas com `\item[SIGLA]`) → `description` dentro de `redijasiglas`/`redijasimbolos`
 * - `quadro` → `table` dentro de `redijaquadro` (o front marca a tabela como Quadro)
 * - `longtable` dentro de floats → `tabular`, para a legenda (`\caption`) não se perder
 */
export function normalizeAbntexEnvironments(source: string): string {
  let out = source
    .replace(/\\begin\{(siglas|simbolos)\}/g, '\\begin{redija$1}\\begin{description}')
    .replace(/\\end\{(siglas|simbolos)\}/g, '\\end{description}\\end{redija$1}')
    .replace(/\\begin\{quadro\}(\s*\[[^\]]*\])?/g, '\\begin{redijaquadro}\\begin{table}$1')
    .replace(/\\end\{quadro\}/g, '\\end{table}\\end{redijaquadro}')
    // \setlength antes do primeiro \item impede o Pandoc de reconhecer a lista
    .replace(/\\setlength\s*\{\\(?:parskip|itemsep|parsep|topsep)\}\s*\{[^}]*\}/g, '')
    // Linha-modelo de tabulação (`xxxx \= xxxx \kill`) do ambiente tabbing não é conteúdo
    .replace(/^[^\n%]*\\kill[ \t]*$/gm, '');

  out = out.replace(TABLE_ENV, (env) =>
    env
      .replace(/\\(begin|end)\{longtable\}/g, '\\$1{tabular}')
      .replace(/\\end(?:firsthead|head|foot|lastfoot)\b/g, ''),
  );
  return out;
}

/** Nomes pelos quais os .sty enviados no upload podem ser carregados (`style/ucsal` e `ucsal`). */
export function localPackageNames(files: string[]): Set<string> {
  const names = new Set<string>();
  for (const f of files) {
    if (!/\.sty$/i.test(f)) continue;
    const withoutExt = f.replace(/\.sty$/i, '');
    names.add(withoutExt.toLowerCase());
    names.add(path.posix.basename(withoutExt).toLowerCase());
  }
  return names;
}

/** Remove `\usepackage`/`\RequirePackage` de pacotes locais, mantendo os demais da mesma lista. */
export function removeLocalPackages(source: string, localNames: Set<string>): string {
  if (localNames.size === 0) return source;
  return source.replace(
    /\\(usepackage|RequirePackage)\s*(\[[^\]]*\])?\s*\{([^}]*)\}/g,
    (whole, cmd: string, opts: string | undefined, list: string) => {
      const kept = list
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n && !localNames.has(n.replace(/\.sty$/i, '').toLowerCase()));
      if (kept.length === list.split(',').filter((n) => n.trim()).length) return whole;
      return kept.length > 0 ? `\\${cmd}${opts ?? ''}{${kept.join(',')}}` : '';
    },
  );
}

/** Remove comentários LaTeX (`% …` até o fim da linha), preservando `\%`. */
export function stripLatexComments(source: string): string {
  return source.replace(/(^|[^\\])%.*$/gm, '$1');
}

/**
 * O leitor LaTeX do Pandoc só aproveita o `tabular` e a legenda de um ambiente `table`.
 * Move `\fonte{}`, `\legend{}` e `\nota{}` para logo depois do `\end{table}` para não perdê-los.
 * Tabelas comentadas (`%\begin{table}`) ficam intocadas.
 */
export function moveTableNotesOutside(source: string): string {
  return source.replace(TABLE_ENV, (env, offset: number) => {
    const lineStart = source.lastIndexOf('\n', offset - 1) + 1;
    if (source.slice(lineStart, offset).includes('%')) return env;
    const clean = stripLatexComments(env);
    const notes = clean.match(TABLE_NOTE);
    if (!notes) return env;
    return `${clean.replace(TABLE_NOTE, '')}\n${notes.join('\n')}\n`;
  });
}

type JsonNode ={ t?: string; c?: unknown } & Record<string, unknown>;

/**
 * Monta o preâmbulo do documento principal com os `\input`/`\include` expandidos (sem comentários),
 * para que o front encontre \titulo, \autor, \orientador… mesmo quando estão em arquivos separados
 * (ex.: `configuracoes/metadados.tex`). Só o trecho antes de `\begin{document}` é expandido.
 */
export function expandLatexPreamble(mainFile: string, readText: (f: string) => string | undefined): string {
  const mainDir = path.posix.dirname(mainFile);
  const stripComments = stripLatexComments;
  const resolve = (name: string): string | undefined => {
    const clean = name.trim().replace(/^"|"$/g, '');
    const base = path.posix.normalize(path.posix.join(mainDir === '.' ? '' : mainDir, clean));
    for (const candidate of [base, `${base}.tex`]) {
      if (readText(candidate) !== undefined) return candidate;
    }
    return undefined;
  };

  const seen = new Set<string>();
  const expand = (text: string, depth: number): string =>
    stripComments(text).replace(/\\(?:input|include)\s*\{([^}]+)\}/g, (_whole, name: string) => {
      const target = resolve(name);
      if (!target || seen.has(target) || depth > 8) return '';
      seen.add(target);
      return `\n${expand(readText(target) ?? '', depth + 1)}\n`;
    });

  const main = readText(mainFile) ?? '';
  const bodyStart = main.search(/\\begin\s*\{document\}/);
  const preamble = bodyStart >= 0 ? main.slice(0, bodyStart) : main;
  return `${expand(preamble, 0)}\n${bodyStart >= 0 ? main.slice(bodyStart) : ''}`;
}

/** Percorre o AST e chama `visit` em cada nó `{t, c}`. */
function walkAst(node: unknown, visit: (n: JsonNode) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walkAst(child, visit);
    return;
  }
  if (node && typeof node === 'object') {
    const obj = node as JsonNode;
    if (typeof obj.t === 'string') visit(obj);
    for (const value of Object.values(obj)) {
      if (value && typeof value === 'object') walkAst(value, visit);
    }
  }
}

function collectMathAndImages(ast: unknown): { math: string[]; images: string[] } {
  const math = new Set<string>();
  const images = new Set<string>();
  walkAst(ast, (n) => {
    if (n.t === 'Math' && Array.isArray(n.c) && typeof n.c[1] === 'string') {
      math.add(n.c[1]);
    } else if (n.t === 'Image' && Array.isArray(n.c)) {
      const target = n.c[2];
      if (Array.isArray(target) && typeof target[0] === 'string') images.add(target[0]);
    }
  });
  return { math: [...math], images: [...images] };
}

const MATH_SEPARATOR = 'REDIJAMATHSEP';

/**
 * Converte todas as equações TeX do documento para Typst numa única chamada ao Pandoc
 * (writer `typst`, que usa o texmath), separando-as por marcadores.
 */
async function convertMathToTypst(
  expressions: string[],
  apiVersion: unknown,
  cwd: string,
): Promise<Record<string, string>> {
  if (expressions.length === 0) return {};
  const blocks = expressions.flatMap((tex, i) => [
    { t: 'Para', c: [{ t: 'Str', c: `${MATH_SEPARATOR}${i}` }] },
    { t: 'Para', c: [{ t: 'Math', c: [{ t: 'InlineMath' }, tex] }] },
  ]);
  const doc = { 'pandoc-api-version': apiVersion, meta: {}, blocks };
  const out = await runPandoc(['-f', 'json', '-t', 'typst', '--wrap=none'], {
    cwd,
    stdin: JSON.stringify(doc),
  });

  const result: Record<string, string> = {};
  const parts = out.split(new RegExp(`^${MATH_SEPARATOR}(\\d+)\\s*$`, 'm'));
  // parts = [antes, idx0, conteúdo0, idx1, conteúdo1, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const idx = Number(parts[i]);
    let body = (parts[i + 1] ?? '').trim();
    if (body.startsWith('$') && body.endsWith('$') && body.length >= 2) body = body.slice(1, -1).trim();
    if (expressions[idx] !== undefined && body) result[expressions[idx]] = body;
  }
  return result;
}

async function listFilesRecursive(root: string, rel = ''): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(path.join(root, rel), { withFileTypes: true })) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await listFilesRecursive(root, childRel)));
    else if (entry.isFile()) out.push(childRel);
  }
  return out;
}

const IMAGE_FALLBACK_EXTS = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'];

async function loadMedia(
  targets: string[],
  mainDir: string,
  root: string,
  allFiles: string[],
  warnings: string[],
): Promise<Record<string, string>> {
  const byBase = new Map<string, string>();
  for (const f of allFiles) {
    const base = path.basename(f).toLowerCase();
    byBase.set(base, f);
    byBase.set(base.replace(/\.[^.]+$/, ''), f);
  }

  const media: Record<string, string> = {};
  let total = 0;
  for (const target of targets) {
    if (/^(https?:|data:)/i.test(target)) continue;
    const clean = decodeURIComponent(target.split('#')[0].split('?')[0]);
    const candidates: string[] = [];
    const relToRoot = path.posix.normalize(path.posix.join(path.relative(root, mainDir).split(path.sep).join('/'), clean));
    candidates.push(relToRoot);
    if (!path.extname(clean)) candidates.push(...IMAGE_FALLBACK_EXTS.map((e) => relToRoot + e));
    const viaBase = byBase.get(path.basename(clean).toLowerCase());
    if (viaBase) candidates.push(viaBase);

    let found: string | null = null;
    for (const c of candidates) {
      const abs = resolveInside(root, c);
      if (!abs) continue;
      try {
        if ((await stat(abs)).isFile()) {
          found = abs;
          break;
        }
      } catch {
        // tenta o próximo candidato
      }
    }
    if (!found) {
      warnings.push(`Imagem não encontrada no upload: ${clean}`);
      continue;
    }
    const mime = IMAGE_MIME[path.extname(found).toLowerCase()];
    if (!mime) {
      warnings.push(`Formato de imagem não suportado no editor (converta para PNG/JPG): ${clean}`);
      continue;
    }
    const bytes = await readFile(found);
    if (bytes.byteLength > config.maxImageBytes || total + bytes.byteLength > config.maxTotalMediaBytes) {
      warnings.push(`Imagem ignorada por exceder o limite de tamanho: ${clean}`);
      continue;
    }
    total += bytes.byteLength;
    media[target] = `data:${mime};base64,${bytes.toString('base64')}`;
  }
  return media;
}

async function convertBibliographies(bibFiles: string[], root: string, warnings: string[]): Promise<unknown[]> {
  const entries: unknown[] = [];
  for (const bib of bibFiles) {
    try {
      const out = await runPandoc(['-f', 'bibtex', '-t', 'csljson', path.basename(bib)], {
        cwd: path.dirname(path.join(root, bib)),
      });
      const parsed = JSON.parse(out) as unknown;
      if (Array.isArray(parsed)) entries.push(...parsed);
    } catch {
      warnings.push(`Não foi possível ler a bibliografia ${bib}.`);
    }
  }
  return entries;
}

/**
 * Converte um upload (arquivo único ou .zip) para o AST do Pandoc + mídia + bibliografia.
 * Trabalha numa pasta temporária exclusiva, apagada ao final.
 */
export async function convertUpload(fileName: string, bytes: Uint8Array): Promise<ConvertResponse> {
  const uploadFormat = formatFromFileName(fileName);
  if (!uploadFormat) {
    throw new ImportError('Formato não suportado. Envie .docx, .tex, .md, .typ ou .zip.', 415);
  }

  const root = await mkdtemp(path.join(os.tmpdir(), 'redija-import-'));
  try {
    let files: string[];
    if (uploadFormat === 'zip') {
      files = await safeUnzip(bytes, root, {
        maxEntries: config.maxZipEntries,
        maxUnzippedBytes: config.maxUnzippedBytes,
      });
    } else {
      const safeName = `documento${path.extname(fileName).toLowerCase()}`;
      await writeFile(path.join(root, safeName), bytes);
      files = [safeName];
    }

    const textCache = new Map<string, string>();
    const readText = (f: string): string => textCache.get(f) ?? '';
    for (const f of files) {
      if (/\.(tex|latex|typ|md|markdown)$/i.test(f)) {
        textCache.set(f, (await readFile(path.join(root, f))).toString('utf8'));
      }
    }

    const mainFile = pickMainFile(files, readText);
    if (!mainFile) {
      throw new ImportError('Nenhum documento .tex, .typ, .md ou .docx foi encontrado no .zip.');
    }
    const format = EXT_TO_FORMAT[path.extname(mainFile).toLowerCase()];
    const warnings: string[] = [];

    // Bloqueia leituras fora da pasta do upload antes de chamar o Pandoc
    if (format === 'latex') {
      const unsafe = files
        .filter((f) => /\.(tex|latex|sty|cls)$/i.test(f))
        .flatMap((f) => findUnsafeLatexIncludes(textCache.get(f) ?? ''));
      if (unsafe.length > 0) {
        throw new ImportError(`O documento referencia arquivos fora do projeto: ${unsafe.slice(0, 3).join(', ')}`);
      }
    }
    if (format === 'typst') {
      const unsafe = files
        .filter((f) => /\.typ$/i.test(f))
        .flatMap((f) => findUnsafeTypstIncludes(textCache.get(f) ?? ''));
      if (unsafe.length > 0) {
        throw new ImportError(`O documento referencia arquivos fora do projeto: ${unsafe.slice(0, 3).join(', ')}`);
      }
    }

    const mainAbs = path.join(root, mainFile);
    const mainDir = path.dirname(mainAbs);
    let inputName = path.basename(mainFile);

    // As cópias no tmp podem ser ajustadas: o upload original não é tocado
    const writeLatexCopies = async (ignoreLocalPackages: boolean) => {
      const localPackages = ignoreLocalPackages ? localPackageNames(files) : new Set<string>();
      let mainAdjusted = textCache.get(mainFile) ?? '';
      for (const f of files.filter((name) => /\.(tex|latex)$/i.test(name))) {
        const original = textCache.get(f) ?? '';
        let adjusted = moveTableNotesOutside(normalizeAbntexEnvironments(original));
        if (ignoreLocalPackages) adjusted = removeLocalPackages(adjusted, localPackages);
        if (adjusted !== original) await writeFile(path.join(root, f), adjusted, 'utf8');
        if (f === mainFile) mainAdjusted = adjusted;
      }
      await writeFile(path.join(mainDir, '.redija-main.tex'), `${LATEX_PRELUDE}\n${mainAdjusted}`, 'utf8');
    };

    if (format === 'latex') {
      inputName = '.redija-main.tex';
      await writeLatexCopies(false);
    }

    if (format === 'typst') {
      const stripped = stripTypstTemplateWrappers(textCache.get(mainFile) ?? '');
      inputName = '.redija-main.typ';
      await writeFile(path.join(mainDir, inputName), stripped, 'utf8');
    }

    const args = ['-f', PANDOC_READER[format], '-t', 'json', inputName];
    if (format === 'docx') args.push('--extract-media=.redija-media');

    let astJson: string;
    try {
      astJson = await runPandoc(args, { cwd: mainDir });
    } catch (err) {
      // Pacotes .sty próprios da instituição costumam usar programação TeX (\if, \@empty, …) que o
      // Pandoc não consegue expandir. Nova tentativa ignorando-os: os comandos desconhecidos são
      // descartados e os metadados continuam vindo de `mainSource` no front.
      const hasLocalPackages = localPackageNames(files).size > 0;
      if (format !== 'latex' || !hasLocalPackages || !(err instanceof ImportError) || err.status !== 422) throw err;
      await writeLatexCopies(true);
      astJson = await runPandoc(args, { cwd: mainDir });
      warnings.push('Os pacotes .sty do próprio projeto foram ignorados para conseguir ler o documento.');
    }
    const ast = JSON.parse(astJson) as { 'pandoc-api-version'?: unknown };

    const { math, images } = collectMathAndImages(ast);
    let mathTypst: Record<string, string> = {};
    try {
      mathTypst = await convertMathToTypst(math, ast['pandoc-api-version'], mainDir);
    } catch {
      warnings.push('Algumas equações não puderam ser convertidas para Typst.');
    }

    const allFiles = await listFilesRecursive(root);
    const media = await loadMedia(images, mainDir, root, allFiles, warnings);

    const bibFiles = files.filter((f) => /\.bib$/i.test(f));
    const bibliography = await convertBibliographies(bibFiles, root, warnings);

    let mainSource: string | undefined;
    if (format === 'latex') {
      mainSource = expandLatexPreamble(mainFile, (f) => textCache.get(f)).slice(0, config.maxSourceEchoBytes);
    } else if (format === 'typst') {
      mainSource = (textCache.get(mainFile) ?? '').slice(0, config.maxSourceEchoBytes);
    }

    return {
      format,
      mainFile: uploadFormat === 'zip' ? mainFile : fileName,
      ast,
      mathTypst,
      media,
      bibliography,
      mainSource,
      warnings,
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
