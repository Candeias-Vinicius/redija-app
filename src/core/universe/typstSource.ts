// =====================================================================
// RedijaApp — Leitura leve de código Typst (modelos do Typst Universe)
// Não é um parser completo: só o suficiente para achar a regra `#show:` do
// exemplo de um modelo, separar argumentos e ler a assinatura `#let f(...)`.
// Trata strings, conteúdo `[...]` (modo marcação), comentários, raw e math.
// =====================================================================

export type TypstValueShape =
  | 'str'
  | 'content'
  | 'num'
  | 'bool'
  | 'none'
  | 'auto'
  | 'datetime'
  | 'array'
  | 'dict'
  | 'paren'
  | 'file'
  | 'call'
  | 'ident'
  | 'other';

export type TypstArg =
  /** `key` é o nome como está no código (com aspas em `"chave": valor`). */
  | { kind: 'named'; name: string; key: string; expr: string }
  | { kind: 'positional'; expr: string }
  | { kind: 'spread'; expr: string };

export type TypstShowForm = 'with' | 'closure' | 'factory' | 'bare';

export interface TypstShowRule {
  form: TypstShowForm;
  /** Função chamada, como aparece no código (`thesis`, `ppgsi.thesis`). */
  entry: string;
  /** Nome do parâmetro do corpo nas regras `doc => f(..., doc)`. */
  bodyVar?: string;
  args: TypstArg[];
  /** Trecho exato da regra no código (de `#show` até o fim da chamada). */
  raw: string;
  /** Posição de `raw` no código analisado. */
  index: number;
}

export interface TypstPackageImport {
  spec: string;
  alias: string | null;
  /** `'*'`, lista de nomes ou `null` (importa o módulo pelo nome). */
  items: '*' | string[] | null;
  raw: string;
}

export interface TypstSignature {
  named: Array<{ name: string; def: string }>;
  positional: string[];
  sink: boolean;
}

/** Pula um comentário que começa em `i`; devolve o índice seguinte ou `i` se não houver. */
function skipComment(src: string, i: number): number {
  if (src[i] !== '/') return i;
  if (src[i + 1] === '/') {
    const nl = src.indexOf('\n', i);
    return nl < 0 ? src.length : nl;
  }
  if (src[i + 1] === '*') {
    let depth = 1;
    let j = i + 2;
    while (j < src.length && depth > 0) {
      if (src[j] === '/' && src[j + 1] === '*') {
        depth++;
        j += 2;
      } else if (src[j] === '*' && src[j + 1] === '/') {
        depth--;
        j += 2;
      } else {
        j++;
      }
    }
    return j;
  }
  return i;
}

/** Pula um trecho raw (\`...\` ou \`\`\`...\`\`\`); devolve o índice seguinte ou -1 se não fechar. */
function skipRaw(src: string, i: number): number {
  let k = i;
  while (src[k] === '`') k++;
  const ticks = k - i;
  if (ticks === 2) return k; // `` é raw vazio
  const end = src.indexOf('`'.repeat(ticks), k);
  return end < 0 ? -1 : end + ticks;
}

function skipString(src: string, i: number): number {
  let j = i + 1;
  while (j < src.length && src[j] !== '"') {
    if (src[j] === '\\') j++;
    j++;
  }
  return j + 1;
}

/**
 * A partir de `start` (logo depois de um `(`, `[` ou `{`), acha o delimitador que fecha.
 * Retorna o índice do fechamento ou -1.
 */
export function findClose(src: string, start: number, open: '(' | '[' | '{' = '('): number {
  const stack: string[] = [open];
  let i = start;
  while (i < src.length) {
    const top = stack[stack.length - 1];
    const c = src[i];
    const inMarkup = top === '[';
    // Em marcação, `//` só é comentário fora de URLs (https://...)
    if (c === '/' && (src[i + 1] === '/' || src[i + 1] === '*') && !(inMarkup && src[i - 1] === ':')) {
      i = skipComment(src, i);
      continue;
    }
    if (c === '`') {
      const end = skipRaw(src, i);
      if (end < 0) return -1;
      i = end;
      continue;
    }
    if (c === '$') {
      const end = src.indexOf('$', i + 1);
      if (end > 0) {
        i = end + 1;
        continue;
      }
    }
    if (inMarkup) {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '[') stack.push('[');
      else if (c === ']') {
        stack.pop();
        if (!stack.length) return i;
      }
      i++;
      continue;
    }
    if (c === '"') {
      i = skipString(src, i);
      continue;
    }
    if (c === '(' || c === '[' || c === '{') {
      stack.push(c);
    } else if (c === ')' || c === ']' || c === '}') {
      stack.pop();
      if (!stack.length) return i;
    }
    i++;
  }
  return -1;
}

/** Separa o texto entre parênteses de uma chamada em argumentos de topo. */
export function splitArgs(inner: string): TypstArg[] {
  const items: string[] = [];
  const stack: string[] = [];
  let cur = '';
  let i = 0;
  while (i < inner.length) {
    const c = inner[i];
    const top = stack[stack.length - 1];
    if (c === '/' && (inner[i + 1] === '/' || inner[i + 1] === '*') && !(top === '[' && inner[i - 1] === ':')) {
      i = skipComment(inner, i);
      continue;
    }
    if (c === '`') {
      const end = skipRaw(inner, i);
      const stop = end < 0 ? inner.length : end;
      cur += inner.slice(i, stop);
      i = stop;
      continue;
    }
    if (top === '[') {
      if (c === '\\') {
        cur += inner.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (c === '[') stack.push('[');
      if (c === ']') stack.pop();
      cur += c;
      i++;
      continue;
    }
    if (c === '"') {
      const end = skipString(inner, i);
      cur += inner.slice(i, end);
      i = end;
      continue;
    }
    if (c === '(' || c === '{' || c === '[') stack.push(c);
    if (c === ')' || c === '}' || c === ']') stack.pop();
    if (c === ',' && stack.length === 0) {
      if (cur.trim()) items.push(cur.trim());
      cur = '';
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  if (cur.trim()) items.push(cur.trim());

  return items.map((raw): TypstArg => {
    if (raw.startsWith('..')) return { kind: 'spread', expr: raw.slice(2).trim() };
    const m = raw.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*([\s\S]*)$/);
    if (m) return { kind: 'named', name: m[1], key: m[1], expr: m[2].trim() };
    // Chave entre aspas em dicionário: ("chave": valor)
    const q = raw.match(/^("(?:[^"\\]|\\.)*")\s*:\s*([\s\S]*)$/);
    if (q) return { kind: 'named', name: q[1].slice(1, -1), key: q[1], expr: q[2].trim() };
    return { kind: 'positional', expr: raw };
  });
}

/** Itens de um array ou dicionário literal `(...)`. */
export function literalItems(expr: string): TypstArg[] {
  const e = expr.trim();
  if (!e.startsWith('(')) return [];
  const close = findClose(e, 1, '(');
  if (close < 0) return [];
  return splitArgs(e.slice(1, close));
}

const FILE_CALL = /^(image|read|json|yaml|toml|csv|bibliography|bytes|xml|cbor)\s*\(/;

/** Classifica o formato de um valor (texto, conteúdo, lista, dicionário...). */
export function valueShape(expr: string): TypstValueShape {
  const e = expr.trim();
  if (e.startsWith('"')) return 'str';
  if (e.startsWith('[')) return 'content';
  if (/^-?[0-9]+(\.[0-9]+)?([a-z%]+)?$/.test(e)) return 'num';
  if (e === 'true' || e === 'false') return 'bool';
  if (e === 'none') return 'none';
  if (e === 'auto') return 'auto';
  if (/^datetime(\.today)?\s*\(/.test(e)) {
    // Só a data em si; `datetime.today().display()` é texto
    const open = e.indexOf('(');
    const close = findClose(e, open + 1, '(');
    if (close === e.length - 1) return 'datetime';
    return /\.display\s*\(/.test(e) ? 'str' : 'other';
  }
  if (/^lorem\s*\(/.test(e)) return 'str';
  if (/^\(\s*:\s*\)$/.test(e)) return 'dict';
  if (/^\(\s*\)$/.test(e)) return 'array';
  if (e.startsWith('(')) {
    const close = findClose(e, 1, '(');
    if (close === e.length - 1) {
      const inner = e.slice(1, close);
      const items = splitArgs(inner);
      if (items.length && items.every((it) => it.kind === 'named')) return 'dict';
      if (items.length === 1 && items[0].kind === 'positional' && !/,\s*$/.test(inner)) return 'paren';
      return 'array';
    }
  }
  if (FILE_CALL.test(e)) return 'file';
  if (/^[a-zA-Z_][a-zA-Z0-9_.-]*\s*\(/.test(e)) return 'call';
  if (/^[a-zA-Z_][a-zA-Z0-9_.-]*$/.test(e)) return 'ident';
  return 'other';
}

/** O código está dentro de um comentário de linha nesta posição? */
function isLineCommented(src: string, index: number): boolean {
  const lineStart = src.lastIndexOf('\n', index - 1) + 1;
  return /\/\//.test(src.slice(lineStart, index).replace(/"[^"]*"/g, '""'));
}

/** Lista as regras `#show: ...` de topo de um arquivo, na ordem em que aparecem. */
export function findShowRules(src: string): TypstShowRule[] {
  const rules: TypstShowRule[] = [];
  const re = /#show\s*:\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (isLineCommented(src, m.index)) continue;
    const at = m.index + m[0].length;
    const rest = src.slice(at);

    const clo = rest.match(
      /^\(?\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*\)?\s*=>\s*\{?\s*([a-zA-Z_][a-zA-Z0-9_.-]*)\s*\(/,
    );
    if (clo) {
      const open = at + clo[0].length;
      const close = findClose(src, open, '(');
      if (close < 0) continue;
      const args = splitArgs(src.slice(open, close)).filter(
        (a) => !(a.kind === 'positional' && a.expr === clo[1]),
      );
      rules.push({ form: 'closure', entry: clo[2], bodyVar: clo[1], args, raw: src.slice(m.index, close + 1), index: m.index });
      continue;
    }
    const w = rest.match(/^([a-zA-Z_][a-zA-Z0-9_.-]*?)\.with\s*\(/);
    if (w) {
      const open = at + w[0].length;
      const close = findClose(src, open, '(');
      if (close < 0) continue;
      rules.push({ form: 'with', entry: w[1], args: splitArgs(src.slice(open, close)), raw: src.slice(m.index, close + 1), index: m.index });
      continue;
    }
    const call = rest.match(/^([a-zA-Z_][a-zA-Z0-9_.-]*)\s*\(/);
    if (call) {
      const open = at + call[0].length;
      const close = findClose(src, open, '(');
      if (close < 0) continue;
      rules.push({ form: 'factory', entry: call[1], args: splitArgs(src.slice(open, close)), raw: src.slice(m.index, close + 1), index: m.index });
      continue;
    }
    const bare = rest.match(/^([a-zA-Z_][a-zA-Z0-9_.-]*)[ \t]*(?=\r?\n|$|;|\/\/)/);
    if (bare) {
      rules.push({ form: 'bare', entry: bare[1], args: [], raw: src.slice(m.index, at + bare[1].length), index: m.index });
    }
  }
  return rules;
}

/** Imports de pacotes `@namespace/nome:versão` de um arquivo. */
export function findPackageImports(src: string): TypstPackageImport[] {
  const out: TypstPackageImport[] = [];
  const re = /#import\s+"(@[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+:[0-9.]+)"(\s+as\s+([a-zA-Z_][a-zA-Z0-9_-]*))?(\s*:\s*)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (isLineCommented(src, m.index)) continue;
    let items: TypstPackageImport['items'] = null;
    let end = m.index + m[0].length;
    if (m[4]) {
      const rest = src.slice(end);
      if (rest.startsWith('*')) {
        items = '*';
        end += 1;
      } else if (rest.startsWith('(')) {
        const close = findClose(src, end + 1, '(');
        if (close < 0) continue;
        items = splitItems(src.slice(end + 1, close));
        end = close + 1;
      } else {
        const line = rest.split('\n')[0];
        items = splitItems(line.replace(/\/\/.*$/, ''));
        end += line.length;
      }
    }
    out.push({ spec: m[1], alias: m[3] ?? null, items, raw: src.slice(m.index, end) });
  }
  return out;
}

function splitItems(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.replace(/\/\/.*$/, '').trim())
    .filter(Boolean);
}

function escapeRegex(text: string): string {
  return text.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Procura `let nome(...)` nos arquivos; usa a definição com mais parâmetros. */
export function findSignature(files: Array<[string, string]>, name: string): TypstSignature | null {
  const re = new RegExp(`(?:^|[\\s#;{])let\\s+${escapeRegex(name)}\\s*\\(`, 'g');
  let best: TypstArg[] | null = null;
  for (const [, src] of files) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      if (isLineCommented(src, m.index + 1)) continue;
      const open = m.index + m[0].length;
      const close = findClose(src, open, '(');
      if (close < 0) continue;
      const params = splitArgs(src.slice(open, close));
      if (!best || params.length > best.length) best = params;
    }
  }
  if (!best) return null;
  return {
    named: best.flatMap((p) => (p.kind === 'named' ? [{ name: p.name, def: p.expr }] : [])),
    positional: best.flatMap((p) => (p.kind === 'positional' ? [p.expr.trim()] : [])),
    sink: best.some((p) => p.kind === 'spread'),
  };
}

/** Procura `let nome = outro` ou `let nome = outro.with(...)` (apelido da função). */
export function findAlias(files: Array<[string, string]>, name: string): string | null {
  const re = new RegExp(`(?:^|[\\s#;{])let\\s+${escapeRegex(name)}\\s*=\\s*([a-zA-Z_][a-zA-Z0-9_.-]*)`, 'g');
  for (const [, src] of files) {
    re.lastIndex = 0;
    const m = re.exec(src);
    if (m) return m[1].replace(/\.with$/, '');
  }
  return null;
}

/** Tira um comentário `// ...` do fim da linha, sem confundir com `//` dentro de textos. */
export function stripTrailingComment(line: string): string {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '/' && line[i + 1] === '/' && line[i - 1] !== ':') return line.slice(0, i).trimEnd();
  }
  return line;
}
