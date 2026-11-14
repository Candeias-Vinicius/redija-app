import path from 'node:path';

/**
 * Caminho relativo seguro: sem raiz absoluta, sem letra de drive, sem `..`, sem `~`
 * e sem barras invertidas / caracteres de controle.
 */
export function isSafeRelativePath(p: string): boolean {
  if (!p || p.length > 512) return false;
  if (p.includes('\\') || [...p].some((ch) => ch.charCodeAt(0) < 0x20)) return false;
  if (p.startsWith('/') || p.startsWith('~') || /^[a-zA-Z]:/.test(p)) return false;
  return !p.split('/').some((seg) => seg === '..');
}

/** Resolve `rel` dentro de `root`, ou devolve null se escapar da raiz. */
export function resolveInside(root: string, rel: string): string | null {
  if (!isSafeRelativePath(rel)) return null;
  const resolved = path.resolve(root, rel);
  const normalizedRoot = path.resolve(root) + path.sep;
  return resolved.startsWith(normalizedRoot) ? resolved : null;
}

const LATEX_FILE_COMMANDS =
  /\\(input|include|subfile|import|subimport|includefrom|subincludefrom|inputfrom|subinputfrom|lstinputlisting|verbatiminput|inputminted|VerbatimInput|includegraphics|bibliography|addbibresource)\b\s*(\[[^\]]*\])?\s*(\{[^}]*\}|\S+)?/g;

/**
 * Lista referências a arquivos em LaTeX que poderiam ler algo fora do projeto enviado
 * (ex.: `\input{/etc/passwd}`, `\input{../x}` ou argumentos montados com macros).
 */
export function findUnsafeLatexIncludes(source: string): string[] {
  const problems: string[] = [];
  for (const m of source.matchAll(LATEX_FILE_COMMANDS)) {
    const rawArg = m[3];
    if (!rawArg) continue;
    const arg = rawArg.startsWith('{') ? rawArg.slice(1, -1).trim() : rawArg.trim();
    if (!arg) continue;
    // \bibliography{a,b} aceita listas
    const parts = m[1] === 'bibliography' || m[1] === 'addbibresource' ? arg.split(',') : [arg];
    for (const part of parts) {
      const candidate = part.trim().replace(/^"|"$/g, '');
      if (!candidate) continue;
      if (candidate.includes('\\') || !isSafeRelativePath(candidate)) {
        problems.push(`\\${m[1]}{${candidate}}`);
      }
    }
  }
  return problems;
}

const TYPST_FILE_FUNCTIONS =
  /(?:^|[^\w-])(read|json|csv|yaml|toml|xml|cbor|include|import|image|plugin|bibliography)\b\s*(\(?)\s*/g;

/**
 * Em Typst, só aceitamos funções de leitura de arquivo com string literal segura como argumento.
 * Expressões (`read("/et" + "c")`, variáveis) são rejeitadas porque não dá para validá-las.
 */
export function findUnsafeTypstIncludes(source: string): string[] {
  const problems: string[] = [];
  for (const m of source.matchAll(TYPST_FILE_FUNCTIONS)) {
    const fn = m[1];
    const hasParen = m[2] === '(';
    const isKeyword = fn === 'include' || fn === 'import';
    // `image`, `read` etc. só contam como chamada quando seguidos de parênteses
    if (!hasParen && !isKeyword) continue;
    const rest = source.slice((m.index ?? 0) + m[0].length);
    const literal = rest.match(/^"((?:[^"\\]|\\.)*)"/);
    if (!literal) {
      // `#import "x": a` sem aspas não é import de arquivo; `read(variavel)` é rejeitado
      if (hasParen && !rest.startsWith(')')) {
        const arg = rest.slice(0, 30).split(/[)\n]/)[0];
        problems.push(`${fn}(${arg})`);
      }
      continue;
    }
    const target = literal[1];
    // O literal precisa ser o argumento inteiro: `read("/et" + "c/passwd")` é recusado
    const afterLiteral = rest.slice(literal[0].length);
    if (!/^[ \t]*(?:[),:;\]\n]|$)/.test(afterLiteral)) {
      problems.push(`${fn}("${target}"…)`);
      continue;
    }
    if (target.startsWith('@')) continue; // pacotes do Typst Universe (@preview/...)
    if (target.startsWith('/')) {
      // Em Typst, "/x" é relativo à raiz do projeto, não do sistema
      if (!isSafeRelativePath(target.slice(1))) problems.push(`${fn}("${target}")`);
      continue;
    }
    if (!isSafeRelativePath(target)) problems.push(`${fn}("${target}")`);
  }
  return problems;
}
