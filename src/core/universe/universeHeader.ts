// =====================================================================
// RedijaApp — Topo do documento para modelos do Typst Universe
// Parte do exemplo que acompanha o modelo (perfil em `templateProfile.ts`) e
// troca os valores de exemplo ("Título da tese", "Nome do Autor") pelos dados
// do trabalho, mantendo o formato que o modelo espera (texto, conteúdo, lista
// ou dicionário). Os dados ficam no dicionário `redija`, para o código gerado
// ser legível e continuar acompanhando a barra lateral quando editado à mão.
// =====================================================================

import type {
  DocumentProject,
  TemplateConfig,
  UniverseFrontField,
  UniverseTemplateProfile,
} from '@/types/document';
import { typstContent, typstString } from '@/core/transpiler/escape';
import {
  findClose,
  findShowRules,
  literalItems,
  splitArgs,
  stripTrailingComment,
  valueShape,
  type TypstArg,
  type TypstShowRule,
  type TypstValueShape,
} from './typstSource';

/** Funções do `abnt.typ` usadas pelos blocos do corpo (figuras, tabelas, citações...). */
export const ABNT_BODY_HELPERS = ['figura', 'tabela', 'quadro', 'codigo', 'citacao', 'referencias'];

/**
 * Importa só as funções do corpo, depois do pacote: um pacote que exporte um nome igual
 * (o abntly exporta `quadro`) não substitui a função do RedijaApp.
 */
export const ABNT_HELPERS_IMPORT = `#import "abnt.typ": ${ABNT_BODY_HELPERS.join(', ')}`;

export type RedijaField =
  | 'title'
  | 'subtitle'
  | 'authors'
  | 'advisor'
  | 'coadvisor'
  | 'institution'
  | 'course'
  | 'location'
  | 'year'
  | 'date'
  | 'abstract'
  | 'keywords'
  | 'nature'
  | 'acknowledgments'
  | 'dedication'
  | 'epigraph';

/** Nome de parâmetro (normalizado: minúsculas, `_` → `-`) → campo do trabalho. */
const ALIASES: Record<RedijaField, string[]> = {
  title: ['title', 'titulo', 'titel', 'titre', 'titolo', 'thesis-title', 'document-title', 'report-title', 'paper-title', 'doc-title', 'project-title', 'dissertation-title', 'lab-title', 'main-title'],
  subtitle: ['subtitle', 'subtitulo', 'untertitel', 'sous-titre', 'sottotitolo'],
  authors: ['authors', 'author', 'autor', 'autores', 'autoren', 'auteur', 'auteurs', 'autore', 'autori', 'student', 'students', 'by', 'author-name', 'author-names', 'student-name', 'student-names', 'candidate', 'candidate-name'],
  advisor: ['advisor', 'advisors', 'adviser', 'advisers', 'supervisor', 'supervisors', 'orientador', 'orientadores', 'orientadora', 'betreuer', 'promotor', 'promoter', 'promotors', 'mentor', 'mentors', 'tutor', 'tutors', 'instructor', 'professor', 'teacher', 'relatore', 'directeur'],
  coadvisor: ['coadvisor', 'co-advisor', 'co-supervisor', 'cosupervisor', 'cosupervisors', 'co-supervisors', 'coorientador', 'co-orientador', 'coorientadora', 'second-supervisor', 'co-adviser'],
  institution: ['institution', 'university', 'universidade', 'instituicao', 'school', 'organization', 'organisation', 'college', 'universitat', 'universite', 'universita', 'hochschule', 'university-name', 'school-name'],
  course: ['course', 'curso', 'program', 'programme', 'degree-program', 'study', 'studies', 'course-name', 'studiengang', 'study-program', 'programme-name', 'program-name', 'field-of-study'],
  location: ['location', 'city', 'place', 'local', 'cidade', 'ort'],
  year: ['year', 'ano', 'jahr', 'annee', 'anno'],
  date: ['date', 'data', 'datum', 'submission-date'],
  abstract: ['abstract', 'abstracts', 'resumo', 'summary', 'zusammenfassung', 'resumen', 'riassunto'],
  keywords: ['keywords', 'keyword', 'palavras-chave', 'index-terms', 'schlagworte', 'schlusselworter', 'mots-cles', 'parole-chiave'],
  nature: ['description', 'nature', 'natureza', 'nota-apresentacao', 'preambulo'],
  acknowledgments: ['acknowledgments', 'acknowledgements', 'acknowledgement', 'acknowledgment', 'agradecimentos', 'thanks'],
  dedication: ['dedication', 'dedicatoria'],
  epigraph: ['epigraph', 'epigrafe'],
};

const PARAM_TO_FIELD = new Map<string, RedijaField>();
for (const [field, names] of Object.entries(ALIASES) as Array<[RedijaField, string[]]>) {
  for (const n of names) PARAM_TO_FIELD.set(n, field);
}

/** Sufixos/prefixos de idioma (`title-en`, `en-title`) e o idioma próprio de alguns nomes. */
const LANG_CODES = new Set(['pt', 'en', 'de', 'fr', 'es', 'it', 'nl', 'tr', 'zh', 'ja', 'cn', 'mk', 'pl', 'cs', 'ru', 'ko', 'german', 'english', 'french', 'portuguese', 'foreign']);
const INHERENT_LANG: Record<string, string> = { resumo: 'pt', resumen: 'es', zusammenfassung: 'de', riassunto: 'it', 'palavras-chave': 'pt', titulo: 'pt' };

const norm = (name: string): string => name.toLowerCase().replace(/_/g, '-');

interface ParamInfo {
  field: RedijaField;
  /** Idioma do parâmetro, quando o nome traz um (`abstract-en`) ou é de um idioma (`resumo`). */
  lang?: string;
}

/** Campo do trabalho para um nome de parâmetro; `siblings` são os outros nomes do mesmo nível. */
export function fieldForParam(name: string, siblings: string[] = []): ParamInfo | null {
  const n = norm(name);
  const direct = PARAM_TO_FIELD.get(n);
  if (direct) return { field: direct, lang: INHERENT_LANG[n] };
  const suffix = n.match(/^(title|titulo|subtitle|abstract|summary|resumo|keywords|palavras-chave)[-]?([a-z]+)$/);
  if (suffix && LANG_CODES.has(suffix[2])) {
    const base = PARAM_TO_FIELD.get(suffix[1]);
    if (base) return { field: base, lang: suffix[2] };
  }
  const prefix = n.match(/^([a-z]{2})-?(title|abstract|keywords)$/);
  if (prefix && LANG_CODES.has(prefix[1])) {
    const base = PARAM_TO_FIELD.get(prefix[2]);
    if (base) return { field: base, lang: prefix[1] };
  }
  // `name` é o autor só num dicionário de dados do trabalho (com título ao lado), não numa
  // instituição ou pessoa
  if (
    n === 'name' &&
    siblings.some((s) => PARAM_TO_FIELD.get(norm(s)) === 'title') &&
    !siblings.some((s) => PARAM_TO_FIELD.get(norm(s)) === 'authors')
  ) {
    return { field: 'authors' };
  }
  return null;
}

const BIBLIOGRAPHY_PARAMS = new Set(['bibliography', 'bib', 'references', 'refs', 'bibliography-file', 'bib-file', 'bibfile', 'bibliography-path', 'bib-path', 'literature', 'library', 'referencias']);

// ---------------------------------------------------------------------------------------------
// Dados do trabalho

const splitPeople = (raw?: string): string[] =>
  (raw ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

const strArray = (items: string[]): string =>
  items.length === 0 ? '()' : `(${items.map(typstString).join(', ')}${items.length === 1 ? ',' : ''})`;

/** O que o modelo recebe de cada campo: o dicionário `redija` e o que está vazio. */
export interface RedijaData {
  /** `#let redija = (...)` com os dados do trabalho. */
  definition: string;
  /** Campos sem valor no trabalho. */
  empty: Set<RedijaField | 'foreignAbstract' | 'foreignKeywords'>;
  numericYear: boolean;
  lang: string;
}

function buildDate(year: string, approvalDate?: string): string {
  const iso = approvalDate?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `datetime(year: ${Number(iso[1])}, month: ${Number(iso[2])}, day: ${Number(iso[3])})`;
  const y = Number(year);
  if (/^\d{4}$/.test(year) && y !== new Date().getFullYear()) return `datetime(year: ${y}, month: 1, day: 1)`;
  return 'datetime.today()';
}

export function buildRedijaData(project: DocumentProject, cfg: TemplateConfig): RedijaData {
  const m = project.metadata;
  const text = (v?: string) => v?.trim() ?? '';
  const authors = splitPeople(m.author);
  const advisors = splitPeople(m.advisor);
  const keywords = (m.keywords ?? []).map((k) => k.trim()).filter(Boolean);
  const foreignKeywords = (m.foreignKeywords ?? []).map((k) => k.trim()).filter(Boolean);
  const year = text(m.year);
  const numericYear = /^\d{1,4}$/.test(year);
  const lang = cfg.documentLanguage ?? 'pt';

  const empty = new Set<RedijaField | 'foreignAbstract' | 'foreignKeywords'>();
  const check = (field: RedijaField | 'foreignAbstract' | 'foreignKeywords', value: string | string[]) => {
    if (Array.isArray(value) ? value.length === 0 : !value) empty.add(field);
  };
  check('title', text(m.title));
  check('subtitle', text(m.subtitle));
  check('authors', authors);
  check('advisor', advisors);
  check('coadvisor', text(m.coadvisor));
  check('institution', text(m.institution));
  check('course', text(m.course));
  check('location', text(m.location));
  check('year', year);
  check('abstract', text(m.abstract));
  check('keywords', keywords);
  check('nature', text(m.nature));
  check('acknowledgments', text(m.acknowledgments));
  check('dedication', text(m.dedicatory));
  check('epigraph', text(m.epigraph));
  check('foreignAbstract', text(m.foreignAbstract));
  check('foreignKeywords', foreignKeywords);

  const entries: Array<[string, string]> = [
    ['titulo', typstString(text(m.title))],
    ['subtitulo', typstString(text(m.subtitle))],
    ['autor', typstString(authors.join(', '))],
    ['autores', strArray(authors)],
    ['orientador', typstString(advisors.join(', '))],
    ['orientadores', strArray(advisors)],
    ['coorientador', typstString(text(m.coadvisor))],
    ['instituicao', typstString(text(m.institution))],
    ['curso', typstString(text(m.course))],
    ['local', typstString(text(m.location))],
    ['ano', typstString(year)],
    ['ano-numero', numericYear ? String(Number(year)) : 'none'],
    ['data', buildDate(year, m.approvalDate)],
    ['resumo', typstContent(text(m.abstract))],
    ['resumo-texto', typstString(text(m.abstract))],
    ['palavras-chave', strArray(keywords)],
    ['resumo-estrangeiro', typstContent(text(m.foreignAbstract) || text(m.abstract))],
    ['resumo-estrangeiro-texto', typstString(text(m.foreignAbstract) || text(m.abstract))],
    ['palavras-chave-estrangeiras', strArray(foreignKeywords.length ? foreignKeywords : keywords)],
    ['natureza', typstContent(text(m.nature))],
    ['natureza-texto', typstString(text(m.nature))],
    ['agradecimentos', typstContent(text(m.acknowledgments))],
    ['agradecimentos-texto', typstString(text(m.acknowledgments))],
    ['dedicatoria', typstContent(text(m.dedicatory))],
    ['dedicatoria-texto', typstString(text(m.dedicatory))],
    ['epigrafe', typstContent(text(m.epigraph))],
    ['epigrafe-texto', typstString(text(m.epigraph))],
    ['idioma', typstString(lang)],
  ];
  const definition = `// Dados do trabalho (barra lateral do RedijaApp)\n#let redija = (\n${entries
    .map(([k, v]) => `  ${k}: ${v},`)
    .join('\n')}\n)`;
  return { definition, empty, numericYear, lang };
}

// ---------------------------------------------------------------------------------------------
// Substituição no formato do exemplo

interface RewriteContext {
  data: RedijaData;
  /** Campos preenchidos (para o resumo do que o modelo recebe). */
  hits: Set<RedijaField>;
  /** Bibliografia do trabalho para os `bibliography(...)` do exemplo. */
  bibliography: UniverseBibliography;
  consumedBibliography: boolean;
  overrides?: Record<string, string | boolean | number>;
}

const REF: Record<RedijaField, string> = {
  title: 'redija.titulo',
  subtitle: 'redija.subtitulo',
  authors: 'redija.autor',
  advisor: 'redija.orientador',
  coadvisor: 'redija.coorientador',
  institution: 'redija.instituicao',
  course: 'redija.curso',
  location: 'redija.local',
  year: 'redija.ano',
  date: 'redija.ano',
  abstract: 'redija.resumo-texto',
  keywords: 'redija.palavras-chave.join(", ")',
  nature: 'redija.natureza',
  acknowledgments: 'redija.agradecimentos',
  dedication: 'redija.dedicatoria',
  epigraph: 'redija.epigrafe',
};

const LIST_REF: Partial<Record<RedijaField, string>> = {
  authors: 'redija.autores',
  advisor: 'redija.orientadores',
  keywords: 'redija.palavras-chave',
};

const CONTENT_FIELDS = new Set<RedijaField>(['nature', 'acknowledgments', 'dedication', 'epigraph']);

/** Campo em texto (`str`) ou conteúdo (`[...]`), conforme o exemplo. */
function scalarRef(field: RedijaField, shape: 'str' | 'content', foreign: boolean): string {
  if (field === 'abstract') {
    if (foreign) return shape === 'content' ? 'redija.resumo-estrangeiro' : 'redija.resumo-estrangeiro-texto';
    return shape === 'content' ? 'redija.resumo' : 'redija.resumo-texto';
  }
  if (field === 'keywords') {
    const list = foreign ? 'redija.palavras-chave-estrangeiras' : 'redija.palavras-chave';
    return shape === 'content' ? `[#${list}.join(", ")]` : `${list}.join(", ")`;
  }
  const ref = REF[field];
  if (CONTENT_FIELDS.has(field)) return shape === 'content' ? ref : `${ref}-texto`;
  return shape === 'content' ? `[#${ref}]` : ref;
}

/** Chaves de um dicionário de pessoa → campo. */
function personKey(key: string): 'self' | 'given' | 'family' | 'institution' | 'location' | null {
  const k = norm(key);
  if (['name', 'nome', 'full-name', 'fullname'].includes(k)) return 'self';
  if (['given', 'given-name', 'first', 'first-name', 'firstname', 'forename', 'prenome'].includes(k)) return 'given';
  if (['surname', 'family', 'family-name', 'last', 'last-name', 'lastname', 'sobrenome'].includes(k)) return 'family';
  if (['affiliation', 'organization', 'organisation', 'institution', 'university', 'school', 'org', 'institute'].includes(k)) return 'institution';
  if (['location', 'city', 'place'].includes(k)) return 'location';
  return null;
}

/** Dicionário de pessoa do exemplo com o nome (e afiliação) trocados. `nameExpr` é a expressão do nome. */
function personDict(exampleDict: string, nameExpr: string, ctx: RewriteContext): string {
  const parts: string[] = [];
  let hasName = false;
  for (const it of literalItems(exampleDict)) {
    if (it.kind !== 'named') continue;
    const role = personKey(it.name);
    const shape = valueShape(it.expr);
    if (role === 'self' || role === 'given' || role === 'family') hasName = true;
    const nameValue =
      role === 'given'
        ? `${nameExpr}.split(" ").slice(0, -1).join(" ")`
        : role === 'family'
          ? `${nameExpr}.split(" ").last()`
          : nameExpr;
    if ((role === 'self' || role === 'given' || role === 'family') && (shape === 'str' || shape === 'content')) {
      parts.push(`${it.key}: ${shape === 'content' ? `[#${nameValue}]` : nameValue}`);
    } else if (role === 'self' && shape === 'dict') {
      parts.push(`${it.key}: ${personDict(it.expr, nameExpr, ctx)}`);
    } else if ((role === 'institution' || role === 'location') && (shape === 'str' || shape === 'content')) {
      const ref = role === 'institution' ? 'redija.instituicao' : 'redija.local';
      parts.push(`${it.key}: ${shape === 'content' ? `[#${ref}]` : ref}`);
      ctx.hits.add(role === 'institution' ? 'institution' : 'location');
    } else if (role === 'institution' && (shape === 'dict' || shape === 'call')) {
      parts.push(`${it.key}: ${rewriteExpr(it.expr, ctx)}`);
    } else {
      parts.push(`${it.key}: ${it.expr}`);
    }
  }
  // Pessoa com nome em partes (`given`/`surname`, `first-name`...): fica como no exemplo
  if (!hasName && !parts.length) return `(name: ${nameExpr})`;
  return `(${parts.join(', ')})`;
}

/**
 * Expressão para um campo no formato do valor de exemplo; `null` mantém o exemplo
 * (formato que o RedijaApp não sabe preencher).
 */
function renderField(
  info: ParamInfo,
  paramName: string,
  exampleExpr: string,
  foreign: boolean,
  ctx: RewriteContext,
): string | null {
  const { field } = info;
  const shape = valueShape(exampleExpr);
  const plural = /s$/.test(norm(paramName)) && !['status', 'thesis', 'class'].includes(norm(paramName));
  const isPerson = field === 'authors' || field === 'advisor';
  const empty = ctx.data.empty;

  if (field === 'date') {
    if (shape === 'datetime') return 'redija.data';
    if (shape === 'str' || shape === 'content') return scalarRef('year', shape, false);
    return null;
  }
  if (field === 'year') {
    if (shape === 'num') return ctx.data.numericYear ? 'redija.ano-numero' : null;
    if (shape === 'str' || shape === 'content') return scalarRef('year', shape, false);
    if (shape === 'none' || shape === 'auto') return 'redija.ano';
    return null;
  }
  if (CONTENT_FIELDS.has(field) && empty.has(field) && field !== 'nature') {
    // Agradecimentos, dedicatória e epígrafe vazios: `none` (o modelo pula a página)
    return shape === 'str' || shape === 'content' || shape === 'none' ? 'none' : null;
  }
  if (shape === 'str' || shape === 'content') {
    if (field === 'coadvisor' && empty.has('coadvisor')) return shape === 'str' ? '""' : '[]';
    return scalarRef(field, shape, foreign);
  }
  if (shape === 'array') {
    const first = literalItems(exampleExpr).find((it) => it.kind === 'positional');
    const itemShape: TypstValueShape = first ? valueShape(first.expr) : 'str';
    const list = field === 'keywords' && foreign ? 'redija.palavras-chave-estrangeiras' : LIST_REF[field];
    if (list) {
      if (itemShape === 'str') return list;
      if (itemShape === 'content') return `${list}.map(item => [#item])`;
      if (itemShape === 'dict' && isPerson && first) {
        return `${list}.map(nome => ${personDict(first.expr, 'nome', ctx)})`;
      }
      return null;
    }
    // Título em linhas (`title-tr: ("Linha 1", "Linha 2")`)
    if (field === 'title' && (itemShape === 'str' || itemShape === 'content')) {
      return itemShape === 'str' ? '(redija.titulo,)' : '([#redija.titulo],)';
    }
    return null;
  }
  if (shape === 'dict') {
    if (isPerson) return personDict(exampleExpr, isPerson && field === 'advisor' ? 'redija.orientador' : 'redija.autor', ctx);
    // Por idioma: (en: [...], de: [...])
    const items = literalItems(exampleExpr);
    if (items.length && items.every((it) => it.kind === 'named' && LANG_CODES.has(norm(it.name)))) {
      const parts = items.map((it) => {
        const s = valueShape(it.expr);
        const name = it.kind === 'named' ? it.key : '';
        if (s !== 'str' && s !== 'content') return `${name}: ${it.expr}`;
        return `${name}: ${scalarRef(field, s, norm(name) !== ctx.data.lang && field === 'abstract')}`;
      });
      return `(${parts.join(', ')})`;
    }
    return null;
  }
  if (shape === 'none' || shape === 'auto') {
    if (isPerson || field === 'keywords') return plural || field === 'keywords' ? (LIST_REF[field] ?? null) : REF[field];
    if (field === 'abstract') return foreign ? 'redija.resumo-estrangeiro' : 'redija.resumo';
    if (CONTENT_FIELDS.has(field)) return REF[field];
    return REF[field];
  }
  return null;
}

/** Decide qual parâmetro de resumo/palavras-chave é o principal e quais são de outro idioma. */
function foreignParams(names: string[], lang: string): Set<string> {
  const foreign = new Set<string>();
  for (const field of ['abstract', 'keywords'] as const) {
    const params = names
      .map((n) => ({ n, info: fieldForParam(n, names) }))
      .filter((p) => p.info?.field === field);
    if (params.length < 2) continue;
    const primary =
      params.find((p) => p.info?.lang === lang) ?? params.find((p) => !p.info?.lang) ?? params[0];
    for (const p of params) if (p !== primary) foreign.add(p.n);
  }
  return foreign;
}

const isBibliographyCall = (expr: string): boolean => /^bibliography\s*\(/.test(expr.trim());
const isBibFilePath = (expr: string): boolean => /^"[^"]*\.(bib|yml|yaml)"$/.test(expr.trim());

/** `bibliography(...)` do exemplo → bibliografia do trabalho. */
function bibliographyExpr(ctx: RewriteContext): string {
  if (ctx.bibliography.hasReferences) ctx.consumedBibliography = true;
  return ctx.bibliography.call;
}

/** Troca um argumento nomeado; devolve `null` para remover o argumento. */
function rewriteNamed(arg: Extract<TypstArg, { kind: 'named' }>, names: string[], foreign: Set<string>, ctx: RewriteContext, topLevel: boolean): string | null {
  if (topLevel && ctx.overrides && Object.prototype.hasOwnProperty.call(ctx.overrides, arg.name)) {
    return `${arg.key}: ${overrideLiteral(ctx.overrides[arg.name], valueShape(arg.expr))}`;
  }
  if (isBibliographyCall(arg.expr)) return `${arg.key}: ${bibliographyExpr(ctx)}`;
  if (BIBLIOGRAPHY_PARAMS.has(norm(arg.name)) && isBibFilePath(arg.expr)) {
    // Caminho do .bib: o do trabalho, ou nenhum (o modelo usa o padrão)
    if (!ctx.bibliography.hasReferences) return null;
    ctx.consumedBibliography = true;
    return `${arg.key}: "refs.bib"`;
  }
  const info = fieldForParam(arg.name, names);
  const shape = valueShape(arg.expr);
  if (info && !['ident', 'call', 'file', 'other', 'paren'].includes(shape)) {
    const rep = renderField(info, arg.name, arg.expr, foreign.has(arg.name), ctx);
    if (rep != null) {
      ctx.hits.add(info.field);
      return `${arg.key}: ${rep}`;
    }
  }
  return `${arg.key}: ${rewriteExpr(arg.expr, ctx)}`;
}

function overrideLiteral(value: string | boolean | number, shape: TypstValueShape): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0';
  return shape === 'content' ? typstContent(value) : typstString(value);
}

function rewriteArgs(args: TypstArg[], ctx: RewriteContext, positionalNames: string[] = [], topLevel = false): string[] {
  const names = args.flatMap((a) => (a.kind === 'named' ? [a.name] : []));
  const foreign = foreignParams(names, ctx.data.lang);
  const out: string[] = [];
  let pos = 0;
  for (const arg of args) {
    if (arg.kind === 'named') {
      const r = rewriteNamed(arg, names, foreign, ctx, topLevel);
      if (r != null) out.push(r);
      continue;
    }
    if (arg.kind === 'spread') {
      out.push(`..${arg.expr}`);
      continue;
    }
    const pname = positionalNames[pos++];
    if (isBibliographyCall(arg.expr)) {
      out.push(bibliographyExpr(ctx));
      continue;
    }
    const info = pname ? fieldForParam(pname) : null;
    const shape = valueShape(arg.expr);
    if (info && !['ident', 'call', 'file', 'other', 'paren'].includes(shape)) {
      const rep = renderField(info, pname, arg.expr, false, ctx);
      if (rep != null) {
        ctx.hits.add(info.field);
        out.push(rep);
        continue;
      }
    }
    out.push(rewriteExpr(arg.expr, ctx));
  }
  return out;
}

/** Reescreve dicionários, listas e chamadas `f(...)` em qualquer nível. */
function rewriteExpr(expr: string, ctx: RewriteContext, depth = 0): string {
  const e = expr.trim();
  if (depth > 6) return e;
  if (isBibliographyCall(e)) {
    const close = findClose(e, e.indexOf('(') + 1, '(');
    if (close === e.length - 1) return bibliographyExpr(ctx);
  }
  const call = e.match(/^([a-zA-Z_][a-zA-Z0-9_.-]*)?\s*\(/);
  if (!call) return e;
  if (call[1] && /^(image|read|json|yaml|toml|csv|bytes|datetime|rgb|cmyk|luma|color|bibliography)$/.test(call[1].split('.').pop()!)) return e;
  const open = e.indexOf('(', call[1] ? call[1].length : 0);
  const close = findClose(e, open + 1, '(');
  if (close < 0) return e;
  const inner = e.slice(open + 1, close);
  const items = splitArgs(inner);
  if (!items.length) return e;
  const parts = rewriteArgs(items, ctx);
  const single = !call[1] && items.length === 1 && items[0].kind === 'positional' && /,\s*$/.test(inner) ? ',' : '';
  return `${call[1] ?? ''}(${parts.join(', ')}${single})${rewriteTail(e.slice(close + 1), ctx, depth)}`;
}

/** Chamadas encadeadas: `f(...)(...)` ou `.with(...)`. */
function rewriteTail(tail: string, ctx: RewriteContext, depth: number): string {
  if (!tail.trim()) return tail;
  const m = tail.match(/^(\s*\.with\s*|\s*)\(/);
  if (!m) return tail;
  return `${m[1]}${rewriteExpr(tail.slice(m[1].length), ctx, depth + 1)}`;
}

/** Preâmbulo: `#let nome = valor` com nome de campo, e dicionários/chamadas em `#let`. */
function rewritePreamble(preamble: string, ctx: RewriteContext): string {
  let out = '';
  let last = 0;
  const re = /#let\s+([a-zA-Z_][a-zA-Z0-9_-]*)\s*=\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(preamble))) {
    const start = m.index + m[0].length;
    const rest = preamble.slice(start);
    let end: number;
    const callM = rest.match(/^([a-zA-Z_][a-zA-Z0-9_.-]*)?\s*\(/);
    if (callM) {
      const close = findClose(preamble, start + rest.indexOf('(') + 1, '(');
      if (close < 0) continue;
      end = close + 1;
    } else if (rest.startsWith('[')) {
      const close = findClose(preamble, start + 1, '[');
      if (close < 0) continue;
      end = close + 1;
    } else {
      const nl = preamble.indexOf('\n', start);
      end = nl < 0 ? preamble.length : nl;
    }
    const expr = callM || rest.startsWith('[') ? preamble.slice(start, end) : stripTrailingComment(preamble.slice(start, end));
    const info = fieldForParam(m[1]);
    const shape = valueShape(expr);
    let rep: string | null = null;
    if (info && !['ident', 'call', 'file', 'other', 'paren'].includes(shape)) {
      rep = renderField(info, m[1], expr, false, ctx);
      if (rep != null) ctx.hits.add(info.field);
    }
    if (rep == null && callM) rep = rewriteExpr(expr, ctx);
    out += preamble.slice(last, start) + (rep ?? preamble.slice(start, end));
    last = end;
    re.lastIndex = end;
  }
  return out + preamble.slice(last);
}

function rebuildShow(rule: TypstShowRule, args: string[]): string {
  const body = rule.bodyVar ?? 'doc';
  const list = (items: string[]) => (items.length ? `\n  ${items.join(',\n  ')},\n` : '');
  switch (rule.form) {
    case 'closure':
      return `#show: ${body} => ${rule.entry}(${list([...args, body])})`;
    case 'factory':
      return `#show: ${rule.entry}(${list(args)})`;
    case 'bare':
      return args.length ? `#show: ${rule.entry}.with(${list(args)})` : `#show: ${rule.entry}`;
    default:
      return `#show: ${rule.entry}.with(${list(args)})`;
  }
}

const FRONT_REF: Record<UniverseFrontField, string> = {
  abstract: 'redija.resumo',
  foreignAbstract: 'redija.resumo-estrangeiro',
  dedication: 'redija.dedicatoria',
  acknowledgments: 'redija.agradecimentos',
  epigraph: 'redija.epigrafe',
};

function frontCallsCode(profile: UniverseTemplateProfile, ctx: RewriteContext): string[] {
  const out: string[] = [];
  const empty = ctx.data.empty;
  for (const fc of profile.frontCalls ?? []) {
    if (!fc.field) {
      const m = fc.call.match(/^#([a-zA-Z_][a-zA-Z0-9_.-]*)(\(.*)$/s);
      out.push(m ? `#${m[1]}${rewriteTail(m[2], ctx, 0)}` : fc.call);
      continue;
    }
    // Resumos sempre vão (alguns modelos exigem); os demais só com texto no trabalho
    if ((fc.field === 'dedication' || fc.field === 'acknowledgments' || fc.field === 'epigraph') && empty.has(fc.field)) continue;
    if (fc.field === 'abstract' || fc.field === 'foreignAbstract') ctx.hits.add('abstract');
    out.push(`${fc.call}[#${FRONT_REF[fc.field]}]`);
  }
  return out;
}

export interface UniverseHeaderResult {
  /** Código do topo: dados, preâmbulo, regra `#show`, páginas iniciais e import do corpo. */
  code: string;
  /** O modelo recebeu a bibliografia por parâmetro; o corpo não repete o `#bibliography`. */
  consumesBibliography: boolean;
  /** Campos do trabalho que o modelo recebe. */
  filled: RedijaField[];
}

/** Bibliografia que o RedijaApp entrega aos `bibliography(...)` do exemplo do modelo. */
export interface UniverseBibliography {
  /** Chamada, ex.: `bibliography("refs.bib", full: true, style: "...")`. */
  call: string;
  /** Com referências, o modelo passa a mostrar a lista e o corpo não repete. */
  hasReferences: boolean;
}

export interface UniverseHeaderOptions {
  bibliography?: UniverseBibliography;
}

/** Sem referências no trabalho: uma bibliografia vazia, para o modelo não mostrar as do exemplo. */
export const EMPTY_UNIVERSE_BIBLIOGRAPHY: UniverseBibliography = { call: 'bibliography(bytes(""))', hasReferences: false };

/**
 * Topo do documento a partir do exemplo do modelo. Retorna `null` quando o perfil não
 * tem a regra `#show` do exemplo (o gerador usa então a forma antiga).
 */
export function buildUniverseHeaderFromProfile(
  project: DocumentProject,
  cfg: TemplateConfig,
  profile: UniverseTemplateProfile,
  options: UniverseHeaderOptions = {},
): UniverseHeaderResult | null {
  if (!profile.showRule) return null;
  const rule = findShowRules(profile.showRule)[0];
  if (!rule) return null;
  const data = buildRedijaData(project, cfg);
  const ctx: RewriteContext = {
    data,
    hits: new Set(),
    bibliography: options.bibliography ?? EMPTY_UNIVERSE_BIBLIOGRAPHY,
    consumedBibliography: false,
    overrides: cfg.universeOverrides,
  };
  const preamble = rewritePreamble(profile.preamble ?? '', ctx);
  const args = rewriteArgs(rule.args, ctx, profile.signature?.positional ?? [], true);
  const show = rebuildShow(rule, args);
  const front = frontCallsCode(profile, ctx);
  const docSet = '#set document(title: redija.titulo, author: redija.autores)';
  const code = [data.definition, preamble, docSet, show, ...front, ABNT_HELPERS_IMPORT]
    .filter((part) => part.trim())
    .join('\n\n');
  return { code, consumesBibliography: ctx.consumedBibliography, filled: [...ctx.hits] };
}

/** Topo escrito à mão pelo usuário (painel "Configuração do modelo"). */
export function buildCustomUniverseHeader(project: DocumentProject, cfg: TemplateConfig, custom: string): UniverseHeaderResult {
  const data = buildRedijaData(project, cfg);
  return {
    code: [data.definition, custom.trim(), ABNT_HELPERS_IMPORT].join('\n\n'),
    consumesBibliography: /(^|[^.\w-])bibliography\s*\(\s*"refs\.bib"/.test(custom),
    filled: [],
  };
}

/** Só a parte editável do topo (sem o dicionário `redija` e o import do corpo). */
export function editableUniverseHeader(code: string): string {
  const withoutData = code.replace(/^\/\/ Dados do trabalho[^\n]*\n#let redija = \([\s\S]*?\n\)\n*/, '');
  return withoutData.replace(`\n\n${ABNT_HELPERS_IMPORT}`, '').replace(ABNT_HELPERS_IMPORT, '').trim();
}

export interface UniverseExtraField {
  name: string;
  kind: 'text' | 'content' | 'bool' | 'number';
  /** Valor do exemplo do modelo. */
  example: string | boolean | number;
}

/**
 * Argumentos da regra `#show` do exemplo que não correspondem a nenhum dado do trabalho
 * e que dá para editar num formulário (texto, sim/não ou número).
 */
export function listUniverseExtraFields(profile?: UniverseTemplateProfile): UniverseExtraField[] {
  if (!profile?.showRule) return [];
  const rule = findShowRules(profile.showRule)[0];
  if (!rule) return [];
  const names = rule.args.flatMap((a) => (a.kind === 'named' ? [a.name] : []));
  const out: UniverseExtraField[] = [];
  for (const arg of rule.args) {
    if (arg.kind !== 'named') continue;
    if (fieldForParam(arg.name, names) || BIBLIOGRAPHY_PARAMS.has(norm(arg.name))) continue;
    const shape = valueShape(arg.expr);
    if (shape === 'str') {
      out.push({ name: arg.name, kind: 'text', example: unquote(arg.expr) });
    } else if (shape === 'content') {
      const inner = arg.expr.trim().slice(1, -1).trim();
      if (!/[#$\\]/.test(inner) && inner.length <= 400) out.push({ name: arg.name, kind: 'content', example: inner });
    } else if (shape === 'bool') {
      out.push({ name: arg.name, kind: 'bool', example: arg.expr.trim() === 'true' });
    } else if (shape === 'num' && /^-?\d+(\.\d+)?$/.test(arg.expr.trim())) {
      out.push({ name: arg.name, kind: 'number', example: Number(arg.expr.trim()) });
    }
  }
  return out;
}

function unquote(expr: string): string {
  try {
    return JSON.parse(expr.trim()) as string;
  } catch {
    return expr.trim().slice(1, -1);
  }
}
