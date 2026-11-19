// =====================================================================
// RedijaApp — Conversor de Expressões Matemáticas (Typst / LaTeX) para OMML
// Gera Office Math Markup Language (ECMA-376 <m:oMath> / <m:oMathPara>)
// nativo e editável para Microsoft Word e LibreOffice Writer.
// =====================================================================

export interface MathToOmmlResult {
  ok: boolean;
  omml: string;
  rawCode: string;
  error?: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Símbolos e letras gregas em sintaxe Typst e LaTeX mapeados para Unicode matemático. */
const SYMBOL_MAP: Record<string, string> = {
  // Letras gregas minúsculas
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  varepsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  vartheta: 'ϑ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  rho: 'ρ',
  varrho: 'ϱ',
  sigma: 'σ',
  varsigma: 'ς',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  varphi: 'ϕ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  // Letras gregas maiúsculas
  Gamma: 'Γ',
  Delta: 'Δ',
  Theta: 'Θ',
  Lambda: 'Λ',
  Xi: 'Ξ',
  Pi: 'Π',
  Sigma: 'Σ',
  Upsilon: 'Υ',
  Phi: 'Φ',
  Psi: 'Ψ',
  Omega: 'Ω',
  // Operadores e constantes
  oo: '∞',
  infinity: '∞',
  infty: '∞',
  approx: '≈',
  equiv: '≡',
  prop: '∝',
  propto: '∝',
  neq: '≠',
  ne: '≠',
  leq: '≤',
  le: '≤',
  geq: '≥',
  ge: '≥',
  pm: '±',
  mp: '∓',
  times: '×',
  div: '÷',
  cdot: '⋅',
  'dot.op': '⋅',
  star: '⋆',
  ast: '∗',
  circ: '∘',
  bullet: '∙',
  oplus: '⊕',
  otimes: '⊗',
  to: '→',
  rightarrow: '→',
  'arrow.r': '→',
  leftarrow: '←',
  'arrow.l': '←',
  leftrightarrow: '↔',
  'arrow.l.r': '↔',
  Rightarrow: '⇒',
  'arrow.r.double': '⇒',
  Leftarrow: '⇐',
  'arrow.l.double': '⇐',
  Leftrightarrow: '⇔',
  'arrow.l.r.double': '⇔',
  mapsto: '↦',
  in: '∈',
  'in.not': '∉',
  notin: '∉',
  ni: '∋',
  subset: '⊂',
  'subset.eq': '⊆',
  subseteq: '⊆',
  supset: '⊃',
  'supset.eq': '⊇',
  supseteq: '⊇',
  union: '∪',
  cup: '∪',
  sect: '∩',
  cap: '∩',
  emptyset: '∅',
  nothing: '∅',
  forall: '∀',
  exists: '∃',
  nexists: '∄',
  neg: '¬',
  lnot: '¬',
  land: '∧',
  and: '∧',
  lor: '∨',
  or: '∨',
  partial: '∂',
  diff: '∂',
  nabla: '∇',
  grad: '∇',
  dots: '…',
  'dots.c': '⋯',
  cdots: '⋯',
  ldots: '…',
  vdots: '⋮',
  ddots: '⋱',
  aleph: 'ℵ',
  hbar: 'ℏ',
  ell: 'ℓ',
  Re: 'ℜ',
  Im: 'ℑ',
  wp: '℘',
  angle: '∠',
  perp: '⊥',
  parallel: '∥',
  triangle: '△',
};

/** Operadores N-ários (somatório, integral, produtório, união, interseção). */
const NARY_MAP: Record<string, string> = {
  sum: '∑',
  integral: '∫',
  'integral.double': '∬',
  'integral.triple': '∭',
  'integral.cont': '∮',
  int: '∫',
  iint: '∬',
  iiint: '∭',
  oint: '∮',
  prod: '∏',
  product: '∏',
  'union.big': '⋃',
  bigcup: '⋃',
  'sect.big': '⋂',
  bigcap: '⋂',
};

/** Funções matemáticas padrão que devem ser renderizadas em estilo romano (upright). */
const UPRIGHT_FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'cot',
  'sec',
  'csc',
  'arcsin',
  'arccos',
  'arctan',
  'sinh',
  'cosh',
  'tanh',
  'coth',
  'log',
  'ln',
  'lg',
  'exp',
  'max',
  'min',
  'sup',
  'inf',
  'det',
  'dim',
  'ker',
  'hom',
  'deg',
  'gcd',
  'lcm',
  'Pr',
  'arg',
  'mod',
  'sgn',
  'tr',
  'rank',
]);

/** Espaços tipográficos ignorados ou convertidos em espaço fino no OMML. */
const SPACING_TOKENS = new Set(['thin', 'med', 'thick', 'quad', 'wide', 'space']);

/** Acentos matemáticos suportados pelo OMML (<m:acc>). */
const ACCENT_MAP: Record<string, string> = {
  hat: '\u0302',
  tilde: '\u0303',
  bar: '\u0304',
  overline: '\u0305',
  dot: '\u0307',
  ddot: '\u0308',
  arrow: '\u20D7',
  vec: '\u20D7',
  breve: '\u0306',
  check: '\u030C',
};

/** Comandos de código Typst ou macros LaTeX complexas que o conversor OMML não suporta. */
const UNSUPPORTED_DIRECTIVE_RE =
  /#\s*(?:let|set|show|import|include|for|while|if|else|context|locate|state|counter|query|measure|layout|place|move|rotate|scale|skew|hide|box|block|rect|circle|ellipse|line|polygon|path|curve|image|table|grid|stack|columns|page|pagebreak|v|h|panic|assert)\b/i;

const UNSUPPORTED_LATEX_ENV_RE =
  /\\begin\s*\{(?!matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|aligned|cases)[a-zA-Z*]+\}/;

const UNSUPPORTED_LATEX_CMD_RE =
  /\\(?:newcommand|renewcommand|def|gdef|edef|let|makeatletter|input|include|includegraphics|tikz|chemfig|ce|SI|qty)\b/;

type MathAstNode =
  | { kind: 'run'; text: string; upright?: boolean }
  | { kind: 'group'; children: MathAstNode[]; open?: string; close?: string }
  | { kind: 'frac'; num: MathAstNode[]; den: MathAstNode[] }
  | { kind: 'sup'; base: MathAstNode; sup: MathAstNode[] }
  | { kind: 'sub'; base: MathAstNode; sub: MathAstNode[] }
  | { kind: 'subsup'; base: MathAstNode; sub: MathAstNode[]; sup: MathAstNode[] }
  | { kind: 'sqrt'; deg?: MathAstNode[]; body: MathAstNode[] }
  | { kind: 'nary'; chr: string; sub?: MathAstNode[]; sup?: MathAstNode[]; body: MathAstNode[] }
  | { kind: 'lim'; name: string; sub: MathAstNode[] }
  | { kind: 'acc'; chr: string; body: MathAstNode[] }
  | { kind: 'matrix'; open: string; close: string; rows: MathAstNode[][][] };

interface Token {
  type: 'ident' | 'number' | 'op' | 'open' | 'close' | 'sep' | 'string' | 'space';
  value: string;
}

class MathConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MathConversionError';
  }
}

/**
 * Limpa delimitadores externos ($...$ ou $$...$$) de uma expressão matemática.
 */
export function stripMathDelimiters(raw: string): string {
  let expr = raw.trim();
  if (expr.startsWith('$$') && expr.endsWith('$$') && expr.length >= 4) {
    expr = expr.slice(2, -2).trim();
  } else if (expr.startsWith('$') && expr.endsWith('$') && expr.length >= 2) {
    expr = expr.slice(1, -1).trim();
  }
  return expr;
}

function tokenizeMath(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    // Whitespace
    if (/\s/.test(ch)) {
      while (i < input.length && /\s/.test(input[i])) i++;
      continue;
    }

    // String literal "..."
    if (ch === '"') {
      let str = '';
      i++;
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < input.length) {
          i++;
        }
        str += input[i];
        i++;
      }
      if (i >= input.length) {
        throw new MathConversionError('String literal não fechada na equação.');
      }
      i++; // consome '"'
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Sequências de escape ou comandos LaTeX (\alpha, \frac, \{, \}, \, etc.)
    if (ch === '\\') {
      i++;
      if (i >= input.length) {
        throw new MathConversionError('Barra invertida isolada no final da equação.');
      }
      const next = input[i];
      if (/[a-zA-Z]/.test(next)) {
        let cmd = '';
        while (i < input.length && /[a-zA-Z]/.test(input[i])) {
          cmd += input[i];
          i++;
        }
        if (cmd === 'left' || cmd === 'right' || cmd === 'displaystyle' || cmd === 'textstyle') {
          continue;
        }
        if (cmd === 'quad' || cmd === 'qquad' || cmd === 'enspace' || cmd === 'thinspace') {
          continue;
        }
        tokens.push({ type: 'ident', value: cmd });
        continue;
      }
      // Escape de delimitador ou espaço (\{, \}, \(, \), \[, \], \,, \;, \!, \:)
      i++;
      if (next === ',' || next === ';' || next === ':' || next === '!' || next === ' ') {
        continue;
      }
      if (next === '{' || next === '}' || next === '(' || next === ')' || next === '[' || next === ']' || next === '|') {
        tokens.push({ type: 'op', value: next });
        continue;
      }
      tokens.push({ type: 'op', value: next });
      continue;
    }

    // Operadores compostos de 2 ou 3 caracteres
    const three = input.slice(i, i + 3);
    if (three === '<->' || three === '<=>') {
      tokens.push({ type: 'op', value: SYMBOL_MAP[three] });
      i += 3;
      continue;
    }

    const two = input.slice(i, i + 2);
    if (two === '!=' || two === '<=' || two === '>=' || two === '+-' || two === '-+' || two === '->' || two === '<-' || two === '=>') {
      const mapped =
        two === '!='
          ? '≠'
          : two === '<='
            ? '≤'
            : two === '>='
              ? '≥'
              : two === '+-'
                ? '±'
                : two === '-+'
                  ? '∓'
                  : two === '->'
                    ? '→'
                    : two === '<-'
                      ? '←'
                      : '⇒';
      tokens.push({ type: 'op', value: mapped });
      i += 2;
      continue;
    }

    // Delimitadores de abertura e fechamento
    if (ch === '(' || ch === '[' || ch === '{') {
      tokens.push({ type: 'open', value: ch });
      i++;
      continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      tokens.push({ type: 'close', value: ch });
      i++;
      continue;
    }

    // Separadores de argumentos e linhas de matriz
    if (ch === ',' || ch === ';') {
      tokens.push({ type: 'sep', value: ch });
      i++;
      continue;
    }

    // Números (ex: 12, 3.14)
    if (/[0-9]/.test(ch)) {
      let num = '';
      while (i < input.length && /[0-9.]/.test(input[i])) {
        num += input[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    // Identificadores (incluindo notação com ponto do Typst: arrow.r, subset.eq, union.big, in.not)
    if (/[a-zA-Z]/.test(ch)) {
      let ident = '';
      while (i < input.length && /[a-zA-Z0-9.]/.test(input[i])) {
        ident += input[i];
        i++;
      }
      // Remove ponto final solto se não fizer parte de símbolo composto
      while (ident.endsWith('.')) {
        ident = ident.slice(0, -1);
        i--;
      }
      if (SPACING_TOKENS.has(ident)) {
        continue;
      }
      tokens.push({ type: 'ident', value: ident });
      continue;
    }

    // Operadores simples (+, -, *, /, ^, _, =, <, >, |, !, etc.)
    tokens.push({ type: 'op', value: ch });
    i++;
  }

  return tokens;
}

function matchingClose(open: string): string {
  if (open === '(') return ')';
  if (open === '[') return ']';
  return '}';
}

function unwrapOuterGroup(node: MathAstNode): MathAstNode[] {
  if (node.kind === 'group') return node.children;
  return [node];
}

function splitTokensBySeparator(tokens: Token[], sepValue: string): Token[][] {
  const parts: Token[][] = [];
  let current: Token[] = [];
  let depth = 0;

  for (const tok of tokens) {
    if (tok.type === 'open') {
      depth++;
      current.push(tok);
    } else if (tok.type === 'close') {
      depth--;
      current.push(tok);
    } else if (depth === 0 && tok.type === 'sep' && tok.value === sepValue) {
      parts.push(current);
      current = [];
    } else {
      current.push(tok);
    }
  }
  parts.push(current);
  return parts;
}

const KNOWN_CALLABLE_FUNCTIONS = new Set([
  'frac',
  'sqrt',
  'root',
  'mat',
  'vec',
  'abs',
  'norm',
  'floor',
  'ceil',
  'lr',
  'text',
  'upright',
  'bold',
  'italic',
  'roman',
  'cal',
  'bb',
  'op',
  ...Object.keys(ACCENT_MAP),
  ...UPRIGHT_FUNCTIONS,
]);

function parseTokens(tokens: Token[]): MathAstNode[] {
  let pos = 0;

  function peek(offset = 0): Token | undefined {
    return tokens[pos + offset];
  }

  function consume(): Token {
    return tokens[pos++];
  }

  function readBalancedGroup(): { open: string; close: string; inner: Token[] } {
    const openTok = consume();
    if (!openTok || openTok.type !== 'open') {
      throw new MathConversionError('Grupo delimitador esperado.');
    }
    const expectedClose = matchingClose(openTok.value);
    const inner: Token[] = [];
    const stack: string[] = [expectedClose];

    while (pos < tokens.length && stack.length > 0) {
      const t = consume();
      if (t.type === 'open') {
        stack.push(matchingClose(t.value));
        inner.push(t);
      } else if (t.type === 'close') {
        const top = stack.pop();
        if (t.value !== top) {
          throw new MathConversionError(`Delimitador desbalanceado: esperado '${top}', encontrado '${t.value}'.`);
        }
        if (stack.length > 0) {
          inner.push(t);
        }
      } else {
        inner.push(t);
      }
    }

    if (stack.length > 0) {
      throw new MathConversionError(`Delimitador '${openTok.value}' não foi fechado.`);
    }

    return { open: openTok.value, close: expectedClose, inner };
  }

  function parseAtom(): MathAstNode {
    const t = peek();
    if (!t) {
      throw new MathConversionError('Expressão matemática incompleta.');
    }

    if (t.type === 'open') {
      const grp = readBalancedGroup();
      const children = parseTokens(grp.inner);
      if (grp.open === '{') {
        return { kind: 'group', children };
      }
      return { kind: 'group', children, open: grp.open, close: grp.close };
    }

    if (t.type === 'close') {
      throw new MathConversionError(`Delimitador de fechamento '${t.value}' sem abertura correspondente.`);
    }

    if (t.type === 'string') {
      consume();
      return { kind: 'run', text: t.value, upright: true };
    }

    if (t.type === 'number') {
      consume();
      return { kind: 'run', text: t.value };
    }

    if (t.type === 'ident') {
      consume();
      const name = t.value;

      // Funções com argumentos em parênteses (Typst) ou chaves (LaTeX)
      const next = peek();

      if (name === 'frac') {
        if (next?.type === 'open' && next.value === '(') {
          const grp = readBalancedGroup();
          const args = splitTokensBySeparator(grp.inner, ',');
          if (args.length !== 2 || args[0].length === 0 || args[1].length === 0) {
            throw new MathConversionError('Função frac(a, b) exige numerador e denominador.');
          }
          return {
            kind: 'frac',
            num: parseTokens(args[0]),
            den: parseTokens(args[1]),
          };
        }
        if (next?.type === 'open' && next.value === '{') {
          const numGrp = readBalancedGroup();
          if (peek()?.type !== 'open' || peek()?.value !== '{') {
            throw new MathConversionError('Comando \\frac exige dois blocos {numerador}{denominador}.');
          }
          const denGrp = readBalancedGroup();
          if (numGrp.inner.length === 0 || denGrp.inner.length === 0) {
            throw new MathConversionError('Comando \\frac exige numerador e denominador não vazios.');
          }
          return {
            kind: 'frac',
            num: parseTokens(numGrp.inner),
            den: parseTokens(denGrp.inner),
          };
        }
        throw new MathConversionError('Uso inválido de frac sem argumentos.');
      }

      if (name === 'sqrt') {
        if (next?.type === 'open' && next.value === '[') {
          const degGrp = readBalancedGroup();
          if (peek()?.type !== 'open') {
            throw new MathConversionError('Comando \\sqrt[n]{x} exige radicando.');
          }
          const bodyGrp = readBalancedGroup();
          if (bodyGrp.inner.length === 0) {
            throw new MathConversionError('Radicando vazio em \\sqrt.');
          }
          return {
            kind: 'sqrt',
            deg: parseTokens(degGrp.inner),
            body: parseTokens(bodyGrp.inner),
          };
        }
        if (next?.type === 'open') {
          const bodyGrp = readBalancedGroup();
          if (bodyGrp.inner.length === 0) {
            throw new MathConversionError('Radicando vazio em sqrt().');
          }
          return {
            kind: 'sqrt',
            body: parseTokens(bodyGrp.inner),
          };
        }
        const arg = parseAtom();
        return { kind: 'sqrt', body: unwrapOuterGroup(arg) };
      }

      if (name === 'root') {
        if (next?.type === 'open' && next.value === '(') {
          const grp = readBalancedGroup();
          const args = splitTokensBySeparator(grp.inner, ',');
          if (args.length !== 2 || args[0].length === 0 || args[1].length === 0) {
            throw new MathConversionError('Função root(n, x) exige índice e radicando.');
          }
          return {
            kind: 'sqrt',
            deg: parseTokens(args[0]),
            body: parseTokens(args[1]),
          };
        }
        throw new MathConversionError('Uso inválido de root(n, x).');
      }

      if (name === 'mat' && next?.type === 'open' && next.value === '(') {
        const grp = readBalancedGroup();
        const rawRows = splitTokensBySeparator(grp.inner, ';').filter((r) => r.length > 0);
        if (rawRows.length === 0) {
          throw new MathConversionError('Matriz vazia em mat().');
        }
        const rows = rawRows.map((rowTokens) =>
          splitTokensBySeparator(rowTokens, ',').map((cellTokens) =>
            cellTokens.length > 0 ? parseTokens(cellTokens) : [{ kind: 'run', text: '' } as MathAstNode],
          ),
        );
        return { kind: 'matrix', open: '(', close: ')', rows };
      }

      if (name === 'vec' && next?.type === 'open' && next.value === '(') {
        const grp = readBalancedGroup();
        const args = splitTokensBySeparator(grp.inner, ',');
        if (args.length > 1) {
          const rows = args.map((cellTokens) => [parseTokens(cellTokens)]);
          return { kind: 'matrix', open: '(', close: ')', rows };
        }
        return { kind: 'acc', chr: '\u20D7', body: parseTokens(grp.inner) };
      }

      if (name in ACCENT_MAP && next?.type === 'open') {
        const grp = readBalancedGroup();
        if (grp.inner.length === 0) {
          throw new MathConversionError(`Acento ${name}() vazio.`);
        }
        return { kind: 'acc', chr: ACCENT_MAP[name], body: parseTokens(grp.inner) };
      }

      if ((name === 'abs' || name === 'norm' || name === 'floor' || name === 'ceil') && next?.type === 'open') {
        const grp = readBalancedGroup();
        const [openChr, closeChr] =
          name === 'abs'
            ? ['|', '|']
            : name === 'norm'
              ? ['‖', '‖']
              : name === 'floor'
                ? ['⌊', '⌋']
                : ['⌈', '⌉'];
        return { kind: 'group', children: parseTokens(grp.inner), open: openChr, close: closeChr };
      }

      if (name === 'lr' && next?.type === 'open' && next.value === '(') {
        const grp = readBalancedGroup();
        return { kind: 'group', children: parseTokens(grp.inner) };
      }

      if (
        (name === 'text' ||
          name === 'upright' ||
          name === 'bold' ||
          name === 'italic' ||
          name === 'roman' ||
          name === 'cal' ||
          name === 'bb' ||
          name === 'op') &&
        next?.type === 'open'
      ) {
        const grp = readBalancedGroup();
        return { kind: 'group', children: parseTokens(grp.inner) };
      }

      // Se um identificador desconhecido de mais de 1 letra é chamado como função `foo(a, b)` com vírgula ou múltiplos args
      if (
        name.length > 1 &&
        !KNOWN_CALLABLE_FUNCTIONS.has(name) &&
        !(name in SYMBOL_MAP) &&
        !(name in NARY_MAP) &&
        next?.type === 'open' &&
        next.value === '('
      ) {
        // Verifica se é uma função desconhecida do Typst/LaTeX (ex: custom_macro(a, b) ou #fun)
        if (name.includes('_') || name.includes('.') || name.length > 3) {
          throw new MathConversionError(`Construção ou função matemática não suportada: ${name}(...).`);
        }
      }

      if (name in NARY_MAP) {
        return { kind: 'run', text: NARY_MAP[name] };
      }

      if (name in SYMBOL_MAP) {
        return { kind: 'run', text: SYMBOL_MAP[name] };
      }

      if (UPRIGHT_FUNCTIONS.has(name) || name === 'lim') {
        return { kind: 'run', text: name, upright: true };
      }

      return { kind: 'run', text: name };
    }

    if (t.type === 'sep') {
      consume();
      return { kind: 'run', text: `${t.value} ` };
    }

    // Operador
    consume();
    return { kind: 'run', text: t.value };
  }

  function parseScripted(): MathAstNode {
    const base = parseAtom();
    let sub: MathAstNode[] | undefined;
    let sup: MathAstNode[] | undefined;

    while (pos < tokens.length) {
      const next = peek();
      if (next?.type === 'op' && next.value === '_' && !sub) {
        consume();
        const subAtom = parseAtom();
        sub = unwrapOuterGroup(subAtom);
      } else if (next?.type === 'op' && next.value === '^' && !sup) {
        consume();
        const supAtom = parseAtom();
        sup = unwrapOuterGroup(supAtom);
      } else {
        break;
      }
    }

    // Caso especial: lim_(x -> oo)
    if (base.kind === 'run' && base.text === 'lim' && sub && !sup) {
      return { kind: 'lim', name: 'lim', sub };
    }

    if (sub && sup) {
      return { kind: 'subsup', base, sub, sup };
    }
    if (sub) {
      return { kind: 'sub', base, sub };
    }
    if (sup) {
      return { kind: 'sup', base, sup };
    }
    return base;
  }

  const items: MathAstNode[] = [];
  while (pos < tokens.length) {
    const current = peek()!;

    // Operador de fração infixo `/` (ex.: `(a + b) / c` ou `x / 2`)
    if (current.type === 'op' && current.value === '/') {
      consume();
      if (items.length === 0 || pos >= tokens.length) {
        throw new MathConversionError('Operador de divisão "/" sem numerador ou denominador.');
      }
      const prev = items.pop()!;
      const nextNode = parseScripted();
      items.push({
        kind: 'frac',
        num: unwrapOuterGroup(prev),
        den: unwrapOuterGroup(nextNode),
      });
      continue;
    }

    const node = parseScripted();

    // Se o nó é um operador N-ário (∑, ∫, ∏) com sub/sup, agrupa o próximo termo como corpo do N-ário
    const isNaryBase = (n: MathAstNode): string | null => {
      if (n.kind === 'run' && Object.values(NARY_MAP).includes(n.text)) return n.text;
      if ((n.kind === 'sub' || n.kind === 'sup' || n.kind === 'subsup') && n.base.kind === 'run' && Object.values(NARY_MAP).includes(n.base.text)) {
        return n.base.text;
      }
      return null;
    };

    const naryChr = isNaryBase(node);
    if (naryChr && pos < tokens.length && peek()?.type !== 'sep') {
      const sub = node.kind === 'sub' || node.kind === 'subsup' ? node.sub : undefined;
      const sup = node.kind === 'sup' || node.kind === 'subsup' ? node.sup : undefined;
      const bodyNode = parseScripted();
      // Se logo depois vier `/`, a fração inteira é o integrando/termo do somatório
      if (peek()?.type === 'op' && peek()?.value === '/') {
        consume();
        if (pos >= tokens.length) {
          throw new MathConversionError('Operador de divisão "/" sem denominador.');
        }
        const denNode = parseScripted();
        items.push({
          kind: 'nary',
          chr: naryChr,
          sub,
          sup,
          body: [
            {
              kind: 'frac',
              num: unwrapOuterGroup(bodyNode),
              den: unwrapOuterGroup(denNode),
            },
          ],
        });
      } else {
        items.push({
          kind: 'nary',
          chr: naryChr,
          sub,
          sup,
          body: [bodyNode],
        });
      }
      continue;
    }

    items.push(node);
  }

  return items;
}

function renderAstToOmml(nodes: MathAstNode[]): string {
  if (nodes.length === 0) {
    return '<m:r><m:t></m:t></m:r>';
  }
  return nodes.map(renderNodeToOmml).join('');
}

function renderNodeToOmml(node: MathAstNode): string {
  switch (node.kind) {
    case 'run': {
      const rPr = node.upright ? '<m:rPr><m:sty m:val="p"/></m:rPr>' : '';
      return `<m:r>${rPr}<m:t>${escapeXml(node.text)}</m:t></m:r>`;
    }

    case 'group': {
      const inner = renderAstToOmml(node.children);
      if (!node.open || !node.close) {
        return inner;
      }
      return `<m:d><m:dPr><m:begChr m:val="${escapeXml(node.open)}"/><m:endChr m:val="${escapeXml(node.close)}"/></m:dPr><m:e>${inner}</m:e></m:d>`;
    }

    case 'frac':
      return `<m:f><m:num>${renderAstToOmml(node.num)}</m:num><m:den>${renderAstToOmml(node.den)}</m:den></m:f>`;

    case 'sup':
      return `<m:sSup><m:e>${renderNodeToOmml(node.base)}</m:e><m:sup>${renderAstToOmml(node.sup)}</m:sup></m:sSup>`;

    case 'sub':
      return `<m:sSub><m:e>${renderNodeToOmml(node.base)}</m:e><m:sub>${renderAstToOmml(node.sub)}</m:sub></m:sSub>`;

    case 'subsup':
      return `<m:sSubSup><m:e>${renderNodeToOmml(node.base)}</m:e><m:sub>${renderAstToOmml(node.sub)}</m:sub><m:sup>${renderAstToOmml(node.sup)}</m:sup></m:sSubSup>`;

    case 'sqrt': {
      if (node.deg && node.deg.length > 0) {
        return `<m:rad><m:deg>${renderAstToOmml(node.deg)}</m:deg><m:e>${renderAstToOmml(node.body)}</m:e></m:rad>`;
      }
      return `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${renderAstToOmml(node.body)}</m:e></m:rad>`;
    }

    case 'nary': {
      const subHide = node.sub ? '' : '<m:subHide m:val="1"/>';
      const supHide = node.sup ? '' : '<m:supHide m:val="1"/>';
      const subXml = node.sub ? renderAstToOmml(node.sub) : '';
      const supXml = node.sup ? renderAstToOmml(node.sup) : '';
      return `<m:nary><m:naryPr><m:chr m:val="${escapeXml(node.chr)}"/>${subHide}${supHide}</m:naryPr><m:sub>${subXml}</m:sub><m:sup>${supXml}</m:sup><m:e>${renderAstToOmml(node.body)}</m:e></m:nary>`;
    }

    case 'lim':
      return `<m:limLow><m:e><m:r><m:rPr><m:sty m:val="p"/></m:rPr><m:t>${escapeXml(node.name)}</m:t></m:r></m:e><m:lim>${renderAstToOmml(node.sub)}</m:lim></m:limLow>`;

    case 'acc':
      return `<m:acc><m:accPr><m:chr m:val="${escapeXml(node.chr)}"/></m:accPr><m:e>${renderAstToOmml(node.body)}</m:e></m:acc>`;

    case 'matrix': {
      const rowsXml = node.rows
        .map(
          (row) =>
            `<m:mr>${row.map((cell) => `<m:e>${renderAstToOmml(cell)}</m:e>`).join('')}</m:mr>`,
        )
        .join('');
      return `<m:d><m:dPr><m:begChr m:val="${escapeXml(node.open)}"/><m:endChr m:val="${escapeXml(node.close)}"/></m:dPr><m:e><m:m>${rowsXml}</m:m></m:e></m:d>`;
    }
  }
}

/**
 * Converte uma expressão matemática (em sintaxe Typst ou LaTeX) para OMML nativo
 * (`<m:oMath>...</m:oMath>` quando `displayMode: false` ou `<m:oMathPara><m:oMath>...</m:oMath></m:oMathPara>`
 * quando `displayMode: true`).
 *
 * Caso a expressão contenha construções não suportadas ou erros estruturais,
 * retorna `{ ok: false, rawCode, error }` para que o exportador preserve o código original
 * como texto e registre a localização no aviso final.
 */
export function convertMathToOmml(rawExpr: string, displayMode = false): MathToOmmlResult {
  const cleaned = stripMathDelimiters(rawExpr);
  if (!cleaned) {
    return {
      ok: false,
      omml: '',
      rawCode: rawExpr,
      error: 'Expressão matemática vazia.',
    };
  }

  // Rejeita diretivas de programação Typst (#let, #for, #panic, #rect, etc.) ou ambientes LaTeX não suportados
  if (
    UNSUPPORTED_DIRECTIVE_RE.test(cleaned) ||
    UNSUPPORTED_LATEX_ENV_RE.test(cleaned) ||
    UNSUPPORTED_LATEX_CMD_RE.test(cleaned) ||
    cleaned.includes('#')
  ) {
    return {
      ok: false,
      omml: '',
      rawCode: cleaned,
      error: 'A equação utiliza diretivas ou macros não suportadas pelo conversor OMML.',
    };
  }

  try {
    const tokens = tokenizeMath(cleaned);
    if (tokens.length === 0) {
      return {
        ok: false,
        omml: '',
        rawCode: cleaned,
        error: 'Nenhum símbolo matemático válido encontrado.',
      };
    }

    const ast = parseTokens(tokens);
    const innerOmml = renderAstToOmml(ast);
    const oMath = `<m:oMath>${innerOmml}</m:oMath>`;
    const omml = displayMode
      ? `<m:oMathPara><m:oMathParaPr><m:jc m:val="center"/></m:oMathParaPr>${oMath}</m:oMathPara>`
      : oMath;

    return {
      ok: true,
      omml,
      rawCode: cleaned,
    };
  } catch (err) {
    return {
      ok: false,
      omml: '',
      rawCode: cleaned,
      error: err instanceof Error ? err.message : 'Construção matemática não suportada.',
    };
  }
}
